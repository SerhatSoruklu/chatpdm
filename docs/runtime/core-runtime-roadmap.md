# ChatPDM Core Runtime Roadmap

## 1. Purpose

This document defines the controlling runtime roadmap for ChatPDM after the architecture layer is locked.

The roadmap exists to keep implementation tied to phase discipline.

It does not authorize:

- scope expansion by momentum
- inference behavior
- open composition
- silent contract widening
- "smartness" that weakens deterministic refusal

References, concept sources, and implementation opportunities may inform a phase.
They do not replace the roadmap.

## Document Role

- Role: active runtime execution roadmap.
- Scope: runtime phase discipline after the architecture layer is locked.
- Governs: current runtime execution order, active phase status, and bounded expansion.
- Does not govern: LLGS completion law, policy-system structure, or evidence snapshots.
- Related docs: [document-authority-index.md](../meta/document-authority-index.md), [chatpdm-llgs-roadmap.md](./chatpdm-llgs-roadmap.md), [../governance/LLGS_AI_BOUNDARY_PROTOCOL.md](../governance/LLGS_AI_BOUNDARY_PROTOCOL.md).
- Precedence: this roadmap governs current runtime execution only; the LLGS roadmap constrains completion work above it.

## 2. Foundation Layers

### 2.1 Layer 1: Architecture

This layer is already established.

Locked elements include:

- response contract
- concept writing standard
- query normalization and matching rules
- v1 concept scope
- no-match behavior
- ambiguity behavior

These are not active expansion targets in this roadmap.
They are the base constraints that later runtime phases must obey.

### 2.2 Layer 2: System Execution

This is the live roadmap layer.

The execution roadmap determines:

- what the runtime is allowed to do now
- what remains bounded
- what must still be refused
- what counts as completion before the next phase begins

## 3. Phase Status Map

| Phase | Name | Status | Role |
| --- | --- | --- | --- |
| 6 | Concept Authoring & Validation | established | concept discipline layer |
| 7 | Minimal Runtime | established | smallest real deterministic resolver |
| 7.5 | Runtime Proof | established | controlled proof that the minimal runtime behaves honestly |
| 8 | Reality Test | active | pressure from live runtime behavior and real query conditions |
| 9 | Stop and Evaluate | recurring | stop expansion and evaluate boundary integrity before widening |
| 10 | Query-Shape Classification + Subtype-Aware No-Match | established | structured interpretation without reasoning |
| 11 | Controlled Comparison Mode | bounded | explicit comparison handling inside a closed allowlist |
| 12 | Controlled Relation Layer | entered | bounded relation-aware behavior without open graph reasoning |
| 12.5 | Access & Surface Policy Layer | locked | public surface, usage, and policy boundary discipline |
| 12.6 | Source Integrity | locked | source-grounding and integrity discipline |
| 12.7 | Execution Gate / Runtime Truth Discipline | locked | refusal-first runtime truth discipline |
| 12.8 | Composition-Safe Relation Thinking | deferred and guarded | authored relation-aware composition inside explicit closure only |
| 13 | Bounded Composition Layer | deferred | next major frontier after stability gates are satisfied |

## 4. Active Interpretation Rules

The runtime roadmap must preserve these rules across all later phases:

- deterministic output remains the default contract
- refusal remains primary when the structure is missing
- relation behavior must not become open graph inference
- comparison behavior must not become broad evaluative reasoning
- composition must never arrive by accident through local convenience

Practical rule:

If a proposed feature makes the runtime feel more "clever" than inspectable, it is probably outside the active phase.

## 5. Phase Definitions

### Phase 6: Concept Authoring & Validation

Author the concept system before relying on runtime behavior.

Scope:

- canonical authored concept packets
- concept review discipline
- overlap stress testing
- system-fit validation

Non-goals:

- runtime expansion
- retrieval rescue through alias inflation
- relation-first authoring

Exit gates:

- seed concepts are fully authored
- review gates pass
- overlap stress tests do not collapse key concepts
- concept packets remain system-consistent

Reference:

- [phase-6-concept-authoring-and-validation.md](/home/serhat/code/chatpdm/docs/authoring/phase-6-concept-authoring-and-validation.md)

### Phase 7: Minimal Runtime

Prove that ChatPDM can resolve authored concepts deterministically with a real runtime.

Scope:

- query normalization
- exact authored matching
- deterministic resolver output
- explicit no-match behavior

Non-goals:

- broad suggestion systems
- relation reasoning
- comparison logic

Exit gates:

- same query returns the same output
- no hallucinated text enters the runtime
- unsupported inputs resolve honestly into refusal or no-match states

### Phase 7.5: Runtime Proof

Prove that the minimal runtime survives controlled edge cases without structural dishonesty.

Scope:

- exact match proof
- empty-input rejection
- noise input handling
- canonical lookup success and failure
- authored ambiguity and suggestion cases
- schema validation

Non-goals:

- broad coverage expansion
- infrastructure scaling

Exit gates:

- proof cases pass
- schema validation passes
- repeated runs remain stable

Reference:

- [phase-7-5-runtime-proof.md](/home/serhat/code/chatpdm/docs/runtime/phase-7-5-runtime-proof.md)

### Phase 8: Reality Test

Expose the runtime to real usage pressure without pretending the live behavior is already mature.

Scope:

- observe real query patterns
- inspect no-match and ambiguity quality
- identify pressure zones

Non-goals:

- feature inflation in response to every weak signal
- broad semantic expansion

Exit gates:

- real query pressure is visible
- weakness is classified before architectural response

### Phase 9: Stop and Evaluate

Stop expansion and evaluate whether the existing meaning graph remains stable enough for more capability.

Scope:

- boundary integrity review
- forced-match detection
- repeatability checks
- graph-stability diagnosis

Non-goals:

- polishing over structural weakness
- widening runtime scope before the cluster is stable

Exit gates:

- boundary hotspots are known
- repeatability holds
- graph instability is visible before new capability is added

Reference:

- [boundary-integrity.md](/home/serhat/code/chatpdm/docs/boundary-integrity.md)

### Phase 10: Query-Shape Classification + Subtype-Aware No-Match

Classify the request shape so the runtime can refuse more honestly and more specifically.

Scope:

- direct concept lookup classification
- canonical lookup classification
- comparison-shaped phrasing classification
- relation-shaped phrasing classification
- role or actor phrasing classification
- unsupported complex phrasing classification

Non-goals:

- answering comparison content
- answering relation content
- actor identification
- composing new canonical meaning

Exit gates:

- classification remains deterministic
- subtype-aware no-match states improve inspectability
- the classifier does not silently widen runtime capability

### Phase 11: Controlled Comparison Mode

Allow comparison only where the comparison is explicitly authored and structurally safe.

Scope:

- bounded comparison allowlists
- deterministic comparison response behavior
- explicit refusal outside the allowlisted set

Non-goals:

- open comparison generation
- evaluative ranking across arbitrary concepts
- broad analogical reasoning

Exit gates:

- supported comparison pairs remain explicit
- unsupported pairs refuse cleanly
- comparison outputs stay distinct from normal concept lookup behavior

### Phase 12: Controlled Relation Layer

Enter relation-aware behavior without allowing the runtime to behave like an open graph reasoner.

Scope:

- authored relation structures
- explicit relation-aware routing where supported
- deterministic refusal outside authored relation support

Non-goals:

- open graph traversal
- inferred relation discovery
- ontology-like behavior

Exit gates:

- relation-aware outputs remain bounded and inspectable
- unsupported relation requests refuse honestly
- relation handling does not weaken existing boundary discipline

### Phase 12.5: Access & Surface Policy Layer

Lock the public surface, usage boundary, and inspectable policy layer.

Scope:

- allowed-use boundary
- runtime refusal and access framing
- public-facing policy surface discipline
- traceable policy-to-implementation mapping

Non-goals:

- decorative policy expansion
- vague legal marketing language

Exit gates:

- surface policy is published
- policy claims remain inspectable
- policy behavior stays tied to implementation evidence

### Phase 12.6: Source Integrity

Lock source-grounding discipline so the system cannot drift into unstable or weakly grounded canonical meaning.

Scope:

- source priority rules
- canonical reference discipline
- integrity around authored meaning

Non-goals:

- perspective drift into canonical truth
- speculative source expansion

Exit gates:

- source hierarchy is explicit
- canonical meaning remains structurally grounded

### Phase 12.7: Execution Gate / Runtime Truth Discipline

Lock refusal-first execution discipline so the runtime tells the truth about what it can and cannot do.

Scope:

- refusal-first runtime behavior
- contract honesty
- stable evaluation logic
- surface language aligned with runtime truth

Non-goals:

- fluent masking of gaps
- answer-like behavior outside authored support
- contract-softening through UI language

Exit gates:

- doctrine is explicit
- evaluation logic is stable
- refusal remains the first safe behavior when structure is absent

### Phase 12.8: Composition-Safe Relation Thinking

This phase is intentionally small.

It does not mean open composition.
It does not mean an inference engine.
It does not mean a grand reasoning system.

It means only this:

- carefully authored relation-aware compositions
- explicit closure around allowed composition paths
- deterministic refusal outside authored closure

Scope:

- pre-authored composition-safe patterns
- relation-aware compositions that remain fully inspectable
- subtype-distinct output handling where composition is permitted

Non-goals:

- free composition
- latent multi-hop reasoning
- canonical expansion through composition
- speculative "smart" behavior

Exit gates:

- every allowed composition path is authored in advance
- unsupported compositions refuse cleanly
- repeated execution remains stable
- comparison, relation, and composition outputs remain structurally distinct
- no silent contract widening occurs

### Phase 13: Bounded Composition Layer

This is the next major frontier, but it must begin as a constraint phase before it becomes an implementation phase.

Phase 13 starts by defining:

- what compositions are allowed
- what compositions are explicitly refused
- what proof preserves determinism

It does not start by adding broad new runtime capability.

Entry gates:

- current runtime remains stable
- concept boundaries remain clean under pressure
- no drift enters through comparison or relation behavior
- Phase 12.8 passes its closure and refusal gates

Scope:

- explicit allowed composition classes
- deterministic composition contracts
- inspectable authored closure for every supported composition path

Non-goals:

- open-world synthesis
- freeform reasoning
- hidden semantic bridging
- broad multi-step runtime inference

Exit gates:

- every supported composition is deterministic
- every unsupported composition is explicitly refused
- composition remains inspectable at the authored-structure level
- the bounded layer does not collapse comparison, relation, and composition into one vague response mode

## 6. Stop Rules

Stop expansion immediately if any of the following become true:

- refusal starts getting replaced by fluent approximation
- comparison and relation outputs lose subtype distinction
- composition logic widens faster than the concept boundary can support
- implementation convenience starts defining phase meaning
- the system becomes harder to inspect than to describe

## 7. Practical Reading Rule

Use this roadmap as a control document.

When a new idea appears, ask in this order:

1. What phase does this belong to?
2. What does that phase explicitly authorize?
3. What does that phase explicitly refuse?
4. What exit gate would prove it is safe?

If those answers are not clear, the feature is not ready for implementation.
