# Risk Mapping Artifact Update Flow

This document defines the governed update flow for RMG authored artifacts.

## Flow

1. An authored artifact changes.
2. A deterministic diff report is generated.
3. Structural validation runs for the candidate release.
4. Replay validation runs against the seeded replay fixture.
5. Compatibility validation checks the candidate release against the active release.
6. A governance admission decision is derived.
7. The candidate release is either admitted, frozen, or rejected.

## Required Inputs

The governed update flow operates on:

- domain manifest
- node registry
- threat registry
- causal compatibility registry
- falsifier registry
- evidence pack

## Required Checks

Before admission, the candidate release must:

- validate structurally
- preserve replayed resolver output for the seeded replay fixture
- preserve compact output invariants
- surface all changed authored ids in the diff report

## Output Artifacts

The update flow writes deterministic reports for:

- governance admission
- artifact diff
- frozen release records

These reports are audit surfaces, not runtime reasoning surfaces.

## Safety Boundary

This flow does not add new reasoning power.
It only controls change admission for existing authored artifacts.

