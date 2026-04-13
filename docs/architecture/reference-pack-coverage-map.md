# Reference Pack Coverage Map

This map records the current frozen military-constraints packs, their bounded slices, and the regression coverage that protects them.

| Pack | Jurisdiction | Operational slice | Authority graph | Clause counts by type | Regression coverage | Known exclusions |
| --- | --- | --- | --- | --- | --- | --- |
| `mil-us-core-reference` | `US` | Core strike / legal-floor reference slice | `AUTH-GRAPH-US-001` | 21 total; `PROHIBITION` 5, `REQUIREMENT` 2, `AUTHORITY_GATE` 3, `DELEGATION` 2, `CAVEAT` 6, `DEFINITIONAL` 2, `EXAMPLE_ONLY` 1 | 4 frozen cases: legal-floor refusal, authority refusal, missing-fact refusal, allowed case | No maritime VBSS scope, no coalition synthesis, no example-only promotion without explicit override |
| `mil-us-maritime-vbss-core-v0.1.0` | `US` | Maritime VBSS / access-control reference slice | `AUTH-GRAPH-US-001` | 5 total; `REQUIREMENT` 4, `AUTHORITY_GATE` 1 | 2 frozen cases: allowed boarding/search case, unauthorized strike refusal | No naval combat slice, no coalition blending, no strike doctrine expansion, policy overlay remains a narrow authority gate only |

Release artifacts are written under `artifacts/military-constraints/releases/<packId>/<bundleVersion>/`.
