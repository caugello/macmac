"""Tests for messaging bus functionality."""

import json
from unittest.mock import MagicMock, patch

import pytest
from pika import exceptions as pika_exceptions

from services.shared.lib.messaging_bus import MessagingBus


@pytest.mark.unit
@patch("services.shared.lib.messaging_bus.pika")
def test_messaging_bus_init(mock_pika):
    """Test MessagingBus initialization."""
    mock_connection = MagicMock()
    mock_channel = MagicMock()
    mock_connection.channel.return_value = mock_channel
    mock_pika.BlockingConnection.return_value = mock_connection

    bus = MessagingBus("amqp://guest:guest@localhost:5672/")

    mock_pika.URLParameters.assert_called_once_with("amqp://guest:guest@localhost:5672/")
    mock_pika.BlockingConnection.assert_called_once()
    assert bus.channel == mock_channel


@pytest.mark.unit
@patch("services.shared.lib.messaging_bus.pika")
def test_declare_queue(mock_pika):
    """Test declaring a queue."""
    mock_connection = MagicMock()
    mock_channel = MagicMock()
    mock_connection.channel.return_value = mock_channel
    mock_pika.BlockingConnection.return_value = mock_connection

    bus = MessagingBus("amqp://localhost")
    bus.declare_queue("test_queue", durable=True)

    mock_channel.exchange_declare.assert_called_once_with(
        exchange="test_queue.dlx", exchange_type="direct", durable=True
    )
    mock_channel.queue_bind.assert_called_once_with(
        queue="test_queue.dlq", exchange="test_queue.dlx", routing_key="test_queue"
    )
    assert mock_channel.queue_declare.call_count == 2
    mock_channel.queue_declare.assert_any_call(queue="test_queue.dlq", durable=True)
    mock_channel.queue_declare.assert_any_call(
        queue="test_queue",
        durable=True,
        arguments={
            "x-dead-letter-exchange": "test_queue.dlx",
            "x-dead-letter-routing-key": "test_queue",
        },
    )


@pytest.mark.unit
@patch("services.shared.lib.messaging_bus.pika")
def test_get_queue_depth_returns_message_count(mock_pika):
    """get_queue_depth reports the passive declare's message_count, no consume."""
    mock_connection = MagicMock()
    mock_channel = MagicMock()
    mock_connection.channel.return_value = mock_channel
    mock_pika.BlockingConnection.return_value = mock_connection
    mock_channel.queue_declare.return_value.method.message_count = 7

    bus = MessagingBus("amqp://localhost")
    depth = bus.get_queue_depth("test_queue.dlq")

    assert depth == 7
    mock_channel.queue_declare.assert_called_once_with(queue="test_queue.dlq", passive=True)


@pytest.mark.unit
@patch("services.shared.lib.messaging_bus.pika")
def test_get_queue_depth_missing_queue_reopens_channel(mock_pika):
    """A passive declare on a missing queue closes the channel; we reopen and report 0."""
    mock_connection = MagicMock()
    first_channel = MagicMock()
    reopened_channel = MagicMock()
    mock_connection.channel.side_effect = [first_channel, reopened_channel]
    mock_pika.BlockingConnection.return_value = mock_connection
    mock_pika.exceptions.ChannelClosedByBroker = pika_exceptions.ChannelClosedByBroker
    first_channel.queue_declare.side_effect = pika_exceptions.ChannelClosedByBroker(
        404, "NOT_FOUND"
    )

    bus = MessagingBus("amqp://localhost")
    depth = bus.get_queue_depth("missing.dlq")

    assert depth == 0
    # Channel was reopened for subsequent operations.
    assert bus.channel is reopened_channel


@pytest.mark.unit
@patch("services.shared.lib.messaging_bus.pika")
def test_publish_message(mock_pika):
    """Test publishing a message."""
    mock_connection = MagicMock()
    mock_channel = MagicMock()
    mock_connection.channel.return_value = mock_channel
    mock_pika.BlockingConnection.return_value = mock_connection

    bus = MessagingBus("amqp://localhost")

    payload = {"vendor_name": "test", "raw_name": "Product", "product_url": "http://example.com"}
    bus.publish("test_queue", payload)

    # Verify publish was called
    mock_channel.basic_publish.assert_called_once()
    call_args = mock_channel.basic_publish.call_args

    # Check arguments
    assert call_args.kwargs["exchange"] == ""
    assert call_args.kwargs["routing_key"] == "test_queue"

    # Check body is JSON encoded
    body = call_args.kwargs["body"]
    decoded = json.loads(body.decode("utf-8"))
    assert decoded == payload


@pytest.mark.unit
@patch("services.shared.lib.messaging_bus.pika")
def test_consume_message(mock_pika):
    """Test consuming messages."""
    mock_connection = MagicMock()
    mock_channel = MagicMock()
    mock_connection.channel.return_value = mock_channel
    mock_pika.BlockingConnection.return_value = mock_connection

    bus = MessagingBus("amqp://localhost")

    callback = MagicMock()
    bus.consume("test_queue", callback)

    # Verify basic_qos and basic_consume were called
    mock_channel.basic_qos.assert_called_once_with(prefetch_count=1)
    mock_channel.basic_consume.assert_called_once()

    call_args = mock_channel.basic_consume.call_args
    assert call_args.kwargs["queue"] == "test_queue"


@pytest.mark.unit
@patch("services.shared.lib.messaging_bus.pika")
def test_start_consuming(mock_pika):
    """Test starting the consumer loop."""
    mock_connection = MagicMock()
    mock_channel = MagicMock()
    mock_connection.channel.return_value = mock_channel
    mock_pika.BlockingConnection.return_value = mock_connection

    bus = MessagingBus("amqp://localhost")
    bus.start()

    mock_channel.start_consuming.assert_called_once()


@pytest.mark.unit
@patch("services.shared.lib.messaging_bus.pika")
def test_consume_callback_success(mock_pika):
    """Test successful message processing in consume callback."""
    mock_connection = MagicMock()
    mock_channel = MagicMock()
    mock_connection.channel.return_value = mock_channel
    mock_pika.BlockingConnection.return_value = mock_connection

    bus = MessagingBus("amqp://localhost")

    # Mock callback function
    user_callback = MagicMock()

    # Register consumer
    bus.consume("test_queue", user_callback)

    # Get the registered callback
    call_args = mock_channel.basic_consume.call_args
    on_message_callback = call_args.kwargs["on_message_callback"]

    # Simulate incoming message
    mock_method = MagicMock()
    mock_method.delivery_tag = "delivery-123"
    test_payload = {"data": "test"}
    body = json.dumps(test_payload).encode("utf-8")

    # Call the callback
    on_message_callback(mock_channel, mock_method, None, body)

    # Verify user callback was called with decoded data
    user_callback.assert_called_once_with(test_payload, mock_channel)

    # Verify message was acknowledged
    mock_channel.basic_ack.assert_called_once_with(delivery_tag="delivery-123")


@pytest.mark.unit
@patch("services.shared.lib.messaging_bus.pika")
@patch("services.shared.lib.messaging_bus.logger")
def test_consume_callback_error(mock_logger, mock_pika):
    """Test error handling in consume callback."""
    mock_connection = MagicMock()
    mock_channel = MagicMock()
    mock_connection.channel.return_value = mock_channel
    mock_pika.BlockingConnection.return_value = mock_connection

    bus = MessagingBus("amqp://localhost")

    # Mock callback that raises an error
    user_callback = MagicMock(side_effect=ValueError("Processing error"))

    # Register consumer
    bus.consume("test_queue", user_callback)

    # Get the registered callback
    call_args = mock_channel.basic_consume.call_args
    on_message_callback = call_args.kwargs["on_message_callback"]

    # Simulate incoming message
    mock_method = MagicMock()
    mock_method.delivery_tag = "delivery-456"
    test_payload = {"data": "test"}
    body = json.dumps(test_payload).encode("utf-8")

    # Call the callback (should not raise)
    on_message_callback(mock_channel, mock_method, None, body)

    # Verify message was nacked
    mock_channel.basic_nack.assert_called_once_with(delivery_tag="delivery-456", requeue=False)

    # Verify error was logged
    mock_logger.exception.assert_called_once()


@pytest.mark.unit
@patch("services.shared.lib.messaging_bus.pika.BlockingConnection")
def test_plaintext_amqp_no_ssl_options(mock_blocking_connection, monkeypatch):
    """amqp:// in-cluster URL must connect without ssl_options (unchanged path)."""
    monkeypatch.delenv("RABBITMQ_CA_CERT_PATH", raising=False)
    mock_blocking_connection.return_value.channel.return_value = MagicMock()

    MessagingBus("amqp://guest:guest@rabbitmq:5672/%2F")

    params = mock_blocking_connection.call_args.args[0]
    # pika leaves ssl_options as None for plaintext connections.
    assert params.ssl_options is None


@pytest.mark.unit
@patch("services.shared.lib.messaging_bus.os.path.isfile", return_value=True)
@patch("services.shared.lib.messaging_bus.ssl.SSLContext.load_verify_locations")
@patch("services.shared.lib.messaging_bus.pika.BlockingConnection")
def test_amqps_sets_verified_ssl_options(
    mock_blocking_connection, mock_load_verify, _mock_isfile, monkeypatch
):
    """amqps:// URL builds CA-verified SSLOptions with SNI = URL host.

    ``load_verify_locations`` is mocked so the test needs no real cert material
    (CI's unit-test env lacks ``cryptography``); a real stdlib ``ssl.SSLContext``
    is still built, so we can assert it is configured for full verification and
    that pika.SSLOptions carries the URL host as SNI.
    """
    import ssl as ssl_module

    import pika

    ca_path = "/etc/rabbitmq/ca.pem"
    monkeypatch.setenv("RABBITMQ_CA_CERT_PATH", ca_path)
    monkeypatch.delenv("RABBITMQ_TLS_SERVER_NAME", raising=False)
    mock_blocking_connection.return_value.channel.return_value = MagicMock()

    host = "rabbitmq-amqps-macmac.apps.example.com"
    MessagingBus(f"amqps://user:pass@{host}:443/%2F")

    # CA bundle loaded from the configured path.
    mock_load_verify.assert_called_once_with(cafile=ca_path)

    params = mock_blocking_connection.call_args.args[0]
    assert isinstance(params.ssl_options, pika.SSLOptions)
    assert params.ssl_options.server_hostname == host

    # Context configured for full server cert + hostname verification.
    ctx = params.ssl_options.context
    assert ctx.check_hostname is True
    assert ctx.verify_mode == ssl_module.CERT_REQUIRED


@pytest.mark.unit
@patch("services.shared.lib.messaging_bus.os.path.isfile", return_value=True)
@patch("services.shared.lib.messaging_bus.ssl.SSLContext.load_verify_locations")
@patch("services.shared.lib.messaging_bus.pika.BlockingConnection")
def test_amqps_server_name_override(
    mock_blocking_connection, mock_load_verify, _mock_isfile, monkeypatch
):
    """RABBITMQ_TLS_SERVER_NAME overrides the URL host for SNI."""
    ca_path = "/etc/rabbitmq/ca.pem"
    monkeypatch.setenv("RABBITMQ_CA_CERT_PATH", ca_path)
    monkeypatch.setenv("RABBITMQ_TLS_SERVER_NAME", "override.example.com")
    mock_blocking_connection.return_value.channel.return_value = MagicMock()

    MessagingBus("amqps://user:pass@10.0.0.5:443/%2F")

    mock_load_verify.assert_called_once_with(cafile=ca_path)
    params = mock_blocking_connection.call_args.args[0]
    assert params.ssl_options.server_hostname == "override.example.com"


@pytest.mark.unit
@patch("services.shared.lib.messaging_bus.pika.BlockingConnection")
def test_amqps_missing_ca_raises(mock_blocking_connection, monkeypatch):
    """amqps:// without a configured CA path raises a clear error."""
    monkeypatch.delenv("RABBITMQ_CA_CERT_PATH", raising=False)

    with pytest.raises(ValueError, match="RABBITMQ_CA_CERT_PATH"):
        MessagingBus("amqps://user:pass@host.example.com:443/%2F")
    mock_blocking_connection.assert_not_called()


@pytest.mark.unit
@patch("services.shared.lib.messaging_bus.pika.BlockingConnection")
def test_amqps_ca_path_not_found_raises(mock_blocking_connection, monkeypatch, tmp_path):
    """A CA path pointing at a nonexistent file raises FileNotFoundError."""
    monkeypatch.setenv("RABBITMQ_CA_CERT_PATH", str(tmp_path / "missing.pem"))

    with pytest.raises(FileNotFoundError, match="RABBITMQ_CA_CERT_PATH"):
        MessagingBus("amqps://user:pass@host.example.com:443/%2F")
    mock_blocking_connection.assert_not_called()
