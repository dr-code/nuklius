# Decision Log (ADR-style)

All decisions recorded here govern the Nuklius build. Ordered chronologically within each sprint.
Each entry: decision, alternatives rejected, rationale, files affected.

---

## Sprint 1 Decisions

### ADR-001: TypeScript — All New Code

**Date:** 2026-03-18
**Status:** Accepted

**Decision:** All Nuklius-authored code is TypeScript with strict mode. Existing Trilium JavaScript
files are left as-is unless actively modified; touched files are converted to TypeScript first.

**Alternatives rejected:**
- JavaScript + JSDoc: insufficient type safety for a complex multi-process system.

**Files affected:** All `nuklius/` namespaced source files.

---

### ADR-002: Upstream Sync Policy

**Date:** 2026-03-18
**Status:** Accepted

**Decision:**
- Add `upstream` remote pointing to `https://github.com/TriliumNext/Trilium.git`.
- Merge strategy: pull `upstream` into a dedicated `upstream-sync` branch, then open a PR
  against `main`. Never rebase Nuklius history onto upstream.
- Track upstream by release tags, not HEAD.
- Upstream merges are reviewed for conflicts in `nuklius/` paths before merge.

**Alternatives rejected:**
- Rebasing onto upstream: destroys attribution trail, required by AGPL-3.0.
- No upstream tracking: makes security patch ingestion manual and error-prone.

**Files affected:** `.git/config` (remote setup), `SPRINT-01.md` (runbook)

---

### ADR-003: Package Manager — pnpm Only

**Date:** 2026-03-18
**Status:** Accepted

**Decision:** pnpm is the sole package manager. npm and yarn are prohibited in CI, scripts, and
Makefile targets. corepack pins the exact pnpm version via `packageManager` field in `package.json`.

**Alternatives rejected:**
- npm: does not understand pnpm workspace protocol.
- yarn: no benefit; additional toolchain surface.

**Files affected:** `package.json`, `.npmrc`, `.nvmrc`, all CI workflows

---

### ADR-004: Security Toolchain (Locked for All Sprints)

**Date:** 2026-03-18
**Status:** Accepted

**Decision:** The following tools are mandatory in every CI run:

| Category | Tool | Config |
|----------|------|--------|
| SAST | Semgrep | p/owasp-top-ten, p/nodejs, p/typescript |
| SAST | CodeQL | JavaScript/TypeScript |
| SAST | eslint-plugin-security | errors block merge |
| Dependency | pnpm audit | Critical/High block merge |
| Dependency | OSV-Scanner | Critical/High block merge |
| Licenses | license-policy-check.sh | AGPL-compatible policy |
| Secrets | Gitleaks | zero unapproved findings — hard gate |
| Container/FS | Trivy | filesystem scan + image scan |
| DAST | OWASP ZAP | baseline scan against Trilium, ETAPI, nuklius routes |

**Alternatives rejected:**
- Snyk: vendor lock-in; OSV-Scanner is open.
- Warning-only jobs: no enforcement, creates alert fatigue.

**Files affected:** `.github/workflows/security.yml`, `SECURITY_BASELINE.md`, `scripts/ci/`

---

### ADR-005: Security Gate Thresholds

**Date:** 2026-03-18
**Status:** Accepted

**Decision:**
- PR merge blocked by: any Critical; any High in changed code path.
- Release blocked by: any Critical or High in product scope; >2 Medium without approved
  mitigation owner + date.
- Secrets: zero unapproved Gitleaks findings — hard gate.
- All SARIF/JSON reports uploaded with `if: always()` — reports persist when gates fire.

**Alternatives rejected:**
- Blocking on Medium in CI: too noisy at sprint cadence; revisit at Gate D (Sprint 20).

**Files affected:** `.github/workflows/security.yml`, `SECURITY_BASELINE.md`

---

### ADR-006: DAST Scope — Include ZAP from Sprint 1

**Date:** 2026-03-18
**Status:** Accepted

**Decision:** OWASP ZAP baseline scan runs in Sprint 1 security CI against:
1. Trilium server HTTP routes (port 8080)
2. ETAPI routes (`/etapi/*`)
3. Custom nuklius routes (`/api/nuklius/*` — stub 404 acceptable in Sprint 1)

ZAP baseline only (no active/attack scan in CI).

**Alternatives rejected:**
- Defer ZAP to Sprint 8 (when AI routes land): baseline surface should be clean from day 1.
- Active scan: destructive, not appropriate for automated CI.

**Files affected:** `.github/workflows/security.yml`

---

### ADR-007: Node.js and pnpm Version Pinning

**Date:** 2026-03-18
**Status:** Accepted

**Decision:**
- Node.js: pin `20.x` LTS in `.nvmrc` (exact minor from Trilium's `engines` field).
- pnpm: pin exact version in `packageManager` field, enabled via `corepack enable`.
- `.npmrc`: `frozen-lockfile=true`, `strict-peer-dependencies=false` (Trilium has intentional
  peer dep warnings).

**Alternatives rejected:**
- Floating `node: 20` in CI only: local dev divergence causes environment drift.
- Specifying pnpm version in CI actions only: corepack ensures parity for local dev.

**Files affected:** `.nvmrc`, `package.json`, `.npmrc`, `.github/workflows/repro-build.yml`

---

### ADR-008: Reproducible Build — Two-Pass SHA256

**Date:** 2026-03-18
**Status:** Accepted

**Decision:** Two-pass SHA256 checksum comparison:
1. Pass 1: clean install + build, emit manifest with tool versions + per-artifact checksums.
2. Pass 2: repeat build, compare checksums; mismatch exits nonzero with diff output.

**Alternatives rejected:**
- Single-pass with manifest only: does not verify reproducibility.
- Hermetic build (Nix/Bazel): excessive toolchain change for a fork.

**Files affected:** `scripts/ci/repro-build.sh`, `.github/workflows/repro-build.yml`

---

### ADR-009: AGPL License Policy

**Date:** 2026-03-18
**Status:** Accepted

**Decision:**
- All Nuklius dependencies must be AGPL-3.0 compatible.
- CKEditor 5 core (GPL-2.0+): allowed.
- CKEditor 5 premium (slash commands, text snippets): personal use only — distributed builds
  use the open slash command implementation (Sprint 16).
- `docs/CKEDITOR_LICENSING.md` tracks exact premium feature usage policy.
- `scripts/ci/license-policy-check.sh` enforces policy with JSON output.

**Alternatives rejected:**
- MIT-only policy: blocks GPL-compatible Trilium dependencies.
- No license checks: AGPL distribution compliance is non-negotiable.

**Files affected:** `scripts/ci/license-policy-check.sh`, `docs/CKEDITOR_LICENSING.md`

---

### ADR-010: GitHub Actions SHA Pinning

**Date:** 2026-03-18
**Status:** Accepted

**Decision:** All `uses:` references pinned to immutable commit SHAs. Human-readable version
documented in inline comment. Dependabot manages SHA updates.

```yaml
# actions/checkout@v4.2.2
- uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683
```

**Alternatives rejected:**
- Floating tags (`@v4`): supply chain attack surface.
- Pinning to branch: worse than tags.

**Files affected:** All `.github/workflows/*.yml`

---

### ADR-011: Trilium Fork Setup Sequence

**Date:** 2026-03-18
**Status:** Accepted

**Decision:** Sprint 1 CI/docs infrastructure is committed first. Trilium codebase is merged
on top via:
```bash
git remote add upstream https://github.com/TriliumNext/Trilium.git
git fetch upstream
git reset --hard upstream/main   # one-time on clean repo
```
This makes our CI and docs the known-good base layer, not an afterthought.

**Alternatives rejected:**
- Starting from a GitHub fork: complicates remote tracking for `dr-code/nuklius`.
- Squashing Trilium history: violates AGPL-3.0 attribution requirement.

**Files affected:** `SPRINT-01.md` (runbook step 0)

---

## Future ADR Slots

ADR-012 and beyond are added in Sprint 2+ as decisions are made.
