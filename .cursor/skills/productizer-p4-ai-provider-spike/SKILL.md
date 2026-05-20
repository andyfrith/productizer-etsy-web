---
name: productizer-p4-ai-provider-spike
description: >-
  Implement Productizer roadmap P4 AI Provider Spike: ImageGenerationProvider
  (Nano Banana + mock), POST /api/concepts/:id/variations/generate with streaming
  progress, useGenerateVariations hook, GenerateVariationsPanel, Playwright mock flow.
  Use when implementing phase 4 or specs/20260520-phase4-ai-provider-spike.
---

# Productizer P4 — AI Provider Spike

## Before coding

1. Branch: `phase/4-ai-provider-spike` off latest `master` (`productizer-git-workflow`)
2. Read `specs/20260520-phase4-ai-provider-spike/requirements.html` (including **Phase amendments**)
3. Follow `plan.html` step order
4. Run `./scripts/validate-p4.sh --tier docs` after spec-only commits; full script before PR

## In-phase drop-in requests

On UX or behavior changes during P4, update `specs/20260520-phase4-ai-provider-spike/` in the same session as code—see `specs/validation-policy.html#in-phase-amendments`.

## Implementation checklist

### Providers (R4.1–R4.4)

- Extend `src/lib/ai/types.ts`
- `src/lib/ai/providers/mock.ts` — fixture image for CI
- `src/lib/ai/providers/nanobanana.ts` — live API when `NANOBANANA_API_KEY` set
- `src/lib/ai/registry.ts` — `AI_PROVIDER` env + mock fallback
- `tests/ai-registry.test.ts`

### Orchestration (R4.5–R4.7, R4.11)

- `src/lib/schemas/generate-variation.ts`
- `src/lib/ai/generate-variations.ts` — loop, provider call, persist via `variations/repository`, set `prompt_snapshot`
- Reference image from `sourceAssetId` when provided

### API (R4.6, R4.8)

- `src/app/api/concepts/[id]/variations/generate/route.ts` — SSE/NDJSON progress events
- Events: `queued`, `generating`, `saved`, `done`, `error`

### Client (R4.9–R4.10)

- `src/hooks/use-generate-variations.ts` — stream parser + cache invalidation
- `src/components/variations/generate-variations-panel.tsx`
  - `data-testid`: `variation-generate-submit`, `variation-generate-status`
- Wire on `src/app/(studio)/concepts/[id]/page.tsx` above `VariationGallery`

### Tests (R4.12–R4.14)

- `tests/generate-variation-schema.test.ts`
- `e2e/variation-generate.spec.ts` — mock provider, count=2
- `./scripts/validate-p4.sh` exit 0 before PR

### Docs (R4.15)

- README AI section; `.env.example` keys documented

## Out of scope (defer)

- Poster mock, product types (P5)
- Dashboard MiniMock home (P6)
- Redis job queue / `generation_jobs` table
- Auto-approve AI variations
- Auth, Etsy, niche research

## Related

- `productizer-p3-variation-lineage` — gallery + persistence target
- `productizer-phase-validate` — run validate script before PR
