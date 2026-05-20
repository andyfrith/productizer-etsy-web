#!/usr/bin/env bash
# P0 scaffold validation — run from repo root: ./scripts/validate-p0.sh [--tier docs|full]
# Agent: run before every PR; fix all FAILs. MINIMIZE manual steps — use curl & tests.
set -euo pipefail

TIER="full"
if [[ "${1:-}" == "--tier" ]]; then
  TIER="${2:-full}"
  shift 2
elif [[ "${1:-}" == "--docs-only" ]]; then
  TIER="docs"
  shift
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=validate-lib.sh
source "$SCRIPT_DIR/validate-lib.sh"

EXPECTED_BRANCH="phase/0-scaffold"
SPEC_DIR="specs/20260519-phase0-scaffold"
BASE_BRANCH="${VALIDATE_BASE_BRANCH:-master}"

echo "=== Productizer P0 validation (tier: $TIER) ==="
echo "Repo: $REPO_ROOT"
echo ""

# ─── Always (agent-run) ───────────────────────────────────────────────────
echo "## Git & branch"
require_cmd git
assert_branch "$EXPECTED_BRANCH"
assert_no_secrets_in_diff "$BASE_BRANCH"
if git rev-parse --verify "$BASE_BRANCH" >/dev/null 2>&1; then
  if git merge-base --is-ancestor "$BASE_BRANCH" HEAD 2>/dev/null; then
    pass "branch includes commits from $BASE_BRANCH"
  else
    fail "branch may not be based on $BASE_BRANCH (rebase onto latest)"
  fi
fi

echo ""
echo "## Phase spec files"
for f in index.html requirements.html plan.html validation.html; do
  assert_file_exists "$SPEC_DIR/$f"
done

echo ""
echo "## Infra (docs tier+)"
assert_file_exists "docker-compose.yml"
assert_file_exists ".env.example"
assert_not_tracked ".env.local"
assert_not_tracked "storage"

if [[ "$TIER" == "docs" ]]; then
  echo ""
  echo "## Docker (docs tier)"
  assert_docker_postgres_healthy || true
  print_summary
fi

# ─── Full tier (requires Next.js app) ─────────────────────────────────────
echo ""
echo "## Toolchain"
require_cmd node
NODE_MAJOR="$(node -v | sed 's/v//' | cut -d. -f1)"
if [[ "$NODE_MAJOR" == "22" ]]; then
  pass "node major version 22 ($(node -v))"
else
  fail "node major version is $NODE_MAJOR (expected 22; got $(node -v))"
fi
require_cmd pnpm

if [[ ! -f package.json ]]; then
  fail "package.json missing — complete P0 scaffold (plan.html step 1+)"
  print_summary
fi

echo ""
echo "## package.json scripts"
REQUIRED_SCRIPTS=(dev build start lint test test:e2e db:generate db:migrate)
for s in "${REQUIRED_SCRIPTS[@]}"; do
  if node -e "const p=require('./package.json'); process.exit(p.scripts&&p.scripts['$s']?0:1)" 2>/dev/null; then
    pass "script: $s"
  else
    fail "missing script: $s"
  fi
done

echo ""
echo "## Source layout"
for f in \
  "src/app/layout.tsx" \
  "src/app/providers.tsx" \
  "src/app/(studio)/page.tsx" \
  "src/app/api/health/db/route.ts" \
  "src/lib/db/index.ts" \
  "src/lib/schemas/concept.ts" \
  "src/lib/ai/types.ts" \
  "drizzle.config.ts"; do
  assert_file_exists "$f"
done

echo ""
echo "## Environment"
if [[ ! -f .env.local ]]; then
  cp .env.example .env.local
  pass "created .env.local from .env.example"
else
  pass ".env.local exists"
fi

echo ""
echo "## Docker Postgres"
assert_docker_postgres_healthy

echo ""
echo "## Install & automated gate"
pnpm install --frozen-lockfile 2>/dev/null || pnpm install
pass "pnpm install"

pnpm db:migrate
pass "pnpm db:migrate"

pnpm lint
pass "pnpm lint"

pnpm test
pass "pnpm test"

pnpm build
pass "pnpm build"

pnpm test:e2e
pass "pnpm test:e2e"

echo ""
echo "## Runtime (curl — agent starts dev server if needed)"
DEV_PID=""
cleanup_dev() {
  if [[ -n "$DEV_PID" ]] && kill -0 "$DEV_PID" 2>/dev/null; then
    kill "$DEV_PID" 2>/dev/null || true
    wait "$DEV_PID" 2>/dev/null || true
  fi
}
trap cleanup_dev EXIT

if curl -sf --max-time 2 http://localhost:3000/ >/dev/null 2>&1; then
  pass "dev server already running on :3000"
else
  echo "  → starting pnpm dev in background..."
  pnpm dev >/tmp/productizer-p0-dev.log 2>&1 &
  DEV_PID=$!
  for i in $(seq 1 60); do
    if curl -sf --max-time 2 http://localhost:3000/ >/dev/null 2>&1; then
      pass "dev server ready (pid $DEV_PID)"
      break
    fi
    if [[ $i -eq 60 ]]; then
      fail "dev server did not start in 60s (see /tmp/productizer-p0-dev.log)"
    fi
    sleep 1
  done
fi

curl_http_status "http://localhost:3000/" "200"
curl_json_field "http://localhost:3000/api/health/db" "ok" "true"
curl_body_matches "http://localhost:3000/" "Productizer"

echo ""
echo "## DB down graceful degradation"
docker compose stop postgres >/dev/null 2>&1 || true
sleep 2
BODY="$(curl -sf --max-time 10 http://localhost:3000/api/health/db 2>/dev/null || echo '{}')"
if echo "$BODY" | grep -qE '"ok"[[:space:]]*:[[:space:]]*false'; then
  pass "health API reports ok:false when postgres stopped"
else
  fail "health API should report ok:false when postgres stopped (got: $BODY)"
fi
HOME_CODE="$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 http://localhost:3000/ 2>/dev/null || echo '000')"
if [[ "$HOME_CODE" == "200" ]]; then
  pass "studio home still HTTP 200 when DB down"
else
  fail "studio home HTTP $HOME_CODE when DB down (expected 200 with error UI)"
fi
docker compose up -d postgres >/dev/null 2>&1 || true
sleep 3
curl_json_field "http://localhost:3000/api/health/db" "ok" "true"

echo ""
echo "## Theme token (curl built CSS)"
CSS_URL="$(curl -sf http://localhost:3000/ | grep -oE '/_next/static/css/[^"]+\.css' | head -1 || true)"
if [[ -n "$CSS_URL" ]]; then
  if curl -sf "http://localhost:3000$CSS_URL" | grep -qi 'f56400'; then
    pass "accent #f56400 found in compiled CSS"
  else
    fail "accent #f56400 not found in compiled CSS (check theme tokens)"
  fi
else
  skip "could not resolve CSS URL from home page (check theme in Playwright)"
fi

echo ""
echo "## UX (automated via Playwright — see e2e/)"
pass "UX checks delegated to pnpm test:e2e (title, shell, skeleton, a11y smoke)"

print_summary
