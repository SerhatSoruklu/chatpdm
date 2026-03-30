# Concept Version Archive

This folder stores explicit version snapshots for ChatPDM concepts.

Current convention:

- `data/concepts/<concept>.json` holds the active packet
- `data/concept-versions/<concept>/v<version>.json` holds archived snapshots

The archive exists so previously published packets do not disappear when later versions are authored.

This folder is not loaded by the current runtime.
