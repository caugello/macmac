# OVH k3s host — Ansible bootstrap

Bootstraps a single OVH **Fedora 44 Server** VPS for the MacMac k3s migration.
One playbook, two concerns:

- **Harden the host** (issue #402) — sshd lockdown, firewalld default-deny,
  SELinux enforcing, fail2ban, dnf-automatic, and the Btrfs CoW mitigation.
- **Install k3s + retrieve kubeconfig** (issue #403) — official installer
  (pinned), k3s-selinux verified, kubeconfig fetched to the laptop with a
  reachable API endpoint.
- **Install cert-manager + Let's Encrypt issuers** (issue #404) — pinned
  cert-manager, then `letsencrypt-staging` and `letsencrypt-prod` ClusterIssuers
  (HTTP-01 via Traefik). Run just this play with `--tags cert-manager`.

Idempotent: a no-change re-run reports `changed=0`.

## Layout

```
deploy/ovh-k3s-host/
├── playbook.yml                  # the three plays (harden, k3s, cert-manager)
├── requirements.yml              # Galaxy collections (ansible.posix, community.general)
├── inventory.example.ini         # copy -> inventory.ini, list your VPS
├── templates/
│   └── cluster-issuers.yaml.j2   # Let's Encrypt staging + prod ClusterIssuers
├── group_vars/
│   └── all/
│       └── vars.yml.example      # copy -> vars.yml (tunables; no secrets needed)
└── README.md
```

There is **no `vault.yml`** — a single-node k3s install needs no secrets here
(no registry creds, no cluster token). If a future change adds a secret, follow
the enricher-remote vault pattern.

## Prerequisites

- **Order the VPS manually (out of scope).** Provision a Fedora 44 **Server**
  VPS at OVH — 6 vCPU / 12 GB RAM / 100 GB single disk. **Prefer requesting an
  XFS or ext4 root** at install time if the image allows; that removes the
  Btrfs/Postgres copy-on-write concern entirely. The play branches on the
  actual filesystem, so Btrfs is still handled if you end up with it.
- **SSH key access as a sudo user BEFORE running.** Create/confirm a non-root
  sudo user reachable by SSH **key**. The harden play disables
  `PasswordAuthentication` and `PermitRootLogin` — if your key is not working
  first, you will lock yourself out. The sshd drop-in is validated with
  `sshd -t` and the handler *reloads* (never restarts) sshd, so the active
  session is not dropped.
- **Control machine:** `ansible-core` ≥ 2.18 (dnf5 backend on Fedora 41+) plus
  the Galaxy collections:
  ```bash
  ansible-galaxy collection install -r requirements.yml
  ```

## One-time setup

```bash
cp inventory.example.ini inventory.ini
$EDITOR inventory.ini                       # your host + sudo ansible_user

cp group_vars/all/vars.yml.example group_vars/all/vars.yml
$EDITOR group_vars/all/vars.yml             # k3s_api_endpoint, expose_amqps, fail2ban_*, kubeconfig_local_path, acme_email
```

Set `acme_email` to a valid address — Let's Encrypt sends expiry notices there.
The ClusterIssuer manifests are rendered from this value, so the email never
needs to live in a committed file.

Set `k3s_api_endpoint` to the VPS public IP or DNS name — it replaces the
loopback in the fetched kubeconfig so `kubectl` works from the laptop.

## Run

```bash
ansible-playbook -i inventory.ini playbook.yml --syntax-check   # static check
ansible-playbook -i inventory.ini playbook.yml --check          # dry-run
ansible-playbook -i inventory.ini playbook.yml                  # apply
```

## k3s defaults are intentional

The installer is run **without** `--disable traefik`, `--disable servicelb`, or
`--disable local-storage`. The `deploy/overlays/ovh-k3s` manifests depend on the
bundled **Traefik** ingress, **ServiceLB** (LoadBalancer), and the
**local-path** provisioner (PVCs). Do not strip them.

## Post-run verification (maps to the issues' Done-When)

On the host:

```bash
getenforce                                           # Enforcing                (#402)
sudo firewall-cmd --list-all                         # ssh/http/https [+5671]   (#402)
systemctl is-active fail2ban dnf-automatic.timer k3s # all active               (#402, #403)
rpm -q k3s-selinux                                   # installed                (#403)
findmnt -no FSTYPE /                                  # confirm fs / Btrfs branch (#402)
```

From the laptop:

```bash
kubectl --kubeconfig ~/.kube/config-macmac-k3s get nodes    # node Ready        (#403)
kubectl --kubeconfig ~/.kube/config-macmac-k3s run -it --rm debug \
  --image=busybox --restart=Never -- nslookup kubernetes.default   # DNS works  (#403)
kubectl --kubeconfig ~/.kube/config-macmac-k3s -n cert-manager get pods   # Running (#404)
kubectl --kubeconfig ~/.kube/config-macmac-k3s get clusterissuer          # both Ready (#404)
```

End-to-end issuance is verified when the annotated gateway/frontend Ingress
objects come up: cert-manager solves HTTP-01 and writes the `*-tls` Secrets.
While iterating, point an Ingress at `letsencrypt-staging` first to avoid the
Let's Encrypt prod rate limit, then switch the annotation to `letsencrypt-prod`.

## Btrfs branch

The play detects the root filesystem with `findmnt -no FSTYPE /`. On **XFS or
ext4** it does nothing (no CoW issue). On **Btrfs** it creates
`/var/lib/rancher/k3s/storage` *while empty* and applies `chattr +C` there
**before** k3s writes any PVC — `+C` only affects files created afterwards, so
ordering is load-bearing — and best-effort disables snapper timeline snapshots
for the root subvolume to stop deleted PVC/etcd blocks pinning disk on the
single disk.
