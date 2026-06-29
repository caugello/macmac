# `ovh-k3s` overlay

Kustomize overlay for deploying MacMac to the **single-node k3s cluster on an
OVH VPS (Fedora 44)** — Phase 1 of the OpenShift → k3s migration.

See the migration plan (`docs/MIGRATION_OPENSHIFT_TO_K3S.md`, §5 and §9.1) for
the full rationale.

## Layout

```
deploy/
├── bases/macmac/            # portable base (the former openshift/ manifests)
│   ├── kustomization.yaml
│   ├── apps/  config/  databases/  infra/  jobs/  network/
└── overlays/
    └── ovh-k3s/             # this overlay — k3s-specific patches
        ├── kustomization.yaml
        └── README.md
```

The base stays platform-neutral so it can also feed a future **OVH Managed
Kubernetes** overlay without a rewrite. All k3s-specific changes live here in
the overlay.

## Build / render

```bash
kubectl kustomize deploy/overlays/ovh-k3s/
# or
kustomize build deploy/overlays/ovh-k3s/
```

This renders the full stack: 6 app Deployments, 2 infra Deployments
(RabbitMQ, Valkey/redis-cache), 4 PostgreSQL StatefulSets + PVCs, the
NetworkPolicies, Secrets, ConfigMaps, and the crawler/re-enrich CronJobs.

## What this overlay does (and does not) do

This scaffold (#397) only wires the overlay to the base and earmarks where each
later Phase-1 patch lands. It performs **no** conversions itself. The
`patches:` section in `kustomization.yaml` is filled in by:

| Issue | Change | Base file(s) touched |
|-------|--------|----------------------|
| **#398** | `Route` → `Ingress` (cert-manager annotations + hosts) | `bases/macmac/apps/gateway.yaml`, `apps/frontend.yaml` |
| **#399** | Resource requests/limits on every workload (plan §4 table) | all `apps/*` Deployments + `databases/*` StatefulSets + `infra/*` |
| **#400** | `local-path` StorageClass on the 4 database PVCs | `bases/macmac/databases/*-db.yaml` |
| **#401** | RabbitMQ amqps via Traefik TCP / hostPort on 5671 (TLS preserved) | `bases/macmac/infra/rabbitmq.yaml`, `network/network-policies.yaml` |
| **#405** | Delete the base placeholder Secrets so `apply -k` never clobbers the manually-managed live values | `bases/macmac/config/db-secrets.yaml`, `infra/redis.yaml` |
| **#406** | RabbitMQ `fsGroup` (read 0640 secret mounts without OpenShift's gid 0) + `Recreate` strategy (single-node hostPort 5671 can't roll) | `bases/macmac/infra/rabbitmq.yaml` |
| **#411** | Retarget ingress NetworkPolicies (gateway, frontend) from the OpenShift router to Traefik (`kube-system` AND `app.kubernetes.io/name=traefik`); drop rabbitmq's obsolete router peer; add `allow-ingress-acme-solver` so HTTP-01 challenges issue TLS | `bases/macmac/network/network-policies.yaml`, new `network-policies-k3s.yaml` |

Each later issue should add its patch to `patches:` (and any new resource files
it introduces), keeping `kustomize build` green at every step.

## Decisions baked into this migration (do not revisit here)

- **4 separate PostgreSQL instances** — kept, not consolidated (isolation).
- **NetworkPolicies** — kept as-is; k3s enforces them natively. The rules that
  selected `network.openshift.io/policy-group: ingress` are retargeted to the
  Traefik namespace (`kube-system`) AND pod (`app.kubernetes.io/name=traefik`)
  in the #411 patch block (Phase 4.2).
- **Secrets** — never in git. The base ships placeholder Secrets
  (`CHANGE_ME_AT_DEPLOY_TIME`); real values are created out-of-band in the
  cluster (Phase 2.4). See **Secrets** below.

## Secrets

Manual now, [SOPS](https://github.com/getsops/sops) later (Phase 4.3). Real
values are **never** committed. They are generated locally into the gitignored
`secrets/` directory (matched by `.gitignore`'s `secrets/` rule) and applied to
the `macmac` namespace with `kubectl apply`. The base's placeholder copies of
the data-store Secrets are deleted in this overlay (`$patch: delete`, the #405
block in `kustomization.yaml`) so a future `apply -k` cannot overwrite them.

| Secret | Keys | Source | In base? |
|--------|------|--------|----------|
| `recipes-db-secret` | `DB_USER`, `DB_PASSWORD` | generated | placeholder (delete-patched) |
| `catalog-db-secret` | `DB_USER`, `DB_PASSWORD` | generated | placeholder (delete-patched) |
| `auth-db-secret` | `DB_USER`, `DB_PASSWORD` | generated | placeholder (delete-patched) |
| `meal-plans-db-secret` | `DB_USER`, `DB_PASSWORD` | generated | placeholder (delete-patched) |
| `redis-secret` | `password` | generated | placeholder (delete-patched) |
| `macmac-app-secret` | `JWT_SECRET_KEY`, `RABBITMQ_USER`, `RABBITMQ_PASSWORD` | generated | no (referenced only) |
| `rabbitmq-tls` | `ca.crt`, `tls.crt`, `tls.key` | generated (self-signed) | no (referenced only) |
| `macmac-firebase-credentials` | `google-credentials.json` (the key name auth-api mounts at `GOOGLE_APPLICATION_CREDENTIALS`) | **external** (provided by operator) | no (referenced only) |
| `rabbitmq-definitions` | `definitions.json` (central `macmac` admin user + per-location `enricher-*` users scoped to the catalog queues `macmac.catalog.{process.entity,enrichment.results}` + their `.dlx`/`.dlq` and `amq.default`, real password hashes) | generated out-of-band | placeholder (delete-patched) |

Images are pulled from **public** Quay repositories, so no `macmac-pull-secret`
is needed.

After bootstrap, verify the namespace holds every secret:

```bash
kubectl get secrets -n macmac
```

## External amqps (remote enrichers)

Remote enricher workers connect to RabbitMQ over `amqps://…:5671` via the
hostPort bound in #401. Two things gate that path and are deliberately **not**
in this overlay because both embed enricher VPS IPs and this repo is public:

1. **NetworkPolicy** — `allow-ingress-rabbitmq-external` (a standalone, additive
   policy in gitignored `secrets/rabbitmq-external-amqps-netpol.yaml`). kube-router
   enforces NetworkPolicies, and hostPort traffic reaches the rabbitmq pod with
   the **real external source IP** (not masqueraded), so each enricher VPS needs
   an `ipBlock: <ip>/32` allow on 5671. It is a separate object so the #411
   `allow-ingress-rabbitmq` patch (an atomic-list strategic merge) never clobbers
   it. Apply after `apply -k`:

   ```bash
   kubectl apply -f deploy/overlays/ovh-k3s/secrets/rabbitmq-external-amqps-netpol.yaml
   ```

2. **Node firewalld** — 5671 is opened only to the same enricher `/32`s via a
   rich rule (not a broad `--add-port`), keeping the L4 surface pinned to known
   workers. Pinned (not `0.0.0.0/0`) is safe because the broker only ever sees
   fixed enricher VPS IPs — Brightdata is an *outbound* scraping proxy, never
   used to dial the broker. TLS + SASL + the per-enricher least-priv user remain
   the real auth gate. Add one `/32` (in both places) per new enricher VPS.

The enricher hosts themselves are provisioned and hardened by
`deploy/enricher-remote/playbook.yml` (podman quadlet service + firewalld
deny-inbound-except-SSH, key-only SSH, fail2ban, unattended security updates).
