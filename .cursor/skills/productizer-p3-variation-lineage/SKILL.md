---
name: productizer-p3-variation-lineage
description: >-
  Implement Productizer roadmap P3 Variation Lineage: concept_variations table,
  approved_variation_id on concepts, REST /api/concepts/:id/variations,
  approve/reject workflow, VariationGallery with Framer Motion, Playwright approve flow.
  Use when implementing phase 3 or specs/20260520-phase3-variation-lineage.
---

# Productizer P3 — Variation Lineage

## Before coding

1. Branch: `phase/3-variation-lineage` off latest `master` (`productizer-git-workflow`)
2. Read `specs/20260520-phase3-variation-lineage/requirements.html` (including **Phase amendments**)
3. Follow `plan.html` step order
4. Run `./scripts/validate-p3.sh --tier docs` after spec-only commits; full script before PR

## In-phase drop-in requests

On UX or behavior changes during P3, update `specs/20260520-phase3-variation-lineage/` in the same session as code—see `specs/validation-policy.html#in-phase-amendments`.

## Implementation checklist

### Database (R3.1–R3.2)

- Add `conceptVariations` table; `approvedVariationId` on `designConcepts`
- Self-FK `parentVariationId`; optional `sourceAssetId` → `design_assets`
- `pnpm db:generate && pnpm db:migrate`

### Storage (R3.4–R3.5, R3.8)

- Keys under `{STORAGE_ROOT}/variations/{variationId}/` — server-generated only
- Reuse sharp pipeline from `src/lib/assets/process-image.ts` where practical
- `from-asset` route copies files from asset folder to variation folder

### API (R3.3–R3.7)

- `GET` + `POST` `src/app/api/concepts/[id]/variations/route.ts`
- `POST` `src/app/api/concepts/[id]/variations/from-asset/route.ts`
- `PATCH` `src/app/api/concepts/[id]/variations/[variationId]/route.ts`
- `GET` `src/app/api/variations/[id]/file/route.ts` — `?variant=thumb|card|full`
- Single-approved rule in repository (transaction)
- JSON errors: `{ error: string }`

### Client (R3.9–R3.13)

- `src/hooks/use-variations.ts`
- `src/components/variations/variation-gallery.tsx`
  - `data-testid`: `variation-gallery`, `variation-upload`, `variation-approve`, `variation-reject`, `variation-from-preview`
- Framer Motion stagger; honor `prefers-reduced-motion`
- Wire on `src/app/(studio)/concepts/[id]/page.tsx`

### Tests (R3.14–R3.16)

- `src/lib/schemas/variation.ts` + Vitest
- `e2e/variation-lineage.spec.ts` — upload + approve + second approve demotes first
- `./scripts/validate-p3.sh` exit 0 before PR

## Out of scope (defer)

- AI generation, TanStack AI, `prompt_snapshot` from providers (P4)
- Poster mock, product types (P5)
- Dashboard MiniMock home (P6)
- Auth, Etsy, niche research

## Related

- `productizer-p2-asset-upload` — reference assets + preview
- `productizer-phase-validate` — run validate script before PR
