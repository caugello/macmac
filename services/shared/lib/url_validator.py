import ipaddress
import logging
import socket
from urllib.parse import urlparse

logger = logging.getLogger(__name__)

BLOCKED_NETWORKS = [
    ipaddress.ip_network("127.0.0.0/8"),
    ipaddress.ip_network("10.0.0.0/8"),
    ipaddress.ip_network("172.16.0.0/12"),
    ipaddress.ip_network("192.168.0.0/16"),
    ipaddress.ip_network("169.254.0.0/16"),
    ipaddress.ip_network("::1/128"),
    ipaddress.ip_network("fc00::/7"),
    ipaddress.ip_network("fe80::/10"),
]


def validate_url(url: str, allowed_hosts: set[str] | None = None) -> str:
    parsed = urlparse(url)

    if parsed.scheme not in ("http", "https"):
        raise ValueError(f"URL scheme '{parsed.scheme}' not allowed, must be http or https")

    hostname = parsed.hostname
    if not hostname:
        raise ValueError("URL must have a hostname")

    if allowed_hosts and hostname not in allowed_hosts:
        raise ValueError(f"Host '{hostname}' not in allowed hosts")

    try:
        resolved = socket.getaddrinfo(hostname, None, socket.AF_UNSPEC, socket.SOCK_STREAM)
        for _family, _, _, _, sockaddr in resolved:
            ip = ipaddress.ip_address(sockaddr[0])
            for network in BLOCKED_NETWORKS:
                if ip in network:
                    raise ValueError(f"URL resolves to blocked network: {ip}")
    except socket.gaierror:
        raise ValueError(f"URL hostname '{hostname}' could not be resolved") from None

    return url
