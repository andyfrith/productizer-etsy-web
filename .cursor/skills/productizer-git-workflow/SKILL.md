---
name: productizer-git-workflow
description: >-
  Enforces Productizer branch and PR workflow: phase/N-slug branches off master,
  one phase per PR, validation before merge. Use before starting phase work,
  creating files, committing, or opening pull requests.
---

# Productizer Git Workflow

Canonical doc: `specs/git-workflow.html`

## Rules (non-negotiable)

1. **Never** commit phase/feature work directly to `master`.
2. **Always** use branch `phase/{N}-{slug}` for roadmap phase N (specs + code + tests).
3. **One phase per branch and per PR.**
4. Merge to `master` **only via pull request** after validation gate passes.
5. Branch from latest `master` before starting new work.

## Before creating or editing files

```bash
git fetch origin
git checkout master
git pull origin master
git branch --show-current   # must NOT be master for phase work
```

If not on the correct phase branch:

```bash
git checkout -b phase/N-slug   # new
# or
git checkout phase/N-slug      # existing
```

| Phase | Branch | Spec folder |
|-------|--------|-------------|
| P0 Scaffold | `phase/0-scaffold` | `specs/20260519-phase0-scaffold/` |
| P1 Concept CRUD | `phase/1-concept-crud` | `specs/20260519-phase1-concept-crud/` |
| P2 Asset Upload | `phase/2-asset-upload` | `specs/20260520-phase2-asset-upload/` |

## Commits

- Commit only on the phase branch.
- User must request commits explicitly (project rule).
- Suggested message prefix: `phase(N): …`

## Pull requests

1. Agent runs `./scripts/validate-pN.sh` (exit 0) — see `productizer-phase-validate`
2. Push: `git push -u origin phase/N-slug`
3. Title: `phase(N): short description`
4. Body: checklist from `specs/…/validation.html` + pasted script output
5. Target: `master`
6. User merges on GitHub after review (only manual step)

## Other branch types

- `fix/{slug}` — small bugfixes off master
- `chore/{slug}` — CI/tooling only, not a product phase

## If work was started on master

Create branch without losing work:

```bash
git checkout -b phase/N-slug
```

Future commits go on the branch; open PR to merge into `master`.
