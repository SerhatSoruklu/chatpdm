# Kernel Integrity Invariant Map

This map audits the operational containment layer for invalid states.

It does not replace the anti-corruption map in [ANTI_CORRUPTION/INVARIANT_MAP.md](./ANTI_CORRUPTION/INVARIANT_MAP.md).

The distinction is:

- anti-corruption = law and invariants against drift, collapse, and synthetic truth
- kernel integrity = operational containment of invalid states in validator and runtime paths

## Document Role

- Role: supporting invariant coverage map for kernel containment.
- Scope: coverage and enforcement status for kernel-path invalid-state containment.
- Governs: how the kernel containment layer is audited and interpreted.
- Does not govern: anti-corruption system law, runtime roadmap order, or evidence snapshots.
- Related docs: [ANTI_CORRUPTION/ANTI_CORRUPTION_SYSTEM_LAW.md](./ANTI_CORRUPTION/ANTI_CORRUPTION_SYSTEM_LAW.md), [ANTI_CORRUPTION/INVARIANT_MAP.md](./ANTI_CORRUPTION/INVARIANT_MAP.md), [document-authority-index.md](./docs/meta/document-authority-index.md).
- Precedence: this map is subordinate to the anti-corruption system law and exists to record kernel-specific coverage.

## Status Legend

- `enforced`: the canonical kernel path enforces the invariant in code with focused proof coverage
- `partial`: meaningful enforcement exists, but important gaps or bypassable paths remain
- `declared_only`: the invariant is documented, but not directly enforced in code yet

## Invariant Coverage

### KI-001

| Field | Value |
| --- | --- |
| Invariant ID | `KI-001` |
| Law Section | `Single Governed Access Path` |
| Invariant Statement | Concept-serving runtime paths should derive governance state from the validator artifact before serving or acting on concepts. |
| Enforcing Module(s) | [backend/src/modules/concepts/concept-validation-state-loader.js](./backend/src/modules/concepts/concept-validation-state-loader.js)<br>[backend/src/modules/concepts/resolver.js](./backend/src/modules/concepts/resolver.js) |
| Function(s) / Entry Points | `loadConceptValidationSnapshot()`<br>`getConceptRuntimeGovernanceState()`<br>`resolveConceptQuery()` |
| Reason Codes | Indirectly consumes validator reason categories already written into the artifact; no dedicated route-level reason code exists. |
| Runtime Effect | The canonical resolver attaches validator-derived governance state and uses it to decide whether a concept remains actionable. |
| Proof / Verifier / Test | [backend/scripts/verify-runtime-validation-state.js](./backend/scripts/verify-runtime-validation-state.js)<br>`npm --prefix ./backend run check` |
| Enforcement Status | `partial` — the canonical governed path exists, but there is no global route-level guard that forces every future concept-serving path through it. |

### KI-002

| Field | Value |
| --- | --- |
| Invariant ID | `KI-002` |
| Law Section | `Validator Supremacy` |
| Invariant Statement | Validator output remains the authoritative source for structural, relation, and law validity; runtime must consume, not recalculate, that decision. |
| Enforcing Module(s) | [scripts/validate-registers.js](./scripts/validate-registers.js)<br>[scripts/lib/register-validation/derive-governance-enforcement.js](./scripts/lib/register-validation/derive-governance-enforcement.js)<br>[backend/src/modules/concepts/concept-validation-state-loader.js](./backend/src/modules/concepts/concept-validation-state-loader.js)<br>[backend/src/modules/concepts/resolver.js](./backend/src/modules/concepts/resolver.js) |
| Function(s) / Entry Points | `deriveGovernanceEnforcement()`<br>`deriveSystemValidationState()`<br>`deriveConceptRuntimeGovernanceState()`<br>`getConceptRuntimeGovernanceState()`<br>`resolveConceptQuery()` |
| Reason Codes | `LAW_ENFORCEMENT_ACTIVE` plus the validator failure/warning codes already captured in the artifact |
| Runtime Effect | Runtime uses artifact-derived statuses like `enforcementStatus` and `systemValidationState` rather than recomputing law state on the fly. |
| Proof / Verifier / Test | [backend/scripts/verify-runtime-validation-state.js](./backend/scripts/verify-runtime-validation-state.js)<br>[backend/scripts/verify-relation-hardening.js](./backend/scripts/verify-relation-hardening.js) |
| Enforcement Status | `partial` — the canonical runtime honors validator supremacy, but there is no universal prevention against future bypassing code paths. |

### KI-003

| Field | Value |
| --- | --- |
| Invariant ID | `KI-003` |
| Law Section | `Runtime Obedience Is Mandatory` |
| Invariant Statement | Runtime must consume `governanceState`, `enforcementStatus`, `systemValidationState`, and related validator outputs before exposing or acting on concepts. |
| Enforcing Module(s) | [backend/src/modules/concepts/concept-validation-state-loader.js](./backend/src/modules/concepts/concept-validation-state-loader.js)<br>[backend/src/modules/concepts/resolver.js](./backend/src/modules/concepts/resolver.js) |
| Function(s) / Entry Points | `deriveConceptRuntimeGovernanceState()`<br>`getConceptRuntimeGovernanceState()`<br>`buildValidationBlockedResponse()`<br>`resolveConceptQuery()` |
| Reason Codes | Indirectly driven by validator state, including `LAW_ENFORCEMENT_ACTIVE` |
| Runtime Effect | Blocked concepts become non-actionable; structurally incomplete states remain explicit; runtime responses carry `answer.governanceState` when applicable. |
| Proof / Verifier / Test | [backend/scripts/verify-runtime-validation-state.js](./backend/scripts/verify-runtime-validation-state.js)<br>[backend/scripts/verify-relation-hardening.js](./backend/scripts/verify-relation-hardening.js) |
| Enforcement Status | `partial` — the canonical runtime obeys validator state, but this is not yet guaranteed across every future route or helper. |

### KI-004

| Field | Value |
| --- | --- |
| Invariant ID | `KI-004` |
| Law Section | `Invalid States Must Not Propagate` |
| Invariant Statement | Blocked or invalid connected states must not continue into exact-match output, actionable candidates, related concepts, or comparison execution as if they were normal. |
| Enforcing Module(s) | [backend/src/modules/concepts/resolver.js](./backend/src/modules/concepts/resolver.js) |
| Function(s) / Entry Points | `buildValidationBlockedResponse()`<br>`isBlockedConceptId()`<br>`filterActionableSuggestions()`<br>`filterActionableRelatedConcepts()`<br>`filterActionableCandidates()`<br>`resolveConceptQuery()` |
| Reason Codes | Indirectly consumes blocking law reason codes via `isBlocked` and `systemValidationState=law_blocked` |
| Runtime Effect | Blocked concepts are refused, filtered out of suggestions/candidates/related concepts, and kept out of comparison responses. |
| Proof / Verifier / Test | [backend/scripts/verify-relation-hardening.js](./backend/scripts/verify-relation-hardening.js)<br>[tests/runtime/run-query-stress.js](./tests/runtime/run-query-stress.js) |
| Enforcement Status | `enforced` — the canonical resolver actively stops blocked concepts from propagating through normal runtime outputs. |

### KI-005

| Field | Value |
| --- | --- |
| Invariant ID | `KI-005` |
| Law Section | `Blocking Means Blocking` |
| Invariant Statement | When connected-law enforcement derives `blocked`, the system must treat that state as operationally real rather than advisory. |
| Enforcing Module(s) | [scripts/lib/register-validation/derive-governance-enforcement.js](./scripts/lib/register-validation/derive-governance-enforcement.js)<br>[scripts/validate-registers.js](./scripts/validate-registers.js)<br>[backend/src/modules/concepts/concept-validation-state-loader.js](./backend/src/modules/concepts/concept-validation-state-loader.js)<br>[backend/src/modules/concepts/resolver.js](./backend/src/modules/concepts/resolver.js) |
| Function(s) / Entry Points | `deriveEnforcementStatus()`<br>`deriveGovernanceEnforcement()`<br>`deriveSystemValidationState()`<br>`getConceptRuntimeGovernanceState()`<br>`buildValidationBlockedResponse()` |
| Reason Codes | `INVALID_RELATION_DIRECTION`<br>`AUTHORITY_CANNOT_GROUND_DUTY_OUTSIDE_SCOPE`<br>`DUTY_TRIGGER_MISSING_RESPONSIBILITY_BASIS`<br>`DUTY_DERIVATION_MISSING_VALID_SOURCE`<br>`RESPONSIBILITY_MISSING_VALID_TRIGGER_RELATION`<br>`RELATION_REQUIRES_STRUCTURALLY_VALID_CONCEPT`<br>`LAW_ENFORCEMENT_ACTIVE` |
| Runtime Effect | Blocked law failures can fail validation and cause runtime refusal through `validation_blocked` handling. |
| Proof / Verifier / Test | [backend/scripts/verify-relation-hardening.js](./backend/scripts/verify-relation-hardening.js) |
| Enforcement Status | `enforced` — once enforcement reaches `blocked`, the canonical validator/runtime path treats it as blocking rather than informational. |

### KI-006

| Field | Value |
| --- | --- |
| Invariant ID | `KI-006` |
| Law Section | `No Silent Fallback Truth` |
| Invariant Statement | Fallback relation truth must stay explicit, traceable, and controllable; authored relations remain primary truth and strict mode can forbid fallback. |
| Enforcing Module(s) | [backend/src/modules/concepts/relation-policy.js](./backend/src/modules/concepts/relation-policy.js)<br>[backend/src/modules/concepts/concept-relation-loader.js](./backend/src/modules/concepts/concept-relation-loader.js)<br>[scripts/lib/register-validation/validate-concept-relations.js](./scripts/lib/register-validation/validate-concept-relations.js)<br>[backend/src/modules/concepts/concept-validation-state-loader.js](./backend/src/modules/concepts/concept-validation-state-loader.js) |
| Function(s) / Entry Points | `getRelationPolicy()`<br>`loadAuthoredRelationPackets()`<br>`validateConceptRelations()`<br>`buildTrace()` |
| Reason Codes | `RELATION_PACKET_MISSING`<br>`RELATION_FALLBACK_USED`<br>`RELATION_REQUIRED_MISSING_STRICT`<br>`RELATION_PACKET_INVALID`<br>`RELATION_SCHEMA_VIOLATION` |
| Runtime Effect | Relation source and fallback usage remain visible; strict mode can fail missing authored relation packets instead of allowing fallback. |
| Proof / Verifier / Test | [backend/scripts/verify-relation-hardening.js](./backend/scripts/verify-relation-hardening.js) |
| Enforcement Status | `enforced` — fallback is explicit and traceable, not silent. |

### KI-007

| Field | Value |
| --- | --- |
| Invariant ID | `KI-007` |
| Law Section | `No Side Doors` |
| Invariant Statement | New routes or services must not create alternate concept-serving paths that bypass the governed kernel. |
| Enforcing Module(s) | The preferred path is implemented in [backend/src/modules/concepts/resolver.js](./backend/src/modules/concepts/resolver.js) and [backend/src/modules/concepts/concept-validation-state-loader.js](./backend/src/modules/concepts/concept-validation-state-loader.js), but there is no global guard for all future routes. |
| Function(s) / Entry Points | `resolveConceptQuery()`<br>`getConceptRuntimeGovernanceState()` |
| Reason Codes | None dedicated. |
| Runtime Effect | None guaranteed beyond the canonical resolver path. |
| Proof / Verifier / Test | None dedicated. Current confidence comes from the canonical path, not from a route-registry guard. |
| Enforcement Status | `declared_only` — the repo has a governed path, but no explicit mechanism yet forbids future side-door routes from bypassing it. |

### KI-008

| Field | Value |
| --- | --- |
| Invariant ID | `KI-008` |
| Law Section | `Trace Is Required` |
| Invariant Statement | Kernel decisions should remain reconstructable from validator artifacts, relation source markers, runtime governance state, and enforcement traces. |
| Enforcing Module(s) | [scripts/validate-registers.js](./scripts/validate-registers.js)<br>[backend/src/modules/concepts/concept-validation-state-loader.js](./backend/src/modules/concepts/concept-validation-state-loader.js)<br>[backend/src/modules/concepts/resolver.js](./backend/src/modules/concepts/resolver.js) |
| Function(s) / Entry Points | `validate-registers.js` CLI artifact generation<br>`buildTrace()`<br>`deriveConceptRuntimeGovernanceState()`<br>`traceGovernanceState()` |
| Reason Codes | `RELATION_FALLBACK_USED`<br>`RELATION_PACKET_MISSING`<br>`LAW_ENFORCEMENT_ACTIVE` plus validator artifact reason categories |
| Runtime Effect | Canonical concept-match responses carry `governanceState.trace`, and degraded or blocked runtime states emit internal traces. |
| Proof / Verifier / Test | [backend/scripts/verify-runtime-validation-state.js](./backend/scripts/verify-runtime-validation-state.js)<br>[backend/scripts/verify-relation-hardening.js](./backend/scripts/verify-relation-hardening.js) |
| Enforcement Status | `partial` — trace surfaces exist in the canonical path, but not every possible decision path is forced to emit them. |

### KI-009

| Field | Value |
| --- | --- |
| Invariant ID | `KI-009` |
| Law Section | `Invalid States Should Be Unrepresentable Where Possible` |
| Invariant Statement | The kernel should normalize invalidity into explicit statuses and flags so invalid states are harder to use accidentally and easier to contain operationally. |
| Enforcing Module(s) | [backend/src/modules/concepts/concept-validation-state-loader.js](./backend/src/modules/concepts/concept-validation-state-loader.js)<br>[docs/product/response-schema.json](./docs/product/response-schema.json) |
| Function(s) / Entry Points | `deriveConceptRuntimeGovernanceState()` |
| Reason Codes | Indirectly derives from validator artifact state rather than introducing new reason codes |
| Runtime Effect | Runtime receives normalized flags such as `isBlocked`, `isStructurallyIncomplete`, `isFullyValidated`, and `isActionable`. |
| Proof / Verifier / Test | [backend/scripts/verify-runtime-validation-state.js](./backend/scripts/verify-runtime-validation-state.js) |
| Enforcement Status | `partial` — the runtime state surface is normalized, but invalid authored content can still exist and be represented before enforcement or review removes it. |

### KI-010

| Field | Value |
| --- | --- |
| Invariant ID | `KI-010` |
| Law Section | `CI Must Defend the Kernel` |
| Invariant Statement | CI and local validation should defend validator authority, relation integrity, runtime obedience, and blocked-state refusal in the canonical kernel path. |
| Enforcing Module(s) | [scripts/validate-registers.js](./scripts/validate-registers.js)<br>[backend/scripts/verify-runtime-validation-state.js](./backend/scripts/verify-runtime-validation-state.js)<br>[backend/scripts/verify-relation-hardening.js](./backend/scripts/verify-relation-hardening.js) |
| Function(s) / Entry Points | `validate-registers.js` CLI entry<br>`verify-runtime-validation-state.js` CLI entry<br>`verify-relation-hardening.js` CLI entry |
| Reason Codes | All kernel-relevant validator and relation reason codes can surface through these checks; no separate CI-only reason code exists. |
| Runtime Effect | CI/local validation helps stop kernel regressions before publish, but does not yet guarantee route-level compliance for every future concept-serving entry point. |
| Proof / Verifier / Test | `npm run validate:registers`<br>`npm --prefix ./backend run check` |
| Enforcement Status | `partial` — the kernel has real verification coverage, but there is no dedicated CI guard yet for “all concept-serving routes must consume governance state.” |

## Current Gaps

### Canonical-path invariants that remain bypassable by future non-compliant routes

- `KI-001 Single Governed Access Path`
- `KI-002 Validator Supremacy`
- `KI-003 Runtime Obedience Is Mandatory`
- `KI-008 Trace Is Required`
- `KI-010 CI Must Defend the Kernel`

These are materially true in the canonical runtime and validation path, but the repo still lacks a route-level compliance guard that would make bypass visibly impossible.

### Invariants still only partially enforced

- `KI-001` because the governed path is implemented but not globally required
- `KI-002` because validator supremacy is consumed, not globally mandated
- `KI-003` because runtime obedience is canonical-path-specific today
- `KI-008` because trace exists strongly in the main path, not universally
- `KI-009` because invalid states are normalized, but not fully unrepresentable
- `KI-010` because CI checks kernel behavior without yet proving every future route stays governed

### Declared-only invariants

- `KI-007 No Side Doors`

### Suggested Future Hardening Targets

- Add a CI guard that verifies every concept-serving route or service consumes [backend/src/modules/concepts/concept-validation-state-loader.js](./backend/src/modules/concepts/concept-validation-state-loader.js).
- Add a stricter governed-access requirement for new routes so side-door concept serving becomes review-visible or impossible.
- Promote warning-level boundary collapse to stronger blocking behavior if product policy later requires it.
- Add a machine-readable kernel route registry or invariant manifest so governed access can be checked automatically.

See also [ANTI_CORRUPTION/INVARIANT_MAP.md](./ANTI_CORRUPTION/INVARIANT_MAP.md) for the drift-prevention law map.
