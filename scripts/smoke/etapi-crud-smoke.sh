#!/usr/bin/env bash
# scripts/smoke/etapi-crud-smoke.sh
# ETAPI CRUD smoke test.
# Reads ETAPI_TOKEN from environment — refuses to run if unset.
# Registers EXIT trap to clean up: test note deletion + curl config temp file.
# ETAPI_TOKEN is never placed on the curl command line (process list safe).
# Exits nonzero on 401, 403, or unexpected HTTP status.
set -euo pipefail

# --- Token guard (must be before trap registration) ---
: "${ETAPI_TOKEN:?ERROR: ETAPI_TOKEN environment variable is not set. Export it before running this script.}"

SERVER_HOST="${ETAPI_HOST:-localhost}"
SERVER_PORT="${ETAPI_PORT:-8080}"
BASE_URL="http://${SERVER_HOST}:${SERVER_PORT}/etapi"
TIMESTAMP=$(date -u +%Y%m%dT%H%M%SZ)
NOTE_TITLE="nuklius-smoke-${TIMESTAMP}-$$"

LOG_DIR="${LOG_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)/logs}"
mkdir -p "${LOG_DIR}"
LOG="${LOG_DIR}/smoke-etapi.log"

NOTE_ID=""

# Write ETAPI_TOKEN to a temp curl config file — keeps it off the process argv.
# Mode 600 prevents other local users from reading the token.
CURL_AUTH_CONFIG=$(mktemp)
chmod 600 "${CURL_AUTH_CONFIG}"
printf 'header = "Authorization: %s"\n' "${ETAPI_TOKEN}" > "${CURL_AUTH_CONFIG}"

log()  { echo "[etapi-smoke] $*" | tee -a "${LOG}"; }
fail() { log "FAIL: $*"; exit 1; }

# --- Cleanup trap: always delete test note + temp config file ---
cleanup() {
  # Delete test note if still present
  if [ -n "${NOTE_ID}" ]; then
    log "Cleanup: deleting test note ${NOTE_ID}..."
    HTTP=$(curl -sf -K "${CURL_AUTH_CONFIG}" \
      -o /dev/null -w "%{http_code}" \
      -X DELETE \
      "${BASE_URL}/notes/${NOTE_ID}" 2>>"${LOG}" || echo "000")
    if [ "${HTTP}" = "200" ] || [ "${HTTP}" = "204" ]; then
      log "Cleanup: test note deleted (HTTP ${HTTP})"
    else
      log "WARN: cleanup delete returned HTTP ${HTTP} — manual cleanup may be needed for note ${NOTE_ID}"
    fi
  fi
  # Always remove the token config file
  rm -f "${CURL_AUTH_CONFIG}"
}
trap cleanup EXIT

# Helper: curl with token config, content-type, and response status capture
# Usage: curl_api <method> <url> [extra curl args...]
# Prints: response body lines followed by "HTTP_STATUS:<code>"
curl_api() {
  local method="$1"
  local url="$2"
  shift 2
  curl -sf \
    -K "${CURL_AUTH_CONFIG}" \
    -X "${method}" \
    -w "\nHTTP_STATUS:%{http_code}" \
    "$@" \
    "${url}" 2>>"${LOG}" || echo "HTTP_STATUS:000"
}

assert_status() {
  local step="$1"
  local expected="$2"
  local actual="$3"
  if [ "${actual}" != "${expected}" ]; then
    if [ "${actual}" = "401" ] || [ "${actual}" = "403" ]; then
      fail "${step}: auth failure (HTTP ${actual}) — check ETAPI_TOKEN"
    fi
    fail "${step}: expected HTTP ${expected}, got HTTP ${actual}"
  fi
  log "${step}: HTTP ${actual} OK"
}

log "Starting ETAPI CRUD smoke test against ${BASE_URL}"
log "Test note title: ${NOTE_TITLE}"

# Build JSON bodies safely via printf (values are machine-generated, not user input)
CREATE_BODY=$(printf '{"parentNoteId":"root","title":"%s","type":"text","content":"<p>Smoke test %s. Safe to delete.</p>"}' \
  "${NOTE_TITLE}" "${TIMESTAMP}")
UPDATE_BODY=$(printf '{"title":"%s"}' "${NOTE_TITLE}-updated")
UPDATED_TITLE="${NOTE_TITLE}-updated"

# --- CREATE ---
log "--- CREATE ---"
CREATE_RESPONSE=$(curl_api POST "${BASE_URL}/create-note" \
  -H "Content-Type: application/json" \
  -d "${CREATE_BODY}")

HTTP_STATUS=$(echo "${CREATE_RESPONSE}" | grep "HTTP_STATUS:" | cut -d: -f2)
BODY=$(echo "${CREATE_RESPONSE}" | grep -v "HTTP_STATUS:")
assert_status "CREATE" "201" "${HTTP_STATUS}"

NOTE_ID=$(echo "${BODY}" | grep -o '"noteId":"[^"]*"' | cut -d'"' -f4 || echo "")
if [ -z "${NOTE_ID}" ]; then
  fail "CREATE: could not parse noteId from response body: ${BODY}"
fi
log "Created note: ${NOTE_ID}"

# --- READ ---
log "--- READ ---"
READ_RESPONSE=$(curl_api GET "${BASE_URL}/notes/${NOTE_ID}")

HTTP_STATUS=$(echo "${READ_RESPONSE}" | grep "HTTP_STATUS:" | cut -d: -f2)
BODY=$(echo "${READ_RESPONSE}" | grep -v "HTTP_STATUS:")
assert_status "READ" "200" "${HTTP_STATUS}"

RETURNED_TITLE=$(echo "${BODY}" | grep -o '"title":"[^"]*"' | cut -d'"' -f4 || echo "")
if [ "${RETURNED_TITLE}" != "${NOTE_TITLE}" ]; then
  fail "READ: title mismatch — expected '${NOTE_TITLE}', got '${RETURNED_TITLE}'"
fi
log "Read note title verified: ${RETURNED_TITLE}"

# --- UPDATE ---
log "--- UPDATE ---"
UPDATE_RESPONSE=$(curl_api PATCH "${BASE_URL}/notes/${NOTE_ID}" \
  -H "Content-Type: application/json" \
  -d "${UPDATE_BODY}")

HTTP_STATUS=$(echo "${UPDATE_RESPONSE}" | grep "HTTP_STATUS:" | cut -d: -f2)
assert_status "UPDATE" "200" "${HTTP_STATUS}"
log "Updated note title to: ${UPDATED_TITLE}"

# Verify update persisted
VERIFY_RESPONSE=$(curl_api GET "${BASE_URL}/notes/${NOTE_ID}")
HTTP_STATUS=$(echo "${VERIFY_RESPONSE}" | grep "HTTP_STATUS:" | cut -d: -f2)
BODY=$(echo "${VERIFY_RESPONSE}" | grep -v "HTTP_STATUS:")
assert_status "UPDATE-VERIFY" "200" "${HTTP_STATUS}"

VERIFIED_TITLE=$(echo "${BODY}" | grep -o '"title":"[^"]*"' | cut -d'"' -f4 || echo "")
if [ "${VERIFIED_TITLE}" != "${UPDATED_TITLE}" ]; then
  fail "UPDATE-VERIFY: title mismatch — expected '${UPDATED_TITLE}', got '${VERIFIED_TITLE}'"
fi
log "Update verified"

# --- DELETE ---
log "--- DELETE ---"
DELETE_RESPONSE=$(curl_api DELETE "${BASE_URL}/notes/${NOTE_ID}")

HTTP_STATUS=$(echo "${DELETE_RESPONSE}" | grep "HTTP_STATUS:" | cut -d: -f2)
assert_status "DELETE" "200" "${HTTP_STATUS}"
NOTE_ID=""  # Clear so cleanup trap does not double-delete
log "Delete confirmed"

log "=== ETAPI CRUD Smoke: PASS ==="
log "All four operations (create, read, update, delete) succeeded."
log "Log: ${LOG}"
