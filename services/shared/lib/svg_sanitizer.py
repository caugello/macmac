"""Strict allowlist sanitizer for Nutri-Score SVG markup.

The enricher scrapes ``svg.outerHTML`` from vendor pages. That raw HTML is
persisted and returned in API responses, so it must be sanitized to prevent
stored XSS. Only the minimal subset needed to render a letter-grade SVG is
permitted; anything else (scripts, event handlers, foreign objects, unsafe
URIs) is dropped.
"""

from html.parser import HTMLParser

# Tags allowed in a sanitized Nutri-Score SVG.
ALLOWED_TAGS = frozenset({"svg", "path", "rect", "text", "g"})

# Attributes allowed on any permitted tag.
ALLOWED_ATTRS = frozenset({"class", "xmlns", "viewbox"})

# Maximum length of a sanitized SVG. A simple letter-grade SVG is well under
# this; anything larger is rejected outright as suspicious.
MAX_SVG_LENGTH = 2000

# Void/self-closing tags that should not emit a closing tag.
_VOID_TAGS = frozenset({"rect", "path"})


class _SvgSanitizer(HTMLParser):
    """Rebuilds SVG markup keeping only allowlisted tags and attributes."""

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self._parts: list[str] = []
        # Tracks open allowed tags so we only emit matching close tags.
        self._open_tags: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag not in ALLOWED_TAGS:
            return
        self._emit_open(tag, attrs, self_closing=False)
        if tag not in _VOID_TAGS:
            self._open_tags.append(tag)

    def handle_startendtag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag not in ALLOWED_TAGS:
            return
        self._emit_open(tag, attrs, self_closing=True)

    def handle_endtag(self, tag: str) -> None:
        if tag not in ALLOWED_TAGS:
            return
        if tag in self._open_tags:
            # Close any nested unclosed allowed tags first.
            while self._open_tags:
                open_tag = self._open_tags.pop()
                self._parts.append(f"</{open_tag}>")
                if open_tag == tag:
                    break

    def handle_data(self, data: str) -> None:
        # Text content is only meaningful inside <text>; escape it regardless.
        if self._open_tags and self._open_tags[-1] == "text":
            self._parts.append(_escape_text(data))

    def _emit_open(self, tag: str, attrs: list[tuple[str, str | None]], self_closing: bool) -> None:
        safe_attrs = []
        for name, value in attrs:
            name = name.lower()
            if name not in ALLOWED_ATTRS:
                continue
            if value is None:
                continue
            if not _is_safe_value(value):
                continue
            safe_attrs.append(f'{name}="{_escape_attr(value)}"')
        attr_str = (" " + " ".join(safe_attrs)) if safe_attrs else ""
        closer = "/>" if self_closing else ">"
        self._parts.append(f"<{tag}{attr_str}{closer}")

    def result(self) -> str:
        # Close any tags left open by malformed input.
        while self._open_tags:
            self._parts.append(f"</{self._open_tags.pop()}>")
        return "".join(self._parts)


def _is_safe_value(value: str) -> bool:
    """Reject attribute values carrying script/URI payloads."""
    lowered = value.strip().lower()
    if "javascript:" in lowered or "data:" in lowered:
        return False
    if "<" in value or ">" in value:
        return False
    return True


def _escape_attr(value: str) -> str:
    return value.replace("&", "&amp;").replace('"', "&quot;").replace("<", "&lt;")


def _escape_text(value: str) -> str:
    return value.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def sanitize_nutriscore_svg(raw: str | None) -> str | None:
    """Sanitize scraped Nutri-Score SVG markup.

    Returns ``None`` if the input is empty, exceeds :data:`MAX_SVG_LENGTH`, or
    contains no allowlisted content after sanitization. Otherwise returns the
    sanitized markup containing only allowlisted tags and attributes.
    """
    if not raw:
        return None
    if len(raw) > MAX_SVG_LENGTH:
        return None

    parser = _SvgSanitizer()
    parser.feed(raw)
    parser.close()
    cleaned = parser.result()

    if not cleaned or "<svg" not in cleaned:
        return None
    return cleaned
