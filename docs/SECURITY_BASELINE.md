# Security Baseline

Defines the contracts, gates, and policies for all security tooling across every sprint.
Written in Sprint 1 and updated as new scan targets are added.

---

## 1. Readiness Markers

### Server (apps/server)

| Item | Value |
|------|-------|
| Readiness marker | Log line contains `Listening on port` OR HTTP GET `http://localhost:8080` returns HTTP 200 |
| Poll interval | 2 seconds |
| Timeout | 60 seconds |
| Failure behavior | Exit nonzero; emit "SERVER TIMEOUT" with captured stdout/stderr to log file |

### Desktop (apps/desktop — Electron)

| Item | Value |
|------|-------|
| Readiness marker | Electron process exits with code 0 on `--version` flag; main window signal TBD (update when Electron bootstrap is wired) |
| CI execution | `xvfb-run --auto-servernum -- electron .` |
| Timeout | 90 seconds |
| Failure behavior | Exit nonzero; emit "DESKTOP TIMEOUT" with process logs |

> Note: Exact Electron readiness marker will be updated in Sprint 1 once Trilium code is present
> and the desktop startup sequence is confirmed.

---

## 2. ETAPI Auth Contract

- `ETAPI_TOKEN` must be sourced exclusively from the environment variable `ETAPI_TOKEN`.
- Scripts must refuse to run if `ETAPI_TOKEN` is unset (check with `${ETAPI_TOKEN:?}` guard).
- 401 or 403 response from any ETAPI call fails the smoke test immediately with a descriptive error.
- Credentials are never hardcoded, logged, or emitted to stdout.
- In CI: `ETAPI_TOKEN` is set via GitHub Actions encrypted secret `ETAPI_TOKEN`.

---

## 3. Severity Gates

### PR Merge Gates

| Condition | Action |
|-----------|--------|
| Any Critical finding (any scanner) | Block merge |
| Any High finding in changed code path | Block merge |
| Any unapproved secret (Gitleaks) | Block merge — zero tolerance |
| License policy violation | Block merge |

### Release Gates (Gate D — Sprint 20)

| Condition | Action |
|-----------|--------|
| Any Critical or High in product scope | Block release |
| >2 Medium without approved mitigation (owner + resolution date) | Block release |
| Any unapproved secret | Block release |

---

## 4. Artifact Publication Policy

All security scanner reports are uploaded as CI artifacts regardless of gate result.

```yaml
- uses: actions/upload-artifact@...
  if: always()
  with:
    name: security-${{ github.run_id }}-${{ matrix.job }}
    path: security-reports/
    retention-days: 90
```

**Distinction:**
- Artifact publication: always, including on gate failure (preserves evidence for triage).
- Gate enforcement: nonzero job exit, which blocks required status checks.

---

## 5. Suppression and Exception Process

| Step | Details |
|------|---------|
| Finding | Documented in `security-reports/exceptions.md` with: tool, rule ID, affected file, justification, risk owner, review date |
| Approval | Requires explicit comment from repo owner in the PR |
| Duration | Max 90 days; must be re-reviewed at expiry |
| Hard exceptions | Gitleaks secrets findings have NO suppression path — they must be remediated (rotate credential, rewrite history) |

---

## 6. Per-Scanner Contracts

### Semgrep

- Rulesets: `p/owasp-top-ten`, `p/nodejs`, `p/typescript`
- Output format: SARIF → `security-reports/semgrep.sarif`
- Gate: exit nonzero on any Critical or High finding
- Suppression: inline `# nosemgrep: <rule-id>` with justification comment; tracked in exceptions.md

### CodeQL

- Languages: JavaScript, TypeScript
- Output: SARIF → GitHub Security tab + `security-reports/codeql.sarif`
- Gate: exit nonzero on Critical or High

### eslint-plugin-security

- Config: extends `plugin:security/recommended`
- Output: JSON → `security-reports/eslint-security.json`
- Gate: exit nonzero on any `error`-level finding

### pnpm audit

- Command: `pnpm audit --json > security-reports/pnpm-audit.json`
- Gate: exit nonzero on Critical or High CVE
- Scope: all workspaces

### OSV-Scanner

- Command: `osv-scanner --format json --output security-reports/osv.json .`
- Gate: exit nonzero on Critical or High

### License Policy Check (scripts/ci/license-policy-check.sh)

- Output: JSON → `security-reports/licenses.json`
- Policy: AGPL-3.0 compatible; see `docs/CKEDITOR_LICENSING.md` for CKEditor exceptions
- Gate: exit nonzero on policy violation

### Gitleaks

- Command: `gitleaks detect --source . --report-format json --report-path security-reports/gitleaks.json`
- Gate: exit nonzero on ANY finding — zero tolerance, no suppressions
- Also runs on git history: `gitleaks detect --log-opts HEAD` on PRs

### Trivy

- Targets: filesystem scan of repo root; Docker image scan when image is built
- Output: SARIF → `security-reports/trivy.sarif`
- Gate: exit nonzero on Critical or High

### OWASP ZAP

- Mode: baseline scan (`zap-baseline.py`)
- Targets:
  1. `http://localhost:8080` (Trilium server root)
  2. `http://localhost:8080/etapi/` (ETAPI routes)
  3. `http://localhost:8080/api/nuklius/` (custom routes)
- Output: HTML + JSON → `security-reports/zap-report.html`, `security-reports/zap-report.json`
- Gate: exit nonzero on alerts above ZAP WARN threshold (configurable via `.zap/rules.conf`)
- Server must pass readiness check before ZAP runs

---

## 7. Changelog

| Date | Change |
|------|--------|
| 2026-03-18 | Sprint 1: Initial SECURITY_BASELINE.md |
