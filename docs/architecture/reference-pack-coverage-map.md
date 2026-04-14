# Reference Pack Coverage Map

This map records the current frozen military-constraints packs, their bounded slices, and the regression coverage that protects them.
It represents the locked v1 pack surface: Packs 1 through 5 are frozen, and Pack 6+ is post-v1 expansion only.

| Pack | Jurisdiction | Operational slice | Authority graph | Clause counts by type | Regression coverage | Known exclusions |
| --- | --- | --- | --- | --- | --- | --- |
| `mil-us-core-reference` | `US` | Core strike / legal-floor reference slice | `AUTH-GRAPH-US-001` | 21 total; `PROHIBITION` 5, `REQUIREMENT` 2, `AUTHORITY_GATE` 3, `DELEGATION` 2, `CAVEAT` 6, `DEFINITIONAL` 2, `EXAMPLE_ONLY` 1 | 4 frozen cases: legal-floor refusal, authority refusal, missing-fact refusal, allowed case | No maritime VBSS scope, no coalition synthesis, no example-only promotion without explicit override |
| `mil-us-maritime-vbss-core-v0.1.0` | `US` | Maritime VBSS / access-control reference slice | `AUTH-GRAPH-US-001` | 5 total; `REQUIREMENT` 4, `AUTHORITY_GATE` 1 | 2 frozen cases: allowed boarding/search case, unauthorized strike refusal | No naval combat slice, no coalition blending, no strike doctrine expansion, policy overlay remains a narrow authority gate only |
| `mil-us-medical-protection-core-v0.1.0` | `US` | Medical / protected-object reference slice | `AUTH-GRAPH-US-001` | 8 reviewed; `REQUIREMENT` 7, review-only gate 1 | 4 frozen cases: protected hospital refusal, missing loss-of-protection refusal, unauthorized confirmed-loss refusal, authorized confirmed-loss allowed case | No broader hospital attack engine, no proportionality expansion pack, no coalition blending, no new predicate operators |
| `mil-us-civilian-school-protection-core-v0.1.0` | `US` | Civilian / school-protection reference slice | `AUTH-GRAPH-US-001` | 8 reviewed; `REQUIREMENT` 7, review-only gate 1 | 4 frozen cases: protected school refusal, missing protected-class refusal, unauthorized confirmed-objective refusal, authorized confirmed-objective allowed case | No hospital regime reuse, no civilian-harm optimization engine, no coalition blending, no new predicate operators |
| `mil-us-protected-person-state-core-v0.1.0` | `US` | Protected-person state reference slice | `AUTH-GRAPH-US-001` | 8 reviewed; `REQUIREMENT` 7, review-only gate 1 | 6 frozen cases: civilian refusal, medical personnel refusal, missing direct-participation refusal, hors de combat refusal, unauthorized confirmed-participation refusal, authorized confirmed-participation allowed case | No object-protection regime reuse, no cultural-property expansion, no coalition blending, no new predicate operators |

Release artifacts are written under `artifacts/military-constraints/releases/<packId>/<bundleVersion>/`.
