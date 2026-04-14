# Pack Semantic Drift Audit

Audit date: April 14, 2026.

This audit covers Packs 1 to 5 across reviewed clauses, compilation hints, compiled rules, regression fixtures, source-backed integration tests, and pack lifecycle behavior. The goal was to identify only real semantic drift and architecture-boundary violations, not style issues or documentation preferences.

## Method

- Reviewed the pack corpora in `reviewed-clauses/`
- Traced how `machineCandidate`, `reviewStatus`, and `compilationHint` flow through the compiler bridge
- Checked how `ALLOWED` is handled by the evaluator
- Compared frozen regression expectations against the compiled bundle behavior
- Checked pack lifecycle behavior only where it can affect semantic surface area

## Real Drift Findings

| Pack | Artifact | Drift class | Status | Exact problem | Why it is a semantic issue | Minimal fix | Fix locality |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Pack 5 | `backend/src/modules/military-constraints/reviewed-clauses/authority-protected-person-core.json` `CL-PER-AUTH-002` | Gate-clearance drift; reason-code mismatch | `REAL_DRIFT` | The clause says `evaluation may continue`, but it still compiles as an executable `POLICY_OVERLAY` rule with `effect.decision = ALLOWED` and `reasonCode = MISSING_REQUIRED_FACT`. Because `POLICY_OVERLAY` is the final stage in the bundle precedence order, this does not clear a later gate; it becomes a terminal allow-shaped runtime rule. | The clause is presentation-only continuation language being carried into runtime semantics. That leaks projection meaning into decision logic and makes the final stage look like an executable approval rule rather than review metadata. The `MISSING_REQUIRED_FACT` reason code is also a carryover from incompleteness handling, not from a confirmed authorization path. | Demote the clause to review-only metadata by removing `compilationHint` and setting `machineCandidate` to `false`, or delete the clause if it is only documentary. Do not add a new runtime decision state. | Local to pack data. No compiler or runtime change required. |

## Acceptable Patterns To Preserve

- Pack 1 `CLAUSE-LF-0004` is an admissibility gate with `ALLOWED` used as a continue signal in the `ADMISSIBILITY` stage. That is acceptable because later stages still exist and decide the final outcome.
- Pack 3 `CL-MED-ADM-003` is the same kind of admissibility gate. It is a valid gate-clearer because it sits before later legal-floor and overlay checks.
- Pack 4 `CL-CIV-LF-002` is also acceptable for the same reason. It is a legal-floor continuation gate, not a terminal approval rule.
- Pack 3 `CL-MED-AUTH-002` and Pack 4 `CL-CIV-AUTH-002` are already demoted to review-only metadata. That is the correct pattern for continuation notes that should not execute.
- The pack lifecycle root-pack shim in `reference-pack-lifecycle.js` is a tooling-only compatibility path for Pack 1. It does not change evaluator semantics and should be treated as acceptable release plumbing, not kernel drift.

## Findings By Pack

- Pack 1: no real drift found.
- Pack 2: no real drift found.
- Pack 3: no new drift found after the earlier authority-continuation cleanup.
- Pack 4: no new drift found after the earlier authority-continuation cleanup.
- Pack 5: one real drift finding, listed above.

## Fix Priority

1. Demote or remove Pack 5 `CL-PER-AUTH-002`.
2. Keep the Pack 1, Pack 3, and Pack 4 admissibility continuation gates as-is.
3. Keep the Pack 3 and Pack 4 authority continuation clauses review-only.

## Kernel Semantics Status

The kernel semantics remain intact overall. The evaluator still treats `ALLOWED` as a continue signal, the validator still enforces authority references and missing-fact rules, and the all-pack heartbeat remains green. The only real issue identified in this audit is a pack-data drift artifact in Pack 5, not a required runtime or compiler redesign.
