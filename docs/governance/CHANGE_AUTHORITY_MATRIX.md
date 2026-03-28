# ChatPDM Change Authority Matrix

Status: Draft governance matrix for current and near-future ChatPDM stewardship.
Purpose:

- define who can approve what
- separate constitutional authority from maintainer authority
- prevent silent truth-law drift
- keep change review proportional to layer sensitivity
Governing question:
- how are changes routed, blocked, approved, executed, and recorded under ChatPDM governance?
This document is subordinate to:
- [GOVERNANCE_CONSTITUTION.md](./GOVERNANCE_CONSTITUTION.md)
This document is complemented by:
- [CONCEPT_LIFECYCLE.md](./CONCEPT_LIFECYCLE.md)
This document owns authority routing.
It does not own constitutional law, lifecycle state law, exception doctrine, or event schema.

## 1. How To Read This Matrix

Every change object below is mapped to:

- a constitutional class
- typical repo objects
- who may propose the change
- which reviewers must be involved
- who gives final approval
- whether the change can merge without constitutional sign-off
- notes about why the approval burden is set that way
This is not a permission list for convenience.
It is a protection list for truth integrity.

## 2. Active Roles In This Matrix

### Founding Canonical Steward

- constitutional owner of truth law
- final approver for constitutional and canonical changes
- final veto over source law, scope law, refusal law, and trust-surface semantic drift

### Core Maintainer

- may implement non-constitutional changes
- may propose any change
- may merge only within delegated authority

### Source Integrity Reviewer

- checks source relevance
- checks source priority discipline
- checks provenance integrity

### Contrast Reviewer

- checks overlap risk
- checks concept collapse risk
- checks ambiguity and relation separation

### Runtime Contract Reviewer

- checks response contract
- checks schema stability
- checks runtime deterministic implications

### Policy Surface Reviewer

- checks inspect and legal trust wording
- checks policy claim mapping
- checks public trust semantics

### Frontend Trust Reviewer

- checks UI interpretation risk
- checks multi-truth optics
- checks loading or AI-style framing risk

### Release Manager

- coordinates release execution
- does not own constitutional truth changes

### Institutional Deployment Operator

- may execute deployment changes under approved policy
- may not rewrite upstream truth law

## 3. Constitutional Change Classes Used Here

### Class A

- constitutional change
- always requires Founding Canonical Steward approval

### Class B

- canonical package change
- requires Founding Canonical Steward approval with structured reviewer path

### Class C

- maintainer change
- may merge through normal maintainer review if it does not alter truth law

### Class D

- operational change
- may be executed by release or operations roles
- if constitutional semantics are affected, the change is reclassified upward under §3B

## 3A. Binding Reviewer Stop Authority

Required review is not advisory when the reviewed object falls inside the reviewer’s protected domain.
Source Integrity Reviewer may block source-tier, source-priority, source-anchor, and source-admissibility changes until evidence is corrected or a Constitutional Challenge RFC resolves the dispute.
Contrast Reviewer may block concept admission, relation, comparison, alias, normalized-alias, and graph-adjacency changes when overlap, collapse, or ambiguity risk remains unresolved.
Runtime Contract Reviewer may block contract, schema, matcher, normalizer, resolver, lifecycle-gate, and version-routing changes that break deterministic runtime law.
Frontend Trust Reviewer may block public trust wording, reading-lens semantics, ambiguity/refusal wording, and UI behavior that implies alternate truth or generative answer optics.
Policy Surface Reviewer may block inspect and legal evidence-surface wording when it overclaims, weakens traceability, or distorts policy status.
The Founding Canonical Steward may not approve through an active binding block except by the constitutional challenge procedure in [GOVERNANCE_CONSTITUTION.md](./GOVERNANCE_CONSTITUTION.md).

## 3B. Classification Law

If classification is uncertain, the stricter class applies until the dispute is resolved.
A change is at least Class B if it changes scope wording, refusal wording, source attribution, version meaning, graph adjacency, inspectability semantics, or public trust interpretation.
A change is Class A if it changes constitutional doctrine, source law, refusal law, what counts as canonical truth, or the product’s deterministic public contract.
No change may be downgraded from A to B or from B to C without a recorded classification decision entry naming the decider, evidence, and affected files.

## 3C. Required Classification Inputs

Every classification decision must identify:

- the change summary
- affected files
- affected routes, trust surfaces, or runtime outputs
- versions touched
- whether canonical concept content is touched
- whether package boundary contract fields or manifest sovereignty fields are touched
- whether refusal, scope, or source handling is touched
- whether public trust wording is touched
- whether routing, matching, normalization, or resolve behavior is touched

Missing information defaults upward to the stricter class.

## 3D. Deterministic Classification Questions

Use the following question chain before review begins:

- if the change alters what counts as canonical truth, route to Class A
- if the change alters refusal doctrine, scope doctrine, source admissibility doctrine, or constitutional role ownership, route to Class A
- if the change alters the deterministic public contract, schema law, or version law, route to Class A
- if the change alters package schema contract fields that separate package doctrine from core meaning, route to Class A
- if the change admits, revises, deprecates, archives, restores, or supersedes a canonical concept packet, route to Class B
- if the change adds or revises package-local doctrine under `data/packages/` without altering core doctrine, route to Class B
- if the change alters aliases, normalized aliases, related concepts, comparison, or resolve rules in a way that changes routing or neighborhood meaning, route to Class B
- if the change alters public trust wording, inspect-surface evidence claims, reading-lens semantics, ambiguity wording, refusal wording, or source-label meaning, route to Class B
- if the change alters validation rules, review gates, or promotion and rollback gating without changing constitutional doctrine, route to Class B
- if the change is limited to implementation, presentation, layout, component behavior, styling, or build configuration with no truth drift, route to Class C
- if the change is limited to deploy execution, TLS, cache behavior, workflow automation, service restarts, or operational environment hardening with no truth semantics impact, route to Class D

If the chain remains uncertain, the stricter plausible class governs until the dispute is resolved.

## 4. Approval Verbs

Propose means:

- draft the change
- open the issue
- open the PR
- state the intended effect
Review means:
- inspect the proposal
- approve or reject on domain grounds
- request revisions
Block means:
- exercise a binding reviewer stop condition within the reviewer’s protected domain
- require remedy, challenge, or lawful exception before work proceeds
Approve means:
- authorize merge into the protected branch under current governance
Execute means:
- carry out deployment or runtime steps after approval
Record means:
- ensure required governance records exist in the canonical event log
- ensure an exception record exists when the normal path was bypassed
Ratify means:
- approve a constitutional-level doctrine change
Veto means:
- stop the change because it breaches constitutional constraints

## 5. Global Rules

- anyone may identify a problem
- not everyone may change truth law
- proposal rights are broader than approval rights
- operational convenience never overrides constitutional approval
- constitutional silence is not approval
- maintainer urgency is not constitutional authority

## 5A. Steward Constraint Rule For This Matrix

The Founding Canonical Steward may not self-ratify a constitutional expansion, silently downgrade a change class, waive a mandatory evidence gate, or bypass a binding reviewer stop condition without opening a recorded constitutional challenge or amendment path.
Steward-proposed Class A changes require independent review from the affected reviewer discipline and the constitutional review window defined in [GOVERNANCE_CONSTITUTION.md](./GOVERNANCE_CONSTITUTION.md).

## 5B. Emergency Continuity And Freeze Routing

If the Founding Canonical Steward is unavailable, truth-adjacent merges default to freeze.
Emergency freeze, rollback, last-known-safe restore, and temporary truth-release halt actions route through [EMERGENCY_CONTINUITY_PROTOCOL.md](./EMERGENCY_CONTINUITY_PROTOCOL.md).
No emergency path may be used to admit new concepts, weaken refusal semantics, or reclassify a truth-layer change downward.

## 5C. Mandatory Decision Log

Every Class A decision, every Class B promotion or rollback, every classification dispute, and every reviewer block or override attempt must be recorded in the canonical governance event log defined by [GOVERNANCE_EVENT_LOG_SPEC.md](./GOVERNANCE_EVENT_LOG_SPEC.md).
If the action bypassed the normal path, it must also appear in [TRUTH_EXCEPTION_REGISTER.md](./TRUTH_EXCEPTION_REGISTER.md).
This matrix requires the record.
It does not define the record schema.

## 5D. Classification Dispute Routing

If proposer and required reviewer disagree on class, the change freezes at the stricter class.
If the dispute remains unresolved after one review cycle, it escalates to the Founding Canonical Steward with a mandatory decision-log entry.
If the dispute concerns the steward’s own proposal or action, it escalates through the constitutional challenge procedure in [GOVERNANCE_CONSTITUTION.md](./GOVERNANCE_CONSTITUTION.md).
Classification dispute does not itself justify an exception.
Exception law applies only if the normal routing path is being bypassed before the dispute is resolved.

## 5E. Record Responsibility

The proposer is responsible for opening enough context for lawful review.
The final approver is responsible for ensuring any required event record exists before merge or promotion is treated as complete.
The execution owner is responsible for ensuring operational execution records exist when action occurs after approval.
If the action uses an exception path, the approving authority is responsible for ensuring the exception register entry exists as well.
Emergency continuity actors inherit the same record duty for emergency action.

## 6. Matrix Entries

### Matrix Entry 01

Change object: Governance constitution text and doctrine.
Constitutional class: Class A. Repo objects: `docs/governance/GOVERNANCE_CONSTITUTION.md`.
Who may propose: Founding Canonical Steward, Core Maintainer.
Required review: Runtime Contract Reviewer, Policy Surface Reviewer when public semantics are affected. Final approver: Founding Canonical Steward only.
Can merge without constitutional approval: No. Notes: This is the kernel law document. Maintainers may suggest language, but ratification is constitutional.

### Matrix Entry 02

Change object: Change authority matrix doctrine.
Constitutional class: Class A. Repo objects: `docs/governance/CHANGE_AUTHORITY_MATRIX.md`.
Who may propose: Founding Canonical Steward, Core Maintainer.
Required review: one reviewer from any affected layer plus Founding Canonical Steward. Final approver: Founding Canonical Steward only.
Can merge without constitutional approval: No. Notes: This file determines who approves later work, so it cannot be self-modified casually.

### Matrix Entry 03

Change object: Concept lifecycle doctrine.
Constitutional class: Class A. Repo objects: `docs/governance/CONCEPT_LIFECYCLE.md`.
Who may propose: Founding Canonical Steward, Core Maintainer, Contrast Reviewer.
Required review: Source Integrity Reviewer and Contrast Reviewer. Final approver: Founding Canonical Steward only.
Can merge without constitutional approval: No. Notes: Lifecycle doctrine governs admission, promotion, and deprecation of truth objects.

### Matrix Entry 04

Change object: Product response contract semantics.
Constitutional class: Class A. Repo objects: `docs/product/response-contract.md`.
Who may propose: Founding Canonical Steward, Runtime Contract Reviewer, Core Maintainer.
Required review: Runtime Contract Reviewer and Frontend Trust Reviewer. Final approver: Founding Canonical Steward only.
Can merge without constitutional approval: No. Notes: Contract semantics define what the product is allowed to say.

### Matrix Entry 05

Change object: Product response schema structure.
Constitutional class: Class A. Repo objects: `docs/product/response-schema.json`.
Who may propose: Runtime Contract Reviewer, Core Maintainer.
Required review: Runtime Contract Reviewer and Founding Canonical Steward. Final approver: Founding Canonical Steward only.
Can merge without constitutional approval: No. Notes: Schema changes are contract changes even when framed as validation work.

### Matrix Entry 06

Change object: Top-level `queryType` vocabulary.
Constitutional class: Class A. Repo objects: `docs/product/response-contract.md`, resolver outputs, frontend display logic.
Who may propose: Runtime Contract Reviewer, Core Maintainer.
Required review: Runtime Contract Reviewer and Frontend Trust Reviewer. Final approver: Founding Canonical Steward only.
Can merge without constitutional approval: No. Notes: `queryType` shapes public interpretation of what the system is doing.

### Matrix Entry 07

Change object: `resolution.method` vocabulary.
Constitutional class: Class A. Repo objects: `docs/product/response-contract.md`, `backend/src/modules/concepts/resolver.js`.
Who may propose: Runtime Contract Reviewer, Core Maintainer.
Required review: Runtime Contract Reviewer. Final approver: Founding Canonical Steward only.
Can merge without constitutional approval: No. Notes: Resolution methods are part of inspectability and cannot be renamed loosely.

### Matrix Entry 08

Change object: Core concept and package concept required field schema.
Constitutional class: Class A. Repo objects: `backend/src/modules/concepts/concept-loader.js`, `data/concepts/templates`, `data/packages/package-manifest.schema.json`, `data/packages/package-concept.schema.json`.
Who may propose: Founding Canonical Steward, Core Maintainer.
Required review: Source Integrity Reviewer and Contrast Reviewer. Final approver: Founding Canonical Steward only.
Can merge without constitutional approval: No. Notes: If the core/package contract shape changes, truth law changes.

### Matrix Entry 09

Change object: Concept writing standard.
Constitutional class: Class A. Repo objects: `docs/architecture/concept-writing-standard.md`.
Who may propose: Founding Canonical Steward, Contrast Reviewer.
Required review: Contrast Reviewer and Source Integrity Reviewer. Final approver: Founding Canonical Steward only.
Can merge without constitutional approval: No. Notes: Writing rules directly shape the canonical truth layer.

### Matrix Entry 10

Change object: Concept review checklist.
Constitutional class: Class B. Repo objects: `docs/architecture/concept-review-checklist.md`.
Who may propose: Contrast Reviewer, Source Integrity Reviewer, Core Maintainer.
Required review: Founding Canonical Steward and at least one reviewer from source or contrast. Final approver: Founding Canonical Steward.
Can merge without constitutional approval: No. Notes: Review doctrine is subordinate to the constitution but still part of canonical gatekeeping.

### Matrix Entry 11

Change object: v1 concept scope inventory.
Constitutional class: Class A. Repo objects: `docs/architecture/v1-concept-scope.md`, `backend/src/modules/concepts/constants.js`.
Who may propose: Founding Canonical Steward, Core Maintainer.
Required review: Contrast Reviewer and Runtime Contract Reviewer. Final approver: Founding Canonical Steward only.
Can merge without constitutional approval: No. Notes: Inventory size and scope are not maintainership convenience decisions.

### Matrix Entry 12

Change object: Addition of a new concept to `data/concepts`.
Constitutional class: Class B. Repo objects: `data/concepts/*.json`, scope docs, tests, resolver outputs.
Who may propose: Founding Canonical Steward, Domain Package Maintainer when such role exists.
Required review: Source Integrity Reviewer and Contrast Reviewer. Final approver: Founding Canonical Steward.
Can merge without constitutional approval: No. Notes: New concepts alter the system’s truth boundary and concept set version.

### Matrix Entry 13

Change object: Removal of a canonical concept.
Constitutional class: Class B. Repo objects: `data/concepts/*.json`, lifecycle docs, fixtures, scope docs.
Who may propose: Founding Canonical Steward, Contrast Reviewer.
Required review: Contrast Reviewer, Runtime Contract Reviewer. Final approver: Founding Canonical Steward.
Can merge without constitutional approval: No. Notes: Removal may be valid for anti-bloat or overlap reasons, but it is never casual.

### Matrix Entry 14

Change object: Deprecation of a concept without immediate deletion.
Constitutional class: Class B. Repo objects: concept packet metadata, lifecycle docs, release notes.
Who may propose: Founding Canonical Steward, Core Maintainer, Contrast Reviewer.
Required review: Contrast Reviewer. Final approver: Founding Canonical Steward.
Can merge without constitutional approval: No. Notes: Deprecation affects public expectations and query behavior.

### Matrix Entry 15

Change object: `conceptId` rename.
Constitutional class: Class A. Repo objects: concept packet, relations, resolve rules, frontend references, tests.
Who may propose: Founding Canonical Steward only.
Required review: Runtime Contract Reviewer and Contrast Reviewer. Final approver: Founding Canonical Steward only.
Can merge without constitutional approval: No. Notes: `conceptId` is a stable canonical identity and cannot be renamed like display copy.

### Matrix Entry 16

Change object: canonical `title` revision.
Constitutional class: Class B. Repo objects: concept packet, frontend rendering, docs.
Who may propose: Founding Canonical Steward, Core Maintainer.
Required review: Contrast Reviewer. Final approver: Founding Canonical Steward.
Can merge without constitutional approval: No. Notes: Title changes can alter interpretation and search expectations.

### Matrix Entry 17

Change object: `shortDefinition` revision.
Constitutional class: Class B. Repo objects: concept packet, overlays, frontend display, tests.
Who may propose: Founding Canonical Steward, Domain Package Maintainer.
Required review: Source Integrity Reviewer and Contrast Reviewer. Final approver: Founding Canonical Steward.
Can merge without constitutional approval: No. Notes: This is canonical meaning content, not copy editing.

### Matrix Entry 18

Change object: `coreMeaning` revision.
Constitutional class: Class B. Repo objects: concept packet, overlays, tests.
Who may propose: Founding Canonical Steward, Domain Package Maintainer.
Required review: Contrast Reviewer and Source Integrity Reviewer. Final approver: Founding Canonical Steward.
Can merge without constitutional approval: No. Notes: Mechanism changes are meaning changes.

### Matrix Entry 19

Change object: `fullDefinition` revision.
Constitutional class: Class B. Repo objects: concept packet, overlays, frontend trust surfaces.
Who may propose: Founding Canonical Steward, Domain Package Maintainer.
Required review: Source Integrity Reviewer and Frontend Trust Reviewer when public optics change materially. Final approver: Founding Canonical Steward.
Can merge without constitutional approval: No. Notes: Long-form definition changes can subtly shift system doctrine.

### Matrix Entry 20

Change object: context set or context explanations.
Constitutional class: Class B. Repo objects: concept packet `contexts`.
Who may propose: Domain Package Maintainer, Contrast Reviewer, Founding Canonical Steward.
Required review: Contrast Reviewer. Final approver: Founding Canonical Steward.
Can merge without constitutional approval: No. Notes: Context drift can create hidden domain broadening.

### Matrix Entry 21

Change object: related concept edges.
Constitutional class: Class B. Repo objects: concept packet `relatedConcepts`, frontend related-concepts UI.
Who may propose: Founding Canonical Steward, Contrast Reviewer, Domain Package Maintainer.
Required review: Contrast Reviewer. Final approver: Founding Canonical Steward.
Can merge without constitutional approval: No. Notes: Relationship edges create inspectable graph claims and therefore require discipline.

### Matrix Entry 22

Change object: comparison axes between concepts.
Constitutional class: Class B. Repo objects: concept packet `comparison`, comparison UI.
Who may propose: Founding Canonical Steward, Domain Package Maintainer.
Required review: Contrast Reviewer and Runtime Contract Reviewer. Final approver: Founding Canonical Steward.
Can merge without constitutional approval: No. Notes: Comparison is authored and bounded, not generative.

### Matrix Entry 23

Change object: alias additions to a concept.
Constitutional class: Class B. Repo objects: concept packet `aliases`.
Who may propose: Core Maintainer, Founding Canonical Steward, Domain Package Maintainer.
Required review: Contrast Reviewer. Final approver: Founding Canonical Steward.
Can merge without constitutional approval: No. Notes: Alias expansion can broaden runtime behavior without changing the definition text.

### Matrix Entry 24

Change object: normalized alias additions.
Constitutional class: Class B. Repo objects: concept packet `normalizedAliases`.
Who may propose: Core Maintainer, Founding Canonical Steward.
Required review: Runtime Contract Reviewer and Contrast Reviewer. Final approver: Founding Canonical Steward.
Can merge without constitutional approval: No. Notes: Normalized aliases affect determinism directly.

### Matrix Entry 25

Change object: author-defined disambiguation rules.
Constitutional class: Class B. Repo objects: `data/concepts/resolve-rules.json`.
Who may propose: Core Maintainer, Contrast Reviewer, Founding Canonical Steward.
Required review: Contrast Reviewer and Runtime Contract Reviewer. Final approver: Founding Canonical Steward.
Can merge without constitutional approval: No. Notes: Disambiguation rules affect which concepts the system allows the user to choose between.

### Matrix Entry 26

Change object: author-defined suggestion rules.
Constitutional class: Class B. Repo objects: `data/concepts/resolve-rules.json`.
Who may propose: Core Maintainer, Founding Canonical Steward.
Required review: Contrast Reviewer. Final approver: Founding Canonical Steward.
Can merge without constitutional approval: No. Notes: Suggestion rules must not become a quiet substitute for truth expansion.

### Matrix Entry 27

Change object: source registry tier entries.
Constitutional class: Class A. Repo objects: `backend/src/modules/concepts/source-registry.json`.
Who may propose: Source Integrity Reviewer, Founding Canonical Steward.
Required review: Source Integrity Reviewer. Final approver: Founding Canonical Steward only.
Can merge without constitutional approval: No. Notes: Source tiers are part of admissibility law.

### Matrix Entry 28

Change object: primary source mapping by concept.
Constitutional class: Class B. Repo objects: `PRIMARY_SOURCE_BY_CONCEPT` in `concept-loader.js`.
Who may propose: Source Integrity Reviewer, Founding Canonical Steward.
Required review: Source Integrity Reviewer. Final approver: Founding Canonical Steward.
Can merge without constitutional approval: No. Notes: This determines which source leads canonical grounding for each concept.

### Matrix Entry 29

Change object: source priority doctrine.
Constitutional class: Class A. Repo objects: `concept-loader.js`, source registry, concept docs.
Who may propose: Founding Canonical Steward, Source Integrity Reviewer.
Required review: Source Integrity Reviewer and Runtime Contract Reviewer. Final approver: Founding Canonical Steward only.
Can merge without constitutional approval: No. Notes: Priority doctrine is a constitutional truth rule, not a content preference.

### Matrix Entry 30

Change object: source labels and `usedFor` wording inside a concept.
Constitutional class: Class B. Repo objects: concept packet `sources`.
Who may propose: Source Integrity Reviewer, Core Maintainer, Founding Canonical Steward.
Required review: Source Integrity Reviewer. Final approver: Founding Canonical Steward.
Can merge without constitutional approval: No. Notes: Even source display wording can distort provenance if handled loosely.

### Matrix Entry 31

Change object: concept loader validation rules.
Constitutional class: Class A. Repo objects: `backend/src/modules/concepts/concept-loader.js`.
Who may propose: Core Maintainer, Founding Canonical Steward.
Required review: Runtime Contract Reviewer and Source Integrity Reviewer. Final approver: Founding Canonical Steward only.
Can merge without constitutional approval: No. Notes: Loader validation is the promotion gate for authored truth.

### Matrix Entry 32

Change object: matcher behavior.
Constitutional class: Class A. Repo objects: matcher modules, resolver integration, tests.
Who may propose: Core Maintainer, Runtime Contract Reviewer.
Required review: Runtime Contract Reviewer and Contrast Reviewer when canonical selection changes. Final approver: Founding Canonical Steward only.
Can merge without constitutional approval: No. Notes: Matcher changes alter which concept the same query resolves to.

### Matrix Entry 33

Change object: normalizer behavior.
Constitutional class: Class A. Repo objects: normalizer modules, response contract docs.
Who may propose: Core Maintainer, Runtime Contract Reviewer.
Required review: Runtime Contract Reviewer. Final approver: Founding Canonical Steward only.
Can merge without constitutional approval: No. Notes: Normalization is part of deterministic identity for the query path.

### Matrix Entry 34

Change object: governance scope enforcement signals.
Constitutional class: Class A. Repo objects: `backend/src/modules/concepts/governance-scope-enforcer.js`.
Who may propose: Founding Canonical Steward, Core Maintainer.
Required review: Contrast Reviewer and Runtime Contract Reviewer. Final approver: Founding Canonical Steward only.
Can merge without constitutional approval: No. Notes: This file enforces one of the strongest current domain boundaries in the system.

### Matrix Entry 35

Change object: refusal message semantics.
Constitutional class: Class A. Repo objects: `constants.js`, response contract docs, frontend labels.
Who may propose: Runtime Contract Reviewer, Core Maintainer, Policy Surface Reviewer.
Required review: Runtime Contract Reviewer and Frontend Trust Reviewer. Final approver: Founding Canonical Steward only.
Can merge without constitutional approval: No. Notes: Refusal semantics shape user trust and system honesty.

### Matrix Entry 36

Change object: ambiguous match message semantics.
Constitutional class: Class B. Repo objects: `constants.js`, frontend ambiguity UI.
Who may propose: Core Maintainer, Runtime Contract Reviewer.
Required review: Frontend Trust Reviewer. Final approver: Founding Canonical Steward.
Can merge without constitutional approval: No. Notes: Ambiguity wording must not collapse into advice or hidden disambiguation.

### Matrix Entry 37

Change object: `no_exact_match` suggestion semantics.
Constitutional class: Class B. Repo objects: resolver logic, resolve rules, frontend refusal UI.
Who may propose: Core Maintainer, Founding Canonical Steward.
Required review: Contrast Reviewer and Frontend Trust Reviewer. Final approver: Founding Canonical Steward.
Can merge without constitutional approval: No. Notes: Suggestions can become a stealth expansion layer if not governed.

### Matrix Entry 38

Change object: comparison resolver semantics.
Constitutional class: Class A. Repo objects: `backend/src/modules/concepts/comparison-resolver.js`.
Who may propose: Core Maintainer, Runtime Contract Reviewer.
Required review: Runtime Contract Reviewer and Contrast Reviewer. Final approver: Founding Canonical Steward only.
Can merge without constitutional approval: No. Notes: Comparison must remain authored and bounded.

### Matrix Entry 39

Change object: concept set version declaration.
Constitutional class: Class B. Repo objects: `backend/src/modules/concepts/constants.js`, release notes.
Who may propose: Release Manager, Core Maintainer, Founding Canonical Steward.
Required review: Runtime Contract Reviewer. Final approver: Founding Canonical Steward.
Can merge without constitutional approval: No. Notes: Version declaration must reflect real truth-layer change, not just code churn.

### Matrix Entry 40

Change object: contract version declaration.
Constitutional class: Class A. Repo objects: `constants.js`, response contract docs, schema.
Who may propose: Runtime Contract Reviewer, Founding Canonical Steward.
Required review: Runtime Contract Reviewer. Final approver: Founding Canonical Steward only.
Can merge without constitutional approval: No. Notes: Contract version is public law.

### Matrix Entry 41

Change object: matcher version declaration.
Constitutional class: Class B. Repo objects: `constants.js`, backend scripts.
Who may propose: Core Maintainer, Release Manager.
Required review: Runtime Contract Reviewer. Final approver: Founding Canonical Steward.
Can merge without constitutional approval: No. Notes: Version bumps are not optional when matcher behavior changes.

### Matrix Entry 42

Change object: normalizer version declaration.
Constitutional class: Class B. Repo objects: `constants.js`, docs.
Who may propose: Core Maintainer, Release Manager.
Required review: Runtime Contract Reviewer. Final approver: Founding Canonical Steward.
Can merge without constitutional approval: No. Notes: Same input and same version must stay meaningful.

### Matrix Entry 43

Change object: derived overlay manifest structure.
Constitutional class: Class A. Repo objects: `backend/src/modules/concepts/derived-explanation-overlay-manifest.json`.
Who may propose: Core Maintainer, Founding Canonical Steward.
Required review: Runtime Contract Reviewer and Frontend Trust Reviewer. Final approver: Founding Canonical Steward only.
Can merge without constitutional approval: No. Notes: Overlay manifest governs deterministic register generation.

### Matrix Entry 44

Change object: overlay template IDs and prefix strategy.
Constitutional class: Class A. Repo objects: overlay manifest, overlay generation code, verification scripts.
Who may propose: Core Maintainer, Founding Canonical Steward.
Required review: Runtime Contract Reviewer and Frontend Trust Reviewer. Final approver: Founding Canonical Steward only.
Can merge without constitutional approval: No. Notes: These changes alter public register semantics and certification behavior.

### Matrix Entry 45

Change object: `maxSemanticLagMs` for overlays.
Constitutional class: Class B. Repo objects: overlay manifest and derived overlay resolver.
Who may propose: Core Maintainer, Release Manager, Founding Canonical Steward.
Required review: Runtime Contract Reviewer. Final approver: Founding Canonical Steward.
Can merge without constitutional approval: No. Notes: Lag policy affects when stale derived registers are served or blocked.

### Matrix Entry 46

Change object: reading lens gate trust copy.
Constitutional class: Class A. Repo objects: `derived-explanation-reading-lens-gate.json`, frontend policy mirrors.
Who may propose: Policy Surface Reviewer, Founding Canonical Steward.
Required review: Frontend Trust Reviewer and Policy Surface Reviewer. Final approver: Founding Canonical Steward only.
Can merge without constitutional approval: No. Notes: Trust copy controls whether users perceive one truth or multiple answers.

### Matrix Entry 47

Change object: canonical visual anchor specification.
Constitutional class: Class A. Repo objects: `derived-explanation-reading-lens-gate.json`, frontend rendering.
Who may propose: Frontend Trust Reviewer, Founding Canonical Steward.
Required review: Policy Surface Reviewer and Runtime Contract Reviewer. Final approver: Founding Canonical Steward only.
Can merge without constitutional approval: No. Notes: Anchor semantics are part of interpretation governance, not cosmetic layout.

### Matrix Entry 48

Change object: reading lens mode labels.
Constitutional class: Class A. Repo objects: gate JSON, frontend policy, UI labels.
Who may propose: Frontend Trust Reviewer, Policy Surface Reviewer.
Required review: Frontend Trust Reviewer and Founding Canonical Steward. Final approver: Founding Canonical Steward only.
Can merge without constitutional approval: No. Notes: Label drift can make overlays feel like alternate answers.

### Matrix Entry 49

Change object: reading lens UI behavior.
Constitutional class: Class B. Repo objects: landing page and related frontend surfaces.
Who may propose: Core Maintainer, Frontend Trust Reviewer.
Required review: Frontend Trust Reviewer. Final approver: Founding Canonical Steward.
Can merge without constitutional approval: No. Notes: UI behavior is implementation, but lens semantics remain constitutionally guarded.

### Matrix Entry 50

Change object: diagnostic feedback vocabulary.
Constitutional class: Class B. Repo objects: landing page feedback labels, backend feedback types if expanded.
Who may propose: Policy Surface Reviewer, Core Maintainer.
Required review: Frontend Trust Reviewer. Final approver: Founding Canonical Steward.
Can merge without constitutional approval: No. Notes: Feedback naming frames whether the product looks like infrastructure or a chatbot.

### Matrix Entry 51

Change object: source rank naming such as Primary Source and Reference Source.
Constitutional class: Class B. Repo objects: landing page rendering and source output copy.
Who may propose: Policy Surface Reviewer, Core Maintainer.
Required review: Source Integrity Reviewer and Frontend Trust Reviewer. Final approver: Founding Canonical Steward.
Can merge without constitutional approval: No. Notes: Source naming is part of truth attribution and must stay precise.

### Matrix Entry 52

Change object: inspect policy claim model.
Constitutional class: Class B. Repo objects: `frontend/src/app/policies/policy-surface.types.ts`, generated data shape.
Who may propose: Policy Surface Reviewer, Core Maintainer.
Required review: Runtime Contract Reviewer and Policy Surface Reviewer. Final approver: Founding Canonical Steward.
Can merge without constitutional approval: No. Notes: Policy claims form a trust and evidence surface tied to modeled behavior.

### Matrix Entry 53

Change object: policy-surface generated data content model.
Constitutional class: Class B. Repo objects: `policy-surface.data.ts`, generators, legal inspect routes.
Who may propose: Core Maintainer, Policy Surface Reviewer.
Required review: Policy Surface Reviewer. Final approver: Founding Canonical Steward.
Can merge without constitutional approval: No. Notes: Inspect surfaces must remain evidence-oriented and bounded.

### Matrix Entry 54

Change object: policy hypotheses schema.
Constitutional class: Class B. Repo objects: `policies/policy-hypotheses.schema.json`, validation scripts.
Who may propose: Policy Surface Reviewer, Core Maintainer.
Required review: Policy Surface Reviewer and Runtime Contract Reviewer. Final approver: Founding Canonical Steward.
Can merge without constitutional approval: No. Notes: Governance claims about policy closure and expiry are legally sensitive trust surfaces.

### Matrix Entry 55

Change object: policy governance validation rules.
Constitutional class: Class B. Repo objects: `scripts/validate-policy-governance.js`.
Who may propose: Core Maintainer, Policy Surface Reviewer.
Required review: Policy Surface Reviewer. Final approver: Founding Canonical Steward.
Can merge without constitutional approval: No. Notes: Validation rules define whether policy claims count as current, closed, or expired.

### Matrix Entry 56

Change object: legal route canonical paths.
Constitutional class: Default Class C. Escalates to Class B if route change alters legal-surface claim meaning, evidence discoverability, or inspect/public trust semantics. Repo objects: `frontend/src/app/seo/registry/seo.legal.ts`, route config.
Who may propose: Core Maintainer, Policy Surface Reviewer.
Required review: Policy Surface Reviewer. Final approver: Core Maintainer for pure routing, Founding Canonical Steward if trust semantics change.
Can merge without constitutional approval: Yes for routing-only changes. Notes: Canonical path hygiene is normally maintainership unless it alters public trust structure.

### Matrix Entry 57

Change object: top-level legal placeholder wording.
Constitutional class: Class B. Repo objects: `public-page.content.ts`, SEO descriptions, placeholders.
Who may propose: Policy Surface Reviewer, Core Maintainer.
Required review: Policy Surface Reviewer and Frontend Trust Reviewer. Final approver: Founding Canonical Steward.
Can merge without constitutional approval: No. Notes: Placeholder wording can overclaim, underclaim, or misframe inspect surfaces.

### Matrix Entry 58

Change object: inspect privacy, terms, and cookies semantic wording.
Constitutional class: Class B. Repo objects: policy page data and inspect templates.
Who may propose: Policy Surface Reviewer, Core Maintainer.
Required review: Policy Surface Reviewer. Final approver: Founding Canonical Steward.
Can merge without constitutional approval: No. Notes: These routes are evidence surfaces and must stay mechanistic, not boilerplate.

### Matrix Entry 59

Change object: homepage trust chips and proof definitions.
Constitutional class: Class B. Repo objects: landing page TS, HTML, CSS.
Who may propose: Frontend Trust Reviewer, Core Maintainer.
Required review: Frontend Trust Reviewer and Policy Surface Reviewer. Final approver: Founding Canonical Steward.
Can merge without constitutional approval: No. Notes: These are interpretive anchors, not ordinary marketing tags.

### Matrix Entry 60

Change object: homepage routing simulator semantics.
Constitutional class: Default Class C. Escalates to Class B if simulator wording, state names, or refusal handling diverge from runtime truth or trust doctrine. Repo objects: landing page simulator logic.
Who may propose: Core Maintainer, Frontend Trust Reviewer.
Required review: Frontend Trust Reviewer. Final approver: Core Maintainer for layout-only changes, Founding Canonical Steward if simulated doctrine changes.
Can merge without constitutional approval: Yes for layout-only changes. Notes: If the simulator’s language diverges from runtime law, the change becomes constitutional.

### Matrix Entry 61

Change object: public reading lens static trust zone wording.
Constitutional class: Class B. Repo objects: landing page reading-lens UI, frontend policy mirror.
Who may propose: Frontend Trust Reviewer, Policy Surface Reviewer.
Required review: Frontend Trust Reviewer. Final approver: Founding Canonical Steward.
Can merge without constitutional approval: No. Notes: This wording explicitly teaches the user’s truth model.

### Matrix Entry 62

Change object: source anchor display strategy in UI.
Constitutional class: Class B. Repo objects: landing page component logic and gate spec.
Who may propose: Frontend Trust Reviewer, Core Maintainer.
Required review: Source Integrity Reviewer and Frontend Trust Reviewer. Final approver: Founding Canonical Steward.
Can merge without constitutional approval: No. Notes: Source anchor drift weakens inspectability and can misstate provenance.

### Matrix Entry 63

Change object: SEO titles and descriptions for legal and inspect surfaces.
Constitutional class: Default Class C. Escalates to Class B if metadata changes determinism, refusal, bounded-runtime, or evidence-surface claims. Repo objects: `seo.legal.ts`.
Who may propose: Core Maintainer, Policy Surface Reviewer.
Required review: Policy Surface Reviewer. Final approver: Core Maintainer for neutral metadata, Founding Canonical Steward for semantic change.
Can merge without constitutional approval: Yes for neutral metadata changes. Notes: SEO can quietly distort public claims if handled carelessly.

### Matrix Entry 64

Change object: frontend global trust-control primitives.
Constitutional class: Class C. Repo objects: `frontend/src/styles.css`.
Who may propose: Core Maintainer, Frontend Trust Reviewer.
Required review: Frontend Trust Reviewer. Final approver: Core Maintainer.
Can merge without constitutional approval: Yes. Notes: Shared control styling is maintainership, not constitutional law.

### Matrix Entry 65

Change object: route structure for published public pages.
Constitutional class: Default Class C. Escalates to Class B if route structure changes public trust interpretation, legal evidence discoverability, or inspect/public boundary semantics. Repo objects: `frontend/src/app/app.routes.ts`.
Who may propose: Core Maintainer.
Required review: Policy Surface Reviewer if legal or inspect routes are affected. Final approver: Core Maintainer, or Founding Canonical Steward when trust semantics change.
Can merge without constitutional approval: Yes for structural routing only. Notes: Route moves become constitutional when they change interpretive meaning.

### Matrix Entry 66

Change object: deploy workflow triggers.
Constitutional class: Default Class D. Escalates to Class B when workflow changes truth release boundaries or promotion sequencing. Escalates to Class A when workflow changes constitutional release doctrine. Repo objects: `.github/workflows/deploy.yml`.
Who may propose: Release Manager, Core Maintainer.
Required review: Release Manager. Final approver: Release Manager, with Founding Canonical Steward only if promotion logic changes truth release boundaries.
Can merge without constitutional approval: Yes for operational-only changes. Notes: Branch protection and release workflow are operational until they alter truth promotion governance.

### Matrix Entry 67

Change object: branch protection and publication policy docs.
Constitutional class: Class C. Repo objects: `AGENTS.md`, docs/workflow guides.
Who may propose: Core Maintainer, Release Manager.
Required review: Release Manager. Final approver: Core Maintainer for workflow-only guidance, Founding Canonical Steward if publication policy changes constitutional release doctrine.
Can merge without constitutional approval: Yes for ordinary workflow guidance. Notes: Git discipline matters, but it is not itself truth law; doctrine-changing publication policy escalates upward.

### Matrix Entry 68

Change object: nginx TLS and cache configuration.
Constitutional class: Class D. Repo objects: deploy and server config outside the repo, deploy docs.
Who may propose: Institutional Deployment Operator, Release Manager.
Required review: Release Manager. Final approver: Deployment operator for infra, Founding Canonical Steward only if truth semantics are altered by caching strategy.
Can merge without constitutional approval: Yes for pure operational hardening. Notes: TLS is operational, not canonical.

### Matrix Entry 69

Change object: backend verification scripts.
Constitutional class: Default Class C for coverage-only additions. Escalates to Class B when the script becomes a required promotion, rollback, or review gate. Escalates to Class A when the script encodes new constitutional law. Repo objects: `backend/scripts/verify-resolver.js`, overlay verification scripts.
Who may propose: Core Maintainer, Runtime Contract Reviewer.
Required review: the reviewer for the layer being asserted. Final approver: Core Maintainer for coverage additions, Founding Canonical Steward when the script encodes new constitutional gates.
Can merge without constitutional approval: Yes only for coverage-only additions. Notes: Tests become governance when they encode new law.

### Matrix Entry 70

Change object: policy validation scripts.
Constitutional class: Default Class C for technical enforcement only. Escalates to Class B when validation determines policy status or trust-surface doctrine. Escalates to Class A when validation creates new constitutional policy law. Repo objects: `scripts/validate-policy-governance.js`.
Who may propose: Core Maintainer, Policy Surface Reviewer.
Required review: Policy Surface Reviewer. Final approver: Core Maintainer for technical enforcement, Founding Canonical Steward for doctrine change.
Can merge without constitutional approval: Yes only for technical enforcement that leaves doctrine unchanged. Notes: Validation can harden policy truth but should not invent new law by surprise.

### Matrix Entry 71

Change object: source reference stack inventory.
Constitutional class: Class B. Repo objects: `docs/conceptual-reference-stack.md`, local source folders.
Who may propose: Source Integrity Reviewer, Founding Canonical Steward.
Required review: Source Integrity Reviewer. Final approver: Founding Canonical Steward.
Can merge without constitutional approval: No. Notes: The reference stack guides authoring rigor and therefore needs controlled growth.

### Matrix Entry 72

Change object: adding a new core source tier candidate.
Constitutional class: Class A. Repo objects: source registry, conceptual reference stack docs.
Who may propose: Source Integrity Reviewer, Founding Canonical Steward.
Required review: Source Integrity Reviewer. Final approver: Founding Canonical Steward only.
Can merge without constitutional approval: No. Notes: Core source admission is constitutional because it affects long-term truth grounding.

### Matrix Entry 73

Change object: adding an extended or technical reference source.
Constitutional class: Class B. Repo objects: source registry, reference stack docs.
Who may propose: Source Integrity Reviewer, Core Maintainer.
Required review: Source Integrity Reviewer. Final approver: Founding Canonical Steward.
Can merge without constitutional approval: No. Notes: Even non-core sources shape authoring behavior and should remain reviewed.

### Matrix Entry 74

Change object: public docs language about determinism, refusal, or bounded runtime.
Constitutional class: Class B. Repo objects: `README.md`, architecture docs, public pages.
Who may propose: Core Maintainer, Policy Surface Reviewer.
Required review: Frontend Trust Reviewer and Founding Canonical Steward. Final approver: Founding Canonical Steward.
Can merge without constitutional approval: No. Notes: Public claims teach the mental model of the system.

### Matrix Entry 75

Change object: purely local component styling with no semantic impact.
Constitutional class: Class C. Repo objects: component-local CSS files.
Who may propose: Core Maintainer, Frontend contributor.
Required review: ordinary frontend review. Final approver: Core Maintainer.
Can merge without constitutional approval: Yes. Notes: Style is free until it changes public interpretation of the truth contract.

## 7. Escalation Rules

Escalate from Class C to Class B when:

- a layout change changes truth interpretation
- a label change changes trust semantics
- a routing change changes public legal meaning
- a helper script changes promotion or validation doctrine
Escalate from Class B to Class A when:
- the change alters source law
- the change alters refusal law
- the change alters constitutional role ownership
- the change alters what counts as canonical truth
Classification disputes default upward to the stricter class until resolved.
Classification disputes must be logged and, if unresolved between proposer and required reviewer, escalate through the constitutional challenge path in [GOVERNANCE_CONSTITUTION.md](./GOVERNANCE_CONSTITUTION.md).

## 8. Fast Heuristics

Ask these questions:

- does this change alter meaning rather than presentation
- does this change broaden scope
- does this change when the system refuses
- does this change source priority or source authority
- does this change what public users believe the system is doing
- does this require a version bump
If the answer is yes to any of the above, the change is not ordinary maintainer work.
These heuristics do not replace class law.
When heuristics and class law conflict, class law and the stricter route govern.

## 9. Example Approval Paths

Example:

- adjusting a button radius in the homepage card
- class: C
- approver: Core Maintainer
Example:
- changing “No exact match” to language that implies partial knowledge
- class: at least B, and Class A if refusal doctrine changes
- approver: Founding Canonical Steward
Example:
- adding `consent.json` as a new concept packet
- class: B
- approver: Founding Canonical Steward with source and contrast review
Example:
- making `authority` universal rather than governance-scoped
- class: A
- approver: Founding Canonical Steward only

## 10. Closing Rule

This matrix exists to keep the system scalable without dissolving the truth layer into generic collaboration.
Collaboration is welcome.
Unbounded authority is not.
The closer the change sits to canonical meaning, the narrower the approval path must become.
