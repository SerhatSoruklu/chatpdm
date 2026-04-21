# ChatPDM LLGS Master Roadmap

## 1. Title and purpose

This document is the controlling LLGS roadmap for ChatPDM. It defines the order,
gates, and stop conditions for LLGS completion work. It lives in `docs/runtime/`
because it governs runtime hardening, not audit state.

## 2. Status and document role

- Status: authoritative control document for LLGS completion work.
- Role: govern execution toward LLGS completion, not current-state analysis.
- Scope: deterministic, refusal-first, bounded, traceable LLGS hardening only.
- The existing runtime roadmap remains in force for current runtime work.
- This roadmap defines the LLGS completion path that sits above that baseline.
- The April 21 LLGS audit is evidence only. It is not source of truth.

## 3. LLGS end-state definition

LLGS end-state is a deterministic, refusal-first, versioned governance system
where canonical meaning is anchored in runtime authority, meaning preservation is
proven rather than assumed, exposure is strict, and telemetry observes without
mutating runtime.

The end-state must preserve meaning, enforce determinism, fail safely, remain
fully traceable, and resist silent drift. If a layer cannot prove its result, it
must refuse.

## 4. Source authority and evidence model

- Authority index:
  - [document-authority-index.md](../meta/document-authority-index.md)
- In-repo source copies:
  - [llgs-source/LLGS-Core-Invariants.txt](./llgs-source/LLGS-Core-Invariants.txt)
  - [llgs-source/Single-Execution-Dependency-Graph.txt](./llgs-source/Single-Execution-Dependency-Graph.txt)
  - [llgs-source/LLGS-Complete.png](./llgs-source/LLGS-Complete.png)
  - [llgs-source/SED-Graph.png](./llgs-source/SED-Graph.png)
- External phase working set, used for synthesis and left out of repo for now:
  - `Phase-1.Work/Phase-1.28Days-Work.txt`
  - `Phase-1.Work/1-Deterministic-Contract-Lock.png`
  - `Phase-2.Work/Phase-2.28Days-Work.txt`
  - `Phase-2.Work/2-Canonical-Registry-Authority.png`
  - `Phase-3.Work/Phase-3.28Days-Work.txt`
  - `Phase-3.Work/3-Meaning-Preservation-Enforcement.png`
  - `Phase-4.Work/Phase-4.28Days-Work.txt`
  - `Phase-4.Work/4-End-to-End-Exposure-Integrity.png`
  - `Phase-5.Work/Phase-5.28Days-Work.txt`
  - `Phase-5.Work/5-Governance-Feedback-System.png`
- Supporting repo context only:
  - [core-runtime-roadmap.md](./core-runtime-roadmap.md)
  - [LLGS_AI_BOUNDARY_PROTOCOL.md](../governance/LLGS_AI_BOUNDARY_PROTOCOL.md)
  - [2026-04-21-llgs-audit.md](../audits/2026-04-21-llgs-audit.md)
- Evidenced facts from the source set:
  - phase names, order, and progression bands
  - root invariants and no-bypass rules
  - versioning rules
  - preconditions for starting LLGS hardening
  - phase entry and exit gates
- Inferred only:
  - the concise control-document wording
  - the repository placement in `docs/runtime/`
  - the synthesis across phase files into one master roadmap

If the source set is silent, the roadmap must not invent authority.

## 5. Core invariants

- Determinism is mandatory.
  - Same input plus same versions must produce the same output.
  - No randomness, time-based variation, hidden state influence, probabilistic
    ranking, or fallback paths that change outcomes.
- No implicit states.
  - All states must be explicit, typed, and observable.
  - Responses must include `type`, `finalState`, `validationState`, and `traceId`.
- No hidden fallbacks.
  - No silent retries, backup logic, or alternate resolution paths that alter
    meaning.
  - If the system cannot resolve deterministically, it must refuse.
- Registry is runtime authority.
  - The canonical registry is the single source of truth.
  - No ID-based allowlists or blocklists outside registry authority.
  - No overlays, patches, or external decision sources may govern runtime.
- Meaning invariance is mandatory.
  - All profiles must preserve the same canonical invariant.
  - No semantic drift, approximation, or "looks similar" validation is allowed.
- Frontend consumes truth only.
  - The client must render exactly what the backend provides.
  - No reconstruction logic, inference, hidden mappings, or state guessing.
- Exposure is strictly enforced.
  - valid -> full exposure
  - partial -> limited exposure
  - degraded -> reduced exposure
  - refused -> refusal only
  - invalid -> hidden (fail closed)
- Fail safe, not silent.
  - Uncertainty must produce refusal, not approximation.
  - No silent degradation, hidden correction, or auto-fixing of invalid states.
- Full traceability.
  - Every decision must be reproducible and attributable.
  - Required fields include `traceId`, `deterministicKey`, `registryVersion`,
    `policyVersion`, and `validatorVersion` where applicable.
- Telemetry is observational only.
  - Telemetry may log, aggregate, detect drift, alert, and report.
  - Telemetry must never directly mutate runtime behavior.
  - Required flow: Telemetry -> Alert -> Review -> Approval -> Registry/Policy
    Update -> Version bump.
- Versioned governance.
  - `registryVersion` increments on registry truth changes.
  - `policyVersion` increments on rule changes.
  - `validatorVersion` increments on invariance logic changes.
  - `exposureVersion` increments on exposure logic changes.
  - `deterministicKey` must include all relevant versions.
- No bypass rules.
  - No resolver output may bypass contract enforcement.
  - No admission decision may bypass registry authority.
  - No profile may bypass invariance validation.
  - No client may bypass exposure contract.
  - No telemetry may bypass governance workflow.

System guarantee:

- preserve meaning
- enforce determinism
- fail safely
- remain fully traceable
- resist drift under pressure

If any invariant is violated, the system is unsafe and execution must stop.

## 6. Absolute execution order

The execution order is fixed and non-optional:

Contract Lock -> Registry Authority -> Meaning Preservation -> Exposure Integrity
-> Governance Feedback

Rules:

- Phase 1 must complete before Phase 2 starts.
- Phase 2 must complete before Phase 3 starts.
- Phase 3 must complete before Phase 4 starts.
- Phase 4 must complete before Phase 5 starts.
- If a prior phase remains partial, the next phase has not started.
- No phase may be treated as complete by assumption or momentum.

## 7. Global entry criteria before LLGS execution

LLGS hardening may begin only if all preconditions hold:

- P0.1 Current runtime exists.
- P0.2 Resolver route exists.
- P0.3 Refusal paths exist.
- P0.4 Basic output validation exists.
- P0.5 Audit snapshot is frozen at 2026-04-21.
- P0.6 Phase roadmaps are frozen.

If any P0.1-P0.6 precondition fails, stop and do not start LLGS hardening.

## 8. Phase roadmap overview

- Phase 1, 50% -> 60%, Deterministic Contract Lock.
  - Lock the public resolver contract so current behavior becomes explicit,
    tested, and non-negotiable.
- Phase 2, 60% -> 70%, Canonical Registry Authority.
  - Make the registry the single runtime authority for admission and governance.
- Phase 3, 70% -> 80%, Meaning Preservation Enforcement.
  - Make "DOES NOT alter meaning" provable and enforce semantic invariance.
- Phase 4, 80% -> 90%, End-to-End Exposure Integrity.
  - Make backend truth and user-visible truth identical under the exposure rules.
- Phase 5, 90% -> 100%, Governance Feedback System.
  - Make telemetry and drift detection real, bounded, and governance-gated.

The phase order is fixed: Contract Lock -> Registry Authority -> Meaning
Preservation -> Exposure Integrity -> Governance Feedback.

## 9. Phase 1

- Objective: turn current resolver behavior into an explicit, tested,
  non-negotiable contract.
- Entry criteria:
  - current resolver route exists
  - refusal paths exist
  - basic output validation exists
  - current public responses can be inventoried
  - audit snapshot is frozen
  - phase roadmaps are frozen
- Allowed changes:
  - public response schema
  - route serialization
  - backend response normalization
  - frontend contract consumption
  - route-level tests and regression locks
- Must not weaken:
  - determinism
  - no implicit states
  - no hidden fallbacks
  - no client-side truth reconstruction
  - no broad concept-scope expansion
  - no registry redesign yet
- Exit criteria:
  - strict response schema exists for the public resolver route
  - all required contract fields are present
  - frontend consumes contract only
  - route-level tests cover all major response classes
  - regression snapshots or checks exist
  - malformed or missing fields fail tests or build
  - a Phase 1 audit note exists
- Outputs / guarantees:
  - `type`, `finalState`, `validationState`, `reason`, `failedLayer`,
    `details`, `traceId`, `deterministicKey`, `registryVersion`,
    `policyVersion`, and `timestamp` are explicit where required
  - same input plus same versions gives same output
  - no ambiguity in outputs
  - no silent differences between layers
  - client consumes truth, not inference

## 10. Phase 2

- Objective: replace packet plus overlays with a single governing registry.
- Entry criteria:
  - Phase 1 is complete
  - current admission-control sources are inventoried
  - canonical registry contract is defined
  - lifecycle, governance, and visibility state dimensions are fixed
- Allowed changes:
  - registry model
  - admission logic
  - authority consolidation
  - deterministic decision flow
  - registry validation and traceability
  - removal of ID-based admission lists and scattered overlays
- Must not weaken:
  - Phase 1 contract shape
  - deterministic output guarantees
  - refusal-first behavior
  - existing contract tests
  - frontend UX discipline
  - meaning preservation, which remains a later phase
- Exit criteria:
  - a single canonical registry contract exists
  - runtime admission derives from registry and policy
  - lifecycle, governance, and visibility directly control admission
  - ID-based lists are removed from runtime logic
  - resolver flow includes an explicit registry check
  - decisions are traceable and testable
- Outputs / guarantees:
  - `resolve -> check registry -> derive admission -> execute -> expose`
  - registry is runtime authority, not metadata
  - decisions are derived, not manually listed
  - versioned traceability is attached to each decision

## 11. Phase 3

- Objective: make "DOES NOT alter meaning" provable and enforced at runtime.
- Entry criteria:
  - Phase 2 is complete
  - canonical invariant has been extracted from the registry
  - semantic profiles are defined
  - deterministic comparison inputs are defined
- Allowed changes:
  - canonical invariant contract
  - semantic profile definitions
  - deterministic profile generation
  - invariance validator
  - threshold enforcement
  - invariance proof metadata
  - tests that prove preservation or rejection
- Must not weaken:
  - Phase 2 registry authority
  - Phase 1 public contract shape
  - determinism
  - refusal-first behavior
  - no probabilistic checks
  - no heuristic similarity logic
  - no UI-level validation
- Exit criteria:
  - canonical invariant is extracted and enforced
  - standard, simplified, and formal profiles exist
  - all profiles are generated from the same invariant
  - all outputs are validated against the invariant
  - any divergence results in rejection
  - no "looks similar" logic remains
  - invariance proof metadata is attached
- Outputs / guarantees:
  - `PASS -> expose`
  - `FAIL -> reject`
  - validator version, thresholds, result, and traceId are attached
  - meaning preservation is proven, not assumed

## 12. Phase 4

- Objective: make backend truth and user-visible truth identical.
- Entry criteria:
  - Phase 3 is complete
  - public output validation contract is defined
  - strict exposure rules are defined
  - frontend contract consumption rules are defined
- Allowed changes:
  - public validation contract
  - exposure enforcement layer
  - backend serialization
  - strict frontend consumption
  - route and exposure tests
  - fail-closed behavior
- Must not weaken:
  - registry authority
  - meaning preservation
  - deterministic output guarantees
  - no client inference
  - no hidden states
  - no telemetry pipeline yet
- Exit criteria:
  - public response contract is complete and enforced
  - exposure layer strictly filters outputs
  - frontend renders exactly what backend sends
  - no reconstruction, inference, or heuristic fallback remains
  - all outputs are traceable and auditable
- Outputs / guarantees:
  - `validationState` is always present
  - valid -> full exposure
  - partial -> limited exposure
  - degraded -> reduced exposure
  - refused -> refusal object only
  - invalid or out-of-contract -> hidden
  - no state may bypass the exposure layer

## 13. Phase 5

- Objective: make the system detect when it is weakening and correct itself
  deterministically.
- Entry criteria:
  - Phase 4 is complete
  - stable public exposure exists
  - telemetry schema is defined
  - observation points are bounded
- Allowed changes:
  - telemetry event collection
  - metrics aggregation
  - drift detection
  - threshold configuration
  - anomaly detection
  - feedback engine
  - governed reports
  - append-only logs and snapshots
  - observability dashboard
- Must not weaken:
  - determinism
  - telemetry must not directly mutate runtime outputs
  - all feedback must go through governance workflow
  - no silent updates
  - everything remains traceable
- Exit criteria:
  - H1 through H5 are implemented
  - drift detection works with thresholds
  - feedback loop updates registry and policy safely
  - governance reports are generated
  - the system can surface its own weaknesses
  - closed-loop governance is validated
- Outputs / guarantees:
  - telemetry is observational only
  - alerts, reviews, and approvals precede any registry or policy update
  - no direct runtime mutation from telemetry
  - the system is self-monitoring and self-correcting
  - the system fails safely instead of drifting silently

## 14. Cross-phase hard dependencies

- Phase 2 depends on Phase 1 because registry authority is meaningless while
  public contract truth remains ambiguous.
- Phase 3 depends on Phase 2 because meaning invariance needs a stable
  canonical registry authority.
- Phase 4 depends on Phase 3 because exposure integrity is meaningless if
  semantic validation is not trusted.
- Phase 5 depends on Phase 4 because telemetry must observe stable truth, not
  UI/backend disagreement.
- If any phase is partial, the next phase does not start.
- No parallel phase start is allowed where the earlier gate is still open.

## 15. Absolute no-bypass rules

- NB1. No resolver output may bypass Phase 1 contract enforcement.
- NB2. No admission decision may bypass registry authority.
- NB3. No profile may bypass invariance validation.
- NB4. No client may bypass exposure contract.
- NB5. No feedback action may bypass governance workflow.
- NB6. No telemetry path may mutate runtime directly.

## 16. Relationship to existing runtime roadmap

This LLGS roadmap does not replace [core-runtime-roadmap.md](./core-runtime-roadmap.md).
The runtime roadmap remains the current runtime discipline document for the repo.

This document is the LLGS completion path. It narrows execution toward the
deterministic, refusal-first, traceable end-state required for LLGS completion.

Where both documents apply, the stricter rule wins. Where they differ, do not
widen scope to satisfy convenience. Resolve the contradiction before proceeding.

## 17. Relationship to LLGS audit

The April 21 LLGS audit, [2026-04-21-llgs-audit.md](../audits/2026-04-21-llgs-audit.md),
is current-state evidence only.

- It shows what is present now.
- It identifies what is missing now.
- It does not define target law.
- It does not override this roadmap.

Use the audit to confirm the gap between current state and the roadmap target.
Do not rewrite the roadmap to match the audit snapshot.

## 18. Definition of full completion

Full completion means all of the following are true:

- Phase 1 through Phase 5 are complete and frozen in order.
- The public contract is explicit, tested, and consistently serialized.
- The registry is the single runtime authority for admission and governance.
- Meaning preservation is proven at runtime across required profiles.
- Exposure integrity is strict backend truth to frontend truth.
- Telemetry is observational, bounded, and routed through governance workflow.
- No bypass paths remain for contract, registry, profile, exposure, or feedback.
- No hidden states, silent drift, or unversioned truth changes remain.
- The system behaves as a deterministic, self-monitoring, self-correcting
  governance system that fails safely under pressure.

## 19. Failure / stop conditions

- If any P0 precondition fails, stop.
- If any phase exit criteria are unmet, do not start the next phase.
- If any invariant is violated, halt and correct.
- If hidden states, silent fallbacks, probabilistic checks, or client-side
  reconstruction appear, stop.
- If registry, profile, exposure, or governance workflow can be bypassed, stop.
- If telemetry can directly mutate runtime, stop.
- If evidence is missing, mark the issue as blocked rather than inferred.
- If implementation conflicts with the source set, resolve the contradiction
  before proceeding.

## 20. Optional appendix: source artifact index

Root source artifacts:

- [llgs-source/LLGS-Core-Invariants.txt](./llgs-source/LLGS-Core-Invariants.txt)
- [llgs-source/Single-Execution-Dependency-Graph.txt](./llgs-source/Single-Execution-Dependency-Graph.txt)
- [llgs-source/LLGS-Complete.png](./llgs-source/LLGS-Complete.png)
- [llgs-source/SED-Graph.png](./llgs-source/SED-Graph.png)

Phase source artifacts:

- `Phase-1.Work/Phase-1.28Days-Work.txt`
- `Phase-1.Work/1-Deterministic-Contract-Lock.png`
- `Phase-2.Work/Phase-2.28Days-Work.txt`
- `Phase-2.Work/2-Canonical-Registry-Authority.png`
- `Phase-3.Work/Phase-3.28Days-Work.txt`
- `Phase-3.Work/3-Meaning-Preservation-Enforcement.png`
- `Phase-4.Work/Phase-4.28Days-Work.txt`
- `Phase-4.Work/4-End-to-End-Exposure-Integrity.png`
- `Phase-5.Work/Phase-5.28Days-Work.txt`
- `Phase-5.Work/5-Governance-Feedback-System.png`

Repo context only:

- [core-runtime-roadmap.md](./core-runtime-roadmap.md)
- [LLGS_AI_BOUNDARY_PROTOCOL.md](../governance/LLGS_AI_BOUNDARY_PROTOCOL.md)
- [2026-04-21-llgs-audit.md](../audits/2026-04-21-llgs-audit.md)
