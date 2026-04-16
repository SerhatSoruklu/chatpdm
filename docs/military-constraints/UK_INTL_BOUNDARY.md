# UK_INTL_BOUNDARY

## Purpose

Record the boundary between the shared international baseline layer and the UK national layer.

## Shared International Layer

- `INTL_LOAC_BASE_V1` is the shared international legal-floor baseline.
- `INTL_PROTECTED_PERSON_BASE_V1` is the shared international protected-person baseline.
- `INTL_PROTECTED_SITE_BASE_V1` is the shared international protected-site baseline.
- These packs remain jurisdiction-neutral at the shared layer and do not carry UK-specific command or ROE assumptions.

## UK National Layer

- `UK_NATIONAL_BASE_V1` depends on `INTL_LOAC_BASE_V1`.
- `UK_ROE_BASE_V1` depends on `UK_NATIONAL_BASE_V1`.
- `UK_COMMAND_AUTHORITY_V1` depends on `UK_ROE_BASE_V1`.
- `UK_DELEGATION_CHAIN_V1` depends on `UK_COMMAND_AUTHORITY_V1`.
- The UK layer is source-backed and jurisdiction-specific.
- The UK layer uses the UK authority graph and the `UK_NATIONAL_COMMAND` owner level.

## Non-Overlaps

- UK command and delegation behavior MUST NOT be inferred from the INTL layer.
- INTL shared packs MUST NOT absorb UK national command semantics.
- Coalition and NATO merge behavior remains a later overlay concern, not part of the UK national foundation layer.

## Admission Truth

- The UK foundation wave is admitted on top of the shared INTL baseline.
- The UK layer exists to prove that the shared baseline is reusable across jurisdictions without cloning the US family mechanically.
