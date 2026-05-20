#!/usr/bin/env bash
# P2 Asset Upload validation — run from repo root: ./scripts/validate-p2.sh [--tier docs|full]
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

EXPECTED_BRANCH="phase/2-asset-upload"
SPEC_DIR="specs/20260520-phase2-asset-upload"
BASE_BRANCH="${VALIDATE_BASE_BRANCH:-master}"

echo "=== Productizer P2 validation (tier: $TIER) ==="
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
  if grep -q '"db:studio"' package.json 2>/dev/null; then
    pass "package.json has db:studio script"
  else
    fail "package.json missing db:studio script"
  fi
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
  fail "package.json missing"
  print_summary
fi

if grep -q '"db:studio"' package.json 2>/dev/null; then
  pass "package.json has db:studio script"
else
  fail "package.json missing db:studio script"
fi

echo ""
echo "## P2 source layout (full tier)"
P2_FILES=(
  "src/lib/db/schema.ts"
  "src/app/api/assets/route.ts"
  "src/app/api/assets/[id]/route.ts"
  "src/app/api/assets/[id]/file/route.ts"
  "src/components/assets/asset-upload.tsx"
  "src/hooks/use-upload-asset.ts"
  "e2e/asset-upload.spec.ts"
  "e2e/fixtures/sample.png"
)
for f in "${P2_FILES[@]}"; do
  assert_file_exists "$f"
done

# Schema: design_assets + reference_asset_id
if grep -q "design_assets\|designAssets" src/lib/db/schema.ts 2>/dev/null; then
  pass "schema references design_assets"
else
  fail "schema missing design_assets / designAssets"
fi

if grep -q "reference_asset_id\|referenceAssetId" src/lib/db/schema.ts 2>/dev/null; then
  pass "schema references reference_asset_id on concepts"
else
  fail "schema missing reference_asset_id / referenceAssetId"
fi

if ls drizzle/*.sql 2>/dev/null | xargs grep -l "design_assets" >/dev/null 2>&1; then
  pass "migration contains design_assets"
else
  fail "no migration SQL for design_assets (run db:generate)"
fi

if grep -q '"sharp"' package.json 2>/dev/null; then
  pass "sharp dependency present"
else
  fail "package.json missing sharp dependency"
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
  pnpm dev >/tmp/productizer-p2-dev.log 2>&1 &
  DEV_PID=$!
  for i in $(seq 1 60); do
    if curl -sf --max-time 2 http://localhost:3000/ >/dev/null 2>&1; then
      pass "dev server ready (pid $DEV_PID)"
      break
    fi
    if [[ $i -eq 60 ]]; then
      fail "dev server did not start in 60s (see /tmp/productizer-p2-dev.log)"
    fi
    sleep 1
  done
fi

# P0/P1 regression
curl_http_status "http://localhost:3000/" "200"
curl_json_field "http://localhost:3000/api/health/db" "ok" "true"
curl_http_status "http://localhost:3000/concepts" "200"

UNIQUE_NAME="validate-p2-$(date +%s)"
CREATE_BODY="$(curl -sf -X POST http://localhost:3000/api/concepts \
  -H 'Content-Type: application/json' \
  -d "{\"name\":\"$UNIQUE_NAME\",\"campaignLabel\":\"validate\"}" 2>/dev/null)" || CREATE_BODY=""
if echo "$CREATE_BODY" | grep -q "\"id\""; then
  pass "POST /api/concepts returned id"
  CONCEPT_ID="$(echo "$CREATE_BODY" | grep -oE '"id"[[:space:]]*:[[:space:]]*"[^"]+"' | head -1 | sed 's/.*"\([^"]*\)"$/\1/')"
else
  fail "POST /api/concepts did not return id"
  CONCEPT_ID=""
fi

FIXTURE="e2e/fixtures/sample.png"
if [[ -n "$CONCEPT_ID" && -f "$FIXTURE" ]]; then
  UPLOAD_BODY="$(curl -sf -X POST http://localhost:3000/api/assets \
    -F "file=@$FIXTURE" \
    -F "conceptId=$CONCEPT_ID" 2>/dev/null)" || UPLOAD_BODY=""
  if echo "$UPLOAD_BODY" | grep -q "\"id\""; then
    pass "POST /api/assets returned id"
    ASSET_ID="$(echo "$UPLOAD_BODY" | grep -oE '"id"[[:space:]]*:[[:space:]]*"[^"]+"' | head -1 | sed 's/.*"\([^"]*\)"$/\1/')"
  else
    fail "POST /api/assets did not return id (body: $UPLOAD_BODY)"
    ASSET_ID=""
  fi

  if [[ -n "${ASSET_ID:-}" ]]; then
    curl_http_status "http://localhost:3000/api/assets/$ASSET_ID" "200"
    curl_http_status "http://localhost:3000/api/assets/$ASSET_ID/file?variant=card" "200"

    DETAIL_BODY="$(curl -sf "http://localhost:3000/api/concepts/$CONCEPT_ID" 2>/dev/null)" || DETAIL_BODY=""
    if echo "$DETAIL_BODY" | grep -qE '"referenceAssetId"[[:space:]]*:[[:space:]]*"' 2>/dev/null; then
      if echo "$DETAIL_BODY" | grep -qF "$ASSET_ID"; then
        pass "GET /api/concepts/:id includes referenceAssetId"
      else
        fail "concept detail referenceAssetId does not match uploaded asset"
      fi
    else
      fail "GET /api/concepts/:id missing referenceAssetId after upload"
    fi
  fi
else
  fail "skipped asset upload curl (missing concept id or $FIXTURE)"
fi

echo ""
echo "## UX (Playwright — e2e/asset-upload.spec.ts)"
pass "upload UX delegated to pnpm test:e2e"

print_summary
