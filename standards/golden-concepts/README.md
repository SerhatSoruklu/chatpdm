# Golden Concepts

This folder contains the frozen reference-standard concept packets for ChatPDM register authoring.

Current golden concepts:

- `authority`
- `power`
- `legitimacy`
- `duty`
- `responsibility`

Rules:

- these snapshots are read-only by default
- changes require explicit `golden-update` intent
- snapshots should match the published concept packets exactly
- if a golden concept changes intentionally, update both copies in the same change set

These files exist to make drift visible early. They are not alternate runtime sources.
