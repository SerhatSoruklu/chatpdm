# Legal Argument Validator Phase Controls

## Purpose

This internal document turns the locked public roadmap into controlled implementation law.

It defines:

- mini-phases
- entry gates
- exit gates
- required artifacts
- invariants touched
- forbidden drift per phase

This document must not be used to rename, reorder, or widen the public roadmap.

The public control document remains:

- [legal-argument-validator-roadmap.md](/home/serhat/code/chatpdm/docs/product/legal-argument-validator-roadmap.md)

That roadmap stays limited to:

- title
- canonical phase order
- canonical phase names

## Control Rules

- No new top-level roadmap letters may be introduced here.
- Mini-phases exist for implementation discipline only.
- If a mini-phase changes the meaning of a top-level phase, the change is invalid until the controlling roadmap is revised first.
- Security, integrity, access control, artifact retention, audit, and tenancy are governed early as law and land later under `L`. They must not be split into a new public roadmap phase.

## Current Authorized Next Wave

The next implementation wave is limited to:

- `Pre-A1`: product constitution and output contract
- `Pre-A2`: doctrine artifact law, replay law, override law, admissibility law
- `A1`: matter, source document, and doctrine artifact data model
- `A2`: immutable storage, hashing, artifact retrieval, retention metadata

No UI, extraction automation, or mapping implementation should outrun those controls.

## Phase Controls

### Pre-A: Scope Lock and Product Law

Mini-phases:

- `Pre-A1`: Product constitution and decision contract
- `Pre-A2`: Artifact, replay, override, and admissibility law

Entry gates:

- the public roadmap is locked
- product boundary is stated as bounded legal validation, not court automation
- allowed top-level outcomes are fixed as `valid`, `invalid`, or `unresolved`

Required artifacts:

- [legal-argument-validator-laws.md](/home/serhat/code/chatpdm/docs/product/legal-argument-validator-laws.md)
- [legal-argument-validator-phase-controls.md](/home/serhat/code/chatpdm/docs/product/legal-argument-validator-phase-controls.md)
- [legal-argument-validator-entities.md](/home/serhat/code/chatpdm/docs/data-model/legal-argument-validator-entities.md)

Exit gates:

- the product is explicitly defined as a deterministic legal argument validator
- refusal-first, no-fuzz, admissibility, replay, trace, authority-scope, and override-visibility laws are written
- the end-state output contract is fixed to `valid`, `invalid`, or `unresolved`
- the requirement for immutable doctrine artifact retention is written as a system law

Invariants touched:

- refusal-first law
- no-fuzz law
- replay law
- trace law
- admissibility law
- authority scope law
- override visibility law
- drift-kill law

Forbidden drift:

- no case outcome prediction
- no judge-replacement framing
- no win-likelihood or persuasiveness scoring
- no fuzzy semantic success path
- no public mini-phase sprawl

### A: Matter and Document Intake

Mini-phases:

- `A1`: Matter, source document, and doctrine artifact model
- `A2`: Immutable storage, hashing, retrieval, and retention metadata

Entry gates:

- `Pre-A` exit gates are complete
- `Matter`, `SourceDocument`, and `DoctrineArtifact` are documented as first-class entities
- immutable artifact retention is defined as a hard requirement

Required artifacts:

- entity definitions for `Matter`, `SourceDocument`, and `DoctrineArtifact`
- storage binding rules for immutable uploads and immutable doctrine artifacts
- hashing and retrieval policy
- retention metadata vocabulary

Exit gates:

- original source uploads are immutable
- normalized text is stored separately from original text
- doctrine artifacts are retrievable by retained artifact reference, not only by current mutable package state
- hash identity is bound to immutable stored artifacts

Invariants touched:

- replay law
- trace law
- governance law
- drift-kill law

Forbidden drift:

- no mutation of original uploads
- no doctrine load by mutable package name only
- no hash-only replay claim without retrievable immutable artifact
- no reasoning records that cannot resolve back to stored artifacts

### B: Segmentation and Source Anchors

Mini-phases:

- `B1`: Deterministic segmentation ruleset
- `B2`: Anchor path, citation span, and paragraph preservation law

Entry gates:

- `A` exit gates are complete
- `SourceDocument` storage and version identity are fixed
- segmentation ruleset versioning is defined

Required artifacts:

- `SourceSegment` entity definition
- segmentation ruleset definition
- anchor path specification
- citation span rules
- deterministic segment identifier rules

Exit gates:

- the same document version and the same segmentation ruleset produce the same segments
- original paragraph anchors are preserved
- every segment is addressable and traceable
- later reasoning may reference only anchored source units

Invariants touched:

- trace law
- replay law
- authority scope law

Forbidden drift:

- no segment generation without stable ruleset versioning
- no loss of original paragraph positions
- no fuzzy segment stitching that erases source anchors
- no argument unit without source segment lineage

### C: Argument Extraction and Admissibility Gate

Mini-phases:

- `C1`: Structured argument unit extraction
- `C2`: Human review, admissibility, and unresolved gate

Entry gates:

- `B` exit gates are complete
- `ArgumentUnit` review and admissibility vocabulary is fixed
- unresolved extraction handling is defined

Required artifacts:

- `ArgumentUnit` entity definition
- extraction provenance rules
- review-state policy
- admissibility policy
- unresolved-reason vocabulary
- extraction-to-mapping gate rules

Exit gates:

- unclear extracted material can remain unresolved without pressure to map
- `pending_review` units do not enter successful deterministic mapping
- `blocked` units do not enter validation success
- extraction provenance is retained for every argument unit

Invariants touched:

- admissibility law
- refusal-first law
- trace law
- override visibility law

Forbidden drift:

- no fully automated extraction success path in early phases
- no silent promotion of `pending_review` to successful mapping
- no discarded unresolved buckets
- no extraction outputs without provenance

### D: Concept Registry and Doctrine Loader

Mini-phases:

- `D1`: Core concept registry and protected identities
- `D2`: Package doctrine loader and namespace enforcement

Entry gates:

- `C` exit gates are complete
- first jurisdiction and first practice area are explicitly chosen
- doctrine package structure is fixed

Required artifacts:

- `Concept` entity definition
- protected core concept list
- doctrine package manifest contract
- namespace rules
- core identity drift check rules
- doctrine loader rejection rules

Exit gates:

- protected core concepts cannot be silently redefined by package doctrine
- `identityBoundary` and required `exclusionRules` are enforced where required
- illegal overrides fail package load and package promotion
- package context may extend application behavior without replacing core identity

Invariants touched:

- core identity law
- governance law
- drift-kill law
- trace law

Forbidden drift:

- no empty protected identity boundaries
- no package doctrine that mutates core concept meaning
- no silent fallback from ambiguous package concept to exact core success
- no synonym expansion that bypasses doctrine review

### E: Authority Registry and Citation Scope Law

Mini-phases:

- `E1`: Authority ingestion and normalization
- `E2`: Citation scope and authority-state enforcement

Entry gates:

- `D` exit gates are complete
- first doctrine package is selected
- authority classes for that doctrine package are fixed

Required artifacts:

- `AuthorityNode` entity definition
- citation parsing rules
- authority state vocabulary
- jurisdiction and effective-period rules
- package scope rules for authority classes

Exit gates:

- authority validation rejects wrong jurisdiction, wrong time period, superseded authority, and out-of-scope authority
- authority class usage is constrained by doctrine package rules
- binding or persuasive status remains explicit

Invariants touched:

- authority scope law
- trace law
- replay law

Forbidden drift:

- no authority success from wrong jurisdiction
- no use of inactive or superseded authority as current support unless a package explicitly allows historical analysis
- no collapse of binding and persuasive authority into one status
- no citation acceptance without structured authority state

### F: Mapping Engine and Synonym Governance

Mini-phases:

- `F1`: Deterministic concept and authority mapping
- `F2`: Synonym governance, manual overrides, and write guards

Entry gates:

- `D` and `E` exit gates are complete
- `Mapping` and `OverrideRecord` are modeled as first-class entities
- deterministic match basis vocabulary is fixed

Required artifacts:

- `Mapping` entity definition
- [override-record.schema.json](/home/serhat/code/chatpdm/docs/data-model/schemas/override-record.schema.json)
- synonym table governance rules
- mapping write guard rules
- resolver rule provenance vocabulary

Exit gates:

- successful mapping requires an exact deterministic basis
- ambiguity remains ambiguity
- unresolved remains unresolved
- manual overrides are explicit, traceable, and reviewable

Invariants touched:

- no-fuzz law
- override visibility law
- governance law
- drift-kill law

Forbidden drift:

- no confidence scores
- no probabilistic success justifications
- no silent best-guess selection between plausible concepts
- no synonym changes treated as harmless metadata

### G: Validation Kernel

Mini-phases:

- `G1`: Structural validation
- `G2`: Concept and authority validation
- `G3`: Consistency and completeness validation

Entry gates:

- `F` exit gates are complete
- validation rule inventory exists for the selected doctrine package
- initial failure-code vocabulary exists for kernel outputs

Required artifacts:

- validation rule inventory
- package-specific completeness requirements
- contradiction rules
- support requirements for rules, application steps, conclusions, and exceptions

Exit gates:

- kernel emits only `valid`, `invalid`, or `unresolved`
- conclusions require explicit support
- admissibility-blocked units do not leak into successful validation
- unresolved doctrine, authority, extraction, or mapping gaps remain unresolved

Invariants touched:

- refusal-first law
- authority scope law
- trace law
- admissibility law

Forbidden drift:

- no soft pass categories
- no persuasive-likelihood output
- no partial success hiding unresolved kernel gaps
- no validation success with missing support paths

### H: Failure Codes, Trace, and Replay Artifact Support

Mini-phases:

- `H1`: Failure-code registry
- `H2`: Trace tree, replay support, and artifact availability checks

Entry gates:

- `G` exit gates are complete
- `ValidationRun` is modeled as a first-class entity
- doctrine artifact retention contract exists

Required artifacts:

- failure-code registry
- `ValidationRun` entity definition
- replay contract
- trace schema
- artifact availability failure rules

Exit gates:

- every `invalid` or `unresolved` result maps to explicit failure codes
- every result includes traceable rule-path and source-anchor context
- replay requires the same input, the same doctrine artifact, and the same resolver version
- missing doctrine artifacts fail explicitly

Invariants touched:

- replay law
- trace law
- override visibility law
- drift-kill law

Forbidden drift:

- no generic invalid output
- no trace-free success, invalid, or unresolved result
- no hash-only replay claim
- no replay against mutable current package state

### I: Analyst Workbench UI

Mini-phases:

- `I1`: Review surfaces and workbench layout
- `I2`: Mapping, trace, and override workflows

Entry gates:

- `H` exit gates are complete
- review and validation actions are already modeled in the backend contracts
- blocked and unresolved states are represented explicitly

Required artifacts:

- interaction surface map
- operator action rules
- trace-visible override workflow
- UI guard rules for blocked and unresolved states

Exit gates:

- operators can inspect sources, extracted units, mappings, failures, and traces in one workbench
- the UI cannot silently convert blocked or unresolved units into successful validation
- operator actions are recorded in reviewable trace context

Invariants touched:

- admissibility law
- trace law
- override visibility law

Forbidden drift:

- no chatbot interface
- no soft assistant wording that implies case prediction
- no hidden inline changes without audit visibility
- no UI affordance that bypasses required review

### J: Report and Export Layer

Mini-phases:

- `J1`: Validation report generation
- `J2`: Export packaging and appendix controls

Entry gates:

- `H` and `I` exit gates are complete
- report language rules are defined
- trace appendices are available

Required artifacts:

- report vocabulary rules
- export contract
- trace appendix rules
- manual override appendix rules

Exit gates:

- reports describe support, contradiction, scope, missing elements, and unresolved gaps
- reports do not state who wins or loses
- exports preserve failure codes, unresolved reasons, and trace context

Invariants touched:

- refusal-first law
- trace law
- override visibility law

Forbidden drift:

- no courtroom outcome language
- no persuasive scoring
- no smoothing of unresolved gaps into narrative success
- no export that drops trace-critical fields

### K: Governance and Promotion Controls

Mini-phases:

- `K1`: Doctrine review and promotion workflow
- `K2`: Regression, drift, and synonym governance suites

Entry gates:

- `D` through `H` exit gates are stable enough to support governance
- doctrine artifact retention exists
- protected concept set is established

Required artifacts:

- promotion state model
- doctrine diff workflow
- regression suite matrix
- synonym regression rules
- protected identity drift review rules

Exit gates:

- no doctrine, synonym, or protected concept changes go live without validation, regression evidence, and reviewer signoff
- promotion states are explicit
- drift against protected core identity is surfaced before promotion

Invariants touched:

- governance law
- core identity law
- drift-kill law
- replay law

Forbidden drift:

- no live doctrine edits without promotion
- no synonym changes outside doctrine review
- no protected identity changes without higher review
- no promotion without retained artifact confirmation

### L: Hardening, Audit, and Tenancy

Mini-phases:

- `L1`: Access control, immutable retention, and audit hardening
- `L2`: Tenancy, retention enforcement, and export integrity

Entry gates:

- `K` exit gates are complete
- retention and audit rules already exist as law from earlier phases
- trace and replay are operational

Required artifacts:

- RBAC model
- audit trail policy
- tenant isolation rules
- retention enforcement rules
- signed export rules
- immutable artifact retention verification rules

Exit gates:

- access control is enforced
- audit history is retained and reviewable
- tenant boundaries are explicit
- doctrine and source artifacts remain both cryptographically identified and immutably retrievable

Invariants touched:

- replay law
- trace law
- governance law
- drift-kill law

Forbidden drift:

- no cross-tenant data bleed
- no mutable audit history
- no artifact integrity claim without retrievable retained artifacts
- no export integrity shortcuts that sever traceability
