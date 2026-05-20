---
name: productizer-begin-next-phase-planning
description: >-
  Start the next Productizer roadmap phase: read specs/roadmap.html, use
  AskQuestion for kickoff decisions, create specs/YYYYMMDD-phaseN-slug/ with
  plan.html, requirements.html, validation.html, index.html, validate-pN.sh
  stub, and phase implementation skill. Use when the user says begin next
  phase, start phase planning, or begin-next-phase-planning.
---

# Begin Next Phase Planning

Orchestrates **spec-only** kickoff for the next roadmap phase. Does not implement app code unless the user asks.

## When to use

- User: "begin next phase", "start P1 planning", `/begin-next-phase-planning`
- After previous phase merged to `master`
- Before creating `phase/{N}-{slug}` implementation branch (spec files may be committed on planning branch or with phase branch)

## Workflow

1. **Read context**
   - `specs/roadmap.html` — identify next phase (first phase without a spec link, or user override)
   - `specs/index.html` — existing phase specs
   - Latest merged phase spec folder (structure reference)
   - `specs/tech-stack.html`, `specs/mission.html`, `specs/validation-policy.html`
   - `productizer-git-workflow` skill

2. **AskQuestion** (required) — confirm:
   - Phase number & name (default: next in roadmap)
   - Scope: full vs MVP vs custom
   - API style if applicable (REST vs Server Actions)
   - Validation bar (full auto vs reduced)
   - Spec folder date `YYYYMMDD` (default: today, match P0 style `20260519-phaseN-slug`)

3. **Create spec folder** `specs/{YYYYMMDD}-phase{N}-{slug}/`
   - `index.html` — hub, branch, deliverable summary
   - `requirements.html` — R{n}.* IDs, decided block, out of scope
   - `plan.html` — numbered steps, skills, risks
   - `validation.html` — agent-first; maps to `scripts/validate-pN.sh`

4. **Scripts**
   - Add `scripts/validate-pN.sh` sourcing `validate-lib.sh`
   - Support `--tier docs` before implementation exists

5. **Constitution updates**
   - `specs/index.html` — hub card under Phase specs
   - `specs/roadmap.html` — link phase row → spec index
   - `specs/validation-policy.html` — script table row

6. **Phase implementation skill** (if new phase)
   - `.cursor/skills/productizer-p{N}-{slug}/SKILL.md` — implementation checklist from plan

7. **Git branch note**
   - Document `phase/{N}-{slug}` in spec; remind user to create branch before implementation commits
   - Do not commit on `master` if repo policy requires phase branch (see `productizer-git-workflow`)

## Slug examples

| Phase | Folder slug | Branch |
|-------|-------------|--------|
| P0 | `phase0-scaffold` | `phase/0-scaffold` |
| P1 | `phase1-concept-crud` | `phase/1-concept-crud` |
| P2 | `phase2-asset-upload` | `phase/2-asset-upload` |

## Do not

- Skip `validation.html` or validate script
- Expand scope into the next phase without user approval
- Implement feature code during planning unless explicitly requested
- Commit `.env.local` or secrets

## Related skills

- `productizer-phase-spec` — file templates and conventions
- `productizer-git-workflow` — branch/PR rules
- `productizer-phase-validate` — run before PR after implementation
