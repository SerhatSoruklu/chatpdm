# ChatPDM Security Threat Model

## Title

ChatPDM Security Threat Model

Repository-grounded threat model for a deterministic, refusal-first, bounded concept resolution system.

## Scope

This document covers the repository surfaces that preserve meaning integrity and constraint integrity:

- concept resolution
- admission and refusal behavior
- output validation and exposure gating
- registry and lifecycle state
- ZeroGlare (ZEE) boundary isolation
- military-constraints compilation, validation, and public exposure

It does not attempt to model generic web application risk, infrastructure risk, or broad product security beyond the repository behavior that is directly evidenced here.

## System Definition

ChatPDM is a deterministic meaning system.

The repo describes a bounded flow of:

`query -> normalization -> concept resolution -> structured answer`

The system is designed to resolve authored meaning or refuse safely. It is not a general chatbot, a general-purpose assistant, or a freeform semantic interpreter.

Relevant repo surfaces include:

- concept admission and resolution in `backend/src/modules/concepts/`
- the shared intake router in `backend/src/modules/intake/shared-intake-router.js`
- output validation and exposure gating in `backend/src/modules/concepts/output-validation-gate.js`
- ZeroGlare (ZEE) boundary separation in `docs/architecture/zeroglare-evidence-engine-boundary.md`
- military-constraints bundle validation and public routing in `backend/src/modules/military-constraints/` and `backend/src/routes/api/v1/military-constraints.route.js`

## Core Invariants

- The system must fail safely instead of drifting silently.
- Admission must be exact, not fuzzy.
- Refusal must be preserved when scope, structure, or evidence is incomplete.
- Public output must stay bounded to the authored contract.
- Internal traces must not leak into public surfaces unless a route explicitly exposes them and the repo contract allows it.
- Registry and lifecycle state must remain deterministic and auditable.
- ZeroGlare artifacts must remain non-authoritative and isolated from runtime consumption.
- Military-constraints evaluation must remain closed-world and refusal-first.

## Protected Assets

- canonical concept meaning
- concept admission state
- concept registry integrity
- lifecycle state and version lineage
- output contract shape
- refusal correctness
- bounded public routes
- source provenance and bundle integrity for military-constraints
- deterministic evaluation order
- separation between authoritative runtime surfaces and inspection-only surfaces

## Trust Boundaries

- user input is untrusted at every intake boundary
- normalized query content is still untrusted until exact admission succeeds
- registry data is trusted only after validation
- lifecycle metadata is trusted only at validated boundaries; it is not a universal runtime authority
- ZeroGlare (ZEE) output is inspection-only and must not become runtime authority
- military-constraints source packs, bundles, and manifests are trusted only after schema and validation checks
- public routes are lower-trust exposure boundaries and must not reveal internal traces by default

## Threat Categories

### Semantic Injection

- Threat Goal: push unsupported meaning into a bounded concept or resolution path.
- Likely Vectors: synonym pressure, paraphrase flooding, prompt-like prose, alias abuse, source-text contamination, and malformed near-equivalence claims.
- Why It Matters: if semantic injection succeeds, the system can appear deterministic while silently changing what it means.
- Preferred Safe Behavior: refuse unsupported equivalence, keep canonical anchors stable, and reject inputs that try to widen concept meaning by phrasing alone.

### Constraint Bypass

- Threat Goal: force the system to bypass an authored refusal, admission rule, or evaluation gate.
- Likely Vectors: missing-fact exploitation, stage-order pressure, malformed bundle state, fallback paths, or route-specific contract abuse.
- Why It Matters: bypassing a constraint turns a bounded system into an improvisational one.
- Preferred Safe Behavior: fail closed, preserve refusal-first semantics, and require explicit validation at each gate.

### Ambiguity Exploitation

- Threat Goal: use vagueness to trigger an unsupported resolution or a spurious match.
- Likely Vectors: under-specified queries, ambiguous relation words, mixed-scope wording, and request shaping that avoids exact authored boundaries.
- Why It Matters: ambiguity pressure is the easiest route to silent drift in a deterministic system.
- Preferred Safe Behavior: refuse when the authored path is unclear, and avoid nearest-neighbor interpretation.

### Unsupported Semantic Bridge Pressure

- Threat Goal: make one bounded domain behave as if it can infer or bridge into another domain without explicit authorization.
- Likely Vectors: cross-domain analogy requests, forced equivalence between concepts and registry terms, or attempts to promote inspection surfaces into runtime meaning.
- Why It Matters: bridge pressure erodes the separation between concepts, sources, feedback, and separate subsystems such as ZeroGlare or military-constraints.
- Preferred Safe Behavior: preserve domain boundaries, classify only where a contract allows it, and refuse cross-domain promotion.

### Cross-Domain Leakage

- Threat Goal: move meaning, traces, or authority across a boundary where they do not belong.
- Likely Vectors: leaking internal traces into public routes, treating inspection-only data as authoritative, or reusing artifacts from one subsystem as inputs to another.
- Why It Matters: leakage makes the public surface lie about what the runtime can actually guarantee.
- Preferred Safe Behavior: keep public outputs bounded, strip internal trace fields unless explicitly allowed, and enforce subsystem isolation.

### Registry or Admission-State Corruption

- Threat Goal: corrupt canonical state so the system resolves from invalid or overwritten truth.
- Likely Vectors: duplicate registry keys, last-wins overwrite behavior, stale lifecycle state, invalid admission records, and version drift.
- Why It Matters: if registry truth is unstable, the system can change behavior without a visible authored change.
- Preferred Safe Behavior: fail closed on invalid registry state, require deterministic admission records, and preserve version lineage.

### Drift Induction

- Threat Goal: induce silent change in meaning, precedence, output state, or boundary behavior over time.
- Likely Vectors: incremental edits to canonical anchors, loosened validators, registry duplication, relaxed stage order, or expanded fallback logic.
- Why It Matters: drift is the main failure mode for authored meaning systems because it can remain invisible until a later mismatch appears.
- Preferred Safe Behavior: lock validated behavior, preserve auditable invariants, and prefer explicit refusal over compensating guesswork.

### Refusal Degradation

- Threat Goal: weaken or bypass refusal behavior so unsupported inputs look partially acceptable.
- Likely Vectors: partial matches, fallback resolution, degraded output masking, and incomplete validation paths that return success-like states.
- Why It Matters: refusal degradation hides boundary failures and makes unsupported behavior look legitimate.
- Preferred Safe Behavior: distinguish valid, partial, degraded, and refused states explicitly, and preserve fail-closed outcomes when structure is malformed.

### Output-Contract Inconsistency

- Threat Goal: produce a response shape that does not match the authored output contract.
- Likely Vectors: payload leakage, hidden trace exposure, malformed effect shapes, unsupported output types, or mixed-state exposure.
- Why It Matters: the output contract is part of the trust boundary; inconsistency here creates false authority.
- Preferred Safe Behavior: validate output shape before exposure, refuse malformed outputs, and keep internal trace data out of public payloads unless the route contract explicitly exposes it.

## Failure Modes

- silent semantic drift in canonical concept anchors
- exact admission being replaced by near-match behavior
- invalid registry state being accepted through overwrite semantics
- lifecycle metadata diverging from validated truth
- internal traces appearing on public routes
- unsupported cross-domain promotion between concept, routing, and inspection surfaces
- malformed military-constraints bundles changing runtime behavior instead of failing closed
- output validation returning success-like states for malformed payloads
- ZeroGlare artifacts being treated as runtime inputs

## Security Principles

- fail closed
- remain deterministic
- stay refusal-first
- keep boundaries explicit
- preserve auditability
- prefer bounded state over inferred state
- never silently widen scope
- never promote inspection data into authority without a contract change
- keep public exposure smaller than internal inspection surfaces

## Non-Goals

- formal certification claims
- claims of completed external security review
- generic OWASP coverage
- infrastructure threat modeling beyond repo evidence
- probabilistic anomaly detection
- confidence scoring as a runtime defense
- open-ended semantic generalization
- new product capabilities or new runtime authorities

## Current Coverage

The repository already shows several concrete protections:

- concept resolution is framed as deterministic and bounded
- concept admission is exact and refusal-first
- output validation has explicit `valid`, `partial`, `degraded`, and `refused` states
- ZeroGlare (ZEE) is documented as non-authoritative and isolated from runtime input paths
- military-constraints evaluation is validated, closed-world, and refusal-first
- public military-constraints route tests assert bounded exposure and no internal trace leakage
- lifecycle and versioning are represented explicitly for concepts

## Partial Coverage

The repository also shows areas that are bounded but not fully security-complete:

- several protections are enforced by local validators and route contracts rather than one central security policy
- lifecycle semantics are explicit, but not every lifecycle concept is enforced as a single global runtime rule
- current docs and tests establish boundary behavior, but they do not equal a formal adversarial assurance program
- some future risk classes are documented as locks or audits rather than fully generalized runtime defenses

## Missing Coverage

The repository does not evidence:

- formal certification or external security attestation
- a single centralized adversarial probe corpus for all meaning-integrity surfaces
- a repository-wide security event ledger for every refusal or drift event
- complete elimination of future semantic drift risk
- automatic detection of every unsupported bridge attempt
- a universal guarantee that future authors will not weaken validated boundaries

## Future Risk Notes

- The highest-risk failure mode is silent drift in meaning, not infrastructure compromise.
- Future changes that touch registry ordering, lifecycle handling, fallback logic, or validation precedence should be treated as trust-boundary changes.
- Shared routers that choose between concept resolution and other bounded surfaces should remain explicit and refusal-first.
- Any attempt to turn inspection surfaces into runtime authority should be treated as a boundary regression.
- The military-constraints subsystem should remain isolated from concept resolution, and any broadened coupling should be treated as a separate audit item.
- Security probes should keep testing synonym pressure, forced equivalence, ambiguity, cross-domain leakage, and unsupported bridge pressure as first-class adversarial cases.
