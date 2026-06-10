"""Unit tests for SSRF protection in services.shared.lib.url_validator."""

import socket
from unittest.mock import patch

import pytest

# Import a name from services.catalog.crud so the module is registered as a
# submodule attribute, allowing the autouse mock_all_caches fixture in
# conftest.py to patch services.catalog.crud.cache when this file is collected
# before any other catalog test.
from services.catalog.crud import get_catalog_item  # noqa: F401
from services.shared.lib.url_validator import validate_url


def _getaddrinfo_returning(ip: str):
    """Build a fake socket.getaddrinfo result resolving to the given IP."""

    def _fake(host, port, family=0, type=0, proto=0, flags=0):
        return [(socket.AF_INET, socket.SOCK_STREAM, 0, "", (ip, 0))]

    return _fake


@pytest.mark.unit
def test_valid_external_url_passes() -> None:
    with patch(
        "services.shared.lib.url_validator.socket.getaddrinfo",
        _getaddrinfo_returning("93.184.216.34"),
    ):
        assert validate_url("https://example.com/page") == "https://example.com/page"


@pytest.mark.unit
def test_non_http_scheme_rejected() -> None:
    with pytest.raises(ValueError, match="scheme"):
        validate_url("ftp://example.com/resource")


@pytest.mark.unit
def test_url_without_hostname_rejected() -> None:
    with pytest.raises(ValueError, match="hostname"):
        validate_url("http:///no-host")


@pytest.mark.unit
def test_localhost_rejected() -> None:
    with patch(
        "services.shared.lib.url_validator.socket.getaddrinfo",
        _getaddrinfo_returning("127.0.0.1"),
    ):
        with pytest.raises(ValueError, match="blocked network"):
            validate_url("http://localhost/admin")


@pytest.mark.unit
@pytest.mark.parametrize("ip", ["10.0.0.5", "172.16.0.1", "192.168.1.10"])
def test_internal_ipv4_rejected(ip: str) -> None:
    with patch(
        "services.shared.lib.url_validator.socket.getaddrinfo",
        _getaddrinfo_returning(ip),
    ):
        with pytest.raises(ValueError, match="blocked network"):
            validate_url("http://internal-service/")


@pytest.mark.unit
def test_metadata_endpoint_rejected() -> None:
    with patch(
        "services.shared.lib.url_validator.socket.getaddrinfo",
        _getaddrinfo_returning("169.254.169.254"),
    ):
        with pytest.raises(ValueError, match="blocked network"):
            validate_url("http://metadata.internal/latest/meta-data/")


@pytest.mark.unit
def test_unresolvable_hostname_rejected() -> None:
    def _raise(*args, **kwargs):
        raise socket.gaierror("name resolution failed")

    with patch("services.shared.lib.url_validator.socket.getaddrinfo", _raise):
        with pytest.raises(ValueError, match="could not be resolved"):
            validate_url("http://does-not-exist.invalid/")


@pytest.mark.unit
def test_private_ipv6_rejected() -> None:
    with patch(
        "services.shared.lib.url_validator.socket.getaddrinfo",
        _getaddrinfo_returning("fc00::1"),
    ):
        with pytest.raises(ValueError, match="blocked network"):
            validate_url("http://internal-ipv6/")
