#!/bin/bash
set -e

IMAGE=$1

if [ -z "$IMAGE" ]; then
  echo "Usage: $0 <image>"
  echo "Example: $0 quay.io/caugello/macmac-gateway:latest"
  exit 1
fi

echo "Verifying image: $IMAGE"
echo ""

echo "1. Verifying image signature..."
cosign verify \
  --certificate-identity-regexp="https://github.com/caugello/macmac/.*" \
  --certificate-oidc-issuer="https://token.actions.githubusercontent.com" \
  "$IMAGE" || { echo "Signature verification failed"; exit 1; }
echo "Signature valid"
echo ""

echo "2. Verifying SLSA provenance..."
cosign verify-attestation \
  --type slsaprovenance \
  --certificate-identity-regexp="https://github.com/caugello/macmac/.*" \
  --certificate-oidc-issuer="https://token.actions.githubusercontent.com" \
  "$IMAGE" || { echo "Provenance verification failed"; exit 1; }
echo "Provenance valid"
echo ""

echo "3. Extracting and scanning SBOM..."
cosign verify-attestation \
  --type spdx \
  --certificate-identity-regexp="https://github.com/caugello/macmac/.*" \
  --certificate-oidc-issuer="https://token.actions.githubusercontent.com" \
  "$IMAGE" | jq -r '.payload' | base64 -d | jq '.predicate' > image-sbom.spdx.json

grype sbom:image-sbom.spdx.json --fail-on critical
rm -f image-sbom.spdx.json
echo "No critical vulnerabilities in SBOM"
echo ""

echo "Image verification complete - all checks passed!"
