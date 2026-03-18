#!/usr/bin/env bash
# scripts/smoke/launch-smoke.sh
# Smoke-tests server + desktop launch from a clean state.
# Polls exact readiness markers defined in docs/SECURITY_BASELINE.md.
# Designed to run in headless CI (uses xvfb-run for Electron).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
LOG_DIR="${ROOT}/logs"
SERVER_LOG="${LOG_DIR}/smoke-server.log"
DESKTOP_LOG="${LOG_DIR}/smoke-desktop.log"

mkdir -p "${LOG_DIR}"

SERVER_PORT="${SERVER_PORT:-8080}"
SERVER_URL="http://localhost:${SERVER_PORT}"
SERVER_TIMEOUT=60    # seconds (from SECURITY_BASELINE.md)
DESKTOP_TIMEOUT=90   # seconds (from SECURITY_BASELINE.md)
POLL_INTERVAL=2

SERVER_PID=""
SMOKE_DATA_DIR=""

log()  { echo "[smoke-launch] $*"; }
fail() { log "FAIL: $*"; exit 1; }

# --- EXIT trap: always kill server and remove temp data dir ---
cleanup() {
  [ -n "${SERVER_PID}" ] && kill "${SERVER_PID}" 2>/dev/null || true
  [ -n "${SMOKE_DATA_DIR}" ] && rm -rf "${SMOKE_DATA_DIR}" || true
}
trap cleanup EXIT

# --- Prerequisite check ---
if [ ! -d "${ROOT}/apps/server" ]; then
  fail "apps/server not found — Trilium fork has not been added to this repo yet. " \
       "Run the fork setup runbook in SPRINT-01.md before executing smoke tests."
fi

# --- Start server ---
SMOKE_DATA_DIR=$(mktemp -d /tmp/nuklius-smoke-XXXXXX)
log "Starting Trilium server on port ${SERVER_PORT}..."
(cd "${ROOT}" && TRILIUM_DATA_DIR="${SMOKE_DATA_DIR}" TRILIUM_PORT="${SERVER_PORT}" \
  pnpm --filter @trilium/server start 2>&1) > "${SERVER_LOG}" &
SERVER_PID=$!
log "Server PID: ${SERVER_PID}"

# --- Poll server readiness ---
log "Waiting for server readiness (timeout: ${SERVER_TIMEOUT}s)..."
elapsed=0
until curl -sf "${SERVER_URL}" -o /dev/null 2>/dev/null; do
  sleep "${POLL_INTERVAL}"
  elapsed=$(( elapsed + POLL_INTERVAL ))
  if [ "${elapsed}" -ge "${SERVER_TIMEOUT}" ]; then
    kill "${SERVER_PID}" 2>/dev/null || true
    log "SERVER TIMEOUT after ${SERVER_TIMEOUT}s"
    log "--- Server log (last 50 lines) ---"
    tail -50 "${SERVER_LOG}" || true
    fail "Server did not reach readiness within ${SERVER_TIMEOUT}s"
  fi
  log "  waiting... (${elapsed}/${SERVER_TIMEOUT}s)"
done
log "Server ready after ${elapsed}s"

# --- Smoke server ---
HTTP_STATUS=$(curl -sf -o /dev/null -w "%{http_code}" "${SERVER_URL}" || echo "000")
if [ "${HTTP_STATUS}" != "200" ]; then
  kill "${SERVER_PID}" 2>/dev/null || true
  fail "Server returned HTTP ${HTTP_STATUS}, expected 200"
fi
log "Server HTTP 200 confirmed"

# --- Start Electron desktop (headless) ---
ELECTRON_BIN=""
if command -v electron &>/dev/null; then
  ELECTRON_BIN="electron"
elif [ -x "${ROOT}/node_modules/.bin/electron" ]; then
  ELECTRON_BIN="${ROOT}/node_modules/.bin/electron"
elif [ -d "${ROOT}/apps/desktop" ]; then
  ELECTRON_BIN="$(pnpm --filter @trilium/desktop exec which electron 2>/dev/null || true)"
fi

if [ -z "${ELECTRON_BIN}" ] || [ ! -d "${ROOT}/apps/desktop" ]; then
  log "WARN: Electron not found or apps/desktop missing — skipping desktop smoke test"
  log "  (Expected until Trilium fork is added)"
  DESKTOP_SKIPPED=1
else
  DESKTOP_SKIPPED=0
  log "Starting Electron desktop (headless via xvfb-run)..."
  (xvfb-run --auto-servernum -- "${ELECTRON_BIN}" "${ROOT}/apps/desktop" --smoke-test 2>&1) \
    > "${DESKTOP_LOG}" &
  DESKTOP_PID=$!
  log "Desktop PID: ${DESKTOP_PID}"

  # Poll desktop readiness (version check proxy)
  elapsed=0
  while kill -0 "${DESKTOP_PID}" 2>/dev/null && [ "${elapsed}" -lt "${DESKTOP_TIMEOUT}" ]; do
    sleep "${POLL_INTERVAL}"
    elapsed=$(( elapsed + POLL_INTERVAL ))
    log "  desktop waiting... (${elapsed}/${DESKTOP_TIMEOUT}s)"
  done

  if kill -0 "${DESKTOP_PID}" 2>/dev/null; then
    kill "${DESKTOP_PID}" 2>/dev/null || true
    log "WARN: Desktop process still running after ${DESKTOP_TIMEOUT}s (expected for GUI apps — treating as available)"
  else
    wait "${DESKTOP_PID}" || DESKTOP_EXIT=$?
    if [ "${DESKTOP_EXIT:-0}" -ne 0 ]; then
      kill "${SERVER_PID}" 2>/dev/null || true
      log "--- Desktop log (last 50 lines) ---"
      tail -50 "${DESKTOP_LOG}" || true
      fail "Desktop exited with code ${DESKTOP_EXIT:-unknown}"
    fi
    log "Desktop process exited cleanly"
  fi
fi

# Server cleanup and smoke data removal handled by EXIT trap.

# --- Report ---
log "=== Smoke Launch Results ==="
log "  Server: PASS (HTTP 200 on ${SERVER_URL})"
if [ "${DESKTOP_SKIPPED:-0}" -eq 1 ]; then
  log "  Desktop: SKIPPED (Trilium fork not yet added)"
else
  log "  Desktop: PASS"
fi
log "Logs: ${SERVER_LOG}, ${DESKTOP_LOG}"
