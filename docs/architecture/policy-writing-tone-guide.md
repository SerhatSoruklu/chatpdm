# Policy Writing Framework

This document defines the canonical writing system for ChatPDM policy surfaces.

It exists to keep policy text bound to real system behavior rather than drifting into generic legal templates, marketing language, or abstract tone advice.

Use this framework when authoring or revising:

- Privacy Policy
- Terms of Service
- Acceptable Use Policy
- Data Retention Statements
- managed-access explanation pages
- verification explanation pages
- inspect-backed legal or policy routes

This framework supplements:

- [architecture-philosophy.md](./architecture-philosophy.md)
- [anti-drift-prompt-template.md](./anti-drift-prompt-template.md)
- [theme-direction.md](./theme-direction.md)
- [../INTERGRITY_RUNTIME_LAWS.md](../INTERGRITY_RUNTIME_LAWS.md)
- [../TRUST_INTEGRITY_STACK.md](../TRUST_INTEGRITY_STACK.md)

## Core Principle

Policy text must reflect real system behavior.

Policy writing in ChatPDM is a system surface.

That means:

- if it is written, it must be true in runtime or operator workflow
- if it is not enforced, do not claim it
- if a boundary exists, state it clearly
- if a surface is transitional, say so directly

Policy pages are not brand theater.

They are human-readable and inspectable descriptions of:

- actual runtime behavior
- actual operator workflow
- actual data handling
- actual enforcement or refusal behavior
- actual limitations

## Source Of Truth

Policy content must be grounded in implemented truth.

The authority for policy writing is:

- actual runtime behavior in backend routes, services, models, and scripts
- actual operator workflow, including review, verification, approval, and rejection paths
- actual data storage, transport, retention, and deletion behavior
- actual refusal, validation, and enforcement behavior
- actual inspect surfaces and proof scripts

In this repo, the primary grounding sources include:

- [frontend/src/app/policies/policy-surface.data.ts](/home/serhat/code/chatpdm/frontend/src/app/policies/policy-surface.data.ts)
- [frontend/src/app/policies/policy-surface.types.ts](/home/serhat/code/chatpdm/frontend/src/app/policies/policy-surface.types.ts)
- [frontend/src/app/pages/public-page/public-page.content.ts](/home/serhat/code/chatpdm/frontend/src/app/pages/public-page/public-page.content.ts)
- [backend/src/modules/managed-access/managed-access.routes.js](/home/serhat/code/chatpdm/backend/src/modules/managed-access/managed-access.routes.js)
- [backend/scripts/verify-managed-access-phase-e.js](/home/serhat/code/chatpdm/backend/scripts/verify-managed-access-phase-e.js)
- [docs/INTERGRITY_RUNTIME_LAWS.md](/home/serhat/code/chatpdm/docs/INTERGRITY_RUNTIME_LAWS.md)
- [docs/TRUST_INTEGRITY_STACK.md](/home/serhat/code/chatpdm/docs/TRUST_INTEGRITY_STACK.md)

Generic legal templates are not a source of truth.

AI-generated tone suggestions are not a source of truth.

They may help describe communication categories, but they do not authorize claims.

## Bounded Claims

Policy and trust writing must not present ChatPDM output as universal truth.

Every concept in ChatPDM is scoped truth, not global truth.

That means policy wording should stay aligned with:

- declared system scope
- declared source priority
- declared doctrine or authored boundary

If disagreement exists, the writing should first check whether the difference comes from:

- different scope
- different source
- different doctrine

It should not default to:

- `you are wrong`

This matters especially on public trust surfaces.

ChatPDM may preserve the same canonical meaning across different reading registers, but a register change does not convert scoped truth into universal truth.

## Canonical Policy-Writing Tones

ChatPDM uses four native writing tones.

These are not branding moods.

They are function-bound writing modes tied to different truth responsibilities.

One surface may use more than one tone, but one tone should dominate.

### 1. System Truth Tone

Purpose:

- describe what the system actually does
- describe storage, transport, lifecycle, and state transitions
- preserve inspectability

Use it for:

- inspect routes
- data retention statements
- privacy mechanisms
- verification mechanics
- evidence and replay-backed surfaces

It should sound like:

- exact
- structured
- mechanism-first
- declarative
- inspectable

It must avoid:

- reassurance language
- vague summaries that hide mechanism
- copied legal boilerplate
- invented implementation detail

Example:

> Verification requests remain bounded by explicit challenge expiry. When a challenge expires, the existing attempt does not succeed and a new request is required.

### 2. Constraint / Enforcement Tone

Purpose:

- state what is allowed, rejected, refused, or blocked
- state what conditions trigger operator or runtime action
- state enforcement boundaries honestly

Use it for:

- Terms of Service
- Acceptable Use Policy
- managed-access verification rules
- submission validity rules
- refusal and rejection boundaries

It should sound like:

- direct
- definite
- conditional
- rule-shaped

It must avoid:

- threatening platform language
- discretionary claims the system does not actually exercise
- pretending human review is automatic runtime enforcement
- overstating sanctions or control powers

Example:

> Fraudulent or misleading verification submissions are not accepted. Requests may be rejected when submitted identity, domain control, or verification state does not match the declared institution.

### 3. Boundary / Limitation Tone

Purpose:

- state what the system does not do
- state where certainty stops
- state where a page is transitional, partial, or non-authoritative
- keep maturity claims bounded

Use it for:

- public legal placeholders
- managed-access explanation pages
- trust-facing pages
- limitation notes inside privacy, terms, or retention pages

It should sound like:

- narrow
- explicit
- non-defensive
- calm

It must avoid:

- apology theater
- overexplaining gaps
- soft bluffing
- hiding uncertainty behind optimistic language

Example:

> This page summarizes the current public policy surface. The inspect route remains the more granular evidence surface for implementation-backed behavior.

### 4. Translation / Explanation Tone

Purpose:

- make system-backed behavior readable to non-technical readers
- translate inspectable truth into plain language without changing meaning
- explain workflow without inflating it

Use it for:

- top-level privacy pages
- top-level terms pages
- acceptable use summaries
- institution-facing managed-access explanation pages

It should sound like:

- plain
- readable
- concise
- outcome-first

It must avoid:

- dumbing the system down into ambiguity
- legal sludge
- marketing phrasing
- human-readable wording that changes the underlying rule

Example:

> If a verification link expires, it cannot be reused. You need to start a new verification attempt.

## Surface Guidance

Different surfaces should lead with different tones.

Recommended dominant tones:

| Surface | Dominant tone | Supporting tone |
| --- | --- | --- |
| `/inspect/privacy`, `/inspect/terms`, `/inspect/cookies` | System Truth Tone | Constraint / Enforcement Tone |
| top-level privacy and terms pages | Translation / Explanation Tone | Boundary / Limitation Tone |
| Acceptable Use Policy | Constraint / Enforcement Tone | Boundary / Limitation Tone |
| Data Retention Statements | System Truth Tone | Boundary / Limitation Tone |
| managed-access explanation pages | Translation / Explanation Tone | Boundary / Limitation Tone |

## Typography For Policy Surfaces

Policy pages should not introduce per-page font systems.

ChatPDM should use one stable typography system across policy and inspect surfaces.

Current rule:

- `Inter` is the dominant policy font
- `IBM Plex Mono` is the support and technical font
- no additional policy-specific font families should be introduced

Use `Inter` for:

- public privacy, terms, acceptable use, cookies, and data-retention pages
- managed-access explanation pages
- body copy
- standard headings
- summaries
- lists

Use `IBM Plex Mono` for:

- inspect labels
- route names
- hash or ID values
- timestamps
- evidence references
- inline technical values
- status chips and other technical microdata

Do not:

- assign different font families per policy page
- create a separate legal font stack
- use mono for full reading paragraphs
- introduce decorative or editorial fonts into inspect surfaces

Serif usage:

- a restrained serif role may exist later for rare hero or display moments
- it is not part of the current policy-writing system
- it should not be used for policy body text, inspect routes, or operational/legal copy

## Writing Workflow

Before publishing a policy sentence, check it in this order:

1. What real behavior, workflow, or constraint is this sentence describing?
2. Where is that behavior implemented or evidenced?
3. Is the sentence describing runtime behavior, operator workflow, or a limitation?
4. Is the sentence using the right tone for that function?
5. Does the sentence claim more than the system proves?

If those questions cannot be answered clearly, the sentence is not ready to publish.

## Policy Drafting Checklist By Surface

ChatPDM's UI already communicates bounded resolution, inspectability, and refusal-first behavior.

That signal is useful.

It means policy pages should read like a calm system surface rather than:

- chatbot copy
- startup trust theater
- abstract legal filler

The practical translation is:

- keep the writing mechanism-first
- keep the wording bounded
- keep the claims traceable
- let the system feel precise without inventing system language

Write the policy suite in this order:

1. Privacy
2. Data Retention / Data Usage
3. Terms
4. Acceptable Use
5. Cookies

### 1. Privacy Policy

Primary job:

- describe what data exists
- describe why it exists
- describe how it flows through the system

Dominant tone:

- Translation / Explanation Tone

Supporting tone:

- System Truth Tone
- Boundary / Limitation Tone

Must cover:

- scope of the document
- data categories grouped by system purpose
- purpose of use and processing
- simple data flow across client, API, runtime, and storage
- what is shared and what is not
- a light retention summary
- security mechanisms without inflated promises
- user rights in bounded language
- real contact path

Must avoid:

- "we care about your privacy" language
- vague "we may collect" hedging where concrete wording is available
- pretending queries are model-training fuel if they are not
- deletion promises broader than actual integrity and operational behavior

Writing test:

- if someone inspects the system, would this sentence still be true?

### 2. Data Retention / Data Usage

Primary job:

- turn privacy claims into lifecycle truth
- state what persists, what expires, and what remains for integrity

Dominant tone:

- System Truth Tone

Supporting tone:

- Boundary / Limitation Tone

Must cover:

- storage classes or storage roles
- session-bound versus persistent data
- short-lived versus longer-lived records
- verification expiry behavior
- logs, evidence, and operational records
- deletion triggers and retention boundaries

Must avoid:

- invented time windows
- fake deletion certainty
- saying "zero persistence" unless the implementation truly proves that
- claiming cryptographic wipe or similar strong mechanisms unless implemented

Writing test:

- does each retention sentence map to a real lifecycle, expiry, deletion, or evidence path?

### 3. Terms of Service

Primary job:

- define the service contract and runtime boundary
- state what the product is and is not

Dominant tone:

- Constraint / Enforcement Tone

Supporting tone:

- Translation / Explanation Tone
- Boundary / Limitation Tone

Must cover:

- the bounded nature of the service
- refusal boundaries and unsupported input limits
- operator-mediated workflow where relevant
- availability of inspect surfaces as evidence, not guarantees
- liability and responsibility boundaries in honest language

Must avoid:

- generic SaaS template language
- pretending the system is generative when it is deterministic
- contractual guarantees beyond the proved runtime
- absolute uptime or resolution claims

Writing test:

- is this describing the actual contract of the current system rather than a template contract for some other product?

### 4. Acceptable Use Policy

Primary job:

- define prohibited behavior clearly
- describe rule and review boundaries without theater

Dominant tone:

- Constraint / Enforcement Tone

Supporting tone:

- Boundary / Limitation Tone

Must cover:

- misuse of verification paths
- fraudulent or misleading submissions
- attempts to bypass request or proof boundaries
- operator review boundaries where runtime enforcement is not fully automated

Must avoid:

- hidden-sanctions language
- pretending there is a full abuse-detection engine if there is not
- dramatic security phrasing
- policy language that implies powers the operator workflow does not currently exercise

Writing test:

- if the system or operator cannot really enforce this boundary, has the sentence been narrowed enough?

### 5. Cookie Policy

Primary job:

- disclose the state and transport behavior already visible in the implementation
- describe cookie and SSR handling as a derived surface, not as a major doctrine layer

Dominant tone:

- System Truth Tone

Supporting tone:

- Translation / Explanation Tone

Must cover:

- what cookies or similar browser state exist
- what they are used for
- whether the state is essential, optional, or absent
- how SSR or request transport interacts with state when relevant

Must avoid:

- decorative policy padding
- claims that outrun the inspectable cookie behavior
- mixing unrelated privacy doctrine into a small implementation disclosure

Writing test:

- does the cookie page read like a direct disclosure of current browser-state behavior?

## Enforcement

A policy claim must not be merged if:

- it cannot be traced to a real implementation source
- inspect output does not agree with the claim
- the statement is not runtime-true
- uncertainty exists but is not explicitly marked

Unverified claims must be downgraded or tracked as hypotheses.

## Forbidden Writing Patterns

The following patterns are not allowed in ChatPDM policy surfaces:

- generic corporate legal sludge
- emotional trust language
- marketing language inside policy pages
- invented precision the system does not enforce
- unenforced guarantees
- vague deletion promises
- absolute safety or maturity claims
- fake operator authority
- runtime claims borrowed from planned future architecture
- wording that implies inspectability where no trace exists

Examples of invalid patterns:

- "We take your privacy very seriously"
- "Your data is always safely deleted everywhere"
- "Violations will result in immediate suspension" when there is no real suspension workflow
- "ChatPDM guarantees deterministic behavior in all contexts"

## Binding Rule

If it is written, it must be true in runtime.

If it depends on operator workflow, that workflow must actually exist.

If it is not enforced, do not describe it as enforced.

If it is only a current-stage boundary, say so directly.

If inspect and public wording diverge, inspect does not rescue an overclaiming public page. Both surfaces must remain aligned.

## Secondary Reference Only

External communication categories such as "architectural," "procedural," "plain-English legal," or "accountable" may be useful shorthand when discussing writing style.

They are not authoritative for ChatPDM.

ChatPDM policy writing is governed by the native framework in this document:

- System Truth Tone
- Constraint / Enforcement Tone
- Boundary / Limitation Tone
- Translation / Explanation Tone

## ChatPDM-Specific Notes

For ChatPDM:

- policy wording must stay aligned with deterministic runtime law
- refusal boundaries must remain visible rather than softened
- managed-access pages must describe trust review as a real workflow, not as implied approval
- proof artifacts such as snapshots, checkpoints, and bundles must not be described as authoritative truth
- placeholder policy surfaces should identify themselves as transitional rather than pretending closure
