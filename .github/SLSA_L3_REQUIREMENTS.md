# GitHub Actions Build Isolation — SLSA Level 3 Requirements

**Status:** Verified | **Date:** 2026-06-06 | **Scope:** MacMac CI/CD pipeline

This document records the build isolation guarantees provided by GitHub Actions for MacMac's container image builds and maps them to [SLSA Level 3](https://slsa.dev/spec/v1.0/levels#build-l3) requirements.

---

## SLSA L3 Build Requirements

SLSA Level 3 requires that:

1. The build platform is **isolated** — builds cannot influence each other.
2. The provenance is **unforgeable** — user-controlled steps cannot write provenance.
3. All **external parameters** are recorded in provenance.
4. The build is **parameterized** — source and entrypoint are fully specified.

---

## GitHub Actions Isolation Guarantees

### Ephemeral VM per job

Each job runs in a fresh virtual machine (Ubuntu 22.04) provisioned by GitHub. The VM is:
- Created from a known base image immediately before the job starts.
- Destroyed after the job completes.
- Never reused across jobs, workflows, or repositories.

**Threat mitigated:** Persistent malware, leftover secrets, or modified toolchain from a prior build.

### No cross-build interference

Matrix jobs in `build-and-push.yaml` run on independent VMs. A compromised or failing `macmac-crawler` job cannot read memory, environment variables, or filesystem artifacts from the `macmac-auth` job running concurrently.

**Threat mitigated:** Lateral movement between build targets; secret exfiltration via shared process space.

### Secrets are injected at runtime — never baked in

OIDC tokens (`id-token: write`) and registry credentials (`REGISTRY_PASSWORD`) are injected into the runner environment at job execution time and are not accessible to other jobs or forks.

`COSIGN_EXPERIMENTAL: "1"` uses GitHub OIDC for keyless signing — the Cosign private key never exists on the runner. Signing is delegated to Fulcio/Rekor in the Sigstore public instance.

**Threat mitigated:** Long-lived key compromise; key leakage via build logs or artifact uploads.

### Provenance generated in GitHub control plane

`actions/attest-build-provenance` runs as a GitHub-controlled action. The provenance payload is generated and signed by GitHub's attestation service — user build steps cannot modify or forge it.

**Threat mitigated:** Build-step provenance forgery; TOCTOU attacks on the provenance payload.

### Network is logged, not blocked

GitHub Actions does not block outbound network access. All network requests are observable via GitHub's audit log but are not recorded in provenance.

**Gap:** Outbound network calls from build steps (e.g., uv package installs) are not enumerated in provenance `resolvedDependencies`. Hermetic builds (Task #15) will close this gap by pre-fetching dependencies and building with `--network=none`.

---

## Cache Isolation

`actions/cache` namespaces cache entries by repository, branch, and cache key. GitHub's cache restoration order is:
1. Current branch exact-key match
2. Current branch `restore-keys` prefix match
3. Default branch matches (as fallback)

**This is NOT a trust boundary between PRs and the release build path.** PR runs can create cache entries that the post-merge main-branch build later restores:

- `test.yaml` and `frontend.yaml` use `enable-cache: true` for uv/npm dependency caches. A PR run primes the cache under the PR branch's scope; once the PR is merged, the same cache key on main is populated (or the main build falls back to the PR-populated entry via the shared key).
- Grype/Trivy vulnerability DB caches use weekly keys (`grype-db-Linux-2026-23`). A malicious internal PR run this week creates a poisoned DB cache under the same key the build-and-push job will restore — suppressing CVE findings for up to 7 days.

**Gap (unmitigated, tracked in Task #18):** The release build path (`build-and-push.yaml`) must not restore caches written by untrusted PR runs for any security-critical step (scanner DBs, dependency resolution). Until Task #18 is resolved, the `build-and-push.yaml` scan steps do not carry a cache-integrity guarantee. Weekly rotation (`date +%Y-%U`) bounds the exposure window but does not eliminate the attack surface.

**Requirement:** When Task #18 is implemented, the release build must either: (a) use a separate cache namespace inaccessible to PR runs, or (b) skip cache restoration for vulnerability DB steps and always re-download.

---

## Threats and Mitigations Summary

| Threat | Mitigation | Status |
|---|---|---|
| Persistent malware across builds | Ephemeral VM — destroyed after each job | ✅ Satisfied |
| Lateral movement between matrix jobs | Independent VMs, no shared process space | ✅ Satisfied |
| Secret exfiltration via shared state | OIDC keyless signing, runtime-only injection | ✅ Satisfied |
| Provenance forgery by build step | Provenance generated in GH control plane | ✅ Satisfied |
| Tag-swap supply chain attack | All base images pinned to `@sha256:` digests | ✅ Satisfied |
| Stale CVE DB suppressing new findings | Weekly cache rotation on `date +%Y-%U` key | ✅ Satisfied |
| Scanner bypass race (job cancellation) | SARIF gate — fails build if SARIF missing | ✅ Satisfied |
| Cache poisoning via PRs | Workflow-scoped cache keys (`grype-db-build-*`, `trivy-db-build-*`) — only `build-and-push.yaml` writes these | ✅ Satisfied (Task #18) |
| Outbound network calls not in provenance | Hermetic builds with `--network=none` | ❌ Open (Task #15) |

---

## Workflows Covered

| Workflow | Runner | Isolation |
|---|---|---|
| `build-and-push.yaml` | `ubuntu-22.04` (GitHub-hosted) | Ephemeral VM, OIDC keyless signing |
| `test.yaml` | `ubuntu-22.04` | Ephemeral VM |
| `pr-security-checks.yaml` | `ubuntu-latest` | Ephemeral VM |
| `vulnerability-monitoring.yaml` | `ubuntu-latest` | Ephemeral VM |

All runners are GitHub-hosted (shared infrastructure). MacMac does not use self-hosted runners.

**Note:** GitHub-hosted runners satisfy SLSA L3 isolation requirements per [GitHub's SLSA documentation](https://docs.github.com/en/actions/security-for-github-actions/using-artifact-attestations/using-artifact-attestations-and-reusable-workflows-to-achieve-slsa-v1-build-level-3). Self-hosted runners require additional hardening to meet the same bar.

---

## Provenance Contents

Each produced image carries attestations anchored to its registry digest (`quay.io/caugello/<image>@sha256:<digest>`):

1. **`actions/attest-build-provenance`** — SLSA v1 provenance containing:
   - Source commit SHA and repository URL
   - Workflow run ID, trigger event, and branch
   - GitHub Actions runner environment

2. **Base image digest attestation** (predicate type: `https://macmac.dev/base-images/v1`) — JSON object listing each external `FROM` image reference and its `sha256` digest, captured at build time and signed with Cosign keyless.

3. **SBOM** (`actions/attest`, `sbom-path`) — SPDX JSON listing all packages in the built image. Generated with Syft and pushed to the registry as an OCI referrer (`push-to-registry: true`) so it is retrievable directly from the image digest.

All attestations are verifiable with:
```bash
cosign verify-attestation \
  --certificate-identity-regexp "https://github.com/caugello/macmac/.*" \
  --certificate-oidc-issuer "https://token.actions.githubusercontent.com" \
  quay.io/caugello/<image>@sha256:<digest>
```

### Python dependency integrity (Task #16 — implemented)

The Dockerfile was updated to close the verify-vs-ship gap:

1. **Locked install**: each builder stage now runs `uv export --frozen --no-emit-project [--extra ...]` to generate a hash-pinned requirements file from `uv.lock`, then installs with `uv pip install --require-hashes`. Hash mismatches fail the build at install time.

2. **RHTL verification in build**: `scripts/verify-packages.py` is COPY'd into the builder stage and executed after each install, verifying SBOM provenance (Red Hat creator + fromager tool) and RECORD integrity (installed file hashes vs RECORD entries). Failures abort the build. Note: the DSSE signature layer (cosign verify-blob) requires the cosign binary, which is not present in the builder images — it runs as a CI test gate in `test.yaml` where cosign-installer has run. The build enforces 2 of 3 layers: (a) hash-pinned install (`--require-hashes`) and (b) SBOM provenance + RECORD integrity. The signature layer is a defense-in-depth CI check, not a build-time gate.

3. **RHTL-vs-PyPI discrimination**: `verify-packages.py` now accepts `--lockfile uv.lock`. When provided, it reads the lock file to determine which packages are expected from RHTL; a missing RHTL SBOM is a build-blocking `FAIL` instead of a silent `SKIP`. PyPI-sourced packages (6 of 87 in the current lockfile) continue to SKIP.

The SBOM and SLSA provenance attestations now reflect a dependency set that was verified against the lockfile at build time.

---

## Related

- [SLSA L3 spec](../specs/slsa-l3.md) — full implementation roadmap
- [CI/CD security remediation](../specs/ci-security-remediation.md) — detailed findings and fixes
- Task #15 — hermetic builds (closes network gap, P3)
- Task #16 — Python dep integrity in build (closes provenance gap, P1 — shippable now)
- Task #18 — cache poisoning hardening (closes cache trust gap)
