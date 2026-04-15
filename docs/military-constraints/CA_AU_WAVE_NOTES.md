# CA/AU Wave Notes

## Purpose

This note records the Canada and Australia expansion wave as a separate pair of national families built on top of the shared INTL baseline.

## Shared Pattern

- `INTL_LOAC_BASE_V1` remains the shared legal floor.
- `INTL_PROTECTED_PERSON_BASE_V1` and `INTL_PROTECTED_SITE_BASE_V1` remain the shared international protection baselines.
- Canada and Australia both reuse the same national structure proven by the UK surface:
  - national base
  - ROE base
  - command authority
  - delegation chain
  - first bounded airspace-control domain

## National Difference

- Canada and Australia remain separate families.
- Each family has its own source registry entries, authority graph fixture, manifests, reviewed clauses, and admission records.
- No pack in the Canada family depends on the Australia family.
- No pack in the Australia family depends on the Canada family.

## Admitted Packs

### Canada

- `CA_NATIONAL_BASE_V1`
- `CA_ROE_BASE_V1`
- `CA_COMMAND_AUTHORITY_V1`
- `CA_DELEGATION_CHAIN_V1`
- `CA_AIRSPACE_CONTROL_V1`

### Australia

- `AU_NATIONAL_BASE_V1`
- `AU_ROE_BASE_V1`
- `AU_COMMAND_AUTHORITY_V1`
- `AU_DELEGATION_CHAIN_V1`
- `AU_AIRSPACE_CONTROL_V1`

## Boundary Rule

If a later Canada or Australia pack needs a shared protection or legal primitive, it MUST depend on the INTL baseline or the relevant national foundation pack.

It MUST NOT import US-specific, UK-specific, or coalition-specific logic unless the dependency is declared and justified by the pack contract.
