---
name: productizer-p1-concept-crud
description: >-
  Implement Productizer roadmap P1 Concept CRUD: design_concepts table,
  REST /api/concepts, RHF+Zod ConceptForm, TanStack Query useConcepts,
  studio gallery and detail pages. Use when implementing phase 1 or
  specs/20260519-phase1-concept-crud.
---

# Productizer P1 — Concept CRUD

## Before coding

1. Branch: `phase/1-concept-crud` off latest `master` (`productizer-git-workflow`)
2. Read `specs/20260519-phase1-concept-crud/requirements.html`
3. Follow `plan.html` step order
4. Run `./scripts/validate-p1.sh --tier docs` after spec-only commits; full script before PR

## Implementation checklist

### Database (R1.1)

- Add `designConcepts` to `src/lib/db/schema.ts` per tech-stack excerpt
- Status enum: `draft` | `active` | `archived` (text column)
- `pnpm db:generate && pnpm db:migrate`

### API (R1.2–R1.3)

- `GET/POST` `src/app/api/concepts/route.ts`
- `GET/PATCH/DELETE` `src/app/api/concepts/[id]/route.ts`
- DELETE = soft archive (`status: archived`)
- Validate with `conceptFormSchema` (+ uuid param for id)
- JSON errors: `{ error: string }`

### Data layer

- Prefer `src/lib/concepts/repository.ts` for Drizzle queries
- Map DB snake_case → API camelCase

### Client (R1.4–R1.8)

- Reuse `src/lib/schemas/concept.ts`
- `src/hooks/use-concepts.ts` — queries + mutations + invalidation + Sonner
- Components: `concept-form.tsx`, `concept-card.tsx`, optional `concept-gallery.tsx`
- Pages: `/concepts`, `/concepts/new`, `/concepts/[id]`
- shadcn: input, textarea, label, badge, alert-dialog

### Studio (R1.9)

- Update `src/app/(studio)/page.tsx`: P1 badge, link to `/concepts`, remove disabled placeholder

### Tests (R1.10–R1.11)

- Vitest: schema + API/repository tests
- Playwright: `e2e/concepts-crud.spec.ts` with `data-testid` from validation.html

## Validation

```bash
chmod +x scripts/validate-p1.sh
./scripts/validate-p1.sh
```

Fix all FAIL lines before PR. Paste summary in PR body (`productizer-phase-validate`).

## Out of scope

- Uploads, `concept_variations`, AI, mocks, auth, Etsy
- Hard delete
- P6 dashboard hero from assets

## Conventions

- TypeScript strict, async/await
- Match P0 patterns: App Router, shadcn, TanStack Query, Etsy accent tokens
- JSDoc on exported functions
