# Trust Integrity Stack

This document defines the non-negotiable trust integrity layers that govern how ChatPDM preserves runtime truth, governance honesty, stewardship discipline, and public trust alignment.

Trust is valid only when all four layers remain aligned.
Trust is invalidated when any one layer fails and the failure remains unresolved.
Public trust claims shall not exceed implemented evidence.

## 1. Purpose

This document governs how trust is preserved across runtime behavior, governance process, stewardship practice, and public representation.

This document is enforceable operating law, not aspirational guidance.
This document defines what preserves trust, what invalidates trust, and what shall not be represented as stable.

## 2. Layer Model

The trust integrity stack contains four bounded layers:

1. Runtime Integrity
2. Governance Integrity
3. Stewardship Integrity
4. Perception Integrity

No layer substitutes for another.
Runtime evidence is necessary but insufficient on its own.
Governance process is necessary but insufficient on its own.
Public trust alignment is invalid when either runtime evidence or governance evidence is unresolved.

## 3. Runtime Integrity

Runtime integrity governs executable truth.
It governs deterministic replay, refusal integrity, contract stability, and safe-failure behavior.
The binding runtime-law document for this layer is [INTERGRITY_RUNTIME_LAWS.md](./INTERGRITY_RUNTIME_LAWS.md).

Runtime integrity requires:

- exact canonical resolution to remain stable for the authored runtime boundary
- canonical identity inputs must match exact canonical form at the system boundary; near-valid or malformed identity inputs shall be rejected rather than normalized
- same input to produce the same canonical output
- refusal behavior to fail closed outside authored scope
- response contracts to remain explicit and auditable
- unresolved ambiguity to remain unresolved rather than silently accepted

Runtime integrity is invalid when:

- the same input produces inconsistent outputs
- identity-bearing inputs are silently normalized, repaired, or coerced into canonical form after acceptance
- refusal behavior widens into fuzzy acceptance
- unsupported or ambiguous inputs begin resolving silently
- output contracts shift without explicit evidence and inspection
- package or boundary leakage alters core resolution behavior without explicit authority

Runtime integrity shall not be preserved by silent normalization, including identity repair, hidden fallback, or post-hoc explanation laundering.

## 4. Governance Integrity

Governance integrity governs how meaning change is authorized, recorded, bounded, and reviewed.
It governs constitutional process, exception visibility, emergency continuity bounds, and audit alignment.

Governance integrity requires:

- meaning changes to obey constitutional authority and change class boundaries
- truth exceptions to remain visible as exception debt
- emergency continuity actions to remain bounded, explicit, and separately recorded
- governance records to remain aligned with actual runtime truth and package law
- append-only governance evidence to remain inspectable

Governance integrity is invalid when:

- runtime behavior changes without aligned governance authorization
- exception debt is hidden, rewritten, or represented as ordinary state
- emergency continuity becomes an unbounded normal operating path
- event, exception, or incident records diverge from actual implemented behavior

Governance integrity shall not be represented by documentation theater, retroactive record laundering, or concealed exception state.

## 5. Stewardship Integrity

Stewardship integrity governs how evidence is handled after it exists.
It governs score legitimacy, baseline discipline, disclosure discipline, and the handling of unresolved drift.

Stewardship integrity requires:

- integrity checks to penalize real drift rather than reward presentation
- baseline changes to require explicit regeneration and inspection
- machine-readable evidence and human-readable records to remain aligned
- unresolved known drift to remain visible until resolved
- missing evidence to remain visible rather than masked

Stewardship integrity is invalid when:

- unresolved known drift is represented as stable
- a green score is presented after excluding known failure modes
- baseline files are refreshed in a way that launders drift rather than records it
- negative evidence is suppressed while positive evidence is surfaced
- append-only evidence surfaces are rewritten to improve appearance

Stewardship integrity shall not be reduced to vanity metrics, ceremonial pass states, or selective evidence handling.

## 6. Perception Integrity

Perception integrity governs what the project says about itself in public and institutional surfaces.
It governs README claims, trust surfaces, public documentation, and any maturity signal presented to external readers.

Perception integrity requires:

- public language to remain aligned with implemented runtime behavior
- institutional wording to remain evidence-backed
- public descriptions of maturity, safety, or determinism to remain bounded by current proof
- trust-facing documentation to preserve explicit limits and failure conditions

The canonical authoring guide for policy and trust wording is [architecture/policy-writing-tone-guide.md](./architecture/policy-writing-tone-guide.md).
The canonical architecture guide for signal placement is [architecture/signal-placement-laws.md](./architecture/signal-placement-laws.md).

Perception integrity is invalid when:

- public claims outrun runtime evidence
- documentation implies guarantees that the system does not currently prove
- wording implies maturity beyond current enforcement or audit depth
- trust surfaces suppress unresolved implementation boundaries

Perception integrity shall not be manufactured through maturity theater, vague assurance language, or unsupported certainty.

## 7. Failure Conditions

Trust integrity fails when any of the following conditions remain unresolved:

- deterministic runtime drift
- silent acceptance replacing refusal
- unresolved ambiguity represented as resolved
- runtime state diverging from governance record
- hidden exception debt
- unbounded emergency continuity
- unresolved known drift represented as stable
- baseline laundering
- missing evidence masked by presentation
- public claims exceeding implemented proof

A favorable runtime score does not override any one of these failures.

## 8. Relationship To Platform Integrity

Executable platform integrity checks are a subordinate evidentiary surface.
They test a bounded runtime kernel and produce runtime evidence.
They do not define the whole trust system.

Platform integrity scoring is limited to executable runtime stability.
It does not replace governance integrity, stewardship integrity, or perception integrity.
Platform integrity results are valid only when interpreted inside this trust integrity stack.

No artifact may change semantic role without an explicit surface-boundary decision.
A runtime evidence artifact shall not be repurposed into doctrine by drift or convenience.
A doctrine artifact shall not be repurposed into runtime evidence by drift or convenience.
If a semantic role change is required, the boundary decision must be explicit, documented, and reflected in artifact naming and surrounding references.
See [CANONICAL_LAYER_RULE.md](./CANONICAL_LAYER_RULE.md) for the canonical rule governing surface projection and response-semantics boundaries.

The subordinate platform integrity surfaces are:

- `tests/platform-integrity.spec.js`
- `scripts/run-platform-integrity.js`
- `tests/runtime/fixtures/platform-integrity-baseline.json`
- `tests/runtime/reports/platform-integrity-results.json`
- `docs/integrity-checks/README.md`
- `docs/integrity-checks/INTEGRITY_CHECK_001.md` and subsequent sequential volumes

## 9. Non-Goals

This document is not:

- a product marketing surface
- a culture memo
- a founder narrative
- a substitute for runtime verification
- a substitute for governance records
- a mechanism for awarding trust by assertion
- a numeric morality score

## 10. Closing Rule

Trust in ChatPDM is valid only when runtime truth, governance truth, stewardship discipline, and public representation remain aligned.

When alignment is unresolved, trust status is invalidated until explicit evidence restores it.
