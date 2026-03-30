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

- top-level canonical prose fields
- authored `registers.standard`
- authored `registers.simplified`
- authored `registers.formal`

`registers.standard` must match the top-level canonical prose exactly.

This folder is not a dumping ground for ideas, loose notes, or speculative concepts.

If a concept is not ready to pass Phase 6 authoring and validation, it does not belong here as a published source artifact.

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
