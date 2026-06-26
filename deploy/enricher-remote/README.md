# Remote enricher — Ansible deploy

Provisions a plain SSH-reachable VPS to run the MacMac **enricher** as a
`podman` + `systemd` (quadlet) service. Each host is an interchangeable
competing-consumer worker that pulls work from the central RabbitMQ over TLS,
scrapes + enriches, and publishes results back. The worker is **DB-free** — it
never connects to Postgres.

Deploy and version-bump are the **same operation**: change `enricher_image_tag`
and re-run the playbook. The run is idempotent — a no-change re-run reports
`changed=0`.

## Layout

```
deploy/enricher-remote/
├── playbook.yml                   # the play (install podman, render unit/env/config, start)
├── inventory.example.ini          # copy -> inventory.ini, list your VPS hosts
├── group_vars/
│   └── all.example.yml            # copy -> all.yml (vault-encrypted), fill secrets/tag
├── templates/
│   ├── enricher.container.j2      # quadlet .container unit
│   └── enricher.env.j2            # the worker's .env
└── README.md
```

## Requirements

- **Control machine:** `ansible-core` **≥ 2.18** (so the `package` module routes
  to the dnf5 backend on Fedora 41+ targets) and the `containers.podman`
  collection:
  ```bash
  ansible-galaxy collection install containers.podman
  ```
  (Only `podman_login` is used from the collection — for private images. Podman
  install, templating, and the systemd/quadlet wiring use builtin modules.)
- **Target VPS:** SSH-reachable, a recent enough OS for **quadlet** support
  (podman ≥ 4.4 — installed by the playbook). systemd-based (Debian/Ubuntu or
  RHEL/Fedora/CentOS).

## One-time setup

1. **Inventory** — copy and fill in your hosts:
   ```bash
   cp inventory.example.ini inventory.ini
   $EDITOR inventory.ini
   ```

2. **Vars** — copy, fill in, and encrypt the secrets file:
   ```bash
   cp group_vars/all.example.yml group_vars/all.yml
   $EDITOR group_vars/all.yml
   ansible-vault encrypt group_vars/all.yml
   ```
   Fill in `openai_api_key`, `rabbitmq_url` (per-location least-privilege creds),
   `rabbitmq_ca_cert` (PEM), `worker_location`, and confirm `enricher_image_tag`.
   `group_vars/all.yml` is **git-ignored** and must never be committed — only the
   `*.example.*` files are tracked.

## Deploy

Dry-run first:

```bash
ansible-playbook -i inventory.ini playbook.yml --check --ask-vault-pass
```

Then apply:

```bash
ansible-playbook -i inventory.ini playbook.yml --ask-vault-pass
```

The playbook:

1. Installs/ensures `podman` (single generic `package` task, family-agnostic).
2. (Optional) `podman login` if `registry_username`/`registry_password` are set.
3. Writes the RabbitMQ CA cert, ships the repo `config.yaml`, and renders the
   `.env` into `/etc/macmac-enricher/`.
4. Renders the quadlet unit to `/etc/containers/systemd/enricher.container`.
5. `systemctl daemon-reload`, then starts `enricher.service` — boot-enablement
   is handled by the quadlet `[Install] WantedBy=multi-user.target` section, not
   by `systemctl enable`.

## Version bump

The image tag is the single source of truth. To upgrade every host:

1. Edit `group_vars/all.yml` → set `enricher_image_tag` to the new release
   (e.g. `0.2.7`).
2. Re-run the playbook.

The unit re-renders, systemd reloads, and the service restarts. The quadlet uses
`Pull=newer`, so the new image is pulled before the container starts. No other
change is needed.

## config.yaml injection

The repo's `config.yaml` is copied to the host
(`/etc/macmac-enricher/config.yaml`) and mounted **read-only** into the container
at `/opt/app-root/src/config.yaml` — the path the enricher loads it from. This is
the simplest option: no registry/ConfigMap dependency, and the file ships
straight from the checkout you run the playbook from. After changing
`config.yaml` in the repo, re-run the playbook to push it; the change triggers a
restart.

## What the quadlet sets

- `Image=quay.io/caugello/macmac-enricher:<tag>` with `Pull=newer`
- `PodmanArgs=--shm-size=2g` (Playwright/Chromium needs a large `/dev/shm`)
- `config.yaml` mounted read-only
- RabbitMQ TLS CA cert mounted read-only (`RABBITMQ_CA_CERT_PATH` points to it)
- `Restart=always` (auto-restart on failure)
- `WantedBy=multi-user.target` via `[Install]` (start on boot)

## Environment (`.env`)

Rendered from vault vars. Variable names match exactly what the enricher reads:

| Var | Required | Source in code |
|-----|----------|----------------|
| `OPENAI_API_KEY` | yes | `services/catalog/enricher/main.py` |
| `RABBITMQ_URL` (`amqps://USER:PASS@HOST:5671/VHOST`) | yes | `services/catalog/enricher/main.py` |
| `RABBITMQ_CA_CERT_PATH` | yes (amqps) | `services/shared/lib/messaging_bus.py` |
| `RABBITMQ_TLS_SERVER_NAME` | optional (SNI) | `services/shared/lib/messaging_bus.py` |
| `WORKER_LOCATION` | yes | `services/catalog/enricher/main.py` |
| `BRIGHTDATA_PROXY_URL` | optional | `services/config.py` |

`CATALOG_DATABASE_URL` is **deliberately omitted** — the worker is DB-free.

## Logs

```bash
journalctl -u enricher -f
```

## Required egress

The VPS must be able to reach (outbound):

- **RabbitMQ** — central broker on **5671/tcp** (amqps/TLS).
- **OpenAI API** — `api.openai.com` on **443/tcp**.
- **Vendor sites** — the grocery/recipe sites the enricher scrapes, on
  **80/443**; plus the Brightdata proxy endpoint if `BRIGHTDATA_PROXY_URL` is set.
- **Container registry** — `quay.io` on **443/tcp** to pull the image.

Provisioning the VPS itself (OS install, firewall) is out of scope — this
playbook assumes an SSH-reachable host.
