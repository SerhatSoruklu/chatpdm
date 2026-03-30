# ChatPDM Concept Source Files

This folder contains authored concept source files for ChatPDM.

These files are canonical authoring artifacts.

This folder may also contain tightly bounded authored resolution-support files such as `resolve-rules.json` when deterministic ambiguity or suggestion behavior must be explicitly authored and reviewed.

Later runtime code may load from this folder directly or from a derived build step produced from this folder.

Rules:

- concepts must not be added casually
- authoring must follow the concept writing standard
- authoring for public runtime prose must also follow `docs/public/register-contract.md`
- review must follow the concept review checklist
- concept scope must remain inside the published v1 concept boundary
- additions or removals require version discipline

Published concept packets must carry:

- lifecycle metadata:
  - `concept`
  - `version`
  - `state`
  - `previousVersion`
  - `createdAt`
  - `updatedAt`
- static `canonical` anchor data
- top-level canonical prose fields
- authored `registers.standard`
- authored `registers.simplified`
- authored `registers.formal`

`registers.standard` must match the top-level canonical prose exactly.

V3 governance concept structure is now defined as a shared foundation module in:

- `backend/src/modules/concepts/concept-structure-schema.js`

It is not enforced on published packets yet.
It exists so validators and loaders can adopt structured concept fields without
breaking current text-first packets.

An internal duty-only example fixture lives at:

- `examples/duty-structure-v3.example.json`

An internal relation-schema example fixture lives at:

- `examples/concept-relations-v1.example.json`

Authored relation packets now live in:

- `relations/authority.json`
- `relations/duty.json`
- `relations/legitimacy.json`
- `relations/power.json`
- `relations/responsibility.json`

Validator and runtime relation policy is controlled by:

- `REQUIRE_AUTHORED_RELATIONS=false`
  - compatible mode
  - missing authored relation packets warn and may fall back to seeded defaults
- `REQUIRE_AUTHORED_RELATIONS=true`
  - strict mode
  - missing authored relation packets fail validation and do not fall back

During the Duty-first V3 rollout, concept packets may optionally include:

- `structureV3`

This block is additive and backward-compatible.
It does not replace the canonical prose or authored reading registers.

Duty rollout regression fixtures live at:

- `../../tests/validator/fixtures/duty.complete-v3.json`
- `../../tests/validator/fixtures/duty.partial-v3.json`
- `../../tests/validator/fixtures/duty.legacy-text-only.json`

Responsibility rollout regression fixtures live at:

- `../../tests/validator/fixtures/responsibility.complete-v3.json`
- `../../tests/validator/fixtures/responsibility.partial-v3.json`
- `../../tests/validator/fixtures/responsibility.legacy-text-only.json`

Authority rollout regression fixtures live at:

- `../../tests/validator/fixtures/authority.complete-v3.json`
- `../../tests/validator/fixtures/authority.partial-v3.json`
- `../../tests/validator/fixtures/authority.legacy-text-only.json`

Power rollout regression fixtures live at:

- `../../tests/validator/fixtures/power.complete-v3.json`
- `../../tests/validator/fixtures/power.partial-v3.json`
- `../../tests/validator/fixtures/power.legacy-text-only.json`

Legitimacy rollout regression fixtures live at:

- `../../tests/validator/fixtures/legitimacy.complete-v3.json`
- `../../tests/validator/fixtures/legitimacy.partial-v3.json`
- `../../tests/validator/fixtures/legitimacy.legacy-text-only.json`

The `canonical` block defines the invariant meaning anchor for all three registers:

- `canonical.invariant`
- `canonical.excludes`
- `canonical.adjacent`

This folder is not a dumping ground for ideas, loose notes, or speculative concepts.

If a concept is not ready to pass Phase 6 authoring and validation, it does not belong here as a published source artifact.

Version archive snapshots live in `../concept-versions/`.
Published packets in this folder represent the current active surface, not the full historical record.

Templates for Phase 6 source files live in `templates/`.

Current published reference-standard packets for multi-register authoring are:

- `authority`
- `power`
- `legitimacy`
- `duty`
- `responsibility`

Before publishing any new concept packet, run register divergence validation across the full published packet set:

- `npm run validate:register-divergence`
- or `npm --prefix ./backend run validate:register-divergence`

Before tightening authored relation enforcement, run the full validator and hardening checks:

- `npm run validate:registers`
- `npm --prefix ./backend run check`
