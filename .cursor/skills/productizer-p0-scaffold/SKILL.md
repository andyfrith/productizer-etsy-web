---
name: productizer-p0-scaffold
description: >-
  Implement Productizer roadmap P0 scaffold: Next.js App Router, shadcn/ui,
  Drizzle, Docker Postgres, TanStack Query, Vitest, Playwright, design tokens.
  Use when bootstrapping the app, running phase0 scaffold, or fulfilling
  specs/20260519-phase0-scaffold requirements.
---

# Productizer P0 Scaffold

## Branch (required)

Work only on **`phase/0-scaffold`**, branched from latest `master`. Merge via PR only. See `productizer-git-workflow`.

```bash
git fetch origin && git checkout master && git pull
git checkout phase/0-scaffold || git checkout -b phase/0-scaffold
```

## Source of truth

1. `specs/20260519-phase0-scaffold/requirements.html` — acceptance criteria
2. `specs/20260519-phase0-scaffold/plan.html` — step order
3. `specs/20260519-phase0-scaffold/validation.html` — done definition
4. `specs/tech-stack.html` — stack choices and repo layout

## Locked choices

- **pnpm**, **Node 22**
- Latest stable **Next.js** App Router, `--src-dir`, `@/*` alias
- Postgres via existing `docker-compose.yml`; app on host (`pnpm dev`)
- Accent **#f56400** (Etsy-adjacent) in shadcn theme

## Implementation order

Follow `plan.html` steps 1–8. After each major step, run `pnpm dev` or `pnpm build` to verify.

### Preserve on scaffold

Do not delete or overwrite:

- `specs/`, `brainstorm/`, `docker-compose.yml`, `.env.example`
- Merge README; keep constitution links

### Minimal P0 surfaces

| Surface | Purpose |
|---------|---------|
| `src/app/(studio)/page.tsx` | Studio home, DB status, polish |
| `src/app/api/health/db/route.ts` | `SELECT 1` proof |
| `src/lib/db/` | Drizzle client |
| `src/lib/schemas/concept.ts` | Zod stub for P1 |
| `src/lib/ai/` | Provider interface + registry stub |
| `tests/` | ≥1 Vitest test |
| `e2e/smoke.spec.ts` | Home loads |

### package.json scripts (required)

`dev`, `build`, `start`, `lint`, `test`, `test:e2e`, `db:generate`, `db:migrate`

## Validation before PR

Use skill **`productizer-phase-validate`**. Agent runs (do not ask user):

```bash
chmod +x scripts/validate-p0.sh scripts/validate-lib.sh
./scripts/validate-p0.sh          # after package.json exists
# ./scripts/validate-p0.sh --tier docs   # before app scaffold
```

Script covers: git branch, secrets, docker, pnpm gate, curl home + `/api/health/db`, DB-down curl, CSS accent grep, Playwright via `test:e2e`.

Encode UX in Playwright (`data-testid="db-status"`, title Productizer, skeleton). User only if Docker/ports blocked or merging PR.

## Out of scope

No concept CRUD, uploads, AI live calls, auth, or Etsy. Do not add `design_concepts` UI until P1 unless user expands scope.
