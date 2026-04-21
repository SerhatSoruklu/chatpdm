# POLICY.md

Canonical policy-system specification for ChatPDM.

This file defines the required structure, tone, layout model, and constraint system for all ChatPDM legal and policy pages.

This file is not policy content.

This file is the source of truth for:

- `privacy.md`
- `terms.md`
- `cookies.md`

All future policy edits must comply with this specification.

## Document Role

- Role: controlling policy-system specification.
- Scope: policy page structure, tone, claims, and file structure for `policies/*.md`.
- Governs: `privacy.md`, `terms.md`, and `cookies.md`.
- Does not govern: runtime resolver behavior, roadmap order, or audit evidence.
- Related docs: [document-authority-index.md](./docs/meta/document-authority-index.md), [docs/public/review-law.md](./docs/public/review-law.md).
- Precedence: this file overrides individual policy pages on structure and tone; policy pages remain content sources inside this policy scope.

## 1. Purpose

The ChatPDM policy system exists to produce legal and policy pages that are:

- deterministic
- bounded
- inspectable
- implementation-aligned
- non-generative in tone and structure

Policy pages must describe actual system behavior, actual platform boundaries, and actual applicable conditions.

Policy pages must not drift into:

- generic legal boilerplate
- filler language
- persuasive brand copy
- vague capability claims
- AI-style explanation language

## 2. Canonical File Structure

The policy system uses this canonical folder structure:

```text
/policies/
  privacy.md
  terms.md
  cookies.md
```

Rules:

- each policy file must follow the same structural model
- each policy file must follow the same tone model
- each policy file must follow the same card-oriented writing constraints
- each policy file must use the same product terminology where applicable

This specification file remains canonical even if the policy files are rendered through another content pipeline.

## 3. Policy Writing Doctrine

Policy writing in ChatPDM is specification writing.

### 3.1 Contract Principle

The following wording is canonical and must not be changed:

> Policy is not decorative prose.
>
> Policy is declared system contract.

Policy text must:

- state what the platform does
- state what the platform does not do
- state where a rule applies
- state where a rule does not apply
- state when a condition changes

Policy text must not:

- imply behavior that is not implemented
- broaden scope beyond actual platform behavior
- soften uncertainty with vague qualifiers
- use legal text as decorative reassurance

## 4. Tone Rules

All policy pages must use a tone that is:

- deterministic
- formal
- precise
- neutral
- non-marketing
- non-persuasive
- non-conversational

### 4.1 Disallowed Tone

Do not use:

- `we aim to`
- `we strive to`
- `we may` unless the condition is legally or operationally unavoidable and immediately bounded
- `generally`
- `typically`
- `from time to time`
- `certain information`
- `improve your experience`
- vague reassurance language
- friendly filler
- explanatory padding

### 4.2 Allowed Tone

Use:

- direct statements
- bounded claims
- explicit scope
- explicit limitations
- exact conditions
- short declarative sentences

### 4.3 Tone Example

Bad:

> We may collect certain types of information to improve your experience.

Good:

> The platform collects the following data types: [list].

## 5. Claim Rules

Every policy claim must be:

- verifiable
- bounded
- implementation-aligned
- non-speculative

Each policy section must explicitly cover:

- what the system does
- what the system does not do
- what limits apply

Claims must not:

- imply optional behavior when behavior is fixed
- imply fixed behavior when behavior is conditional
- describe future intent as present capability
- generalize beyond actual implementation

If a claim cannot be verified against implementation, infrastructure, or real policy intent, it must not appear in a policy page.

### 5.1 Required Claim Frame

Policy statements must use explicit system-action language.

Each claim must be expressible using one of the following frames:

- the platform stores X
- the platform does not store X
- the platform allows X under condition Y
- the platform does not allow X
- the platform enforces X
- the platform refuses X

Examples:

- The system stores X.
- The system does not store Y.
- The platform allows Z under condition A.
- The platform refuses input outside defined scope.

If a sentence cannot be rewritten into one of these frames, it must be clarified before use.

This frame is mandatory. Descriptive or passive language is not sufficient.

### 5.2 Claim-Level Traceability

ChatPDM uses claim-level canonicalism.

Rules:

- rendered policy text may differ from canonical claim wording only when claim meaning is unchanged
- traceability must remain exact at the claim level
- each rendered claim sentence must map to one canonical claim
- each canonical claim must remain implementation-backed

Sentence identity is not the default canonical unit unless a stricter mode is explicitly required.

### 5.3 Structural Text Exclusion

Structural text is not a policy claim unless it is explicitly authored as one.

Structural text includes:

- titles
- section headers
- scope bullets
- annotation fragments
- explanatory labels

Structural text may support interpretation, but it must not be audited as behavior by default.

### 5.4 Internal Transport Boundary

Internal proxy transport must not be described as third-party sharing unless data leaves the product boundary.

This rule applies to:

- SSR forwarding
- internal proxy headers
- internal relay behavior

Transport language must preserve the difference between product-internal movement and external disclosure.

## 6. Required Section Structure

Each policy file must follow this structural order:

1. Title
2. Scope
3. Definitions, if needed
4. Data or behavior description
5. Boundaries
6. Conditions
7. Retention or lifecycle, if applicable

Additional rules:

- do not skip `Scope`
- use `Definitions` only when a term needs bounded interpretation
- use `Retention or lifecycle` only when the policy domain requires it
- keep section titles stable across policies where the concept is the same

## 7. Sentence and Paragraph Rules

### 7.1 Sentence Rules

Every sentence must follow these constraints:

- one idea per sentence
- short to medium length
- no chained legal clauses unless strictly necessary
- no rhetorical framing
- no filler modifiers
- no conversational transitions

### 7.2 Paragraph Rules

Every paragraph block must follow these constraints:

- maximum 2 to 3 sentences per block
- use bullets when listing categories, conditions, exclusions, or data types
- do not write long scrolling legal walls
- do not hide conditions inside dense paragraphs

### 7.3 Structural Preference

Prefer:

- bullets
- short lists
- simple declarative blocks
- compact scoped subsections

Avoid:

- essay paragraphs
- layered subordinate clauses
- stacked caveats inside one sentence

### 7.4 Sentence Length Constraint

All sentences must:

- not exceed 20 words
- express exactly one bounded idea
- avoid compound clauses unless required for legal accuracy

If a sentence exceeds 20 words, it must be split.

## 8. Card-Oriented Content Model

Policy content must be authored so it can map cleanly into UI cards.

Each policy card must:

- have a clear title
- contain one bounded concept
- stay within 2 to 5 lines where possible
- use structured lists when appropriate

This rule exists to preserve inspectability and prevent legal wall-of-text behavior.

Card mapping rules:

- one concept per card
- one responsibility per card
- one condition group per card
- one exclusion group per card

Do not merge multiple unrelated obligations into one card.

### 8.1 Viewport Constraint

Each policy card must be readable within a single viewport height on standard desktop screens.

Rules:

- maximum 5 lines of text per card where possible
- overflow must be split into additional cards
- no scroll-heavy cards

The goal is immediate inspectability, not continuous reading.

## 9. Visual Style Requirements

Policy pages must follow the ChatPDM public-surface visual system.

### 9.1 Background and Surface

Use:

- light cream or off-white backgrounds
- dark neutral text
- restrained surfaces

Do not use:

- pure white page glare
- decorative gradients
- marketing illustration treatment
- ornamental legal styling

### 9.2 Typography

Allowed:

- `Inter` as primary type
- `IBM Plex Mono` for short metadata or structural labels only

Disallowed:

- serif headline fonts
- editorial display fonts
- decorative legal typography

Typography must feel:

- precise
- technical
- inspectable
- controlled

## 10. Terminology Consistency

Policy language must align with product language.

Preferred product-aligned terms:

- `authored`
- `bounded`
- `scope`
- `refused`
- `source-bounded`

Rules:

- do not introduce undefined synonyms for core product concepts
- do not switch terminology between policy pages without reason
- do not use marketing alternatives when product terms are already defined

If a term appears in multiple policy pages, it must carry the same meaning in each page.

### 10.1 Section Title Rules

All section and card titles must:

- directly reference their scope
- avoid generic labels
- avoid `overview` or `general` phrasing

Preferred structure:

`[Scope] — [Constraint or Function]`

Examples:

- Cookies — Data usage constraints
- Data retention — Storage duration rules
- Access control — Authorization boundaries

Titles must describe what the section enforces, not what it discusses.

## 11. Boundaries and Negative Statements

Each policy section must contain explicit boundaries where relevant.

Boundary statements should answer:

- what is included
- what is excluded
- what triggers applicability
- what does not trigger applicability

Negative statements are required when omission would create ambiguity.

Example boundary pattern:

- included behavior
- excluded behavior
- triggering condition
- non-triggering condition

## 12. Prohibitions

Policy pages must not:

- invent system capabilities
- generalize behavior beyond implementation
- copy boilerplate legal text without adaptation
- contradict actual product behavior
- promise features not present in the platform
- use vague fallback wording in place of real scope
- describe speculative future states as current policy

If implementation and drafted policy conflict, the text is invalid until corrected.

## 13. Change Control

Any future policy update must:

- reference this `POLICY.md`
- preserve the structural model
- preserve the tone model
- preserve the terminology model
- preserve the card-oriented writing constraints

No deviation is allowed unless this file is updated first.

Change-review rules:

- structural changes must be deliberate
- terminology changes must be deliberate
- tone drift is a policy bug
- implementation drift is a policy bug
- policy drift is a system bug
- trace drift is a governance bug

## 14. Validation Checklist

Before accepting any policy edit, verify all of the following:

- the section order matches this specification
- every claim is bounded and verifiable
- vague qualifiers are removed
- no generic legal filler remains
- the text reflects actual implementation
- the terminology matches ChatPDM product language
- the content can map cleanly into card-based UI sections
- no editorial or conversational tone appears

If any item fails, the policy edit is incomplete.

## 15. Enforcement Rule

This file is the canonical source of truth for ChatPDM legal and policy writing.

Privacy Policy, Terms of Service, and Cookie Policy must be authored and revised under this specification only.

No policy page may override this document through ad hoc wording, stylistic preference, or copied template behavior.
