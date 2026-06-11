"""Tests for the Nutri-Score SVG sanitizer."""

import pytest

from services.shared.lib.svg_sanitizer import (
    MAX_SVG_LENGTH,
    sanitize_nutriscore_svg,
)


@pytest.mark.unit
def test_none_and_empty_return_none():
    assert sanitize_nutriscore_svg(None) is None
    assert sanitize_nutriscore_svg("") is None


@pytest.mark.unit
def test_keeps_allowed_tags_and_attrs():
    raw = (
        '<svg xmlns="http://www.w3.org/2000/svg" class="ns" viewBox="0 0 100 50">'
        '<rect class="bg"/><path class="a"/><g class="grp">'
        '<text class="lbl">A</text></g></svg>'
    )
    out = sanitize_nutriscore_svg(raw)
    assert out is not None
    assert "<svg" in out
    assert "<rect" in out
    assert "<path" in out
    assert "<text" in out and ">A<" in out
    assert 'class="ns"' in out
    assert 'viewbox="0 0 100 50"' in out


@pytest.mark.unit
def test_strips_disallowed_attributes():
    raw = '<svg onload="alert(1)" id="x" style="color:red" class="ok"><path d="M0 0"/></svg>'
    out = sanitize_nutriscore_svg(raw)
    assert out is not None
    assert "onload" not in out
    assert "alert" not in out
    assert "id=" not in out
    assert "style" not in out
    # disallowed "d" attribute dropped, allowed "class" kept
    assert "d=" not in out
    assert 'class="ok"' in out


@pytest.mark.unit
def test_removes_script_tag():
    raw = '<svg class="ok"><script>alert(document.cookie)</script><path/></svg>'
    out = sanitize_nutriscore_svg(raw)
    assert out is not None
    assert "<script" not in out
    assert "alert" not in out


@pytest.mark.unit
def test_drops_script_text_content_outside_text_tag():
    # data outside an allowed <text> element must not be emitted
    raw = '<svg class="ok">alert(1)<path/></svg>'
    out = sanitize_nutriscore_svg(raw)
    assert out is not None
    assert "alert(1)" not in out


@pytest.mark.unit
def test_removes_foreign_object_and_image():
    raw = (
        '<svg class="ok"><foreignObject><body onclick="x()">hi</body>'
        '</foreignObject><image href="javascript:alert(1)"/><path/></svg>'
    )
    out = sanitize_nutriscore_svg(raw)
    assert out is not None
    assert "foreignObject".lower() not in out.lower()
    assert "onclick" not in out
    assert "javascript" not in out
    assert "<image" not in out


@pytest.mark.unit
def test_rejects_javascript_uri_in_allowed_attr():
    raw = '<svg class="javascript:alert(1)"><path/></svg>'
    out = sanitize_nutriscore_svg(raw)
    assert out is not None
    assert "javascript" not in out


@pytest.mark.unit
def test_rejects_data_uri_in_allowed_attr():
    raw = '<svg class="data:text/html,<script>alert(1)</script>"><path/></svg>'
    out = sanitize_nutriscore_svg(raw)
    assert out is not None
    assert "data:" not in out
    assert "<script" not in out


@pytest.mark.unit
def test_oversize_input_rejected():
    raw = "<svg class='ok'>" + ("<path/>" * 5000) + "</svg>"
    assert len(raw) > MAX_SVG_LENGTH
    assert sanitize_nutriscore_svg(raw) is None


@pytest.mark.unit
def test_no_svg_root_returns_none():
    raw = '<div class="x">no svg here</div>'
    assert sanitize_nutriscore_svg(raw) is None


@pytest.mark.unit
def test_attribute_values_are_escaped():
    raw = '<svg class="a&quot;onload=alert(1)"><path/></svg>'
    out = sanitize_nutriscore_svg(raw)
    assert out is not None
    # No raw double-quote breaking out of the attribute
    assert "onload=alert" not in out or "&quot;" in out
