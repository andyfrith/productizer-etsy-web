---
name: productizer-phase-spec
description: >-
  Create or update Productizer phase spec folders under specs/ with
  plan.html, requirements.html, and validation.html. Use when starting a
  roadmap phase, writing phase requirements, validation checklists, or
  asking for YYYY-MM-DD-phase-feature-name spec directories.
---

# Productizer Phase Spec

## Folder convention

```
specs/{YYYYMMDD}-phase{N}-{slug}/
├── index.html          # Hub: links + deliverable summary
├── requirements.html   # MUST/SHOULD, acceptance criteria, out of scope
├── plan.html           # Ordered implementation steps
└── validation.html     # Automated gate + manual checks + PR template
```

- **Date:** `YYYYMMDD` (user may omit dashes; follow their explicit choice).
- **Slug:** lowercase, hyphenated (e.g. `phase0-scaffold`, `phase1-concept-crud`).
- **Styles:** Link `../shared.css` from phase HTML files (light, text-first; see `brainstorm/visual-outputs.html`).
- **LLM clarity:** Add `doc-context` block at top of each article; use tables and `pre.text-flow` instead of mini-mock decorations.

## Git branch (required)

Before creating spec files, ensure branch `phase/{N}-{slug}` exists and is checked out. See `productizer-git-workflow` and `specs/git-workflow.html`. Document the branch name in `index.html` and `validation.html`.

## Workflow

Prefer **`productizer-begin-next-phase-planning`** when starting a **new** phase from the roadmap (or use command `/begin-next-phase-planning`).

1. Read `specs/roadmap.html` for phase number, deliverable, and dependencies.
2. Read `specs/tech-stack.html` and `specs/mission.html` for constraints.
3. Use **AskQuestion** to confirm: phase ID, scope (full vs partial), Node/pnpm versions, validation bar, folder name.
4. Create the four HTML files; mirror tone/structure of `specs/20260519-phase0-scaffold/`.
5. Add hub card on `specs/index.html` under a **Phase specs** section.
6. Optional: link from the roadmap phase row to `specs/{folder}/index.html`.

## requirements.html

- **Decided** block for locked kickoff choices.
- Table: `R{n}.{m}` IDs, requirement, acceptance column.
- Explicit **Out of scope** list referencing later phases.
- **Proposed repo layout** when touchpoints are known.

## plan.html

- Numbered steps; each step leaves repo runnable.
- Concrete commands (`pnpm`, `docker compose`, `drizzle-kit`).
- Reference project skill for implementation (e.g. `productizer-p0-scaffold`).
- Risks table for common failures.

## validation.html

Follow `specs/validation-policy.html`. **Agent-first, minimal manual.**

- **Step 1:** `./scripts/validate-pN.sh` (create script alongside spec).
- **Table:** each check → script / curl / Playwright (not "user confirms").
- **Manual section:** ≤ 3 items (Docker/ports blocked, GitHub merge only).
- **Playwright:** encode former manual UX checks in `e2e/`.
- **PR checklist:** agent pastes script PASS/FAIL summary.
- Add `scripts/validate-pN.sh` using `scripts/validate-lib.sh` helpers.

## Do not

- Create or edit phase specs on `master` — use `phase/{N}-{slug}`.
- Commit `.env.local` or API keys.
- Expand scope into the next roadmap phase without user approval.
- Skip validation.html — every phase needs a PR-ready definition of done.
