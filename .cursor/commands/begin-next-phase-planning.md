# Begin next phase planning

Start spec kickoff for the next Productizer roadmap phase.

## Instructions

1. Read and follow the skill **productizer-begin-next-phase-planning**.
2. Read `specs/roadmap.html` and determine the next phase (or ask which phase if unclear).
3. Use **AskQuestion** to confirm phase, scope, API style, validation bar, and spec folder date.
4. Create `specs/{YYYYMMDD}-phase{N}-{slug}/` with `index.html`, `requirements.html`, `plan.html`, `validation.html`.
5. Add `scripts/validate-p{N}.sh` (docs tier + full tier).
6. Update `specs/index.html`, `specs/roadmap.html`, and `specs/validation-policy.html`.
7. Create `.cursor/skills/productizer-p{N}-{slug}/SKILL.md` when appropriate.
8. Remind the user to create branch `phase/{N}-{slug}` before implementation work.

Do **not** implement application code unless the user explicitly asks to start implementation in the same turn.
