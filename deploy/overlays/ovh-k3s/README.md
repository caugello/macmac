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

Each later issue should add its patch to `patches:` (and any new resource files
it introduces), keeping `kustomize build` green at every step.

## Decisions baked into this migration (do not revisit here)

- **4 separate PostgreSQL instances** — kept, not consolidated (isolation).
- **NetworkPolicies** — kept as-is; k3s enforces them natively. Only the 3 rules
  selecting `network.openshift.io/policy-group: ingress` get retargeted to the
  Traefik namespace (`kube-system`) later in Phase 4.2.
- **Secrets** — never in git. The base ships placeholder Secrets
  (`CHANGE_ME_AT_DEPLOY_TIME`); real values are created out-of-band in the
  cluster (Phase 2.4).
