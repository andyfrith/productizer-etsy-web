#!/usr/bin/env bash
# P1 Concept CRUD validation — run from repo root: ./scripts/validate-p1.sh [--tier docs|full]
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

EXPECTED_BRANCH="phase/1-concept-crud"
SPEC_DIR="specs/20260519-phase1-concept-crud"
BASE_BRANCH="${VALIDATE_BASE_BRANCH:-master}"

echo "=== Productizer P1 validation (tier: $TIER) ==="
echo "Repo: $REPO_ROOT"
echo ""

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
echo "## Infra"
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
  fail "package.json missing — complete P0 first"
  print_summary
fi

echo ""
echo "## P1 source layout (full tier)"
P1_FILES=(
  "src/lib/db/schema.ts"
  "src/app/api/concepts/route.ts"
  "src/app/api/concepts/[id]/route.ts"
  "src/app/(studio)/concepts/page.tsx"
  "src/components/concepts/concept-form.tsx"
  "src/hooks/use-concepts.ts"
  "e2e/concepts-crud.spec.ts"
)
for f in "${P1_FILES[@]}"; do
  if [[ "$TIER" == "full" ]]; then
    assert_file_exists "$f"
  fi
done

if [[ "$TIER" == "docs" ]]; then
  print_summary
fi

# Schema: design_concepts referenced
if grep -q "design_concepts\|designConcepts" src/lib/db/schema.ts 2>/dev/null; then
  pass "schema references design_concepts"
else
  fail "schema missing design_concepts / designConcepts"
fi

if ls drizzle/*.sql 2>/dev/null | xargs grep -l "design_concepts" >/dev/null 2>&1; then
  pass "migration contains design_concepts"
else
  fail "no migration SQL for design_concepts (run db:generate)"
fi

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
echo "## Runtime (curl)"
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
  pnpm dev >/tmp/productizer-p1-dev.log 2>&1 &
  DEV_PID=$!
  for i in $(seq 1 60); do
    if curl -sf --max-time 2 http://localhost:3000/ >/dev/null 2>&1; then
      pass "dev server ready (pid $DEV_PID)"
      break
    fi
    if [[ $i -eq 60 ]]; then
      fail "dev server did not start in 60s (see /tmp/productizer-p1-dev.log)"
    fi
    sleep 1
  done
fi

# P0 regression
curl_http_status "http://localhost:3000/" "200"
curl_json_field "http://localhost:3000/api/health/db" "ok" "true"
curl_body_matches "http://localhost:3000/" "Productizer"

# P1 gallery page
curl_http_status "http://localhost:3000/concepts" "200"
curl_body_matches "http://localhost:3000/concepts" "concept-gallery|Concepts"

# REST CRUD smoke
UNIQUE_NAME="validate-p1-$(date +%s)"
CREATE_BODY="$(curl -sf -X POST http://localhost:3000/api/concepts \
  -H 'Content-Type: application/json' \
  -d "{\"name\":\"$UNIQUE_NAME\",\"campaignLabel\":\"validate\"}" 2>/dev/null)" || CREATE_BODY=""
if echo "$CREATE_BODY" | grep -q "\"id\""; then
  pass "POST /api/concepts returned id"
  CONCEPT_ID="$(echo "$CREATE_BODY" | grep -oE '"id"[[:space:]]*:[[:space:]]*"[^"]+"' | head -1 | sed 's/.*"\([^"]*\)"$/\1/')"
else
  fail "POST /api/concepts did not return id (body: $CREATE_BODY)"
  CONCEPT_ID=""
fi

if [[ -n "$CONCEPT_ID" ]]; then
  LIST_BODY="$(curl -sf http://localhost:3000/api/concepts 2>/dev/null)" || LIST_BODY=""
  if echo "$LIST_BODY" | grep -qF "$UNIQUE_NAME"; then
    pass "GET /api/concepts includes created concept"
  else
    fail "GET /api/concepts missing created concept name"
  fi

  ARCHIVE_BODY="$(curl -sf -X DELETE "http://localhost:3000/api/concepts/$CONCEPT_ID" 2>/dev/null)" || ARCHIVE_BODY=""
  if echo "$ARCHIVE_BODY" | grep -qE '"status"[[:space:]]*:[[:space:]]*"archived"'; then
    pass "DELETE /api/concepts/:id archived concept"
  else
    fail "DELETE /api/concepts/:id did not set status archived (body: $ARCHIVE_BODY)"
  fi
fi

echo ""
echo "## UX (Playwright — e2e/concepts-crud.spec.ts)"
pass "CRUD UX delegated to pnpm test:e2e"

print_summary
