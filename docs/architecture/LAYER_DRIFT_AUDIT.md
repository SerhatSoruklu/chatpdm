# Layer Drift Audit

This audit checks whether ChatPDM modules stay in their own lane after the military-constraints v1 roadmap and Phase 6 execution-card projection.

Status values used here:

- `clean`: no current boundary breach found
- `watch`: structurally sound, but carries pressure that should stay monitored
- `violation`: concrete drift or boundary breach found

## Summary

- Clean: What ChatPDM is, Vocabulary Boundary, ZeroGlare, Evidence Engine (ZEE), Scope model, Resolution contract, Version policy, Source model, Developers, Docs, Runtime / Chat surface, Military constraints subsystem, Phase 6 execution-card projection
- Watch: Reasoning structure, Risk Mapping Governance
- Violation: API

## What ChatPDM Is

- Module: What ChatPDM is
- Role: Defines ChatPDM as a deterministic meaning system, not a chat-first generator.
- Authoritative input: authored concept packets, source grounding, and contract docs in `docs/architecture/architecture-philosophy.md` and `docs/product/response-contract.md`.
- Authoritative output: stable meaning contracts, versioned response shapes, and bounded public wording.
- Non-authoritative output: marketing tone, speculative behavior claims, or chatbot framing.
- Depends on: source grounding, version discipline, concept contracts, and deterministic runtime behavior.
- Used by: product response surfaces, concept authoring, public trust copy, and subsystem boundaries.
- Forbidden behaviors: probabilistic answer drift, simulated chat behavior, and authority-by-fluency.
- Drift risks: if public wording starts sounding like a general assistant, the architecture can look broader than it is.
- Required fix: none.
- Audit result: clean

## Reasoning Structure

- Module: Reasoning structure
- Role: Describes how ChatPDM reasons as a structured, layered system.
- Authoritative input: `docs/architecture/mental-model.md`, `docs/architecture/system-layer-definitions.md`, and `docs/architecture/resolution-engine.md`.
- Authoritative output: deterministic resolution, refusal-first boundary handling, and explicit layer separation.
- Non-authoritative output: informal intuition, best-effort interpretation, or unlogged fallback reasoning.
- Depends on: loader discipline, runtime boundary checks, and concept contracts.
- Used by: architecture review, feature design, and drift detection.
- Forbidden behaviors: hidden coupling, guessed interpretation, and layer overlap.
- Drift risks: `docs/architecture/mental-model.md` still records loader coupling pressure and runtime abstraction pressure, so the layer remains structurally sound but deserves continued review.
- Required fix: none.
- Audit result: watch

## Risk Mapping Governance

- Module: Risk Mapping Governance
- Role: Provides bounded explanation, audit, governance, and resolve surfaces for risk-mapping queries.
- Authoritative input: risk-mapping pipeline contracts, governance manifests, and the downstream inspect/resolve builders.
- Authoritative output: bounded explanation payloads, governance reports, audit reports, and deterministic resolve outputs.
- Non-authoritative output: narrative advice, strategic guidance, or any claim that the explanation surface is deciding policy.
- Depends on: `backend/src/modules/risk-mapping/inspect/*`, `backend/src/modules/risk-mapping/resolve/*`, `backend/src/modules/risk-mapping/contracts/*`, and the public route wrapper.
- Used by: `/api/v1/risk-mapping/*` endpoints and risk-mapping tests.
- Forbidden behaviors: authority inference, explanation-led decisioning, and fallback interpretation.
- Drift risks: explanation surfaces can drift if they start to feel like a policy engine instead of a projection of validated pipeline state.
- Required fix: none in the risk-mapping governance builders themselves.
- Audit result: watch

## Vocabulary Boundary

- Module: Vocabulary Boundary
- Role: Keeps recognized legal vocabulary outside the ontology unless explicitly admitted.
- Authoritative input: `docs/architecture/vocabulary-boundary-contract.md` and `docs/architecture/legal-vocabulary-recognition-layer.md`.
- Authoritative output: boundary-only recognition, explicit rejection precedence, and non-admission behavior.
- Non-authoritative output: synonym substitution, concept promotion, or visible-only/live upgrades from recognition alone.
- Depends on: recognition registry loading, concept admission gates, and resolver refusal paths.
- Used by: vocabulary recognition, concept resolution, and boundary UI constraints.
- Forbidden behaviors: treating recognition as admission, mapping vocabulary to primitives, or exposing vocabulary as live concept material.
- Drift risks: low, because the contract explicitly forbids concept promotion from recognition.
- Required fix: none.
- Audit result: clean

## ZeroGlare

- Module: ZeroGlare
- Role: A separate pressure-detection and evidence-analysis surface that must stay outside runtime authority paths.
- Authoritative input: `docs/architecture/zeroglare-evidence-engine-boundary.md`.
- Authoritative output: non-authoritative evidence analysis and boundary-safe artifacts.
- Non-authoritative output: resolver inputs, runtime authority, or concept admission signals.
- Depends on: read-only evidence analysis surfaces and boundary rejection checks.
- Used by: public ZEE-facing surfaces and isolation tests.
- Forbidden behaviors: feeding ZEE outputs into resolver logic, runtime output shaping, or admission logic.
- Drift risks: the main risk is accidental reuse by runtime surfaces after the boundary has already been declared.
- Required fix: none.
- Audit result: clean

## Evidence Engine (ZEE)

- Module: Evidence Engine (ZEE)
- Role: A separate public surface for deterministic evidence analysis.
- Authoritative input: `docs/architecture/zeroglare-evidence-engine-boundary.md` and the ZEE module boundary.
- Authoritative output: evidence artifacts that remain non-authoritative.
- Non-authoritative output: concept resolution, runtime policy, or admission decisions.
- Depends on: read-only frontend scaffolds, read-only backend scaffolds, and structural rejection guards.
- Used by: ZEE page routing, read-only backend scaffolding, and isolation checks.
- Forbidden behaviors: runtime reuse, resolver coupling, and hidden decision propagation.
- Drift risks: low so long as the boundary contract remains read-only.
- Required fix: none.
- Audit result: clean

## Scope Model

- Module: Scope model
- Role: Defines what the system may speak about and where each concept is valid.
- Authoritative input: `docs/architecture/system-layer-definitions.md` and `docs/architecture/v1-concept-scope.md`.
- Authoritative output: explicit scope boundaries, out-of-scope refusal, and governance-lane separation.
- Non-authoritative output: broad universalization of governance-scoped terms.
- Depends on: governance structure, rejection handling, and runtime boundary enforcement.
- Used by: concept authoring, resolver scope checks, and documentation.
- Forbidden behaviors: silent scope expansion, universalizing governance terms, and rescue logic for off-scope queries.
- Drift risks: low; both docs repeatedly insist that scope is a control mechanism, not a concept.
- Required fix: none.
- Audit result: clean

## Resolution Contract

- Module: Resolution contract
- Role: Defines the deterministic resolution path and its refusal-first outputs.
- Authoritative input: `docs/architecture/resolution-engine.md`, `docs/product/response-contract.md`, and `docs/architecture/regression-lock-system.md`.
- Authoritative output: resolved concept, governed refusal, unsupported query, and the product response shapes that expose them.
- Non-authoritative output: fallback explanation, guessed concept matches, or improvised response fields.
- Depends on: normalized input, admission state, and versioned concept sets.
- Used by: runtime resolution, response validation, and regression locking.
- Forbidden behaviors: partial resolution, synonym inference, and best-effort guessing.
- Drift risks: low; the contract explicitly refuses mismatch and preserved refusal states.
- Required fix: none.
- Audit result: clean

## Version Policy

- Module: Version policy
- Role: Keeps deterministic behavior reviewable and reproducible across contract, normalizer, matcher, and concept snapshots.
- Authoritative input: `docs/product/version-bump-policy.md` and `docs/architecture/bundle-release-contract.md`.
- Authoritative output: explicit version bumps, fixture updates, and immutability discipline.
- Non-authoritative output: silent ordering changes, undocumented output changes, or shape drift without version changes.
- Depends on: golden fixtures, canonical outputs, and release discipline.
- Used by: product response contracts, bundle releases, and regression review.
- Forbidden behaviors: hidden compatibility changes, unversioned semantics changes, and fixture-free updates.
- Drift risks: low; the contract is explicit about when to bump each version.
- Required fix: none.
- Audit result: clean

## Source Model

- Module: Source model
- Role: Represents concepts and provenance as authored data, not runtime interpretation.
- Authoritative input: `docs/data-model/concepts-and-sources.md`.
- Authoritative output: concept packets, source references, perspectives, metadata, and explicit scope blocks.
- Non-authoritative output: raw source payload copied into runtime meaning, or source pressure that bypasses concept structure.
- Depends on: concept writing, source references, and version metadata.
- Used by: concept authoring, resolution, comparison, and documentation.
- Forbidden behaviors: silent universalization, unscoped governance concepts, and runtime source invention.
- Drift risks: low; the model explicitly says source references record provenance, not copied source payloads.
- Required fix: none.
- Audit result: clean

## Developers

- Module: Developers
- Role: Gives implementation guidance without turning guidance into runtime meaning.
- Authoritative input: `docs/architecture/query-normalization-rules.md` and `docs/architecture/architecture-philosophy.md`.
- Authoritative output: implementation discipline, ordering rules, and explicit versioning expectations.
- Non-authoritative output: architectural improvisation, hidden rescue logic, or “just make it work” guidance.
- Depends on: deterministic contracts, layer separation, and reviewable fixtures.
- Used by: future implementation work and maintenance.
- Forbidden behaviors: using developer guidance to relax contracts or introduce fallback semantics.
- Drift risks: low; the docs are explicit that later implementation must preserve contract discipline.
- Required fix: none.
- Audit result: clean

## Docs

- Module: Docs
- Role: Documents architecture and product contracts without widening runtime meaning.
- Authoritative input: the authored architecture and product contract set.
- Authoritative output: stable explanations, contracts, and lock documents.
- Non-authoritative output: new system semantics hidden in prose.
- Depends on: version policy, release contracts, and architecture boundaries.
- Used by: developers, review, release discipline, and downstream readers.
- Forbidden behaviors: inventing behavior, softening refusal rules, or reassigning authority from code to prose.
- Drift risks: low; the current docs consistently separate explanation from authority.
- Required fix: none.
- Audit result: clean

## API

- Module: API
- Role: Exposes bounded routes for public surfaces and subsystem inspection.
- Authoritative input: `backend/src/routes/api/v1/risk-mapping.route.js` and the relevant product contracts.
- Authoritative output: JSON responses for explain, audit, resolve, governance, diff, and registry routes.
- Non-authoritative output: hidden defaults, silent scope assumptions, or ad hoc best-effort routing.
- Depends on: request validation, downstream module contracts, and route-specific guards.
- Used by: the risk-mapping public surface and runtime consumers.
- Forbidden behaviors: hidden fallback behavior, implicit domain assignment, and routing that bypasses explicit scope.
- Drift risks: concrete hidden fallback exists in the public risk-mapping route.
- Required fix: remove the missing-domain fallback in `buildRiskMapInput` and registry handlers. Missing domain should refuse or 400 instead of silently defaulting to `organization_risk`.
- Audit result: violation

## Runtime / Chat Surface

- Module: Runtime / Chat surface
- Role: Emits the user-visible product response contract and preserves refusal-first behavior.
- Authoritative input: `docs/product/response-contract.md`, `docs/architecture/regression-lock-system.md`, and `docs/architecture/output-validation-exposure-gate.md`.
- Authoritative output: deterministic product responses, refusal states, visible-only states, and locked public shapes.
- Non-authoritative output: fallback prose, best-effort chat behavior, or explanation that changes the decision.
- Depends on: version policy, query normalization, and the public resolver lock.
- Used by: user-facing concept resolution and regression checks.
- Forbidden behaviors: chatbot-style improvisation, silent fallback, and explanation that weakens refusal.
- Drift risks: low; the contract repeatedly separates public response shape from internal failure handling.
- Required fix: none.
- Audit result: clean

## Military Constraints Subsystem

- Module: Military constraints subsystem
- Role: Deterministic closed-world admissibility compiler and runtime evaluator.
- Authoritative input: `docs/architecture/military-constraints-compiler-audit.md`, `docs/architecture/PROTOCOL_GRADE.md`, `docs/architecture/reference-pack-coverage-map.md`, and `docs/architecture/v1-pack-surface-lock.md`.
- Authoritative output: `ALLOWED`, `REFUSED`, or `REFUSED_INCOMPLETE` from validated bundles and structured facts.
- Non-authoritative output: runtime prose interpretation, tactical advice, or semantic widening.
- Depends on: source registry, reviewed clauses, compiler bridge, runtime kernel, regression locks, pack management, and release-grade operationalization.
- Used by: all locked packs, all-pack heartbeat, cross-pack isolation, and release artifacts.
- Forbidden behaviors: new predicate operators, runtime widening, pack-local compiler exceptions, and hidden continuation states.
- Drift risks: the main pack-local continuation drift was already resolved by demoting continuation clauses to review-only metadata.
- Required fix: none.
- Audit result: clean

## Phase 6 Execution-Card Projection

- Module: Phase 6 execution-card projection
- Role: Converts a validated runtime result into a downstream human-readable execution card.
- Authoritative input: `docs/architecture/phase-6-execution-card-projection.md` and `docs/architecture/execution-card-projection-contract.md`.
- Authoritative output: a narrow execution card derived from bundle metadata, runtime decision output, authority trace, and rule trace.
- Non-authoritative output: explanation engine output, recommendations, tactical guidance, or any card field invented from source prose.
- Depends on: validated bundle metadata, runtime decision, traces, and the projection schema.
- Used by: downstream human-readable surfaces and future export/render adapters.
- Forbidden behaviors: deciding admissibility, reading source prose, inventing explanation, or changing refusal semantics.
- Drift risks: low; the projection contract explicitly forbids decision logic and fallback interpretation.
- Required fix: none.
- Audit result: clean

## Overall Result

- Clean module surfaces: 13
- Watch items: 2
- Real violations: 1

The only concrete architecture violation found in this audit is the public API fallback in the risk-mapping route.
Everything else is either clean or a bounded watch item.

## Clean Patterns Worth Preserving

- Refusal-first contracts that preserve explicit `REFUSED_INCOMPLETE` states
- Projection layers that derive output from validated state without reading source prose
- Boundary docs that separate authoritative inputs from explanatory outputs
- Explicit versioning and immutability for product and bundle artifacts
- Locked v1 military-constraints pack surface and all-pack heartbeat discipline

## Real Drift Findings

### API hidden domain fallback

- Module: API
- Artifact: `backend/src/routes/api/v1/risk-mapping.route.js`
- Drift class: hidden fallback / best-effort behavior
- Exact problem: `buildRiskMapInput` and the registry endpoints silently default a missing `domain` to `organization_risk`, even though the risk-map query contract requires explicit domain input.
- Why it is a semantic issue: it lets the API manufacture a scope choice instead of refusing on missing scope, which weakens explicit contract discipline.
- Classification: `violation`
- Minimal surgical fix recommendation: remove the default domain fallback and reject missing domain explicitly at the route boundary.
- Fix scope: local to the API route; no kernel or projection change required.

## Fix Priority Order

1. Remove the hidden domain fallback from the risk-mapping API route.
2. Keep the reasoning-structure pressure points monitored, but do not refactor them without a concrete failure.
3. Preserve the current projection-only behavior of Phase 6 and the refusal-first military constraints kernel.

## Kernel Semantics Status

Overall kernel semantics remain intact.

At the time of this audit, the military-constraints subsystem was still refusal-first, deterministic, and locked at Packs 1 through 5.
Phase 6 remains a projection layer only.
The audit did not find any kernel-wide semantic widening.
