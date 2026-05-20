#!/usr/bin/env bash
# Shared helpers for phase validation scripts. Source, do not execute directly.
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

PASS_COUNT=0
FAIL_COUNT=0
SKIP_COUNT=0
MANUAL_COUNT=0

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

pass() {
  echo -e "${GREEN}PASS${NC} $1"
  PASS_COUNT=$((PASS_COUNT + 1))
}

fail() {
  echo -e "${RED}FAIL${NC} $1"
  FAIL_COUNT=$((FAIL_COUNT + 1))
}

skip() {
  echo -e "${YELLOW}SKIP${NC} $1"
  SKIP_COUNT=$((SKIP_COUNT + 1))
}

manual() {
  echo -e "${YELLOW}MANUAL${NC} $1 (agent: use Playwright/curl; user only if script cannot verify)"
  MANUAL_COUNT=$((MANUAL_COUNT + 1))
}

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    fail "missing command: $1"
    return 1
  fi
  pass "command available: $1"
}

assert_branch() {
  local expected="$1"
  local current
  current="$(git branch --show-current 2>/dev/null || true)"
  if [[ "$current" == "$expected" ]]; then
    pass "git branch is $expected"
  else
    fail "git branch is '$current' (expected $expected)"
  fi
}

assert_file_exists() {
  local path="$1"
  if [[ -f "$path" || -d "$path" ]]; then
    pass "exists: $path"
  else
    fail "missing: $path"
  fi
}

assert_not_tracked() {
  local path="$1"
  if git check-ignore -q "$path" 2>/dev/null; then
    pass "gitignored: $path"
  elif [[ -f "$path" ]] && git ls-files --error-unmatch "$path" >/dev/null 2>&1; then
    fail "should not be tracked: $path"
  else
    pass "not tracked: $path"
  fi
}

assert_no_secrets_in_diff() {
  local base="${1:-master}"
  local patterns='\.env\.local|credentials\.json|\.pem$|NANOBANANA_API_KEY=[^[:space:]]+'
  if git diff "$base"...HEAD 2>/dev/null | grep -qE "$patterns"; then
    fail "possible secrets in diff vs $base"
  else
    pass "no obvious secrets in diff vs $base"
  fi
}

assert_docker_postgres_healthy() {
  require_cmd docker || return 1
  if docker compose ps postgres 2>/dev/null | grep -qE 'healthy|running'; then
    pass "postgres container running"
    return 0
  fi
  echo "  → starting postgres via docker compose..."
  docker compose up -d postgres
  local i=0
  while [[ $i -lt 30 ]]; do
    if docker compose ps postgres 2>/dev/null | grep -q healthy; then
      pass "postgres container healthy"
      return 0
    fi
    sleep 1
    i=$((i + 1))
  done
  fail "postgres not healthy after 30s"
}

curl_json_field() {
  local url="$1"
  local field="$2"
  local expected="$3"
  local body
  body="$(curl -sf --max-time 10 "$url" 2>/dev/null)" || {
    fail "curl failed: $url"
    return 1
  }
  local value
  value="$(echo "$body" | grep -o "\"$field\"[[:space:]]*:[[:space:]]*[^,}]*" | head -1 | sed 's/.*:[[:space:]]*//' | tr -d ' "')"
  if [[ "$value" == "$expected" ]]; then
    pass "curl $url → $field=$expected"
  else
    fail "curl $url → $field=$value (expected $expected)"
  fi
}

curl_http_status() {
  local url="$1"
  local expected="$2"
  local code
  code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "$url" 2>/dev/null)" || {
    fail "curl failed: $url"
    return 1
  }
  if [[ "$code" == "$expected" ]]; then
    pass "curl $url → HTTP $code"
  else
    fail "curl $url → HTTP $code (expected $expected)"
  fi
}

curl_body_matches() {
  local url="$1"
  local pattern="$2"
  local body
  body="$(curl -sf --max-time 10 "$url" 2>/dev/null)" || {
    fail "curl failed: $url"
    return 1
  }
  if echo "$body" | grep -qE "$pattern"; then
    pass "curl $url body matches /$pattern/"
  else
    fail "curl $url body does not match /$pattern/"
  fi
}

print_summary() {
  echo ""
  echo "────────────────────────────────────────"
  echo -e "PASS: ${GREEN}$PASS_COUNT${NC}  FAIL: ${RED}$FAIL_COUNT${NC}  SKIP: ${YELLOW}$SKIP_COUNT${NC}  MANUAL: ${YELLOW}$MANUAL_COUNT${NC}"
  if [[ $FAIL_COUNT -gt 0 ]]; then
    echo -e "${RED}VALIDATION FAILED${NC}"
    exit 1
  fi
  echo -e "${GREEN}VALIDATION PASSED${NC}"
  exit 0
}
