# ChatPDM Governance Constitution

Status: Draft constitutional document for the current ChatPDM phase chain.
Audience:

- founding steward
- future maintainers
- future domain-package owners
- reviewers
- institutional partners
- external auditors
Repository scope:
- this constitution governs the ChatPDM repository at `/home/serhat/code/chatpdm`
- it is grounded in the current architecture, source files, and public trust surfaces already present in the repo
- it does not replace the product contract or implementation details
- it defines who owns truth law, who may change which layer, and which layers are constitutionally protected
Governing question:
- who owns kernel truth law in ChatPDM, what authority boundaries exist, and what no actor may alter casually?
Primary constitutional idea:

> A stable post may be shaken by the wind, but it will not fall if the base is coherent and strong.
Meaning in ChatPDM:

- wording may move
- UI may evolve
- inspect surfaces may expand
- overlays may change register
- but the truth layer must remain structurally coherent
- and that coherence must be protected by governance before scale arrives
This document exists because ChatPDM is not a normal content site.
It is not a chatbot.
It is not a generic Q and A system.
It is not a freeform ontology playground.
It is a deterministic meaning system with a bounded authored concept layer.
That means governance cannot be treated as a later operational detail.
Governance is part of the product architecture.

## 1. Constitutional Purpose

This constitution defines:

- who owns canonical truth law
- who may approve constitutional change
- who may maintain non-constitutional layers
- which system invariants must survive team growth
- which review burdens apply before truth enters runtime
- how refusal, scope, source admissibility, and versioning remain coherent
This constitution does not define:
- the full writing standard for each concept field
- the frontend component tree
- everyday task management
- marketing strategy
- support workflows
- infrastructure budgeting
Those are subordinate documents or operational practices.
This constitution is the kernel law for meaning governance.

## 2. Constitutional Sources Inside The Repo

The constitution is grounded in the current repository, especially:

- [AGENTS.md](../../AGENTS.md)
- [README.md](../../README.md)
- [docs/architecture/architecture-philosophy.md](../architecture/architecture-philosophy.md)
- [docs/product/response-contract.md](../product/response-contract.md)
- [docs/product/response-schema.json](../product/response-schema.json)
- [docs/architecture/concept-writing-standard.md](../architecture/concept-writing-standard.md)
- [docs/architecture/concept-review-checklist.md](../architecture/concept-review-checklist.md)
- [docs/architecture/v1-concept-scope.md](../architecture/v1-concept-scope.md)
- [docs/conceptual-reference-stack.md](../conceptual-reference-stack.md)
- [data/concepts/README.md](../../data/concepts/README.md)
- [backend/src/modules/concepts/concept-loader.js](../../backend/src/modules/concepts/concept-loader.js)
- [backend/src/modules/concepts/resolver.js](../../backend/src/modules/concepts/resolver.js)
- [backend/src/modules/concepts/governance-scope-enforcer.js](../../backend/src/modules/concepts/governance-scope-enforcer.js)
- [backend/src/modules/concepts/derived-explanation-overlay-manifest.json](../../backend/src/modules/concepts/derived-explanation-overlay-manifest.json)
- [backend/src/modules/concepts/derived-explanation-reading-lens-gate.json](../../backend/src/modules/concepts/derived-explanation-reading-lens-gate.json)
- [backend/scripts/verify-resolver.js](../../backend/scripts/verify-resolver.js)
- [scripts/validate-policy-governance.js](../../scripts/validate-policy-governance.js)
These files are not all constitutional documents in themselves.
But together they prove that ChatPDM already has:
- a canonical authored concept set
- scope enforcement
- refusal enforcement
- source priority logic
- deterministic response contracts
- overlay gatekeeping
- policy governance validation
This constitution formalizes ownership of that truth layer.

## 3. External Intellectual Influences

ChatPDM is not an ontology platform in the broad academic sense.
But its governance model benefits from several local reference materials already present in the repo.
Important influences include:

- `an-introduction-to-ontology-engineering.pdf`
- `The Description Logic Handbook - Theory, Implementation and Applications (2003).pdf`
- `SemanticWeb_inRDFSandOWL.pdf`
- the primary concept-authoring reference stack documented in [docs/conceptual-reference-stack.md](../conceptual-reference-stack.md)
Constitutional use of these materials is limited and disciplined.
They are used to reinforce:
- terminology discipline
- explicit vocabulary ownership
- careful distinction between terminology and runtime assertions
- version-aware maintenance
- coordinated ontology evolution without uncontrolled drift
They do not authorize:
- automatic inference expansion
- graph database migration
- probabilistic generation in the truth path
- generic semantic-web product drift
In other words:
- academic ontology ideas may strengthen rigor
- they may not displace the product’s bounded deterministic contract

## 4. Product Identity Under Constitutional Law

Under this constitution, ChatPDM is defined as:

- a deterministic meaning system
- a bounded concept engine
- an authored and inspectable truth surface
- a refusal-first system outside authored scope
Under this constitution, ChatPDM is not:
- a chatbot
- a general semantic search engine
- an inference engine
- a crowdsourced definition commons
- a freeform ontology workbench
- a public dispute-resolution system
This identity is constitutional, not cosmetic.
If a future change causes the product to behave like one of the forbidden categories above, that change is constitutionally suspect even if it compiles.

## 5. Constitutional Layer Model

ChatPDM contains multiple layers.
Not all layers are equal.
The constitutional layer order is:

1. canonical truth layer
2. runtime contract layer
3. scope and refusal enforcement layer
4. source admissibility layer
5. deterministic derived explanation layer
6. public trust wording and inspectability layer
7. frontend presentation layer
8. operational and deployment layer
The closer a layer is to canonical truth, the harder it is to change.
The farther a layer is from canonical truth, the more maintainers may evolve it.
This is the core separation rule of the constitution.

## 6. Founding Constitutional Seat

The founding seat in ChatPDM is:

- Founding Canonical Steward
At the current stage of the system, this role is held by the founder.
The Founding Canonical Steward owns:
- canonical truth law
- concept admissibility law
- scope law
- refusal law
- source admissibility law
- canonical versioning law
- constitutional change approval
- trust-surface semantic law
This role is not normal maintainer power.
It is kernel authority.
This seat should not be treated as:
- informal personal preference
- day-to-day issue triage
- generic code ownership
It is the constitutional authority over the system’s meaning base.

## 7. Why One Constitutional Steward Is Valid Early

Early in the life of a deterministic meaning system, one constitutional steward is a strength.
It keeps:

- concept law coherent
- source standards consistent
- versioning disciplined
- refusal semantics stable
- philosophical drift low
- public trust wording aligned to backend truth
This is not permanent personal centralization for its own sake.
It is constitutional concentration at the stage when the system still needs a coherent founding law.
The danger comes later, when scale introduces:
- more contributors
- domain packages
- external partners
- institutional pressure
- political or editorial incentives to soften law
That is why the constitution is being written now.
It defines the later separation before the system is forced into it by scale.

## 8. Constitutional Offices

ChatPDM recognizes the following offices.

### 8.1 Founding Canonical Steward

Owns:

- constitutional truth law
- final approval on canonical concept changes
- final approval on source priority law
- final approval on refusal and scope law
- final approval on public trust wording that could imply alternate truth
Cannot delegate permanently without an explicit constitutional amendment.
May appoint:
- maintainers
- reviewers
- package owners
- institutional deployment operators

### 8.2 Core Maintainer

Owns:

- implementation work under existing constitutional law
- validation workflow upkeep
- tooling improvements
- frontend or backend improvements that do not change truth law
Does not own:
- canonical concept admissibility
- source admissibility law
- refusal law
- contract semantics

### 8.3 Domain Package Maintainer

Future role.
Owns:

- concept work within an approved domain package
- package-local documentation
- package-local comparison proposals
- package-local maintenance under current constitutional law
Does not own:
- constitutional change
- source-priority law
- runtime contract change
- cross-package truth law

### 8.4 Source Integrity Reviewer

Owns:

- source relevance review
- source misuse detection
- priority-order challenges
- provenance discipline
Does not own:
- unilateral concept promotion
- unilateral runtime release

### 8.5 Contrast Reviewer

Owns:

- overlap detection
- collapse risk identification
- nearby concept separation review
- ambiguity-edge review
Does not own:
- constitutional overrides

### 8.6 Release Manager

Owns:

- release execution
- version coordination
- deployment sequencing
- release-note integrity
Does not own:
- constitutional law
- silent truth-surface changes

### 8.7 Institutional Partner

Future role.
May own:

- deployment configuration for a local implementation
- approved package adoption
- operational compliance work
May not own:
- upstream truth law
- source admissibility law
- constitutional exceptions without constitutional approval

## 9. Truth Law

Truth law is the body of rules that determines what counts as valid canonical meaning in ChatPDM.
Truth law includes:

- what counts as a concept
- what fields a concept must contain
- what the concept is allowed to mean
- what scope must be preserved
- which sources may ground the concept
- how the system refuses unsupported meaning
- how versions are bound to runtime
Truth law does not mean metaphysical truth.
It means:
- system-bounded canonical meaning
- source-prioritized and authored
- reviewed before runtime
- promoted only when structurally safe
Truth law is primarily embodied in:
- [data/concepts](../../data/concepts)
- [backend/src/modules/concepts/concept-loader.js](../../backend/src/modules/concepts/concept-loader.js)
- [backend/src/modules/concepts/resolver.js](../../backend/src/modules/concepts/resolver.js)
- [docs/product/response-contract.md](../product/response-contract.md)
- [docs/product/response-schema.json](../product/response-schema.json)
Truth law belongs constitutionally to the Founding Canonical Steward.

## 10. Scope Law

Scope law determines where the system is allowed to speak.
This is not a secondary policy.
It is a truth boundary.
The current repository already expresses scope law through:

- [docs/architecture/v1-concept-scope.md](../architecture/v1-concept-scope.md)
- governance-scoped concept packets such as [authority.json](../../data/concepts/authority.json)
- [backend/src/modules/concepts/governance-scope-enforcer.js](../../backend/src/modules/concepts/governance-scope-enforcer.js)
- refusal and interpretation fields in the response contract
Scope law includes:
- which concepts are in v1
- which uses of a concept are in-scope
- which uses trigger clarification
- which uses trigger refusal
- which UI and documentation surfaces must preserve scope wording
No maintainer may silently broaden scope through:
- alias expansion
- UI copy
- SEO copy
- fallback copy
- overlay wording
- documentation rephrasing
If scope changes, constitutional review is required.

## 11. Refusal Law

Refusal law determines when the system must say no.
In ChatPDM, refusal is not a UX afterthought.
It is a constitutional honesty mechanism.
Refusal law includes:

- out-of-scope refusal
- no exact match refusal
- blocked execution state
- non-governance usage refusal for governance-scoped concepts
- overlay fail-closed downgrade behavior
This law is already reflected in:
- [README.md](../../README.md)
- [docs/product/response-contract.md](../product/response-contract.md)
- [backend/src/modules/concepts/governance-scope-enforcer.js](../../backend/src/modules/concepts/governance-scope-enforcer.js)
- [backend/src/modules/concepts/resolver.js](../../backend/src/modules/concepts/resolver.js)
Constitutional principle:
- it is always preferable to refuse than to overclaim
This principle may not be overridden for convenience, growth, demos, or partner pressure.

## 12. Source Admissibility Law

Source admissibility law determines which sources may ground canonical concepts and how they are prioritized.
The current repo already enforces part of this through:

- [docs/conceptual-reference-stack.md](../conceptual-reference-stack.md)
- [backend/src/modules/concepts/source-registry.json](../../backend/src/modules/concepts/source-registry.json)
- sourcePriority validation in [concept-loader.js](../../backend/src/modules/concepts/concept-loader.js)
Current source law distinguishes:
- core
- extended
- technical
Constitutional rule:
- primary canonical grounding belongs to the approved primary stack
- extended and technical sources may inform authoring discipline
- no source enters canonical grounding just because it is famous, convenient, or politically useful
The Founding Canonical Steward owns:
- source admissibility
- source tier structure
- source priority doctrine
Reviewers may challenge a source decision.
They may not silently replace it.

## 13. Versioning Law

Versioning law determines when change becomes a new declared object rather than a silent mutation.
Current repo evidence includes:

- `version` in concept packets
- `conceptSetVersion` in [constants.js](../../backend/src/modules/concepts/constants.js)
- `contractVersion`, `matcherVersion`, and `normalizerVersion` in runtime responses
- overlay `manifestVersion`, `storeVersion`, `templateVersion`, and `certificateVersion`
Constitutional version rule:
- if meaning changes, version must change
- if contract semantics change, version must change
- if matcher behavior changes materially, version must change
- if normalization changes materially, version must change
- if canonical concept content changes, concept version and concept set version must change
- if derived overlays change generation doctrine, manifest and derivative versions must change
Silent truth drift is constitutionally prohibited.

## 14. Overlay Law

Derived explanation overlays exist under strict constitutional subordination.
They are allowed only because they remain:

- derived-only
- manifest-pinned
- canonically bound
- certified
- fail-closed
- read-time revalidated
This is evidenced by:
- [backend/src/modules/concepts/derived-explanation-overlay-manifest.json](../../backend/src/modules/concepts/derived-explanation-overlay-manifest.json)
- [backend/src/modules/concepts/derived-explanation-reading-lens-gate.json](../../backend/src/modules/concepts/derived-explanation-reading-lens-gate.json)
- [backend/src/modules/concepts/derived-explanation-overlays.js](../../backend/src/modules/concepts/derived-explanation-overlays.js)
Constitutional rule:
- overlays may never outrank canonical truth
- overlays may never become authored truth by stealth
- overlays may not own independent citations, refusal states, or graph state
- overlays may not imply multiple truths
The reading lens UI is therefore constitutional only if:
- same canonical meaning remains explicit
- different reading register remains explicit
- the trust layer never implies alternate answers

## 15. Public Trust Surface Law

Public trust surfaces include:

- homepage trust cues
- inspect routes
- legal placeholders and inspect surfaces
- reading lens trust copy
- diagnostic feedback naming
- source rank naming
- related concept route visibility
These surfaces are not merely copywriting.
They are interpretation governance.
Constitutional rule:
- public wording must not undermine the deterministic contract
- public wording must not imply generative answer behavior when the system is deterministic
- public wording must not imply alternate truths where only alternate registers exist
This is why trust copy lock is treated as governance rather than marketing.

## 16. Constitutional Change Classes

All changes fall into one of four classes.

### Class A: Constitutional Changes

Examples:

- response contract semantics
- concept schema changes
- source-priority doctrine
- refusal doctrine
- scope doctrine
- trust-surface semantic law
Approval:
- Founding Canonical Steward only

### Class B: Canonical Package Changes

Examples:

- new concept packet
- concept field meaning revision
- source change within a concept
- relation change between concepts
- resolve-rules change affecting canonical selection
Approval:
- Founding Canonical Steward
- plus required reviewer path

### Class C: Maintainer Changes

Examples:

- frontend layout changes
- non-semantic styling changes
- build and tooling changes
- documentation reorganizations that do not change constitutional meaning
Approval:
- maintainers under normal review

### Class D: Operational Changes

Examples:

- deploy tuning
- cache headers
- service restarts
- infrastructure hardening
Approval:
- release or operations maintainers
Operational changes become constitutional if they alter:
- public truth semantics
- source of truth
- scope behavior
- refusal behavior

## 17. Separation Of Powers

ChatPDM should separate the following powers over time:

- constitutional truth power
- package maintenance power
- review power
- release power
- deployment power
The separation principle is:
- no single maintainer should silently own all powers once scale arrives
- but no expansion role may bypass constitutional truth law
This yields the future governance topology:
- constitution owned centrally
- packages maintained distributively
- review shared
- deployment federated

## 18. Constitutional Non-Delegables

The following powers are non-delegable unless the constitution itself is amended:

- redefining what counts as canonical truth
- changing refusal doctrine
- changing source admissibility law
- changing v1 scope law
- changing response contract semantics
- changing canonical source priority order
- changing the constitutional meaning of overlays
- changing the meaning of “deterministic” in public trust copy
These powers may be advised on by others.
They may not be silently transferred.

## 18A. Steward Constraints

The Founding Canonical Steward is constitutionally bound by versioning law, source-anchor permanence, refusal integrity, contrast review, rollback evidence, and explicit amendment procedure.
Steward discretion may not bypass these invariants.
The steward may not:

- rewrite canonical meaning without the required concept and concept-set version change
- remove, downgrade, or substitute source anchors without a recorded revision or deprecation trail
- weaken refusal semantics, blocked states, or scope enforcement silently
- merge overlapping concepts or collapse nearby concepts without recorded contrast review
- approve constitutional amendment without the review window and challenge path defined in §30A
- bypass rollback evidence, publication records, or last-known-safe recovery evidence
Any steward action taken in violation of these constraints is constitutionally defective until reverted, version-corrected, or remanded through §30A.

## 18B. Human Authority Constraint Doctrine

In ChatPDM, power is a bounded obligation.
Authority is held in trust for the integrity of the canonical system.

Every governed role owes duties to preserve:

- version trace
- source trace
- refusal honesty
- scope boundaries
- reconstructible audit history
- visible reason trails for truth-adjacent action

No governed role may treat rank, urgency, prestige, or founder status as a substitute for evidence.
Legitimacy comes from lawful action inside governed limits.

## 18C. Non-Bypass, Dissent, And Recusal

No actor may silently self-ratify a power expansion.
No actor may quietly downgrade a truth-adjacent change class.
No actor may ignore a binding reviewer stop condition outside the constitutional challenge or exception path.

Meaningful dissent must remain visible when action proceeds.
Conflicted actors must recuse from review or approval where authorship interest, institutional pressure, reputational stake, or emergency self-justification would distort neutrality.
Truth governance survives only if disagreement remains reconstructible.

## 18D. Pressure, Capture, And Emergency Limits

Institutional pressure, commercial pressure, and reputational pressure do not rewrite truth law.
No actor may widen scope, weaken refusal, soften source law, or hide rollback because an external stakeholder, a commercial opportunity, or internal optics demand it.

Emergency authority is preservation authority only.
Emergency power may:

- freeze
- rollback
- restore a last-known-safe state
- contain active integrity failure

Emergency power may not:

- add new doctrine
- widen scope
- weaken refusal law
- convert temporary necessity into standing constitutional practice

## 19. Maintainer Freedoms

The constitution is strict at the truth layer.
It is not meant to freeze the entire product.
Maintainers are free to improve:

- layout
- styling
- build performance
- deployment reliability
- legal route placeholders
- inspect ergonomics
- form controls
- homepage composition
provided that they do not change:
- truth law
- scope law
- refusal law
- contract law
- trust semantics

## 20. Package Model For Future Scale

When ChatPDM expands, it should do so through packages rather than through unbounded core growth.
Possible future packages:

- healthcare
- legal reasoning surface
- governance pack
- education pack
- sector-specific comparison packs
Package rule:
- packages may extend approved canonical coverage
- packages may not rewrite constitutional law locally
- packages may not redefine the core refusal doctrine
- packages may not silently fork source priority law
- package doctrine is local, explicit, and non-transitive
- package-local meaning may extend application inside the package boundary
- package-local meaning may not silently redefine core canonical meaning
Packages are subordinate republics inside one constitution.
They are not sovereign truth systems.

## 20A. Kernel Sovereignty And Anti-Back-Propagation

Core runtime mechanics remain constitutionally upstream.

Downstream domain authorities may shape package doctrine only inside a lawfully activated package boundary.
They may not alter core runtime mechanics, including:

- loader law
- matcher behavior
- resolver contract semantics
- refusal states
- rollback semantics
- audit and record semantics

This is the core sovereignty split:

- domain authorities may shape package doctrine
- package consumers may configure deployments
- no downstream authority may rewrite kernel mechanics while claiming upstream continuity

Package-local meaning may not back-propagate into the core by implication, convenience, or repeated local use.
If a package meaning needs to change core canonical meaning, the change becomes constitutional and must follow the constitutional path.
The authored package contract for this boundary lives in:

- `data/packages/package-manifest.schema.json`
- `data/packages/package-concept.schema.json`
These files define package identity, activation boundary, and package-side anti-bleed fields.
They do not activate packages or alter runtime behavior by themselves.

## 21. Institutional Partner Rule

Institutional partners may eventually deploy ChatPDM in constrained environments.
They may need:

- local compliance overlays
- deployment-specific controls
- reporting surfaces
- package selection
They must not receive:
- direct authority over core truth law
- exception rights to bypass refusal
- private source-priority rewrites merged upstream without constitutional review
Partner pressure is not constitutional authority.

## 21A. Deployment Sovereignty Contract

Upstream canonical truth remains authoritative for upstream releases.
Institutional deployments may pin approved `conceptSetVersion`, contract version, matcher version, normalizer version, and overlay-manifest versions.
Institutional deployments may delay or reject upstream adoption until local legal, policy, and operational review is complete.
Local deployments may add policy workflows, escalation wrappers, approval checkpoints, and reporting layers around the upstream truth core.
Local layers may not rewrite canonical concepts, source priority, refusal doctrine, or upstream contract semantics while claiming upstream compatibility.
Upstream updates are opt-in for institutional deployments; no deployment is required to absorb a new truth-layer version automatically.
Support-compatible forks must keep a traceable record of pinned versions, local workflow additions, and any declared loss of upstream compatibility.
Deployment sovereignty is therefore sovereignty over adoption, activation, workflow, and local accountability.
It is not sovereignty over kernel truth law.

No deployment may weaken refusal generation semantics, widen core scope, or alter kernel mechanics under the label of local policy.

## 22. Anti-Capture Principle

ChatPDM must remain resistant to capture by:

- growth pressure
- political pressure
- institutional pressure
- platform pressure
- reviewer fatigue
- “just merge faster” culture
Anti-capture rule:
- if a change makes the system easier to scale but less truthful about its boundaries, the change fails constitutional review
Examples of suspect pressure:
- “users ask for it often”
- “the institution wants softer refusal”
- “this source is more politically convenient”
- “this wording sounds friendlier”
- “the UI should imply broader knowledge”
None of these are sufficient reasons to alter truth law.

## 23. Review Burden

The higher the change class, the heavier the proof burden.
Constitutional proof may include:

- repo-grounded rationale
- impact analysis
- scope preservation proof
- source conflict analysis
- response contract implications
- backward compatibility analysis
- trust-surface implications
No constitutional change should be approved because it “seems reasonable.”
Reasonableness without proof is not enough at the truth layer.

## 24. Constitutional Evidence Standard

ChatPDM should prefer evidence over instinct.
Evidence may include:

- existing repo enforcement
- validation scripts
- response-schema compatibility
- review checklists
- deterministic fixture behavior
- source registry logic
- trust-copy lock artifacts
Constitutional documents should point to actual repo evidence whenever possible.
This is the same design instinct reflected in the architecture philosophy:
- the point is not merely to claim stability
- the point is to fail safely instead of drifting silently

## 25. Failure Behavior Principle

Constitutional trust is proven not only by normal behavior.
It is proven by failure behavior.
The current architecture already demonstrates this principle:

- authored overlay drift -> reject packet
- hash mismatch -> pending_generation
- lag exceeded -> pending_generation
- corrupt generated mode -> invalid
- lens switch -> local field swap only
Those are not just implementation details.
They are constitutional evidence that truth drift is treated as failure, not convenience.

## 26. Documentation Hierarchy

The constitutional documentation hierarchy is:

1. this constitution
2. change authority matrix
3. concept lifecycle
4. emergency continuity protocol
5. truth exception register
6. governance event log spec
7. concept writing standard
8. concept review checklist
9. scope lock
10. response contract
11. implementation files and validation scripts
If two documents conflict:

- the higher constitutional document controls
- unless the constitution is amended deliberately

## 27. Constitutional Review Questions

Every constitutional change should answer:

- what truth object changes
- why the current law is insufficient
- what evidence justifies the change
- what versions must change
- what refusal behavior changes
- what trust copy changes
- what reviewer disciplines are required
- what silent drift risk is introduced
- how rollback would work if the change proves incorrect
If these questions cannot be answered clearly, the change is not ready.

## 28. Emergency Rule

Emergency operational action is allowed for:

- broken deploys
- TLS failure
- service unavailability
- catastrophic runtime outage
Emergency constitutional override is not allowed just because emergency language is used.
Meaning:
- infra can be patched urgently
- truth law cannot be improvised urgently
If a supposed emergency requires truth-law change, the correct action is likely refusal, rollback, or degraded mode rather than constitutional improvisation.

## 29. Founder Succession

The constitution must survive beyond the founder personally.
That means the founder’s long-term role should evolve toward:

- Founding Canonical Steward
This is stronger than being a generic owner.
It means:
- retaining constitutional review authority
- not owning every implementation task
- not acting as every maintainer forever
- protecting the kernel while allowing controlled scale
Succession should eventually distinguish:
- constitutional stewardship
- package maintenance
- release management
- deployment operations
But succession must not dissolve the constitution into majority preference.

## 29A. Emergency Continuity Protocol

If the Founding Canonical Steward is unreachable for 30 days, or becomes unreachable during a severity-one truth, refusal, or source-integrity incident, emergency continuity activates.
Emergency continuity authority passes to a temporary Constitutional Continuity Council composed of the Release Manager, Runtime Contract Reviewer, and the most relevant reviewer discipline for the incident.
The council may appoint a temporary Acting Constitutional Deputy only by unanimous recorded vote.
Emergency powers are limited to freezing promotion, pinning or restoring the last-known-safe truth set, approving refusal bug hotfixes, revoking compromised source anchors, and blocking unsafe downstream rollout.
Emergency continuity may not admit new concepts, expand scope, rewrite refusal doctrine, or amend constitutional law.
Every emergency action must produce an incident record naming the trigger, affected versions, acting authority, evidence, and rollback or ratification path.
Temporary authority expires automatically 14 days after the steward returns, or 30 days after activation if no steward return occurs, unless renewed through a recorded constitutional review.
All emergency actions must be ratified, reverted, or superseded by recorded constitutional review before ordinary promotion resumes.
This section owns the high-level authority transfer.
Operational sequence, record coupling, and incident procedure belong in [EMERGENCY_CONTINUITY_PROTOCOL.md](./EMERGENCY_CONTINUITY_PROTOCOL.md).

## 30. Amendment Rule

The constitution may be amended.
But amendments are themselves constitutional events.
An amendment requires:

- explicit proposal
- explicit reason
- explicit repo-grounded evidence
- explicit impact on source law, scope law, refusal law, or contract law
- explicit ratification by the constitutional steward or a future constitutionally valid governing board
No implied amendment exists.
No soft precedent silently changes constitutional law.

## 30A. Constitutional Challenge Procedure

Any steward, maintainer, reviewer, or institutional deployment operator may open a Constitutional Challenge RFC against a constitutional decision, truth-law change, source ruling, refusal ruling, or deployment-compatibility dispute.
The RFC must state the challenged object, evidence, affected files or versions, risk class, requested remedy, and whether emergency freeze is requested.
This is the sole constitutional appeals path in the governance suite.
The default review window is 14 days.
The Founding Canonical Steward must issue a written response within that window marked `accepted`, `rejected`, or `deferred`, with reasoning, version impact, and rollback implications.
Rejected or deferred Class A disputes, or any challenge directed at the steward’s own action, escalate to a Constitutional Review Council composed of the Release Manager, Runtime Contract Reviewer, and the relevant reviewer discipline, with the challenged steward recused from council voting.
The council may affirm, remand, require freeze, require rollback to the last-known-safe version, or require formal amendment review before merge.
No constitutional precedent becomes valid silently while an open challenge remains unresolved.
All challenges, responses, and outcomes must remain in an immutable governance archive rooted at `data/governance/`.
This phase does not require a separate challenge register file.
When a challenge drives a governance event, exception, or emergency incident, the related canonical record must carry the same `challengeId`.
RFCs, issues, PRs, and release notes may mirror the challenge materials, but they do not replace the canonical cross-reference record.

## 31. Ratification Statement

This document is intended to ratify the current truth-governance posture already visible in the repository.
It does not invent a new power structure out of nowhere.
It makes explicit what the architecture already assumes:

- canonical truth has an owner
- not every contributor owns truth law
- refusal is a governed feature
- source acceptance is law-like
- versioning is part of meaning governance
- trust wording is part of semantic governance

## 32. Constitutional Glossary

Canonical truth:

- the authored meaning surface that runtime is allowed to resolve as authoritative
Truth law:
- the body of rules that governs canonical meaning admission, scope, source grounding, refusal, and versioning
Scope law:
- the rules that determine where a concept is allowed to apply
Refusal law:
- the rules that determine when ChatPDM must refuse rather than improvise
Source admissibility:
- the rules that determine which sources may ground canonical meaning and how they are prioritized
Constitutional steward:
- the role that owns final authority over truth law
Maintainer:
- a role that may evolve implementation under existing law
Package:
- a subordinate expansion surface operating under the main constitution
Trust surface:
- a public-facing wording or interface layer that shapes how users interpret the system’s truth contract

## 33. Appendix A: Constitutional Repo Objects

The following repo objects are constitutionally sensitive:

- `data/concepts/*.json`
- `data/concepts/resolve-rules.json`
- `backend/src/modules/concepts/constants.js`
- `backend/src/modules/concepts/concept-loader.js`
- `backend/src/modules/concepts/resolver.js`
- `backend/src/modules/concepts/governance-scope-enforcer.js`
- `backend/src/modules/concepts/source-registry.json`
- `backend/src/modules/concepts/derived-explanation-overlay-manifest.json`
- `backend/src/modules/concepts/derived-explanation-reading-lens-gate.json`
- `docs/product/response-contract.md`
- `docs/product/response-schema.json`
The following repo objects are important but not automatically constitutional:
- frontend layout files
- component-local CSS
- deploy config
- nginx config
- placeholder public pages
They become constitutionally sensitive when they alter:
- truth semantics
- scope semantics
- refusal semantics
- trust-surface semantics

## 34. Appendix B: Constitutional Signals Already Present In ChatPDM

Signals already visible in the repository include:

- deterministic route naming
- diagnostic feedback rather than thumbs up or down
- source-bounded output
- version-bound canonical definitions
- governance scope enforcement
- refusal-first handling of unsupported meaning
- manifest-pinned overlay generation
- trust copy lock for reading lenses
This constitution treats those signals as product law, not decoration.

## 35. Appendix C: Constitutional Maxims

These maxims summarize the constitution.

- constraint outranks fluency
- refusal outranks overclaim
- versioned change outranks silent drift
- source grounding outranks rhetorical certainty
- constitutional review outranks merge speed
- package growth must not outrank truth law
- public trust wording must not outrank backend truth
- the system may move at the wording layer but not drift at the truth layer

## 36. Closing Statement

ChatPDM should be able to scale without surrendering its truth law.
That is the point of this constitution.
The founder does not need to remain every role forever.
But the system does need a durable constitutional layer that remains stronger than convenience, pressure, or velocity.
The best long-term model is:

- the constitution owns truth law
- maintainers own implementation
- reviewers own rigor
- packages own bounded expansion
- institutions own deployment
And none of them bypass the constitutional layer.
