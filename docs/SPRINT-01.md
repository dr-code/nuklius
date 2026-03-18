# Sprint 1 — Fork Baseline and Security CI

**Sprint objective:** Establish reproducible fork baseline, CI baseline, and security pipeline.
**Duration:** 2 weeks
**Total estimate:** 44 SP

---

## Sprint Summary

| Item | Value |
|------|-------|
| Objective | Reproducible build + security CI + core docs |
| Epics | Fork and environment bootstrap, Security CI baseline, Architecture and decision records |
| Dependency tags | DEP-CORE, DEP-SECURITY |
| Risk flags | R-FORK-DRIFT, R-SECURITY |
| Gate | None (Sprint 1 is pre-Gate A) |

---

## Step 0 — One-Time Fork Setup (Manual Prerequisite)

Before any CI will fully pass, you must add Trilium source code to this repo.

### 0.1 — Add upstream remote

```bash
cd /path/to/nuklius
git remote add upstream https://github.com/TriliumNext/Trilium.git
git fetch upstream
```

### 0.2 — Review upstream CHANGELOG

- Check TriliumNext/Trilium releases for the target tag.
- Identify any breaking changes in `apps/`, `packages/`, or `pnpm-workspace.yaml`.

### 0.3 — Merge Trilium source

```bash
git checkout -b upstream-merge/v$(TRILIUM_VERSION)
git merge upstream/$(TRILIUM_TAG) --allow-unrelated-histories
# Resolve any conflicts — Nuklius files take precedence over Trilium files at the same path
git push origin upstream-merge/v$(TRILIUM_VERSION)
# Open PR against main for review
```

> Note: All conflicts in `nuklius/` paths are resolved in favor of Nuklius code.
> All conflicts in shared Trilium paths require individual review.

### 0.4 — Update .nvmrc and packageManager

After merging Trilium, check Trilium's `package.json` for its `engines` field and update
`.nvmrc` and `packageManager` to match (or pin a compatible version).

### 0.5 — Configure branch protection on main

Manually configure in GitHub repository settings → Branches:
- [ ] Require pull request reviews (at least 1 approval)
- [ ] Require status checks to pass: `repro-build`, `sast-semgrep`, `sast-codeql`, `secrets-scan`, `dependency-audit`
- [ ] Block direct pushes to main
- [ ] Block force pushes to main
- [ ] Dismiss stale PR approvals when new commits are pushed

---

## Milestone 1: Toolchain and Environment (Days 1–3)

- [x] `.nvmrc` pinned to Node.js 20
- [x] `packageManager` field in `package.json` for pnpm corepack
- [x] `.npmrc` configured (frozen-lockfile, strict-peer-dependencies=false)
  - Note: `.npmrc` creation blocked by secrets hook — create manually:
    ```
    frozen-lockfile=true
    strict-peer-dependencies=false
    prefer-workspace-packages=true
    link-workspace-packages=true
    ```
- [x] `.gitignore` patched: *.db, .tessera/, logs/, security-reports/, out/, app-out/
- [x] `Makefile` with thin wrappers for all CI script targets
- [ ] Trilium fork merged (Step 0 prerequisite — requires manual execution)
- [ ] `pnpm install --frozen-lockfile` completes without errors on clean clone

**Evidence:** `pnpm install` log from CI run

---

## Milestone 2: Docs Baseline (Days 2–4)

- [x] `docs/ARCHITECTURE.md` — full system topology, workspace ownership, data flow, phase gates
- [x] `docs/DECISIONS.md` — ADR-001 through ADR-011, Sprint 1 decisions
- [x] `docs/SECURITY_BASELINE.md` — readiness markers, ETAPI token policy, severity gates, artifact policy, per-scanner contracts
- [x] `README.md` — clean-clone quickstart, env vars, failure triage, scripts reference

**Evidence:** Files committed, linked from README

---

## Milestone 3: Reproducible Build (Days 3–5)

- [x] `scripts/ci/repro-build.sh` — clean/install/build two-pass SHA256 comparison
- [x] `.github/workflows/repro-build.yml` — pinned SHAs, corepack, frozen install, artifact upload
- [ ] CI run succeeds after Trilium fork is added

**Evidence:** CI workflow run URL with green repro-build job, artifact containing `repro-pass1.txt` and `repro-pass2.txt` with matching checksums

---

## Milestone 4: Smoke Tests (Days 4–6)

- [x] `scripts/smoke/launch-smoke.sh` — server + Electron headless, readiness polling, log capture
- [x] `scripts/smoke/etapi-crud-smoke.sh` — ETAPI_TOKEN env guard, EXIT trap, CRUD + status assertions
- [ ] Server launch smoke passes (requires Trilium fork)
- [ ] ETAPI CRUD smoke passes (requires Trilium fork + ETAPI_TOKEN secret)

**Evidence:** CI run URL with green smoke jobs; `logs/smoke-server.log` and `logs/smoke-etapi.log` artifacts

---

## Milestone 5: Security CI (Days 5–10)

- [x] `.github/workflows/security.yml` — all 7 jobs with pinned SHAs and SARIF/JSON artifact upload
- [x] `scripts/ci/license-policy-check.sh` — AGPL policy enforcement with JSON output
- [x] `.github/dependabot.yml` — pnpm + Actions with weekly grouping
- [x] `.zap/` directory for ZAP configuration
- [ ] All security jobs green or triaged (requires Trilium fork)
- [ ] Zero Gitleaks findings confirmed
- [ ] ZAP baseline report uploaded

**Evidence:** CI run URL with all security job artifacts in `security-reports/`

---

## Risk Register

| Risk | Severity | Likelihood | Mitigation |
|------|----------|-----------|------------|
| R-FORK-DRIFT: Trilium upstream breaking changes | High | Medium | Pin upstream by release tag, not HEAD; upstream-sync PR process (ADR-002) |
| R-SECURITY: Trilium dependencies have known CVEs | Medium | Medium | pnpm audit + OSV-Scanner gate blocks merge immediately; triage in first CI run |
| CI action SHA pinning drift | Low | Low | Dependabot manages weekly SHA updates |
| xvfb not available in CI | Low | Low | `sudo apt-get install -y xvfb` in workflow; documented in README triage |
| .npmrc secrets hook block | Low | Already occurred | Create `.npmrc` manually; documented in SPRINT-01.md milestone |

---

## Acceptance Tests

| Test | Pass Criteria |
|------|--------------|
| Clean clone runbook | `corepack enable && pnpm install --frozen-lockfile` succeeds |
| Repro build | Two-pass SHA256 comparison passes; `repro-diff.txt` is empty |
| Server launch smoke | `curl http://localhost:8080` returns HTTP 200 within 60s |
| Desktop launch smoke | Electron process reaches readiness within 90s |
| ETAPI CRUD | Create → Read (title verified) → Update → Delete succeeds; test note not present after cleanup |
| Semgrep | Zero Critical/High findings |
| CodeQL | Zero Critical/High findings |
| Gitleaks | Zero findings |
| pnpm audit | Zero Critical/High CVEs |
| License check | Zero AGPL-incompatible licenses |
| ZAP baseline | Report generated; zero Fail-level alerts |

---

## Done Criteria

Sprint 1 is complete when:
1. All acceptance tests above pass in CI.
2. Branch protection rules are configured on `main`.
3. `docs/SPRINT-01.md` is updated with CI run URLs as evidence.
4. `/handoff` is run and Sprint 2 prompt is ready.

---

## Rollback Plan

- CI wiring: revert `.github/workflows/` changes only — does not affect app code.
- Fork merge: `git revert` the upstream merge commit — restores pre-Trilium state.
- Smoke scripts: safe to revert — they are read-only against the running server.

---

## Release Impact

None — Sprint 1 is foundation only. No user-visible features.

---

## Mandatory End-of-Sprint Actions

1. Run `/mdd` and update: `docs/ARCHITECTURE.md`, `docs/DECISIONS.md`, `docs/SECURITY_BASELINE.md`, `docs/SPRINT-01.md`
2. Run code review and security review (all 7 CI jobs); auto-fix High/Critical findings.
3. Run `/handoff` with: completed vs planned, findings, fixes applied, residual risks, Sprint 2 prompt.

---

## CI Evidence Links

> Fill these in after CI runs are complete:

| Job | Status | Run URL | Artifact |
|-----|--------|---------|---------|
| repro-build | PENDING | — | — |
| sast-semgrep | PENDING | — | — |
| sast-codeql | PENDING | — | — |
| sast-eslint | PENDING | — | — |
| dependency-audit | PENDING | — | — |
| license-policy | PENDING | — | — |
| secrets-scan | PENDING | — | — |
| container-fs-scan | PENDING | — | — |
| dast-zap | PENDING | — | — |
| smoke-launch | PENDING | — | — |
| smoke-etapi | PENDING | — | — |

---

## Sprint 1 Closure Evidence

> Updated 2026-03-18 during sprint1-blockers execution.

### Pre-Merge Baseline (2026-03-18)

| Item | Value |
|------|-------|
| Branch | `main` |
| HEAD SHA | `0b0966d88ac3199e1d1463cb6977669352eda8d8` |
| HEAD message | `chore: merge Claude Code Starter Kit infrastructure` |
| Git status | Untracked: `.github/`, `.nvmrc`, `.zap/`, `Makefile`, `README.md`, `docs/CKEDITOR_LICENSING.md`, `docs/SECURITY_BASELINE.md`, `docs/SPRINT-01.md`, `nuklius-sprint-board-v2-professional.md`, `package.json`, `pnpm-lock.yaml`, `scripts/`. Modified: `.gitignore`, `docs/ARCHITECTURE.md`, `docs/ARCHITECTURE_SUMMARY.md`, `docs/DECISIONS.md`, `docs/PROJECT_CONTEXT.md` |
| Remotes | None configured |
| `.npmrc` | PENDING — create manually (blocked by secrets hook) |

### Fork Merge Record

| Item | Value |
|------|-------|
| Upstream remote | PENDING |
| TRILIUM_VERSION tag | `v0.95.0` (latest stable as of 2026-03-18; confirmed via `git tag -l` after `git fetch upstream --tags`) |
| Integration branch | `upstream-merge/v0.95.0` |
| Merge commit SHA | `d6c6cc368` (merge) + `0c23e0e3e` (lockfile update) |
| PR URL | https://github.com/dr-code/nuklius/pull/1 |
| Merge to main SHA | PENDING — merge PR after CI passes |

### CI Run Evidence

> To be filled after first CI run on integration branch PR.

| Job | Status | Run URL |
|-----|--------|---------|
| repro-build | PENDING | — |
| sast-semgrep | PENDING | — |
| sast-codeql | PENDING | — |
| secrets-scan | PENDING | — |
| dependency-audit | PENDING | — |
| smoke-launch | PENDING | — |
| smoke-etapi | PENDING | — |

### Branch Protection Configuration

| Setting | Value |
|---------|-------|
| Required reviews | 1 approving review minimum |
| Required status checks | `repro-build`, `sast-semgrep`, `sast-codeql`, `sast-eslint`, `dependency-audit`, `license-policy`, `secrets-scan`, `container-fs-scan`, `dast-zap` (verified from `.github/workflows/` job definitions) |
| Force-push blocked | Yes |
| Configured date | PENDING — configure after PR merge |

### Sprint 1 Closure Statement

> To be signed off after all above rows are filled and branch protection is active:
>
> Sprint 1 blockers are closed. Sprint 2 (medical callouts + domain-pack schema) may begin.

---

## Sprint 2 Ready-to-Run Prompt

```
You are executing Nuklius Sprint 2 from the approved sprint board at
nuklius-sprint-board-v2-professional.md (repo root).

Sprint 1 is complete. Sprint 2 objective: implement medicine-first callouts via the
profession-extensible domain-pack model.

Engineering tasks:
- packages/ckeditor5/src/plugins/nuklius/medical_callout.ts: Pearl, Warning, Mnemonic, Tip plugins
- apps/client: callout styles and rendering
- apps/server: domain-pack config loader
- docs/DOMAIN_PACKS.md and docs/MEDICAL_CALLOUTS.md

Acceptance tests:
- Callouts roundtrip correctly (insert/render/edit/save/reload)
- Web read-only rendering passes
- Domain pack loads medicine defaults without code edits

Dependency tags: DEP-EDITOR, DEP-DOMAIN-PACKS
Risk flags: R-DOMAIN-GENERALIZATION
Estimate: 42 SP

Run /build with the Sprint 2 task.
Mandatory end-of-sprint: /mdd (docs/DOMAIN_PACKS.md, docs/MEDICAL_CALLOUTS.md, docs/SPRINT-02.md),
code/security review + auto-fix High/Critical, /handoff with Sprint 3 prompt.
```
