# Project Context — Nuklius

## Key Commands

| Command | What it does |
|---------|-------------|
| `make repro-build` / `pnpm run repro-build` | Two-pass reproducible build (SHA256 comparison) |
| `make smoke-launch` / `pnpm run smoke-launch` | Server + Electron headless launch smoke test |
| `make smoke-etapi` / `pnpm run smoke-etapi` | ETAPI CRUD smoke test (requires `ETAPI_TOKEN` env var) |
| `make security-scan` / `pnpm run security-scan` | Full local security scan suite |
| `make license-check` / `pnpm run license-check` | AGPL-compatible license policy check |

> Note: `pnpm dev`, `pnpm test`, `pnpm build`, `pnpm typecheck` will be available
> once the Trilium fork is merged (see `docs/SPRINT-01.md` Step 0 runbook).

## Sprint Status

| Sprint | Status | Gate | Notes |
|--------|--------|------|-------|
| Sprint 1 — Fork Baseline + Security CI | In Progress | Pre-Gate A | CI infrastructure complete; awaiting Trilium fork merge |
| Sprint 2 — Medical Callouts + Domain Packs | Not started | — | |
| Sprint 3 — Block Addressing | Not started | — | |
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
| CKEditor premium licensing policy | `docs/CKEDITOR_LICENSING.md` |
| CI workflows | `.github/workflows/` |
| Smoke scripts | `scripts/smoke/` |
| CI utility scripts | `scripts/ci/` |

## Common Gotchas

- **Trilium fork not yet merged:** `apps/`, `packages/`, `pnpm-workspace.yaml` do not exist yet.
  Smoke tests and full builds will warn/skip gracefully. Run Step 0 in `docs/SPRINT-01.md`.
- **`.npmrc` blocked by secrets hook:** Create manually — see `docs/SPRINT-01.md` Milestone 1.
- **ETAPI_TOKEN required for etapi smoke:** `export ETAPI_TOKEN=<token>` before running.
- **Node version:** `.nvmrc` pins 20.x for CI. Local dev may use newer Node (20+ is fine).
- **All Nuklius code under `nuklius/` namespaces:** Never add custom code at Trilium root paths.
- **ZAP `continue-on-error: true` in Sprint 1:** This is intentional — remove after Trilium fork merge.
- **pnpm only:** Never run `npm install` or `yarn` in this repo.

## Reference Docs

- Full architecture: `docs/ARCHITECTURE.md`
- Architecture brief: `docs/ARCHITECTURE_SUMMARY.md`
- ADR log: `docs/DECISIONS.md`
- Security baseline: `docs/SECURITY_BASELINE.md`
- Sprint 1 runbook: `docs/SPRINT-01.md`
- CKEditor licensing: `docs/CKEDITOR_LICENSING.md`
- Sprint board (20 sprints): `nuklius-sprint-board-v2-professional.md`
- Implementation plan (master): local file — see project lead for path
