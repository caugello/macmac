import json
import logging
import os
import ssl
from collections.abc import Callable
from typing import Any
from urllib.parse import urlparse

import pika

logger = logging.getLogger(__name__)


def _build_ssl_options(host: str, ca_cert_path: str) -> pika.SSLOptions:
    """Build CA-verified ``SSLOptions`` for an ``amqps://`` connection.

    Remote enricher workers reach RabbitMQ over the internet via an OpenShift
    Route with TLS passthrough (port 443, SNI = route hostname). Plain pika
    negotiates TLS for ``amqps://`` URLs but does NOT verify the server cert,
    leaving those connections open to MITM. This loads a CA bundle and enables
    full server cert + hostname verification.
    """
    if not os.path.isfile(ca_cert_path):
        raise FileNotFoundError(f"RABBITMQ_CA_CERT_PATH does not point to a file: {ca_cert_path}")

    context = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
    context.load_verify_locations(cafile=ca_cert_path)
    context.check_hostname = True
    context.verify_mode = ssl.CERT_REQUIRED
    # SNI / hostname verification must target the route hostname the server
    # cert is issued for; an explicit override wins over the URL host.
    server_hostname = os.environ.get("RABBITMQ_TLS_SERVER_NAME") or host
    return pika.SSLOptions(context, server_hostname=server_hostname)


class MessagingBus:
    def __init__(self, url: str):
        params = pika.URLParameters(url)
        ca_cert_path = os.environ.get("RABBITMQ_CA_CERT_PATH")
        parsed = urlparse(url)
        if parsed.scheme == "amqps":
            if not ca_cert_path:
                raise ValueError(
                    "amqps:// URL requires a CA certificate for verification; "
                    "set RABBITMQ_CA_CERT_PATH to the CA bundle path"
                )
            params.ssl_options = _build_ssl_options(parsed.hostname or "", ca_cert_path)
        self.connection = pika.BlockingConnection(params)
        self.channel = self.connection.channel()

    def declare_queue(self, name: str, durable: bool = True):
        dlx_name = f"{name}.dlx"
        dlq_name = f"{name}.dlq"
        self.channel.exchange_declare(exchange=dlx_name, exchange_type="direct", durable=durable)
        self.channel.queue_declare(queue=dlq_name, durable=durable)
        self.channel.queue_bind(queue=dlq_name, exchange=dlx_name, routing_key=name)
        self.channel.queue_declare(
            queue=name,
            durable=durable,
            arguments={"x-dead-letter-exchange": dlx_name, "x-dead-letter-routing-key": name},
        )

    def get_queue_depth(self, queue: str) -> int:
        """Return the number of messages waiting in ``queue`` without consuming them.

        Uses a passive declare, which reports the queue's ``message_count`` and
        never modifies it. A passive declare against a missing queue makes the
        broker close the channel, so we reopen it and report 0 (nothing has been
        dead-lettered there yet).
        """
        try:
            result = self.channel.queue_declare(queue=queue, passive=True)
            return int(result.method.message_count)
        except pika.exceptions.ChannelClosedByBroker:
            self.channel = self.connection.channel()
            return 0

    def consume(self, queue: str, callback: Callable[[dict, Any], None]):
        """
        callback(payload_dict, ch) will be called for each message.
        """

        def _on_message(ch, method, properties, body: bytes):
            try:
                data = json.loads(body.decode("utf-8"))
                logger.info("Received message on %s: %s", queue, data)
                callback(data, ch)
                ch.basic_ack(delivery_tag=method.delivery_tag)
            except Exception:
                logger.exception("Error handling message on %s", queue)
                # You might DLQ or nack with requeue=False here:
                ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)

        self.channel.basic_qos(prefetch_count=1)
        self.channel.basic_consume(queue=queue, on_message_callback=_on_message)

    def publish(self, queue: str, payload: dict):
        body = json.dumps(payload).encode("utf-8")
        self.channel.basic_publish(
            exchange="",
            routing_key=queue,
            body=body,
            properties=pika.BasicProperties(delivery_mode=2),  # persistent
        )
        logger.info("Published message to %s: %s", queue, payload)

    def start(self):
        logger.info("Starting RabbitMQ consumer loop")
        self.channel.start_consuming()
