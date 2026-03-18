# Nuklius

Local-first PKM + learning system for physicians — fork of [TriliumNext/Trilium](https://github.com/TriliumNext/Trilium).

> **Status:** Sprint 1 — Fork baseline and security CI setup.

---

## Architecture

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the full system overview.

---

## Clean-Clone Quickstart

### Prerequisites

- macOS (primary target), Linux (CI)
- Node.js 20.x — install via [nvm](https://github.com/nvm-sh/nvm) and run `nvm use`
- corepack (ships with Node.js 16.9+)
- xvfb (Linux/CI only, for headless Electron): `sudo apt-get install -y xvfb`

### Step 0 — One-Time Fork Setup

The Trilium source code must be added to this repo before smoke tests will pass.
Run this **once** on a fresh clone:

```bash
git remote add upstream https://github.com/TriliumNext/Trilium.git
git fetch upstream
# Review upstream CHANGELOG for breaking changes, then:
git merge upstream/main --allow-unrelated-histories
```

See [`docs/SPRINT-01.md`](docs/SPRINT-01.md) for the full fork setup runbook including
branch-protection configuration.

### Step 1 — Toolchain

```bash
corepack enable
corepack prepare --activate   # installs pnpm version from packageManager field
nvm use                        # or: node --version must be 20.x
```

### Step 2 — Install

```bash
pnpm install --frozen-lockfile
```

Expected: dependency tree installed with zero warnings about frozen lockfile mismatches.

### Step 3 — Reproducible Build

```bash
make repro-build
# or: pnpm run repro-build
```

Expected output: `PASS: Both passes produced identical checksums.`

### Step 4 — Launch Smoke Test

```bash
make smoke-launch
# or: pnpm run smoke-launch
```

Expected output: `Server: PASS (HTTP 200)`, `Desktop: PASS` (after Trilium fork is added).

### Step 5 — ETAPI Smoke Test

```bash
export ETAPI_TOKEN="<your-etapi-token>"  # See Trilium Settings → ETAPI
make smoke-etapi
# or: pnpm run smoke-etapi
```

Expected output: `ETAPI CRUD Smoke: PASS`

### Step 6 — Security Scan

```bash
make security-scan
# or: pnpm run security-scan
```

Expected output: all scanners pass with zero Critical/High findings.

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ETAPI_TOKEN` | Yes (for smoke-etapi) | Trilium ETAPI bearer token. Set in Trilium Settings → API Tokens. Never commit. |
| `TRILIUM_PORT` | No | Server port (default: 8080) |
| `TRILIUM_DATA_DIR` | No | Data directory path (default: `~/.local/share/trilium-data`) |

In CI, set `ETAPI_TOKEN` as a GitHub Actions encrypted secret.

---

## Common Failure Triage

| Failure | Likely cause | Fix |
|---------|-------------|-----|
| `apps/server not found` | Trilium fork not added | Run Step 0 (fork setup) |
| `ETAPI_TOKEN is not set` | Missing env var | `export ETAPI_TOKEN=<token>` |
| `pnpm: frozen-lockfile` | pnpm-lock.yaml out of sync | `pnpm install` (not frozen) to update, then commit lockfile |
| `corepack: wrong pnpm version` | corepack not activated | `corepack enable && corepack prepare --activate` |
| `xvfb-run not found` | headless Electron on Linux | `sudo apt-get install -y xvfb` |
| `Server TIMEOUT` | Server did not start in 60s | Check `logs/smoke-server.log` for error messages |
| Semgrep gate failure | Security finding | See `security-reports/semgrep.sarif` — remediate or add suppression with justification |
| Gitleaks gate failure | Committed secret | Rotate the credential, then rewrite git history (`git filter-branch` or `git-filter-repo`) |

---

## Scripts Reference

| Command | What it does |
|---------|-------------|
| `make repro-build` | Two-pass reproducible build with SHA256 checksum comparison |
| `make smoke-launch` | Server + Electron headless launch smoke test |
| `make smoke-etapi` | ETAPI CRUD smoke test (requires `ETAPI_TOKEN`) |
| `make security-scan` | Full local security scan suite |
| `make license-check` | Check all dependency licenses against AGPL policy |

---

## CI Workflows

| Workflow | Trigger | Artifacts |
|----------|---------|-----------|
| `repro-build.yml` | PR, push to main | `logs/repro-pass1.txt`, `repro-pass2.txt`, `repro-diff.txt` |
| `security.yml` | PR, push to main, weekly | SARIF (GitHub Security tab) + JSON in `security-reports/` |

---

## Docs

| Document | Purpose |
|----------|---------|
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | System topology, workspace ownership, data flow |
| [`docs/DECISIONS.md`](docs/DECISIONS.md) | ADR log for all major technical decisions |
| [`docs/SECURITY_BASELINE.md`](docs/SECURITY_BASELINE.md) | Scan contracts, gates, readiness markers |
| [`docs/SPRINT-01.md`](docs/SPRINT-01.md) | Sprint 1 runbook, evidence checklist, risk register |
