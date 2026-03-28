# ChatPDM Concept Lifecycle

Status: Draft lifecycle document for canonical concepts and adjacent truth objects.
Purpose:

- define how a concept moves from proposal to published truth object
- define when a concept must be revised, versioned, deprecated, or removed
- define the review gates that protect determinism and boundary integrity
- define which neighboring artifacts move with the concept
Governing question:
- how do canonical concepts and adjacent truth objects lawfully move between lifecycle states in ChatPDM?
This document owns lifecycle state law.
It does not own global event schema, exception doctrine, or constitutional office allocation.
This document is subordinate to:
- [GOVERNANCE_CONSTITUTION.md](./GOVERNANCE_CONSTITUTION.md)
- [CHANGE_AUTHORITY_MATRIX.md](./CHANGE_AUTHORITY_MATRIX.md)
This document is grounded in:
- [data/concepts/README.md](../../data/concepts/README.md)
- [docs/architecture/concept-writing-standard.md](../architecture/concept-writing-standard.md)
- [docs/architecture/concept-review-checklist.md](../architecture/concept-review-checklist.md)
- [docs/architecture/v1-concept-scope.md](../architecture/v1-concept-scope.md)
- [backend/src/modules/concepts/concept-loader.js](../../backend/src/modules/concepts/concept-loader.js)
- [backend/src/modules/concepts/resolver.js](../../backend/src/modules/concepts/resolver.js)
- [backend/src/modules/concepts/governance-scope-enforcer.js](../../backend/src/modules/concepts/governance-scope-enforcer.js)
- [data/concepts/resolve-rules.json](../../data/concepts/resolve-rules.json)
- [backend/scripts/verify-resolver.js](../../backend/scripts/verify-resolver.js)
- [backend/src/modules/concepts/derived-explanation-overlay-manifest.json](../../backend/src/modules/concepts/derived-explanation-overlay-manifest.json)

## 1. Lifecycle Principle

In ChatPDM, a concept is not published because it exists as an idea.
A concept is published only after it survives a governed lifecycle.
That lifecycle exists to prevent:

- scope creep
- semantic overlap
- weak source grounding
- hidden UI drift
- silent version drift
- accidental runtime broadening
Every concept must move through governed states.
No concept enters runtime by enthusiasm alone.

## 2. What Counts As A Lifecycle Object

The primary lifecycle object is a canonical concept packet.
A concept packet currently lives as a JSON file in:

- `data/concepts/*.json`
But the lifecycle also governs adjacent truth objects:
- `aliases`
- `normalizedAliases`
- `contexts`
- `sources`
- `sourcePriority`
- `relatedConcepts`
- authored `comparison` axes
- `reviewMetadata`
- resolve rules in `data/concepts/resolve-rules.json`
The lifecycle also touches downstream derivative objects:
- derived explanation overlays
- response contract compatibility
- trust surface wording
- inspect route evidence surfaces

## 3. Lifecycle Boundary

This document governs:

- canonical concept admission
- canonical revision
- canonical versioning
- concept deprecation
- concept removal or archival
This document does not govern:
- purely visual UI polish
- TLS maintenance
- cache tuning
- generic component cleanup
Those may react to a concept lifecycle event.
They are not themselves concept lifecycle stages.

## 4. Lifecycle States

The canonical state vocabulary is: `idea`, `pre-screened`, `in-authoring`, `in-source-review`, `in-contrast-review`, `in-scope-review`, `in-runtime-validation`, `awaiting-version-decision`, `approved-for-promotion`, `published`, `revised-draft`, `superseded`, `deprecated`, `archived`, `rolled-back`, `rejected`.
No unofficial state names should be used in governance notes for core concepts.

## 4A. Formal State Machine

One concept may have only one active lifecycle state at a time.
`hold` is not a separate state; it is a review outcome marker attached to the current active state with a required next action and expiry date.
Lifecycle state is a governed status, not an implication drawn from merged code alone.
No state transition is valid until the required reviewer path and record obligations are satisfied.
Allowed forward path for new admission is: `idea -> pre-screened -> in-authoring -> in-source-review -> in-contrast-review -> in-scope-review -> in-runtime-validation -> awaiting-version-decision -> approved-for-promotion -> published`.
Allowed controlled re-entry path is: `published -> revised-draft`; `revised-draft -> in-source-review|in-contrast-review|in-scope-review|in-runtime-validation|awaiting-version-decision`; `published -> deprecated|archived`; `published|approved-for-promotion -> rolled-back`; `published -> superseded` only when a later version is published.
Forbidden examples include publishing directly from `idea`, `hold`, or `rejected`, keeping multiple active states at once, or skipping source, contrast, or scope review for a new concept.

## 5. State Definition: Idea

Meaning:

- the concept exists as a candidate, not yet as a runtime object
Allowed artifacts:
- issue note
- draft note
- comparison memo
- review prompt
Forbidden artifacts:
- published concept file in `data/concepts`
- resolver references
- frontend public claims
Decision owner:
- anyone may raise the idea
- Founding Canonical Steward decides whether it moves to pre-screened

## 6. State Definition: Pre-Screened

Meaning:

- the concept passed an initial fit check
Minimum questions answered:
- why this concept exists
- why an existing concept is insufficient
- which domain it belongs to
- what nearby concepts it must not collapse into
Allowed artifacts:
- scoped proposal notes
- source candidate shortlist
Forbidden artifacts:
- premature concept packet promotion
Decision owner:
- Founding Canonical Steward

## 7. State Definition: In-Authoring

Meaning:

- the concept is being written as a real packet draft
Required artifacts:
- `conceptId`
- `title`
- `shortDefinition`
- `coreMeaning`
- `fullDefinition`
- `contexts`
- `sourcePriority`
- `sources`
- `relatedConcepts`
- `aliases`
- `normalizedAliases`
Optional but often needed:
- `comparison`
- `reviewMetadata`
- `scope`
Decision owner:
- Founding Canonical Steward or delegated package author

## 8. State Definition: In-Source-Review

Meaning:

- the concept has a full draft and is being checked for grounding integrity
Questions:
- are the selected sources admissible
- does the priority order obey source law
- does each source have a real grounding role
- are decorative or weak sources being used
Decision owner:
- Source Integrity Reviewer
- final acceptance by Founding Canonical Steward

## 9. State Definition: In-Contrast-Review

Meaning:

- the concept is being checked against neighboring concepts
Questions:
- does the concept collapse into an existing one
- do relation types remain directional and meaningful
- are comparison axes structurally valid
- does the concept introduce unique explanatory power
Decision owner:
- Contrast Reviewer
- final acceptance by Founding Canonical Steward

## 10. State Definition: In-Scope-Review

Meaning:

- the concept is being checked against the system’s current allowed scope
Questions:
- does the concept belong in the current inventory
- does it preserve governance scoping where required
- does it require clarification or refusal rules
- does it widen the public runtime incorrectly
Decision owner:
- Founding Canonical Steward

## 11. State Definition: In-Runtime-Validation

Meaning:

- the authored draft is being checked against loader, resolver, and response-contract realities
Checks include:
- packet validates under `concept-loader.js`
- response shape remains valid
- concept packet does not violate reserved fields
- related concepts resolve to known targets
- comparison structure validates
Decision owner:
- Core Maintainer with Runtime Contract Reviewer input
- final acceptance by Founding Canonical Steward

## 12. State Definition: Awaiting-Version-Decision

Meaning:

- content is structurally valid but publication metadata has not been finalized
Questions:
- is this a new concept or a revision
- which concept version applies
- must `conceptSetVersion` change
- do overlays need regeneration
- does public wording need synchronized updates
Decision owner:
- Founding Canonical Steward
- Release Manager coordinates execution

## 13. State Definition: Approved For Promotion

Meaning:

- the concept has passed review and is authorized to enter the published set
This state is narrow.
It should exist only briefly.
It means:
- merge-ready
- version-ready
- downstream checks identified
Decision owner:
- Founding Canonical Steward

## 14. State Definition: Published

Meaning:

- concept is live in the canonical published set and may resolve at runtime
Published evidence includes:
- packet present in `data/concepts`
- loader accepts it
- resolver can use it
- contract and version declarations are coherent
- tests or verification are updated where needed
Decision owner:
- Release Manager executes
- Founding Canonical Steward authorizes

## 15. State Definition: Revised-Draft

Meaning:

- a published concept is undergoing a proposed revision
Important rule:
- published status remains active until a revision is approved and versioned
This prevents:
- partial truth states
- shadow edits
- ambiguous doctrine
Decision owner:
- Founding Canonical Steward

## 16. State Definition: Superseded

Meaning:

- a concept version has been replaced by a later approved version
Superseded does not mean erased.
It means:
- older version no longer defines current live truth
- historical trace remains meaningful
Decision owner:
- Founding Canonical Steward

## 17. State Definition: Deprecated

Meaning:

- a concept remains known but is on an approved path out of the live surface
Deprecation may occur because of:
- overlap discovered later
- scope tightening
- structural weakness
- replacement by a stronger concept organization
Decision owner:
- Founding Canonical Steward

## 18. State Definition: Archived

Meaning:

- concept is no longer in the live canonical set
- historical trace remains in governance records
Archive does not mean deletion from history.
It means:
- no live resolver authority
- preserved change trace
Decision owner:
- Founding Canonical Steward

## 19. State Definition: Rolled-Back

Meaning:

- a promoted change was reversed because it proved unsafe or incorrect
Rollback is a valid constitutional action.
It is not failure theater.
It is integrity preservation.
Decision owner:
- Founding Canonical Steward with Release Manager execution

## 20. State Definition: Rejected

Meaning:

- the concept did not survive governance review
Reasons may include:
- overlap
- weak source grounding
- out-of-scope inclusion
- weak explanatory value
- unresolved structural ambiguity
Rejected concepts do not belong in the published source folder.

## 21. Lifecycle Entry Criteria

A concept may enter the lifecycle only if:

- it names a structural mechanism or abstraction
- it can be bounded
- it can be contrasted
- it can be source-grounded
- it is not simply a common search term
If one of these fails, the concept should remain an idea or be rejected.

## 22. Proposal Intake

Proposal intake should record:

- candidate name
- why the concept is needed
- nearest neighboring concepts
- likely domain
- likely source candidates
- likely scope risks
Good proposals are narrow.
Bad proposals are vague, demand-driven, or prestige-driven.

## 23. Intake Rejection Triggers

Reject early when:

- the concept is obviously synonymous with an existing one
- the concept is too narrative
- the concept is culturally unstable in a way the current scope cannot govern
- the concept is being proposed only because users ask for it often
- the concept cannot be justified structurally
Early rejection is healthy.
It saves authoring effort and protects scope.

## 24. Authoring Rules During In-Authoring

Authoring must obey:

- concept writing standard
- source priority rules
- v1 scope lock
- no chatbot phrasing
- no teaching-tone expansion
- no rhetorical filler
Authoring must also preserve:
- field role separation
- structural neutrality
- contrastability

## 25. Source Assembly Rules

Before source review:

- candidate sources must be gathered
- source role per source must be stated
- priority order must be justified
- decorative references must be removed
A concept without a defendable source story is not ready.

## 26. Contrast Assembly Rules

Before contrast review:

- nearby concepts must be named explicitly
- likely collapse risks must be stated
- the draft must explain what the concept is not
- relation directions must be justified
If contrast cannot be stated clearly, the concept is not sufficiently formed.

## 27. Scope Review Rules

Scope review asks:

- is this concept admitted by the active concept inventory
- is it governance-scoped or universal
- must scope be preserved in docs and UI
- are non-governance usages likely to appear
- do refusal or clarification rules need to be authored
This review is especially strict for:
- authority
- power
- legitimacy

## 28. Resolve Rule Companion Review

Some concepts require companion resolve-rule work.
Examples:

- disambiguation candidates
- broader-topic suggestions
When companion rules are needed:
- they must be authored explicitly
- they must be reviewed with the concept
- they must not be added later as ad hoc rescue logic

## 29. Validation Rule: Loader

Before promotion:

- `validateConceptShape` must accept the packet
- reserved authored overlay fields must not be present
- required arrays and strings must validate
- comparison objects must validate if present
Loader validation is the first executable promotion gate.

## 30. Validation Rule: Resolver

Before promotion:

- the concept must resolve under the expected paths
- related concepts must exist
- any new comparison surface must stay bounded
- response contract shape must remain valid
Resolver validation is not just a technical test.
It proves that the concept can live inside runtime law.

## 31. Validation Rule: Response Contract

Before promotion:

- all returned fields must comply with the published response contract
- no new undocumented surface may appear
- no silent semantic field drift may be introduced
Contract compatibility is mandatory.

## 32. Validation Rule: Overlay Impact

If the concept is live in a lens-enabled surface:

- overlay regeneration must remain coherent
- canonical bindings must remain exact
- read-time integrity must not be broken
Concept authors do not own overlay doctrine.
But they do own the canonical content that overlays derive from.

## 33. Validation Rule: Policy Surface Impact

If concept changes affect:

- inspect wording
- public trust wording
- source labels
- refusal explanation
then the concept lifecycle must trigger a trust-surface review.
This is especially important for visible homepage and inspect surfaces.

## 34. Version Decision Rules

Use a version bump when:

- canonical meaning changes
- boundaries change
- source grounding changes materially
- comparison meaning changes materially
- alias behavior changes in a way that alters runtime resolution
Do not avoid a version bump just to keep numbers low.
Version discipline is integrity, not vanity.

## 35. Concept Version Rule

Each published concept packet has a `version`.
That field must change when canonical meaning changes materially.
Material includes:

- definition changes
- scope changes
- source priority changes
- relation structure changes
- comparison doctrine changes
Pure formatting does not require a concept version bump.

## 36. Concept Set Version Rule

`conceptSetVersion` must change when the live published set changes materially.
Material includes:

- new concept admission
- concept removal
- concept version changes
- resolve-rules behavior changes
- relation graph changes affecting live outputs
This version is a runtime statement, not a release note slogan.

## 37. Promotion Checklist

Before promotion, confirm:

- concept passed source review
- concept passed contrast review
- concept passed scope review
- loader validates
- resolver behavior is correct
- version decision is recorded
- downstream impacts are known
If any item is missing, promotion is premature.

## 37A. Mandatory Evidence Artifacts

No concept may enter `approved-for-promotion`, `published`, `deprecated`, or `rolled-back` without a linked evidence bundle.
Minimum required records are: source review, contrast review, scope review, runtime validation, version decision, and downstream impact.
Each record must name author, date, reviewed object and version, evidence links, result, unresolved risks, and required follow-ups.
Steward approval may ratify or reject evidence, but it may not replace missing evidence.

## 38. Merge Discipline

Concept promotion should not be hidden inside unrelated commits.
Keep concept promotion scoped to:

- concept packet change
- rule changes strictly required
- test or verification updates
- documentation updates strictly required
This preserves historical legibility.

## 39. Publication Event

A publication event should record:

- concept identifier
- concept version
- concept set version
- promotion date
- related rules changed
- validation completed
- reviewer path completed
This record must exist as an event in the canonical governance event log defined by [GOVERNANCE_EVENT_LOG_SPEC.md](./GOVERNANCE_EVENT_LOG_SPEC.md).
That event must carry the relevant lifecycle linkage fields such as `linkedLifecycleState`, `fromVersion`, `toVersion`, and `linkedConceptSetVersion` when the event family requires them.
If promotion occurred under exception, the publication record must also name the relevant `exceptionId` from [TRUTH_EXCEPTION_REGISTER.md](./TRUTH_EXCEPTION_REGISTER.md).
PR descriptions and release notes may reference the event.
They do not replace it.

## 39A. Governance Audit Log And Emergency Safety Actions

Lifecycle does not own the global event schema.
It requires lifecycle actions to be recorded in the append-only event log at the canonical path owned by [GOVERNANCE_EVENT_LOG_SPEC.md](./GOVERNANCE_EVENT_LOG_SPEC.md).
Lifecycle state transitions do not create a separate lifecycle log in this phase.
They remain canonical through the linked governance events recorded in `data/governance/governance-event-log.ndjson`.
Lifecycle also does not own exception doctrine.
If a lifecycle action bypasses its ordinary path, the deviation must be recorded in [TRUTH_EXCEPTION_REGISTER.md](./TRUTH_EXCEPTION_REGISTER.md).
If the Founding Canonical Steward is unavailable, freeze, rollback, and last-known-safe restore actions follow [EMERGENCY_CONTINUITY_PROTOCOL.md](./EMERGENCY_CONTINUITY_PROTOCOL.md).

## 40. Published Maintenance

Once published, a concept is not “finished forever.”
It remains subject to:

- overlap discovery
- source challenge
- trust-surface mismatch discovery
- policy wording mismatch
- runtime pressure testing
Published does not mean beyond review.
It means beyond casual editing.

## 41. Revision Triggers

Open a revision when:

- a reviewer finds structural drift
- a stronger primary source grounding is identified
- a contrast problem appears
- UI trust wording reveals an interpretive problem
- runtime behavior exposes a weak alias or suggestion boundary
Do not revise just because a concept “could sound nicer.”

## 42. Revision Rules

Revisions must:

- preserve history
- state what changed
- explain why the old version is insufficient
- identify whether scope or refusal changed
- identify whether source, alias, relation, comparison, resolve-rule, or package-boundary effects reopen dependent review
- trigger version review
Unlogged revision is silent drift.
Silent drift is prohibited.

## 43. Minor Edit Rule

A minor edit may avoid a concept version bump only if all are true:

- no meaning changes
- no scope changes
- no source changes
- no relation changes
- no runtime behavior changes
Examples:
- typo correction
- punctuation cleanup
- clear formatting repair
Anything more should be treated as a substantive revision candidate.

## 44. Alias Lifecycle

Aliases are subordinate to canonical truth.
Their lifecycle is:

- proposed
- checked for overlap risk
- validated for normalization behavior
- approved or rejected
- published with concept set update when needed
Alias changes are never just UX tweaks.
They affect the routing boundary.

## 45. Normalized Alias Lifecycle

Normalized aliases need stricter review than ordinary aliases because they affect deterministic matching.
Their review must check:

- collision risk
- ambiguity risk
- scope leakage risk
- unsupported broadening risk
If risk is unclear, reject or hold.

## 46. Relation Lifecycle

Relations must pass:

- direction review
- type review
- nearby concept review
- frontend inspectability review where applicable
Do not add relations for navigation convenience alone.
Relations are explanatory claims.

## 47. Comparison Lifecycle

Comparison entries must pass:

- concept-pair validity
- authored axis review
- no hidden synthesis
- no equivalence overclaim
Comparison is not a looser mode.
It is a tightly governed one.

## 48. Source Priority Lifecycle

If source priority changes for a concept:

- source review reopens
- meaning review reopens
- version review reopens
Because source priority changes can alter canonical grounding even when the words look similar.

## 49. Governance Scope Lifecycle

For governance-scoped concepts:

- scope block must remain present
- mustPreserveIn list must remain valid
- nonGovernanceHandling must remain valid
- enforcement implications must be rechecked after revision
No revision should accidentally universalize a governance-scoped concept.

## 49A. Graph Revalidation Triggers

A concept must reopen when neighboring truth objects change its routing, adjacency, or scope boundary.
Mandatory reopen triggers include changes to `relatedConcepts`, `comparison`, `data/concepts/resolve-rules.json`, `aliases`, `normalizedAliases`, source priority, scope doctrine, or package boundary that affect the concept or its neighbors.
Reopen destination is `in-contrast-review`, `in-scope-review`, `in-source-review`, or `in-runtime-validation` according to the affected dependency; dependent concepts may not remain silently published without that review.
No graph-affecting change is complete until every flagged dependent concept is either revalidated or explicitly deprecated.

## 50. Reviewer Notes Requirement

At minimum, reviewer notes should answer:

- what passed
- what failed
- what remains risky
- whether scope changed
- whether versions must change
If notes are absent, later audit becomes too weak.

## 51. Rejection Rules

Reject a concept draft if:

- it overlaps too heavily
- it depends on explanatory padding
- it lacks defensible source grounding
- it violates scope discipline
- it cannot survive contract-level runtime treatment
Rejection is a valid governance outcome.
It protects the system from weak admissions.

## 52. Hold Rules

Hold rather than reject when:

- the concept is probably valid but source work is incomplete
- contrast review found a solvable collapse problem
- scope handling exists but is not yet explicit
- resolve-rule companion work is incomplete
Hold is a status marker inside the current active review state, not a second parallel state.
Hold status should not linger indefinitely.
It should force a defined next action.

## 52A. Temporal Law

`pre-screened` expires after 30 days unless the concept enters `in-authoring`.
`hold` requires a named next action and review date within 21 days; otherwise the concept returns to `pre-screened` or is rejected.
`awaiting-version-decision` and `approved-for-promotion` expire after 14 days unless renewed with fresh evidence.
`revised-draft` and any review evidence older than 30 days at promotion time require fresh contrast, scope, and version review before publication.

## 53. Deprecation Triggers

Deprecate when:

- overlap is later proven
- scope policy narrows and the concept no longer belongs in the live set
- a stronger canonical organization replaces the current concept
- the concept is historically informative but no longer live-authoritative
Deprecation should be documented explicitly.

## 54. Deprecation Procedure

When deprecating:

- state the reason
- state the effective version boundary
- state what replaces it if anything
- state what happens to aliases and relations
- state whether the concept remains visible historically
Deprecation without procedure creates confusion.

## 55. Archive Procedure

When archiving:

- remove live runtime authority
- preserve historical record
- preserve governance reasoning
- preserve version trace
Archive should not erase why the concept once existed.

## 56. Rollback Triggers

Rollback may be required when:

- a published concept revision is found unsafe
- a source priority change was wrong
- a scope widening slipped through
- a runtime effect violated trust law
Rollback is a protective tool.
It should remain available.

## 57. Rollback Procedure

When rolling back:

- identify the bad publication boundary
- restore the last sound version
- regenerate downstream derived artifacts if needed
- emit the rollback event required by [GOVERNANCE_EVENT_LOG_SPEC.md](./GOVERNANCE_EVENT_LOG_SPEC.md)
- name the relevant `exceptionId` if rollback bypassed the ordinary path
- state the reason in release notes or governance notes
- review the gate that failed
Rollback must be explicit.

## 58. Relationship To Derived Overlays

Canonical concepts are the truth source.
Overlays are derived.
Therefore:

- overlays do not create lifecycle authority of their own
- overlay changes may require concept review only when canonical text changes
- concept revision may require overlay regeneration
This keeps overlay work subordinate to canonical lifecycle law.

## 59. Relationship To Inspect Surfaces

Inspect surfaces may expose:

- policy claims
- source attribution
- route discipline
- deterministic trust cues
They do not define canonical concept truth.
But concept lifecycle events may require inspect-surface updates when:
- source labels change
- refusal semantics change
- trust wording must preserve the new law

## 60. Relationship To Public UI

Public UI may render:

- title
- definitions
- related concepts
- reading registers
- source labels
UI cannot rewrite the lifecycle.
Lifecycle law always flows from canonical truth toward UI, never the reverse.

## 61. Relationship To Packages

Future package maintainers may draft concepts.
They still must pass:

- intake
- authoring
- source review
- contrast review
- scope review
- runtime validation
- version decision
- promotion approval
Packages do not create a shortcut around the lifecycle.
Package identity and sovereignty boundary must be declared in `data/packages/package-manifest.schema.json`.
Package-local concepts must be authored under `data/packages/<packageId>/concepts/*.json` against `data/packages/package-concept.schema.json`.
Package-local doctrine remains local to its package boundary unless constitutional review explicitly promotes a change into the core.

## 62. Relationship To Institutional Pressure

Institutional requests may accelerate review.
They do not waive review.
No partner request should skip:

- source review
- scope review
- contrast review
- version decision
If a partner wants speed, the safe answer is:
- narrow the request
- not the lifecycle

## 63. Anti-Bloat Rule In Lifecycle Terms

A concept should move forward only if removing it would meaningfully weaken the system.
If not, reject it.
This anti-bloat rule applies at:

- intake
- contrast review
- version review
- deprecation review
The right time to stop bloat is before promotion, not after the runtime becomes crowded.

## 64. Lifecycle Checklist For New Concepts

- proposal explains structural need
- candidate fits active scope
- nearby concepts named
- source shortlist assembled
- packet fully authored
- source review passed
- contrast review passed
- scope review passed
- runtime validation passed
- version decision recorded
- promotion approved

## 65. Lifecycle Checklist For Revisions

- published baseline identified
- proposed changes isolated
- source implications checked
- scope implications checked
- runtime implications checked
- overlay implications checked
- version impact decided
- trust-surface impact decided

## 66. Lifecycle Checklist For Deprecation

- reason stated
- overlap or scope basis proven
- replacement stated if relevant
- alias consequences reviewed
- relation consequences reviewed
- public and inspect consequences reviewed
- archival plan stated

## 67. Lifecycle Checklist For Rollback

- regression identified
- safe prior state identified
- restore path known
- version trace preserved
- downstream regeneration completed if needed
- governance failure root cause recorded

## 68. Minimal Promotion Record Template

Record: `conceptId`, `conceptVersion`, `conceptSetVersion`, `state transitioned from`, `state transitioned to`, `approving steward`, `reviewers`, `impacted files`, `impacted trust surfaces`.
This record must exist in the canonical governance event log defined by [GOVERNANCE_EVENT_LOG_SPEC.md](./GOVERNANCE_EVENT_LOG_SPEC.md) and may be mirrored in PR description or release notes.

## 69. Minimal Revision Record Template

Record: `current live version`, `proposed new version`, `changed fields`, `semantic reason`, `source reason`, `scope reason`, `runtime effect`, `approval path`.

## 70. Minimal Deprecation Record Template

Record: `conceptId`, `last active version`, `deprecation reason`, `replacement if any`, `effective release boundary`, `archive destination`.

## 71. Minimal Rejection Record Template

Record: `candidate name`, `rejection stage`, `rejection basis`, `whether resubmission is allowed`, `what would need to change`.
This prevents future re-proposal loops with no memory.

## 72. Lifecycle Smells

Treat these as warning signs:

- concept drafted before scope fit is checked
- aliases added to rescue weak matching
- sources added late only for authority optics
- no contrast notes for a highly adjacent concept
- public wording updated before canonical review finishes
- version bump resisted for political reasons
These smells do not always prove failure.
They always justify closer review.

## 73. Lifecycle Non-Goals

This lifecycle is not designed to:

- maximize concept throughput
- satisfy every user request quickly
- emulate community wiki growth
- reward broad authoring volume
It is designed to:
- protect coherence
- protect comparability
- protect inspectability
- protect deterministic truth boundaries

## 74. Founding Steward Rule

At the current stage:

- the founder is the constitutional steward
- the founder is also the final promotion authority
Later, authoring labor may distribute.
But constitutional promotion authority must remain narrow until a valid successor governance structure exists.

## 75. Closing Statement

The lifecycle is not paperwork added on top of ChatPDM.
It is part of how ChatPDM stays what it claims to be.
Without lifecycle law, concept packets would become just files.
With lifecycle law, they remain governed truth objects.
