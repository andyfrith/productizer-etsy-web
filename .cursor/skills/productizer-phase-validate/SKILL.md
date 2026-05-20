---
name: productizer-phase-validate
description: >-
  Run automated phase validation for Productizer before PRs: execute
  scripts/validate-p0.sh (or phase script), curl health endpoints, docker,
  git checks. Use when validating a phase, completing implementation,
  or preparing a pull request. Minimize manual user checks.
---

# Productizer Phase Validation

**Principle:** The agent runs every check that can be automated. Manual user steps are last resort only.

## Before every PR

1. Read `specs/{phase-folder}/validation.html`
2. Run the phase validation script from repo root
3. Fix all `FAIL` lines; re-run until `VALIDATION PASSED`
4. Paste script output summary into PR description

## P0 commands

```bash
# Docs-only PR (no package.json yet)
./scripts/validate-p0.sh --tier docs

# Full P0 (after Next.js scaffold exists)
chmod +x scripts/validate-p0.sh scripts/validate-lib.sh
./scripts/validate-p0.sh
```

## What the agent must run itself

| Check | How |
|-------|-----|
| Branch | `git branch --show-current` |
| Secrets | script `assert_no_secrets_in_diff` |
| Spec files | script file existence |
| Postgres | `docker compose up -d` + health |
| Lint/test/build | `pnpm lint`, `pnpm test`, `pnpm build` |
| E2E + UX | `pnpm test:e2e` (Playwright, not human eyes) |
| HTTP | `curl` home + `/api/health/db` |
| DB down | script stops postgres, curls, restarts |
| Theme accent | script greps compiled CSS for `f56400` |
| Dev server | script starts `pnpm dev` if not running |

## Do not ask the user to

- Confirm curl/HTTP results the agent can run
- Run `pnpm test` / lint / build manually if agent has shell access
- Visually verify items covered by Playwright specs

## When user is needed (rare)

- Docker Desktop not installed / not running
- Port 3000 or 5432 blocked by another process
- GitHub PR approval / merge click
- Subjective product judgment not encoded in tests

## Adding checks for new phases

1. Copy `scripts/validate-p0.sh` → `scripts/validate-pN.sh`
2. In `validation.html`: list script command first; mark only irreducible items `MANUAL`
3. Encode UX in Playwright, not manual checklist

## Playwright UX coverage (P0)

E2E specs should assert (so humans don't):

- Page title contains "Productizer"
- Studio home renders Card (not Next default template)
- DB status visible (connected or error state)
- Skeleton appears while loading (or data-testid present)
- Focusable primary control exists
