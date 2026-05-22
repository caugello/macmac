#!/bin/bash
set -e

echo "Scanning dependencies for vulnerabilities..."

if ! command -v grype &> /dev/null; then
  echo "Installing grype..."
  curl -sSfL https://raw.githubusercontent.com/anchore/grype/main/install.sh | sh -s -- -b /usr/local/bin
fi

for req in requirements*.txt; do
  [ -f "$req" ] && grype "file:$req" \
    --only-fixed \
    --fail-on critical \
    --quiet
done

if [ -f frontend/package-lock.json ]; then
  grype "file:frontend/package-lock.json" \
    --only-fixed \
    --fail-on critical \
    --quiet
fi

echo "No critical vulnerabilities found"
