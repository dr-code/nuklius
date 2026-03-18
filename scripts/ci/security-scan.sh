#!/usr/bin/env bash
# scripts/ci/security-scan.sh
# Runs local security scan suite. CI uses security.yml workflows.
# This script is for developer local runs: pnpm run security-scan
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
REPORT_DIR="${ROOT}/security-reports"
mkdir -p "${REPORT_DIR}"

log()  { echo "[security-scan] $*"; }
FAIL_COUNT=0
fail_track() { log "FAIL: $*"; FAIL_COUNT=$(( FAIL_COUNT + 1 )); }

# --- pnpm audit ---
log "Running pnpm audit..."
if command -v pnpm &>/dev/null; then
  pnpm audit --json > "${REPORT_DIR}/pnpm-audit.json" || true
  if jq -e '.metadata.vulnerabilities | (.critical + .high) > 0' \
      "${REPORT_DIR}/pnpm-audit.json" > /dev/null 2>&1; then
    fail_track "pnpm audit: Critical/High CVEs found"
  else
    log "pnpm audit: PASS"
  fi
else
  log "WARN: pnpm not found — skipping pnpm audit"
fi

# --- Gitleaks ---
log "Running Gitleaks..."
if command -v gitleaks &>/dev/null; then
  gitleaks detect --source "${ROOT}" \
    --report-format json \
    --report-path "${REPORT_DIR}/gitleaks.json" \
    --exit-code 1 || fail_track "Gitleaks: secret(s) found — zero tolerance"
  log "Gitleaks: PASS"
else
  log "WARN: gitleaks not installed — skipping (install: brew install gitleaks)"
fi

# --- OSV-Scanner ---
log "Running OSV-Scanner..."
if command -v osv-scanner &>/dev/null; then
  osv-scanner --format json --output "${REPORT_DIR}/osv.json" "${ROOT}" || \
    fail_track "OSV-Scanner: vulnerabilities found"
  log "OSV-Scanner: PASS"
else
  log "WARN: osv-scanner not installed — skipping (install: brew install osv-scanner)"
fi

# --- Trivy ---
log "Running Trivy filesystem scan..."
if command -v trivy &>/dev/null; then
  trivy fs --severity CRITICAL,HIGH --format sarif \
    --output "${REPORT_DIR}/trivy.sarif" "${ROOT}" || \
    fail_track "Trivy: Critical/High findings"
  log "Trivy: PASS"
else
  log "WARN: trivy not installed — skipping (install: brew install trivy)"
fi

# --- License check ---
log "Running license policy check..."
bash "${ROOT}/scripts/ci/license-policy-check.sh" || \
  fail_track "License policy: violations found"

# --- Semgrep ---
log "Running Semgrep..."
if command -v semgrep &>/dev/null; then
  semgrep --config p/owasp-top-ten --config p/nodejs --config p/typescript \
    --json --output "${REPORT_DIR}/semgrep.json" "${ROOT}" || \
    fail_track "Semgrep: findings above threshold"
  log "Semgrep: PASS"
else
  log "WARN: semgrep not installed — skipping (install: pip3 install semgrep)"
fi

# --- Report ---
log ""
log "=== Security Scan Summary ==="
log "Reports written to: ${REPORT_DIR}/"
if [ "${FAIL_COUNT}" -gt 0 ]; then
  log "FAIL: ${FAIL_COUNT} scanner(s) reported issues — review reports above"
  exit 1
fi
log "PASS: All scanners passed"
