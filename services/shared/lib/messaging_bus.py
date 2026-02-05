import json
import logging
from typing import Any, Callable

import pika

logger = logging.getLogger(__name__)


class MessagingBus:
    def __init__(self, url: str):
        self.connection = pika.BlockingConnection(pika.URLParameters(url))
        self.channel = self.connection.channel()

    def declare_queue(self, name: str, durable: bool = True):
        self.channel.queue_declare(queue=name, durable=durable)

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
