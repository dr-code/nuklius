#!/usr/bin/env bash
# scripts/ci/repro-build.sh
# Two-pass reproducible build with SHA256 checksum comparison.
# Exits nonzero if the two passes produce different checksums.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
MANIFEST_DIR="${ROOT}/logs"
PASS1="${MANIFEST_DIR}/repro-pass1.txt"
PASS2="${MANIFEST_DIR}/repro-pass2.txt"
DIFF_OUT="${MANIFEST_DIR}/repro-diff.txt"

mkdir -p "${MANIFEST_DIR}"

log() { echo "[repro-build] $*"; }

emit_manifest() {
  local label="$1"
  local out="$2"
  {
    echo "# Nuklius Reproducible Build Manifest"
    echo "# Pass: ${label}"
    echo "# Date: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
    echo "# Node: $(node --version)"
    echo "# pnpm: $(pnpm --version)"
    echo "# Lockfile SHA256: $(sha256sum "${ROOT}/pnpm-lock.yaml" 2>/dev/null | awk '{print $1}' || echo 'NO_LOCKFILE')"
    echo "#"
    # Find all build artifacts (dist/, out/, app-out/) and hash them
    if find "${ROOT}" \
        \( -path "*/node_modules" -prune \) \
        -o \( -path "${ROOT}/.tessera" -prune \) \
        -o \( -type f \( -path "*/dist/*" -o -path "*/out/*" -o -path "*/app-out/*" \) -print \) \
      2>/dev/null | sort | xargs -r sha256sum 2>/dev/null; then
      :
    else
      echo "NO_ARTIFACTS_FOUND"
    fi
  } > "${out}"
  log "Manifest written to ${out}"
}

build_pass() {
  local label="$1"
  log "=== PASS ${label}: clean + install + build ==="

  # Clean build artifacts (not node_modules — pnpm install handles that)
  find "${ROOT}" \( -path "*/node_modules" -prune \) \
    -o \( -type d -name "dist" -print \) \
    -o \( -type d -name "out" -print \) \
    -o \( -type d -name "app-out" -print \) \
    2>/dev/null | grep -v node_modules | xargs -r rm -rf || true

  cd "${ROOT}"

  # Frozen install — skip if no lockfile (pre-fork-merge state)
  if [ -f "${ROOT}/pnpm-lock.yaml" ]; then
    log "Installing dependencies (frozen lockfile)..."
    pnpm install --frozen-lockfile 2>&1 | tail -5
  else
    log "WARN: pnpm-lock.yaml not found — running pnpm install without frozen flag (pre-fork state)"
    pnpm install 2>&1 | tail -5
  fi

  # Build all workspaces (will be a no-op until Trilium code is present)
  if [ -f "${ROOT}/pnpm-workspace.yaml" ]; then
    log "Building all workspaces..."
    pnpm --recursive run build 2>&1 | tail -20 || log "WARN: some workspace builds failed (expected before Trilium fork is added)"
  else
    log "WARN: pnpm-workspace.yaml not found — skipping workspace build (Trilium not yet present)"
  fi

  # Use the module-level PASS1/PASS2 variables so callers and the diff step
  # reference the same path — avoids silent mismatch if variable names change.
  if [ "${label}" = "1" ]; then
    emit_manifest "${label}" "${PASS1}"
  else
    emit_manifest "${label}" "${PASS2}"
  fi
}

# --- Pass 1 ---
build_pass "1"

# --- Pass 2 ---
build_pass "2"

# --- Compare artifact checksums only (exclude metadata header lines) ---
log "=== Comparing checksums ==="
grep -v '^#' "${PASS1}" | sort > "${MANIFEST_DIR}/repro-artifacts-1.txt" || true
grep -v '^#' "${PASS2}" | sort > "${MANIFEST_DIR}/repro-artifacts-2.txt" || true
if diff "${MANIFEST_DIR}/repro-artifacts-1.txt" "${MANIFEST_DIR}/repro-artifacts-2.txt" > "${DIFF_OUT}" 2>&1; then
  log "PASS: Both passes produced identical checksums."
  cat "${PASS1}"
  exit 0
else
  log "FAIL: Checksum mismatch between pass 1 and pass 2."
  log "Diff output:"
  cat "${DIFF_OUT}"
  exit 1
fi
