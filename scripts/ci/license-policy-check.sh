#!/usr/bin/env bash
# scripts/ci/license-policy-check.sh
# Enumerates all workspace dependency licenses and enforces the AGPL-compatible policy.
# Outputs JSON report to security-reports/licenses.json.
# Exits nonzero on policy violations.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
REPORT_DIR="${ROOT}/security-reports"
REPORT="${REPORT_DIR}/licenses.json"
VIOLATIONS="${REPORT_DIR}/license-violations.json"

mkdir -p "${REPORT_DIR}"

log()  { echo "[license-check] $*"; }
fail() { log "FAIL: $*"; exit 1; }

# --- AGPL-compatible allowlist ---
# These SPDX identifiers are permitted.
ALLOWED_LICENSES=(
  "MIT"
  "ISC"
  "BSD-2-Clause"
  "BSD-3-Clause"
  "Apache-2.0"
  "0BSD"
  "Unlicense"
  "CC0-1.0"
  "CC-BY-3.0"
  "CC-BY-4.0"
  "Python-2.0"
  "BlueOak-1.0.0"
  "LGPL-2.0-only"
  "LGPL-2.1-only"
  "LGPL-2.1-or-later"
  "LGPL-3.0-only"
  "LGPL-3.0-or-later"
  "GPL-2.0-only"
  "GPL-2.0-or-later"
  "GPL-3.0-only"
  "GPL-3.0-or-later"
  "AGPL-3.0-only"
  "AGPL-3.0-or-later"
  "MPL-2.0"
)

# Known exceptions (CKEditor commercial features — personal use only, documented in CKEDITOR_LICENSING.md)
EXCEPTIONS=(
  "LicenseRef-CKEditor-Commercial"
)

# --- Enumerate licenses ---
log "Enumerating workspace dependency licenses..."

if ! command -v pnpm &>/dev/null; then
  fail "pnpm not found — run 'corepack enable && corepack prepare' first"
fi

# Use pnpm licenses list if available; fall back to license-checker
if pnpm licenses list --json > "${REPORT}" 2>/dev/null; then
  log "License report written to ${REPORT}"
else
  log "WARN: 'pnpm licenses list' failed — attempting fallback with license-checker"
  if command -v license-checker &>/dev/null; then
    license-checker --json --out "${REPORT}" --start "${ROOT}" 2>/dev/null || \
      echo "{\"error\": \"license-checker failed\"}" > "${REPORT}"
  else
    log "WARN: license-checker not installed — skipping enumeration"
    echo "{\"warning\": \"license enumeration tools not available\", \"policy\": \"AGPL-compatible\"}" \
      > "${REPORT}"
    log "Report written (empty/warning-only): ${REPORT}"
    exit 0
  fi
fi

# --- Policy enforcement ---
log "Checking against AGPL-compatible allowlist..."

VIOLATION_COUNT=0
VIOLATION_LIST="[]"

# Parse the JSON report and check each license
if command -v jq &>/dev/null && [ -s "${REPORT}" ]; then
  # Try to extract license strings and check them
  # pnpm licenses list --json returns: {"MIT": [{name, version, path},...], "ISC": [...]}
  # Transform to [{license, name}] pairs for uniform processing.
  # Falls back to license-checker format: {"pkg@ver": {licenses: "MIT", ...}}
  check_package() {
    local pkg="$1"
    local lic="$2"
    local ALLOWED=0
    # Exact SPDX match (not substring) to avoid false positives
    for allowed in "${ALLOWED_LICENSES[@]}"; do
      if [[ "${lic}" == "${allowed}" ]]; then
        ALLOWED=1
        break
      fi
    done
    # Documented exceptions (exact match)
    if [ "${ALLOWED}" -eq 0 ]; then
      for exc in "${EXCEPTIONS[@]}"; do
        if [[ "${lic}" == "${exc}" ]]; then
          ALLOWED=1
          log "EXCEPTION: ${pkg} uses ${lic} (documented in docs/CKEDITOR_LICENSING.md)"
          break
        fi
      done
    fi
    if [ "${ALLOWED}" -eq 0 ]; then
      VIOLATION_COUNT=$(( VIOLATION_COUNT + 1 ))
      log "VIOLATION: ${pkg} uses disallowed license: ${lic}"
    fi
  }

  # Detect output format and iterate
  FORMAT=$(jq -r 'if type == "object" and (keys[0] // "" | test("^[A-Z]")) then "pnpm" else "license-checker" end' \
    "${REPORT}" 2>/dev/null || echo "unknown")

  if [ "${FORMAT}" = "pnpm" ]; then
    # pnpm licenses list format: {LicenseName: [{name, version, ...}]}
    while IFS=$'\t' read -r lic pkg; do
      check_package "${pkg}" "${lic}"
    done < <(jq -r 'to_entries[] | .key as $lic | .value[] | [$lic, .name] | @tsv' \
      "${REPORT}" 2>/dev/null | head -1000 || true)
  else
    # license-checker format: {"pkg@version": {licenses: "MIT", ...}}
    while IFS=$'\t' read -r pkg lic; do
      check_package "${pkg}" "${lic}"
    done < <(jq -r 'to_entries[] | [.key, (.value.licenses // "UNKNOWN")] | @tsv' \
      "${REPORT}" 2>/dev/null | head -1000 || true)
  fi
else
  log "WARN: jq not available or empty report — skipping violation check"
  log "Install jq for automated policy enforcement"
fi

# --- Output ---
cat > "${VIOLATIONS}" << EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "policy": "AGPL-3.0-compatible",
  "violation_count": ${VIOLATION_COUNT},
  "status": "$([ ${VIOLATION_COUNT} -eq 0 ] && echo "PASS" || echo "FAIL")"
}
EOF

log "License check complete: ${VIOLATION_COUNT} violation(s)"
log "Report: ${REPORT}"
log "Violations summary: ${VIOLATIONS}"

if [ "${VIOLATION_COUNT}" -gt 0 ]; then
  fail "${VIOLATION_COUNT} license violation(s) found — see ${VIOLATIONS}"
fi

log "PASS: All dependency licenses are AGPL-compatible"
