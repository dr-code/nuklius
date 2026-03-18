# Project Context — Nuklius

## Key Commands

| Command | What it does |
|---------|-------------|
| `make repro-build` / `pnpm run repro-build` | Two-pass reproducible build (SHA256 comparison) |
| `make smoke-launch` / `pnpm run smoke-launch` | Server + Electron headless launch smoke test |
| `make smoke-etapi` / `pnpm run smoke-etapi` | ETAPI CRUD smoke test (requires `ETAPI_TOKEN` env var) |
| `make security-scan` / `pnpm run security-scan` | Full local security scan suite |
| `make license-check` / `pnpm run license-check` | AGPL-compatible license policy check |

> `pnpm dev`, `pnpm test`, `pnpm build`, `pnpm typecheck` are available — Trilium fork merged (v0.95.0, PR #1).

## Sprint Status

| Sprint | Status | Gate | Notes |
|--------|--------|------|-------|
| Sprint 1 — Fork Baseline + Security CI | **CLOSED** | Pre-Gate A | TriliumNext/Notes v0.95.0 merged (PR #1); branch protection active; ETAPI_TOKEN set |
| Sprint 2 — Medical Callouts + Domain Packs | **CLOSED** | — | Domain pack loader, MedicalCalloutPlugin, nuklius-callouts.css. See docs/SPRINT-02.md |
| Sprint 3 — Block Addressing | **READY TO START** | — | Use Sprint 3 prompt in docs/SPRINT-02.md |
| ... | ... | — | |
| Sprint 7 | Not started | Gate A | No-AI baseline complete |
| Sprint 12 | Not started | Gate B | AI runtime stable |
| Sprint 14 | Not started | Gate C | Learning loop complete |
| Sprint 20 | Not started | Gate D | Release readiness |

## Feature → Doc Lookup

| Working on... | Read first |
|---------------|------------|
| Architecture, ownership, data flow | `docs/ARCHITECTURE.md` |
| Technical decisions and ADRs | `docs/DECISIONS.md` |
| Security gates, scanner contracts, ETAPI auth | `docs/SECURITY_BASELINE.md` |
| Sprint 1 runbook, fork setup, CI evidence | `docs/SPRINT-01.md` |
| Sprint 2 runbook, callout system, Sprint 3 prompt | `docs/SPRINT-02.md` |
| Domain pack JSON schema, loader, extensibility | `docs/DOMAIN_PACKS.md` |
| CKEditor callout plugin, CSS design, roundtrip | `docs/MEDICAL_CALLOUTS.md` |
| CKEditor premium licensing policy | `docs/CKEDITOR_LICENSING.md` |
| CI workflows | `.github/workflows/` |
| Smoke scripts | `scripts/smoke/` |
| CI utility scripts | `scripts/ci/` |

## Common Gotchas

- **`.npmrc` not committed:** Secrets hook blocks tool writes. Create manually on fresh clones: `frozen-lockfile=true`, `strict-peer-dependencies=false`, `prefer-workspace-packages=true`, `link-workspace-packages=true`.
- **ETAPI_TOKEN required for etapi smoke:** `export ETAPI_TOKEN=<token>` locally; GitHub Actions secret is set.
- **Node version:** `.nvmrc` pins `22.16.0` (aligned to TriliumNext upstream). Use `nvm use`.
- **All Nuklius code under `nuklius/` namespaces:** Never add custom code at Trilium root paths.
- **ZAP `continue-on-error: true`:** Still present — review and remove once ZAP baseline is established in Sprint CI.
- **pnpm only:** Never run `npm install` or `yarn` in this repo. `packageManager: pnpm@10.12.1`.
- **CI evidence URLs:** Pending Sprint 2 PR run — fill in `docs/SPRINT-01.md` evidence table after first CI run.
- **Client tests pre-existing failures:** `config.spec.ts` and other client specs fail due to bootstrap/WebSocket jsdom side effects — pre-existing before Sprint 2. Fix is Sprint 3 prerequisite.
- **Browser-level CKEditor plugin tests:** Require Chrome + WebDriverIO (WebDriver setup deferred to Sprint 3).
- **Domain pack path in prod:** `apps/server/domain-packs/medicine.json` must be copied to `dist/` — update `apps/server/package.json` copy step before first prod build.

## Reference Docs

- Full architecture: `docs/ARCHITECTURE.md`
- Architecture brief: `docs/ARCHITECTURE_SUMMARY.md`
- ADR log: `docs/DECISIONS.md`
- Security baseline: `docs/SECURITY_BASELINE.md`
- Sprint 1 runbook: `docs/SPRINT-01.md`
- CKEditor licensing: `docs/CKEDITOR_LICENSING.md`
- Sprint board (20 sprints): `nuklius-sprint-board-v2-professional.md`
- Implementation plan (master): local file — see project lead for path
