---
name: productizer-p2-asset-upload
description: >-
  Implement Productizer roadmap P2 Asset Upload: design_assets table,
  reference_asset_id on concepts, POST /api/assets multipart, sharp thumb/card/full,
  file serving route, AssetUpload UI on concept detail. Use when implementing
  phase 2 or specs/20260520-phase2-asset-upload.
---

# Productizer P2 — Asset Upload

## Before coding

1. Branch: `phase/2-asset-upload` off latest `master` (`productizer-git-workflow`)
2. Read `specs/20260520-phase2-asset-upload/requirements.html`
3. Follow `plan.html` step order
4. Run `./scripts/validate-p2.sh --tier docs` after spec-only commits; full script before PR

## Implementation checklist

### Database (R2.1–R2.2)

- Add `designAssets` table; `referenceAssetId` on `designConcepts`
- `pnpm db:generate && pnpm db:migrate`

### Dependencies (R2.4)

- `pnpm add sharp`
- `src/lib/assets/process-image.ts` — thumb (~256), card (~800), full (~2048 max edge)

### Storage (R2.4–R2.6)

- Keys under `{STORAGE_ROOT}/assets/{assetId}/` — server-generated only
- Reuse `ensureStorageRoot()` from `src/lib/storage.ts`

### API (R2.3–R2.5)

- `POST` `src/app/api/assets/route.ts` — `formData()`, file + optional `conceptId`
- `GET` `src/app/api/assets/[id]/route.ts` — metadata
- `GET` `src/app/api/assets/[id]/file/route.ts` — `?variant=thumb|card|full`
- MIME allowlist: png, jpeg, webp; max size ~10MB
- JSON errors: `{ error: string }`

### Data layer

- `src/lib/assets/repository.ts` — create asset, write files, link concept
- `src/lib/schemas/asset.ts` — validation constants

### Client (R2.7–R2.8)

- `src/hooks/use-upload-asset.ts`
- `src/components/assets/asset-upload.tsx` with `data-testid="asset-upload"` and `data-testid="asset-preview"`
- Wire into `src/app/(studio)/concepts/[id]/page.tsx`

### Tests (R2.10–R2.11)

- Vitest: schema / path helpers
- `e2e/fixtures/sample.png` + `e2e/asset-upload.spec.ts`

### Dev tooling (R2.9)

- Ensure `db:studio` in `package.json` and README

## Validation

```bash
chmod +x scripts/validate-p2.sh
./scripts/validate-p2.sh
```

Fix all FAIL lines before PR. Paste summary in PR body (`productizer-phase-validate`).

## Out of scope

- `concept_variations`, AI, mocks, cloud storage, auth
- Video/SVG uploads
- Standalone asset library page

## Conventions

- TypeScript strict, async/await
- Match P1 patterns: REST routes, TanStack Query, shadcn, Sonner
- JSDoc on exported functions
