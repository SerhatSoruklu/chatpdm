# ChatPDM Concept Source Files

This folder contains authored concept source files for ChatPDM.

These files are canonical authoring artifacts.

This folder may also contain tightly bounded authored resolution-support files such as `resolve-rules.json` when deterministic ambiguity or suggestion behavior must be explicitly authored and reviewed.

Later runtime code may load from this folder directly or from a derived build step produced from this folder.

Rules:

- concepts must not be added casually
- authoring must follow the concept writing standard
- review must follow the concept review checklist
- concept scope must remain inside the published v1 concept boundary
- additions or removals require version discipline

This folder is not a dumping ground for ideas, loose notes, or speculative concepts.

If a concept is not ready to pass Phase 6 authoring and validation, it does not belong here as a published source artifact.

Templates for Phase 6 source files live in `templates/`.
