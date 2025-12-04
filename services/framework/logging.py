import contextvars
import json
import logging
import sys
import time
import uuid
from datetime import datetime

from services.config import get_config

_span_stack = contextvars.ContextVar("span_stack", default=[])
current_trace_id = contextvars.ContextVar("trace_id", default=str(uuid.uuid4()))


LOG_FORMAT = "[%(asctime)s] [%(levelname)s] %(message)s"
config = get_config()


class TraceIDFilter(logging.Filter):
    """Injects trace_id into log records if available."""

    def filter(self, record):
        record.trace_id = current_trace_id.get() or "-"
        return True


def setup_logging():
    """
    Configure the root logger with a StreamHandler and a custom formatter.
    Also, adds a TraceIDFilter to inject trace_id into log records.
    """
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(logging.Formatter(LOG_FORMAT))

    logger = logging.getLogger(config.title)
    logger.setLevel(logging.INFO)
    logger.addHandler(handler)
    logger.addFilter(TraceIDFilter())

    return logger


logger = setup_logging()


def log_span(event: str, **fields):
    """
    Logs a structured span event.
    A span represents an operation or unit of work within a trace.
    It automatically includes the current trace ID and timestamp.
    """
    trace_id = current_trace_id.get()
    payload = {
        "ts": datetime.utcnow().isoformat(),
        "trace_id": trace_id,
        "event": event,
        **fields,
    }
    logger.info(json.dumps(payload))


class Span:
    """
    A context manager for logging spans.
    """

    def __init__(self, name):
        self.name = name

    def __enter__(self):
        self.start = time.time()
        log_span(f"span_start_{self.name}", name=self.name)
        stack = _span_stack.get()
        _span_stack.set(stack + [self.name])

    def __exit__(self, exc_type, exc_val, tb):
        stack = _span_stack.get()[:-1]
        _span_stack.set(stack)
        duration = round((time.time() - self.start) * 1000, 2)
        log_span(f"span_end_{self.name}", name=self.name, duration_ms=duration)


def log_event(event: str, **data):
    """
    Logs a structured event with additional data.
    The current trace ID and span stack are automatically included.
    """
    payload = {
        "ts": datetime.utcnow().isoformat(),
        "event": event,
        **data,
    }
    logger.info(json.dumps(payload))
