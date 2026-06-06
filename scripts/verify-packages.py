#!/usr/bin/env python3
"""Verify Red Hat Trusted Libraries packages: SBOM provenance + RECORD integrity + crypto.

Usage: python scripts/verify-packages.py [--lockfile uv.lock] [site-packages-path]
Default site-packages: .venv/lib/python3.12/site-packages

Options:
  --lockfile <path>   Path to uv.lock. When provided, packages listed as
                      RHTL-sourced in the lockfile must have a redhat.spdx.json
                      SBOM — a missing SBOM is a FAIL, not a SKIP.
                      Without --lockfile, missing SBOMs are silently skipped.

Verification layers:
  1. SBOM provenance  — Red Hat creator + fromager tool in redhat.spdx.json
  2. RECORD integrity — installed file hashes match RECORD entries
  3. Attestation      — DSSE signature verified with cosign + Red Hat public key
     (requires RHTL credentials + cosign binary; gracefully skipped if unavailable)
"""

import base64
import csv
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

DEFAULT_PATH = ".venv/lib/python3.12/site-packages"
RHTL_INDEX_URL = "https://packages.redhat.com/trusted-libraries/python"
KEY_PATH = Path(__file__).parent / "redhat-release3.pub"


def verify_sbom(sbom_path: Path) -> str | None:
    try:
        data = json.loads(sbom_path.read_text())
    except (json.JSONDecodeError, OSError) as e:
        return f"invalid SBOM: {e}"

    creators = data.get("creationInfo", {}).get("creators", [])
    if not any("Organization: Red Hat" in c for c in creators):
        return "SBOM missing Red Hat creator"
    if not any("Tool: fromager" in c for c in creators):
        return "SBOM missing fromager tool"
    return None


def verify_record(site_packages: Path, dist_info: Path) -> str | None:
    record_path = dist_info / "RECORD"
    if not record_path.exists():
        return None

    with open(record_path) as f:
        for row in csv.reader(f):
            if len(row) < 2 or not row[1] or not row[1].startswith("sha256="):
                continue
            rel_path, hash_spec = row[0], row[1]
            full_path = site_packages / rel_path
            if not full_path.is_file():
                continue

            b64_hash = hash_spec.split("=", 1)[1]
            if len(b64_hash) % 4:
                b64_hash += "=" * (4 - len(b64_hash) % 4)
            expected = base64.urlsafe_b64decode(b64_hash).hex()
            actual = hashlib.sha256(full_path.read_bytes()).hexdigest()
            if expected != actual:
                return f"hash mismatch: {rel_path}"
    return None


_RHTL_REGISTRY = "https://packages.redhat.com/trusted-libraries/python"


def _normalize_name(name: str) -> str:
    return re.sub(r"[-_.]+", "-", name).lower()


def _get_rhtl_packages(lockfile_path: Path) -> set[str]:
    """Return normalized names of packages sourced from RHTL in uv.lock.

    A missing SBOM for any returned package is a build-blocking FAIL, not a skip.
    """
    try:
        import tomllib
        with open(lockfile_path, "rb") as f:
            data = tomllib.load(f)
    except Exception as exc:
        print(f"WARNING: could not parse lockfile {lockfile_path}: {exc}", file=sys.stderr)
        return set()
    return {
        _normalize_name(pkg["name"])
        for pkg in data.get("package", [])
        if pkg.get("source", {}).get("registry") == _RHTL_REGISTRY
    }


def _rhtl_credentials() -> tuple[str, str] | None:
    user = os.environ.get("UV_INDEX_RHTL_USERNAME")
    pwd = os.environ.get("UV_INDEX_RHTL_PASSWORD")
    return (user, pwd) if user and pwd else None


def _fetch_url(url: str, creds: tuple[str, str] | None = None,
               accept: str | None = None) -> bytes | None:
    req = urllib.request.Request(url)
    if accept:
        req.add_header("Accept", accept)
    if creds:
        token = base64.b64encode(f"{creds[0]}:{creds[1]}".encode()).decode()
        req.add_header("Authorization", f"Basic {token}")
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return resp.read()
    except (urllib.error.URLError, OSError):
        return None


def fetch_attestation(pkg_name: str, version: str,
                      creds: tuple[str, str]) -> dict | None:
    normalized = _normalize_name(pkg_name)
    url = f"{RHTL_INDEX_URL}/{normalized}/"
    raw = _fetch_url(url, creds, accept="application/vnd.pypi.simple.v1+json")
    if not raw:
        return None
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        return None

    for entry in data.get("files", []):
        filename = entry.get("filename", "")
        if f"-{version}-" not in filename or not filename.endswith(".whl"):
            continue
        prov = entry.get("provenance")
        if not prov:
            continue
        if isinstance(prov, dict):
            return prov
        if isinstance(prov, str):
            prov_url = prov
            if prov_url.startswith("/"):
                prov_url = f"https://packages.redhat.com{prov_url}"
            raw = _fetch_url(prov_url, creds)
            if raw:
                try:
                    return json.loads(raw)
                except json.JSONDecodeError:
                    pass
    return None


def verify_crypto(attestation: dict) -> str | None:
    bundles = attestation.get("attestation_bundles", [])
    if not bundles:
        return "no attestation bundles"
    atts = bundles[0].get("attestations", [])
    if not atts:
        return "no attestations"

    env = atts[0].get("envelope", {})
    stmt_b64 = env.get("statement", "")
    sig_b64 = env.get("signature", "")
    if not stmt_b64 or not sig_b64:
        return "missing statement or signature"

    try:
        stmt_bytes = base64.b64decode(stmt_b64)
        sig_bytes = base64.b64decode(sig_b64)
    except Exception as e:
        return f"base64 decode error: {e}"

    # DSSE Pre-Authentication Encoding
    ptype = "application/vnd.in-toto+json"
    pae = f"DSSEv1 {len(ptype)} {ptype} {len(stmt_bytes)} ".encode() + stmt_bytes

    with tempfile.TemporaryDirectory() as tmp:
        pae_path = Path(tmp) / "pae"
        sig_path = Path(tmp) / "sig"
        pae_path.write_bytes(pae)
        sig_path.write_bytes(sig_bytes)

        r = subprocess.run(
            ["cosign", "verify-blob",
             "--key", str(KEY_PATH),
             "--signature", str(sig_path),
             "--insecure-ignore-tlog=true",
             str(pae_path)],
            capture_output=True, timeout=30,
        )
        if r.returncode != 0:
            stderr = r.stderr.decode().strip()
            return f"signature invalid: {stderr}"
    return None


def main() -> int:
    # Parse args: [--lockfile <path>] [site-packages-path]
    args = sys.argv[1:]
    lockfile_path: Path | None = None
    site_packages_arg: str | None = None
    i = 0
    while i < len(args):
        if args[i] == "--lockfile" and i + 1 < len(args):
            lockfile_path = Path(args[i + 1])
            i += 2
        else:
            site_packages_arg = args[i]
            i += 1

    site_packages = Path(site_packages_arg if site_packages_arg else DEFAULT_PATH)
    if not site_packages.is_dir():
        print(f"ERROR: Directory not found: {site_packages}", file=sys.stderr)
        return 1

    rhtl_packages = _get_rhtl_packages(lockfile_path) if lockfile_path else set()

    creds = _rhtl_credentials()
    has_cosign = shutil.which("cosign") is not None
    has_key = KEY_PATH.exists()
    crypto_enabled = bool(creds) and has_cosign and has_key

    print("=== Red Hat Trusted Libraries Package Verification ===")
    print(f"Timestamp: {datetime.now(timezone.utc).isoformat()}")
    print(f"Packages:  {site_packages}")
    print(f"Lockfile:  {lockfile_path or '(not provided — RHTL-miss treated as SKIP)'}")
    print(f"RHTL pkgs: {len(rhtl_packages)} expected from RHTL per lockfile")
    print(f"Crypto:    {'enabled' if crypto_enabled else 'disabled'}")
    if not creds:
        print("  (no RHTL credentials — skipping attestation)")
    if not has_cosign:
        print("  (cosign not found — skipping signature check)")
    if not has_key:
        print(f"  (public key not found at {KEY_PATH})")
    print()

    verified = 0
    crypto_count = 0
    failed = 0
    skipped = 0

    for dist_info in sorted(site_packages.glob("*.dist-info")):
        stem = dist_info.name.removesuffix(".dist-info")
        parts = stem.split("-", 1)
        pkg_name = parts[0]
        version = parts[1] if len(parts) > 1 else ""
        sbom = dist_info / "sboms" / "redhat.spdx.json"

        if not sbom.exists():
            normalized = _normalize_name(pkg_name)
            if normalized in rhtl_packages:
                # Package is recorded as RHTL-sourced in uv.lock but has no SBOM.
                # This indicates a PyPI fallback slipped in during the build.
                print(f"FAIL  {pkg_name} (RHTL package has no SBOM — PyPI fallback?)")
                failed += 1
            else:
                print(f"SKIP  {pkg_name} (not from RHTL)")
                skipped += 1
            continue

        err = verify_sbom(sbom)
        if err:
            print(f"FAIL  {pkg_name} ({err})")
            failed += 1
            continue

        err = verify_record(site_packages, dist_info)
        if err:
            print(f"FAIL  {pkg_name} ({err})")
            failed += 1
            continue

        crypto_ok = False
        if crypto_enabled and version:
            att = fetch_attestation(pkg_name, version, creds)
            if att:
                err = verify_crypto(att)
                if err:
                    print(f"FAIL  {pkg_name} (crypto: {err})")
                    failed += 1
                    continue
                crypto_ok = True
                crypto_count += 1

        tag = "PASS+" if crypto_ok else "PASS "
        print(f"{tag} {pkg_name}")
        verified += 1

    print()
    print("=== Summary ===")
    print(f"Verified: {verified}")
    if crypto_enabled:
        print(f"  Crypto: {crypto_count}")
    print(f"Failed:   {failed}")
    print(f"Skipped:  {skipped} (PyPI packages)")

    if failed > 0:
        print()
        print(f"VERIFICATION FAILED: {failed} package(s) failed")
        return 1

    print()
    print("All RHTL packages verified successfully")
    return 0


if __name__ == "__main__":
    sys.exit(main())
