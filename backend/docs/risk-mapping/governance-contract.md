# Risk Mapping Governance Contract

Risk Mapping Governance (RMG) governs authored artifact changes for the risk-mapping subsystem.
It exists to prevent silent drift in the domain manifest, registries, and evidence packs.

## Governed Release

A governed release is a file-based release record with explicit metadata for:

- `releaseId`
- `domainId`
- `entity`
- `evidenceSetVersion`
- `registryVersion`
- `status`
- `frozenAt`
- `registryHash`
- `notes`
- authored artifact paths

Every active release must be represented explicitly in governance data.

## Release Statuses

Allowed statuses in this phase:

- `active`: the current admitted release for a tuple
- `candidate`: a proposed release under review
- `superseded`: a release replaced by a newer admitted release
- `rejected`: a release that failed structural or compatibility requirements

## Admission Rules

A candidate release may be admitted only when all of the following pass:

- structural validation
- replay validation against the seeded replay fixture
- compatibility checks against the active release
- registry hash verification for the authored artifact set

If structural validation fails, the release is rejected.

If structural validation passes but replay or compatibility requires review, the release is frozen.

## Freeze vs Reject

Freeze is not reject.

- `freeze` means the candidate release is valid enough to hold, but not safe to activate yet
- `reject` means the candidate release is structurally invalid and cannot proceed

Freeze preserves audit visibility without silently activating the candidate.

## Why This Exists

RMG is intended to remain deterministic and refusal-first.
Governance is the control layer that keeps authored changes explicit, reviewable, and reproducible over time.
Governance language should stay boundary-based and should not imply prediction or hidden inference.
