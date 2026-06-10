#!/usr/bin/env bash
# Verify base container image signatures and attestations before build.
#
# Usage: scripts/verify-base-images.sh [Dockerfile]
# Default Dockerfile: ./Dockerfile
#
# Parses every FROM and COPY --from= line carrying an @sha256: digest,
# deduplicates by image reference, and verifies each image:
#
#   registry.access.redhat.com/*:
#     Conforma (ec validate image) verifies three layers in one pass:
#       1. builtin.image.signature_check       — image signed by publisher
#       2. builtin.attestation.signature_check  — SLSA provenance + SBOMs signed
#       3. builtin.attestation.syntax_check     — in-toto attestation structure valid
#     --ignore-rekor: upstream Rekor instance is not in cosign's default
#     trusted root; key verification itself is sound.
#
#   ghcr.io/astral-sh/*:
#     gh attestation verify — full Sigstore SLSA provenance via GitHub
#
# Exits 0 only if ALL checks pass; exits 1 on any failure (fail-closed).
set -euo pipefail

CONTAINERFILE="${1:-./Dockerfile}"
KEY_PATH="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/redhat-release3.pub"

if [ ! -f "$CONTAINERFILE" ]; then
  echo "ERROR: Dockerfile not found: $CONTAINERFILE" >&2
  exit 1
fi

echo "=== Base Image Signature & Attestation Verification ==="
echo "Dockerfile: $CONTAINERFILE"
echo "Key:           $KEY_PATH"
echo

mapfile -t IMAGES < <(
  awk '
    /@sha256:/ {
      for (i = 1; i <= NF; i++) {
        if ($i ~ /@sha256:/) {
          ref = $i
          sub(/^--from=/, "", ref)
          print ref
        }
      }
    }
  ' "$CONTAINERFILE" | sort -u
)

if [ "${#IMAGES[@]}" -eq 0 ]; then
  echo "ERROR: no @sha256:-pinned images found in $CONTAINERFILE" >&2
  exit 1
fi

verified=0
failed=0

for image in "${IMAGES[@]}"; do
  case "$image" in
    registry.access.redhat.com/*)
      # Conforma verifies image signature + attestation signature (SLSA
      # provenance and SBOMs) + attestation syntax in a single pass.
      ec_output=$(ec validate image \
        --image "$image" \
        --public-key "$KEY_PATH" \
        --ignore-rekor \
        --output text 2>&1) || true
      if echo "$ec_output" | grep -q '^Success: true'; then
        successes=$(echo "$ec_output" | sed -n 's/.*Successes: \([0-9]*\).*/\1/p' | head -1)
        echo "PASS  $image (ec: ${successes} checks — signature + SLSA provenance + SBOM)"
        verified=$((verified + 1))
      else
        echo "FAIL  $image"
        echo "$ec_output" | grep -E '(Violation|Error|FAIL)' | sed 's/^/      /'
        failed=$((failed + 1))
      fi
      ;;
    ghcr.io/astral-sh/*)
      gh_output=$(gh attestation verify "oci://$image" --owner astral-sh 2>&1) && {
        echo "PASS  $image (GitHub SLSA provenance)"
        verified=$((verified + 1))
      } || {
        echo "FAIL  $image (GitHub attestation verification failed)"
        echo "$gh_output" | sed 's/^/      /'
        failed=$((failed + 1))
      }
      ;;
    *)
      echo "FAIL  $image (no verification method configured)"
      failed=$((failed + 1))
      ;;
  esac
done

echo
echo "=== Summary ==="
echo "Verified: $verified"
echo "Failed:   $failed"

if [ "$failed" -gt 0 ]; then
  echo
  echo "VERIFICATION FAILED: $failed image(s) failed"
  exit 1
fi

echo
echo "All base images verified successfully"
exit 0
