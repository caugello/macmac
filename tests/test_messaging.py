"""Tests for messaging bus functionality."""

import json
from unittest.mock import MagicMock, patch

import pytest

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

    mock_channel.queue_declare.assert_called_once_with(queue="test_queue", durable=True)


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
