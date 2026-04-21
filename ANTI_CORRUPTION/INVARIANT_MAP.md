# Invariant Map

This file connects [ANTI_CORRUPTION_SYSTEM_LAW.md](./ANTI_CORRUPTION_SYSTEM_LAW.md) to the enforcement that actually exists in code today.

It is intentionally conservative:

- it does not claim enforcement that is not implemented
- it marks partial enforcement explicitly
- it distinguishes declared policy from executable checks

## Document Role

- Role: supporting anti-corruption invariant map.
- Scope: current enforcement coverage for anti-corruption law sections.
- Governs: how implementation reality is classified against the law doc.
- Does not govern: runtime execution order, kernel containment details, or evidence snapshots.
- Related docs: [ANTI_CORRUPTION_SYSTEM_LAW.md](./ANTI_CORRUPTION_SYSTEM_LAW.md), [KERNEL_INTEGRITY_INVARIANT_MAP.md](../KERNEL_INTEGRITY_INVARIANT_MAP.md), [document-authority-index.md](../docs/meta/document-authority-index.md).
- Precedence: this map is below the anti-corruption system law and above local notebooks or ad hoc notes.

## Status Legend

- `enforced`: the canonical validator/runtime path enforces this invariant in code and has focused proof coverage
- `partial`: meaningful enforcement exists, but important gaps or bypassable paths remain
- `declared_only`: the invariant exists only as policy/documentation today

## Invariant Coverage

### ACSL-001

| Field | Value |
| --- | --- |
| Invariant ID | `ACSL-001` |
| Law Section | `Integrity Kernel` |
| Invariant Statement | Schema constraints, relation law, boundary law, and validator enforcement must align; incompatible states must be rejected by the canonical validator/runtime path. |
| Enforcing Module(s) | [scripts/lib/register-validation/validate-concept-shape.js](../scripts/lib/register-validation/validate-concept-shape.js)<br>[scripts/lib/register-validation/validate-concept-relations.js](../scripts/lib/register-validation/validate-concept-relations.js)<br>[scripts/lib/register-validation/validate-governance-laws.js](../scripts/lib/register-validation/validate-governance-laws.js)<br>[scripts/lib/register-validation/derive-governance-enforcement.js](../scripts/lib/register-validation/derive-governance-enforcement.js)<br>[backend/src/modules/concepts/resolver.js](../backend/src/modules/concepts/resolver.js) |
| Function(s) / Entry Points | `validateConceptShape()`<br>`validateConceptRelations()`<br>`validateGovernanceLaws()`<br>`deriveGovernanceEnforcement()`<br>`resolveConceptQuery()` |
| Reason Codes | `STRUCTURALLY_INCOMPLETE_CONCEPT`<br>`INVALID_RELATION_DIRECTION`<br>`RELATION_REQUIRES_STRUCTURALLY_VALID_CONCEPT`<br>`LAW_ENFORCEMENT_ACTIVE` |
| Runtime Effect | Invalid connected states can fail validation; law-blocked concepts are refused through `validation_blocked` responses and removed from actionable runtime paths. |
| Proof / Verifier / Test | `npm run validate:registers`<br>[backend/scripts/verify-runtime-validation-state.js](../backend/scripts/verify-runtime-validation-state.js)<br>[backend/scripts/verify-relation-hardening.js](../backend/scripts/verify-relation-hardening.js) |
| Enforcement Status | `partial` — the canonical path enforces the kernel, but the law document itself is not a non-bypassable entry point and future non-compliant routes could still ignore it. |

### ACSL-002

| Field | Value |
| --- | --- |
| Invariant ID | `ACSL-002` |
| Law Section | `1. No Silent Meaning Change` |
| Invariant Statement | Meaning changes must be explicit, versioned, re-approved, and auditable; rewording must not silently soften boundaries or collapse concepts. |
| Enforcing Module(s) | [scripts/lib/governance/diff-concepts.js](../scripts/lib/governance/diff-concepts.js)<br>[scripts/lib/governance/promotion-workflow.js](../scripts/lib/governance/promotion-workflow.js)<br>[scripts/lib/governance/audit-trail.js](../scripts/lib/governance/audit-trail.js) |
| Function(s) / Entry Points | `diffConcepts()`<br>`approveChange()`<br>`publishConcept()`<br>`appendAuditRecord()` |
| Reason Codes | None in the register-validation layer; this is mainly workflow- and audit-backed today. |
| Runtime Effect | No direct runtime effect. The protection exists in governance workflow and append-only audit recording, not in the resolver path itself. |
| Proof / Verifier / Test | Append-only audit writes through `flag: 'wx'` in `appendAuditRecord()`<br>Workflow approval/publish requires validator pass in `approveChange()` and `publishConcept()` |
| Enforcement Status | `partial` — workflow and audit support exist, but runtime still loads authored concept packets directly rather than requiring an approved/published state transition path. |

### ACSL-003

| Field | Value |
| --- | --- |
| Invariant ID | `ACSL-003` |
| Law Section | `2. Schema Integrity is Mandatory` |
| Invariant Statement | All V3 concepts must satisfy required slots; missing required structure makes a concept structurally incomplete and invalid at validator level. |
| Enforcing Module(s) | [scripts/lib/register-validation/validate-concept-shape.js](../scripts/lib/register-validation/validate-concept-shape.js)<br>[scripts/lib/register-validation/validate-duty-shape.js](../scripts/lib/register-validation/validate-duty-shape.js)<br>[scripts/lib/register-validation/validate-responsibility-shape.js](../scripts/lib/register-validation/validate-responsibility-shape.js)<br>[scripts/lib/register-validation/validate-authority-shape.js](../scripts/lib/register-validation/validate-authority-shape.js)<br>[scripts/lib/register-validation/validate-power-shape.js](../scripts/lib/register-validation/validate-power-shape.js)<br>[scripts/lib/register-validation/validate-legitimacy-shape.js](../scripts/lib/register-validation/validate-legitimacy-shape.js) |
| Function(s) / Entry Points | `validateConceptShape()`<br>`validateDutyShape()`<br>`validateResponsibilityShape()`<br>`validateAuthorityShape()`<br>`validatePowerShape()`<br>`validateLegitimacyShape()` |
| Reason Codes | `DUTY_MISSING_*`<br>`RESPONSIBILITY_MISSING_*`<br>`AUTHORITY_MISSING_*`<br>`POWER_MISSING_*`<br>`LEGITIMACY_MISSING_*`<br>`MISSING_RECOMMENDED_SLOT`<br>`STRUCTURALLY_INCOMPLETE_CONCEPT` |
| Runtime Effect | Validator marks missing required structure as `v3Status=incomplete`; runtime governance state exposes `isStructurallyIncomplete` and prevents the concept from being treated as fully validated. |
| Proof / Verifier / Test | [backend/scripts/verify-duty-v3.js](../backend/scripts/verify-duty-v3.js)<br>[backend/scripts/verify-responsibility-v3.js](../backend/scripts/verify-responsibility-v3.js)<br>[backend/scripts/verify-authority-v3.js](../backend/scripts/verify-authority-v3.js)<br>[backend/scripts/verify-power-v3.js](../backend/scripts/verify-power-v3.js)<br>[backend/scripts/verify-legitimacy-v3.js](../backend/scripts/verify-legitimacy-v3.js) |
| Enforcement Status | `enforced` — required-slot failures deterministically downgrade V3 status and fail the validator path. |

### ACSL-004

| Field | Value |
| --- | --- |
| Invariant ID | `ACSL-004` |
| Law Section | `3. Relation Law is Binding` |
| Invariant Statement | Relations must be authored, schema-valid, directionally valid, and law-consistent; invalid relation states must escalate to enforcement and system validation outcomes. |
| Enforcing Module(s) | [backend/src/modules/concepts/concept-relation-loader.js](../backend/src/modules/concepts/concept-relation-loader.js)<br>[backend/src/modules/concepts/relation-policy.js](../backend/src/modules/concepts/relation-policy.js)<br>[scripts/lib/register-validation/validate-concept-relations.js](../scripts/lib/register-validation/validate-concept-relations.js)<br>[scripts/lib/register-validation/validate-governance-laws.js](../scripts/lib/register-validation/validate-governance-laws.js)<br>[scripts/lib/register-validation/derive-governance-enforcement.js](../scripts/lib/register-validation/derive-governance-enforcement.js) |
| Function(s) / Entry Points | `loadAuthoredRelationPackets()`<br>`getRelationPolicy()`<br>`validateConceptRelations()`<br>`validateGovernanceLaws()`<br>`deriveGovernanceEnforcement()` |
| Reason Codes | `RELATION_PACKET_INVALID`<br>`RELATION_PACKET_MISSING`<br>`RELATION_SCHEMA_VIOLATION`<br>`INVALID_RELATION_DIRECTION`<br>`AUTHORITY_CANNOT_GROUND_DUTY_OUTSIDE_SCOPE`<br>`DUTY_TRIGGER_MISSING_RESPONSIBILITY_BASIS`<br>`DUTY_DERIVATION_MISSING_VALID_SOURCE`<br>`RESPONSIBILITY_MISSING_VALID_TRIGGER_RELATION`<br>`RELATION_REQUIRES_STRUCTURALLY_VALID_CONCEPT` |
| Runtime Effect | Invalid relation/law states can produce `enforcementStatus=blocked` and `systemValidationState=law_blocked`, which the canonical runtime consumes as non-actionable. |
| Proof / Verifier / Test | `npm run validate:registers`<br>[backend/scripts/verify-relation-hardening.js](../backend/scripts/verify-relation-hardening.js) |
| Enforcement Status | `enforced` — authored relations are primary truth, fallback is explicit, and blocking law failures now matter at validator/runtime level. |

### ACSL-005

| Field | Value |
| --- | --- |
| Invariant ID | `ACSL-005` |
| Law Section | `4. Boundary Separation Must Hold` |
| Invariant Statement | Duty/responsibility, authority/power, authority/legitimacy, and power/legitimacy must remain distinct; collapse must be detected deterministically. |
| Enforcing Module(s) | [scripts/lib/register-validation/validate-duty-responsibility-boundary.js](../scripts/lib/register-validation/validate-duty-responsibility-boundary.js)<br>[scripts/lib/register-validation/validate-authority-power-boundary.js](../scripts/lib/register-validation/validate-authority-power-boundary.js)<br>[scripts/lib/register-validation/validate-legitimacy-boundary.js](../scripts/lib/register-validation/validate-legitimacy-boundary.js)<br>[scripts/lib/register-validation/validate-concept-shape.js](../scripts/lib/register-validation/validate-concept-shape.js) |
| Function(s) / Entry Points | `validateDutyResponsibilityBoundary()`<br>`validateAuthorityPowerBoundary()`<br>`validateLegitimacyBoundary()`<br>`validateConceptShape()` |
| Reason Codes | `DUTY_COLLAPSES_TO_RESPONSIBILITY`<br>`RESPONSIBILITY_COLLAPSES_TO_DUTY`<br>`AUTHORITY_COLLAPSES_TO_POWER`<br>`POWER_COLLAPSES_TO_AUTHORITY`<br>`AUTHORITY_COLLAPSES_TO_LEGITIMACY`<br>`LEGITIMACY_COLLAPSES_TO_AUTHORITY`<br>`POWER_COLLAPSES_TO_LEGITIMACY`<br>`LEGITIMACY_COLLAPSES_TO_POWER` |
| Runtime Effect | Boundary collapse is visible in V3 reports and warning output. It is not currently a blocking law reason in the enforcement classifier. |
| Proof / Verifier / Test | [backend/scripts/verify-responsibility-v3.js](../backend/scripts/verify-responsibility-v3.js)<br>[backend/scripts/verify-authority-v3.js](../backend/scripts/verify-authority-v3.js)<br>[backend/scripts/verify-power-v3.js](../backend/scripts/verify-power-v3.js)<br>[backend/scripts/verify-legitimacy-v3.js](../backend/scripts/verify-legitimacy-v3.js) |
| Enforcement Status | `partial` — collapse detection is deterministic and visible, but boundary failures remain warning-level rather than fully blocking enforcement. |

### ACSL-006

| Field | Value |
| --- | --- |
| Invariant ID | `ACSL-006` |
| Law Section | `5. Validator Authority is Final` |
| Invariant Statement | Validator output defines validity, structural completeness, relational correctness, and law status; downstream layers are supposed to consume, not reinterpret, that decision. |
| Enforcing Module(s) | [scripts/validate-registers.js](../scripts/validate-registers.js)<br>[scripts/lib/register-validation/derive-governance-enforcement.js](../scripts/lib/register-validation/derive-governance-enforcement.js)<br>[backend/src/modules/concepts/concept-validation-state-loader.js](../backend/src/modules/concepts/concept-validation-state-loader.js)<br>[backend/src/modules/concepts/resolver.js](../backend/src/modules/concepts/resolver.js) |
| Function(s) / Entry Points | `deriveGovernanceEnforcement()`<br>`deriveSystemValidationState()`<br>`deriveConceptRuntimeGovernanceState()`<br>`getConceptRuntimeGovernanceState()`<br>`resolveConceptQuery()` |
| Reason Codes | `LAW_ENFORCEMENT_ACTIVE` plus whatever failure/warning codes produced the validator artifact |
| Runtime Effect | Canonical runtime consumes the validator artifact instead of recomputing law. Blocked states remain blocked in runtime logic. |
| Proof / Verifier / Test | [backend/scripts/verify-runtime-validation-state.js](../backend/scripts/verify-runtime-validation-state.js)<br>[backend/scripts/verify-relation-hardening.js](../backend/scripts/verify-relation-hardening.js) |
| Enforcement Status | `partial` — the canonical path respects validator output, but there is no global route-level guard that prevents future new paths from ignoring the artifact. |

### ACSL-007

| Field | Value |
| --- | --- |
| Invariant ID | `ACSL-007` |
| Law Section | `6. Runtime Must Obey Validation` |
| Invariant Statement | Runtime must consume validator state, keep law-blocked concepts non-actionable, and expose structural incompleteness as degraded rather than pretending it is fully valid. |
| Enforcing Module(s) | [backend/src/modules/concepts/concept-validation-state-loader.js](../backend/src/modules/concepts/concept-validation-state-loader.js)<br>[backend/src/modules/concepts/resolver.js](../backend/src/modules/concepts/resolver.js) |
| Function(s) / Entry Points | `deriveConceptRuntimeGovernanceState()`<br>`getConceptRuntimeGovernanceState()`<br>`resolveConceptQuery()`<br>`buildValidationBlockedResponse()`<br>`filterActionableSuggestions()`<br>`filterActionableRelatedConcepts()`<br>`filterActionableCandidates()` |
| Reason Codes | Indirectly consumes validator output including `LAW_ENFORCEMENT_ACTIVE`; blocked law codes propagate through `systemValidationState=law_blocked` |
| Runtime Effect | Blocked concepts refuse with `validation_blocked`, are removed from suggestions/candidates/related concepts, and are marked non-actionable in `governanceState`. |
| Proof / Verifier / Test | [backend/scripts/verify-runtime-validation-state.js](../backend/scripts/verify-runtime-validation-state.js)<br>[backend/scripts/verify-relation-hardening.js](../backend/scripts/verify-relation-hardening.js) |
| Enforcement Status | `partial` — the canonical resolver obeys validation state, but the repo does not yet enforce this consumption rule automatically for every future runtime route. |

### ACSL-008

| Field | Value |
| --- | --- |
| Invariant ID | `ACSL-008` |
| Law Section | `7. No Synthetic Truth` |
| Invariant Statement | Fallback may exist only as explicit, traceable, reported scaffolding; authored relations remain primary truth and strict mode can forbid fallback entirely. |
| Enforcing Module(s) | [backend/src/modules/concepts/relation-policy.js](../backend/src/modules/concepts/relation-policy.js)<br>[backend/src/modules/concepts/concept-relation-loader.js](../backend/src/modules/concepts/concept-relation-loader.js)<br>[scripts/lib/register-validation/validate-concept-relations.js](../scripts/lib/register-validation/validate-concept-relations.js)<br>[backend/src/modules/concepts/concept-validation-state-loader.js](../backend/src/modules/concepts/concept-validation-state-loader.js) |
| Function(s) / Entry Points | `getRelationPolicy()`<br>`loadAuthoredRelationPackets()`<br>`validateConceptRelations()`<br>`buildTrace()` |
| Reason Codes | `RELATION_PACKET_MISSING`<br>`RELATION_FALLBACK_USED`<br>`RELATION_REQUIRED_MISSING_STRICT`<br>`RELATION_PACKET_INVALID`<br>`RELATION_SCHEMA_VIOLATION` |
| Runtime Effect | Relation source is surfaced as `authored` or `fallback`; strict mode can fail missing relation packets instead of silently seeding truth. |
| Proof / Verifier / Test | [backend/scripts/verify-relation-hardening.js](../backend/scripts/verify-relation-hardening.js) |
| Enforcement Status | `enforced` — fallback is explicit and traced, authored relations are primary, and strict mode already disables fallback when enabled. |

### ACSL-009

| Field | Value |
| --- | --- |
| Invariant ID | `ACSL-009` |
| Law Section | `8. No Silent Degradation` |
| Invariant Statement | Missing structure, missing relation coverage, and live enforcement changes must emit warnings or failures and remain visible in validation/runtime traces. |
| Enforcing Module(s) | [scripts/lib/register-validation/validate-concept-shape.js](../scripts/lib/register-validation/validate-concept-shape.js)<br>[scripts/lib/register-validation/validate-concept-relations.js](../scripts/lib/register-validation/validate-concept-relations.js)<br>[scripts/lib/register-validation/derive-governance-enforcement.js](../scripts/lib/register-validation/derive-governance-enforcement.js)<br>[backend/src/modules/concepts/concept-validation-state-loader.js](../backend/src/modules/concepts/concept-validation-state-loader.js)<br>[backend/src/modules/concepts/resolver.js](../backend/src/modules/concepts/resolver.js) |
| Function(s) / Entry Points | `validateConceptShape()`<br>`validateConceptRelations()`<br>`deriveGovernanceEnforcement()`<br>`deriveConceptRuntimeGovernanceState()`<br>`traceGovernanceState()` |
| Reason Codes | `MISSING_RECOMMENDED_SLOT`<br>`STRUCTURALLY_INCOMPLETE_CONCEPT`<br>`RELATION_PACKET_MISSING`<br>`RELATION_FALLBACK_USED`<br>`LAW_ENFORCEMENT_ACTIVE` |
| Runtime Effect | Degraded states are reflected in validator output, runtime governance flags, and internal stderr tracing for blocked or warning-bearing concepts. |
| Proof / Verifier / Test | `npm run validate:registers`<br>[backend/scripts/verify-runtime-validation-state.js](../backend/scripts/verify-runtime-validation-state.js)<br>[backend/scripts/verify-relation-hardening.js](../backend/scripts/verify-relation-hardening.js) |
| Enforcement Status | `enforced` — degradation is surfaced explicitly in the validator artifact and canonical runtime trace/state. |

### ACSL-010

| Field | Value |
| --- | --- |
| Invariant ID | `ACSL-010` |
| Law Section | `9. No AI-Derived Truth Injection` |
| Invariant Statement | AI-generated material must not bypass schema validation, relation law, or validator approval before it becomes truth. |
| Enforcing Module(s) | None dedicated in code today. |
| Function(s) / Entry Points | None dedicated in code today. |
| Reason Codes | None dedicated in code today. |
| Runtime Effect | None guaranteed by code. This remains a policy/process rule. |
| Proof / Verifier / Test | None dedicated in CI or runtime. |
| Enforcement Status | `declared_only` — the repo architecture avoids LLM behavior in the canonical runtime, but there is no direct code-level gate that rejects AI-originated authored content on origin alone. |

### ACSL-011

| Field | Value |
| --- | --- |
| Invariant ID | `ACSL-011` |
| Law Section | `10. Fail Safe Over Flexibility` |
| Invariant Statement | When structure, relation law, or runtime actionability is uncertain, the canonical path should reject, warn, or demand explicit definition rather than guessing. |
| Enforcing Module(s) | [scripts/lib/register-validation/derive-governance-enforcement.js](../scripts/lib/register-validation/derive-governance-enforcement.js)<br>[backend/src/modules/concepts/resolver.js](../backend/src/modules/concepts/resolver.js)<br>[backend/src/modules/concepts/governance-scope-enforcer.js](../backend/src/modules/concepts/governance-scope-enforcer.js) |
| Function(s) / Entry Points | `deriveEnforcementStatus()`<br>`deriveSystemValidationState()`<br>`buildValidationBlockedResponse()`<br>`resolveConceptQuery()` |
| Reason Codes | Blocking law reason codes in `BLOCKING_LAW_REASON_CODES`<br>`RELATION_REQUIRED_MISSING_STRICT` when strict authored relations are required |
| Runtime Effect | Invalid connected states become `law_blocked`; blocked concepts and governed out-of-scope queries refuse instead of resolving as valid concepts. |
| Proof / Verifier / Test | [backend/scripts/verify-relation-hardening.js](../backend/scripts/verify-relation-hardening.js)<br>[tests/runtime/run-query-stress.js](../tests/runtime/run-query-stress.js) |
| Enforcement Status | `partial` — the canonical path is refusal-first, but the repo does not yet prove that every future route or helper will preserve the same fail-safe discipline. |

### ACSL-012

| Field | Value |
| --- | --- |
| Invariant ID | `ACSL-012` |
| Law Section | `11. Enforcement Over Appearance` |
| Invariant Statement | Invalid or blocked states must not be presented as if they are valid, even if refusing or degrading the response is less convenient. |
| Enforcing Module(s) | [backend/src/modules/concepts/concept-validation-state-loader.js](../backend/src/modules/concepts/concept-validation-state-loader.js)<br>[backend/src/modules/concepts/resolver.js](../backend/src/modules/concepts/resolver.js) |
| Function(s) / Entry Points | `getConceptRuntimeGovernanceState()`<br>`resolveConceptQuery()`<br>`buildValidationBlockedResponse()`<br>`filterActionableSuggestions()`<br>`filterActionableRelatedConcepts()`<br>`filterActionableCandidates()` |
| Reason Codes | Indirectly driven by validator artifact status and `LAW_ENFORCEMENT_ACTIVE` |
| Runtime Effect | Canonical responses refuse blocked exact matches, suppress blocked suggestions/candidates/related concepts, and surface degraded governance state instead of pretending the concept is fully valid. |
| Proof / Verifier / Test | [backend/scripts/verify-runtime-validation-state.js](../backend/scripts/verify-runtime-validation-state.js)<br>[backend/scripts/verify-relation-hardening.js](../backend/scripts/verify-relation-hardening.js) |
| Enforcement Status | `partial` — the canonical runtime honors enforcement over appearance, but that rule is not yet guaranteed for future non-compliant response paths. |

### ACSL-013

| Field | Value |
| --- | --- |
| Invariant ID | `ACSL-013` |
| Law Section | `Trace Requirement` |
| Invariant Statement | Validation, relation, and enforcement decisions must be reconstructable from artifacts, runtime governance state, and audit records. |
| Enforcing Module(s) | [scripts/validate-registers.js](../scripts/validate-registers.js)<br>[backend/src/modules/concepts/concept-validation-state-loader.js](../backend/src/modules/concepts/concept-validation-state-loader.js)<br>[backend/src/modules/concepts/resolver.js](../backend/src/modules/concepts/resolver.js)<br>[scripts/lib/governance/audit-trail.js](../scripts/lib/governance/audit-trail.js) |
| Function(s) / Entry Points | `validate-registers.js` CLI artifact generation<br>`buildTrace()`<br>`deriveConceptRuntimeGovernanceState()`<br>`traceGovernanceState()`<br>`appendAuditRecord()`<br>`getConceptHistory()` |
| Reason Codes | `RELATION_FALLBACK_USED`<br>`RELATION_PACKET_MISSING`<br>`LAW_ENFORCEMENT_ACTIVE` plus validator reason categories captured in the artifact |
| Runtime Effect | Canonical concept-match payloads carry `answer.governanceState.trace`; blocked/degraded states emit stderr traces; governance workflow writes append-only audit records. |
| Proof / Verifier / Test | [backend/scripts/verify-runtime-validation-state.js](../backend/scripts/verify-runtime-validation-state.js)<br>[backend/scripts/verify-relation-hardening.js](../backend/scripts/verify-relation-hardening.js) |
| Enforcement Status | `partial` — strong tracing exists in the canonical path, but not every conceivable decision path is yet forced to emit the same trace surface. |

## Current Gaps

### Declared in law but not yet fully enforced

- `ACSL-010 No AI-Derived Truth Injection` is still policy-only. There is no dedicated code path that rejects authored content because of AI origin alone.
- `ACSL-005 Boundary Separation Must Hold` is detected deterministically, but boundary collapse is still warning-level rather than a blocking enforcement condition.
- `ACSL-002 No Silent Meaning Change` relies on workflow and audit modules; runtime is not restricted to serving only workflow-approved published concepts.

### Enforced in the canonical path but still bypassable by future non-compliant paths

- `ACSL-001 Integrity Kernel`
- `ACSL-006 Validator Authority is Final`
- `ACSL-007 Runtime Must Obey Validation`
- `ACSL-011 Fail Safe Over Flexibility`
- `ACSL-012 Enforcement Over Appearance`
- `ACSL-013 Trace Requirement`

These are materially enforced in the current validator/runtime path, but a future route could still bypass them if it does not consume the validator artifact and governance-state loader.

### Suggested Future Hardening Targets

- Add a CI verifier that every concept-serving runtime path consumes [backend/src/modules/concepts/concept-validation-state-loader.js](../backend/src/modules/concepts/concept-validation-state-loader.js).
- Promote boundary-collapse failures from warning-only to enforcement-classified law outcomes where product policy requires it.
- Add a machine-readable invariant manifest that checks this map against real file/function/reason-code references.
- Tighten runtime loading so published/approved governance content is distinguishable from merely authored content.
