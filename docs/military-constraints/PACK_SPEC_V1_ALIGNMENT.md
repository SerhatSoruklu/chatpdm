# PACK_SPEC_V1 Alignment Note

## Corrected Mismatches

- The prior draft used future-shaped fields such as `packVersion`, `manifestVersion`, `domain`, and `summary` as if they were part of the current admission contract. The repo currently admits packs through a reference-pack manifest plus compiled bundle workflow, so the spec now uses the real manifest fields: `packId`, `jurisdiction`, `bundleId`, `bundleVersion`, `reviewedClauseSetIds`, `authorityGraphId`, `sourceRegistryVersion`, and `regressionSuiteVersion`.
- The prior draft described a generic source model. The repo uses a source registry schema with `sourceId`, `title`, `localPath`, `jurisdiction`, `role`, `authorityTier`, `admissibility`, `extractionQuality`, `exampleOnly`, `sourceVersion`, `trustTier`, and `locator`, plus optional `normativeOverride` and `notes`.
- Reviewed clause artifacts now carry explicit provenance metadata with `derivationType`, `transformationNotes`, and `parentClauseIds`, and compiled rules preserve that provenance as audit-only metadata.
- The prior draft described authority graphs with `nodes` and `edges`. The repo uses `levels` and `delegationEdges`, so the spec now matches that shape.
- The prior draft described hashing in abstract terms. The repo canonicalizes bundle content through `assembleBundle` and `computeBundleHash`, excluding `bundleHash` and `compiledAt`, with deterministic ordering applied before hashing.

## Minimal Follow-Up

- If future admitted-pack work introduces new manifest fields, update the manifest schema and this specification together.
- Do not add ad hoc pack-shape fields outside the manifest and bundle schemas.
