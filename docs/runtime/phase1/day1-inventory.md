# Phase 1 - Day 1

Deterministic Contract Lock
Date: 2026-04-22
Time: 2026-04-22 16:07 BST
Commit/Branch: main @ 0c7f5df0cf37a7adf3704052e4e9743a70e58181

---

## Scope

Freeze current resolver behavior before any edits.
Inventory public product responses only.
HTTP error envelopes excluded.

---

## Phase A - Code Truth (Enumeration)

### Response Types (from code)

List these exact public product response types:

- concept_match
- comparison
- rejected_concept
- VOCABULARY_DETECTED
- no_exact_match
- invalid_query
- unsupported_query_type
- ambiguous_match

For each response type, include:

- origin file + function
- trigger condition
- short note

- concept_match - origin: `resolveConceptQuery` in `backend/src/modules/concepts/resolver.js:561`; upstream match source: `matchQuery` in `backend/src/modules/concepts/matcher.js:114`; trigger: a live concept match survives the guard, vocabulary, rejection, governance, and visibility checks.
- comparison - origin: `resolveConceptQuery` in `backend/src/modules/concepts/resolver.js:520`; trigger: `queryClassification.queryType === 'comparison_query'`, no visible-only concept is mentioned, no blocked concepts remain, and `resolveComparisonQuery(...)` returns a comparison payload.
- rejected_concept - origin: `buildRejectedConceptResponse` in `backend/src/modules/concepts/resolver.js:113`; trigger: `getRejectedConceptRecord(...)` returns a record before the main concept set lookup.
- VOCABULARY_DETECTED - origin: `buildVocabularyDetectedResponse` in `backend/src/modules/concepts/resolver.js:142`; trigger: vocabulary matches and the target is neither live nor visible-only.
- no_exact_match - origin: multiple resolver branches, including `buildPreResolutionGuardResponse` at `resolver.js:94`, `buildValidationBlockedResponse` at `resolver.js:191`, `buildVisibleOnlyConceptResponse` at `resolver.js:254`, and the fallback at `resolver.js:639`; trigger: pre-resolution refusal, governance-scope enforcement, out-of-scope interaction, visible-only routing, comparison fallback, governance-unavailable live concept, blocked concept/candidate set, or default no-match suggestions.
- invalid_query - origin: `buildInvalidQueryResponse` in `backend/src/modules/concepts/resolver.js:277`; trigger: `queryClassification.queryType === 'invalid_query'`.
- unsupported_query_type - origin: `buildUnsupportedQueryTypeResponse` in `backend/src/modules/concepts/resolver.js:288`; trigger: `queryClassification.queryType` is `relation_query`, `role_or_actor_query`, or `unsupported_complex_query` with no recoverable exact response.
- ambiguous_match - origin: `matchQuery` in `backend/src/modules/concepts/matcher.js:101` and public emission in `resolveConceptQuery` at `resolver.js:620`; trigger: alias collision or author-defined disambiguation yields ambiguous candidates, and at least one candidate remains actionable after blocked filtering.

### Excluded from this inventory

- Internal pipeline engine types
- Concept detail route output
- HTTP error envelopes

Document that HTTP error envelopes are intentionally excluded from this Day 1 inventory and may be handled in a separate pass.

Excluded inventory notes:

- Internal pipeline engine types: `LIVE_RESOLUTION`, `VISIBLE_INSPECTION`, `STRUCTURAL_REJECTION`, `VOCAB_CLASSIFICATION`, `NO_MATCH`
- Concept detail route output from `backend/src/routes/api/v1/concepts.route.js` and `backend/src/modules/concepts/concept-detail-service.js`
- HTTP error envelopes: `invalid_query`, `invalid_concept_id`, `concept_not_found`, `concept_resolve_failed`, `concept_detail_failed`

---

## Phase B - Runtime Truth (Field Inventory)

Important:
This section is currently code-derived, not live-captured.
State that clearly at the top of the section.
Mark raw runtime JSON examples as pending.

### Status

- This pass is code-derived from resolver branches
- Live API capture is completed for the reachable public product responses
- `ambiguous_match` is not captured on the current live route because the only authored ambiguous disambiguation input is intercepted by vocabulary boundary precedence before the ambiguous branch can resolve
- HTTP error envelopes excluded

### Top-Level Fields

Summarize the current top-level field inventory:

- `type`: present in all public resolver response types; always present
- `query`: all; always present
- `normalizedQuery`: all; always present
- `contractVersion`: all; always present
- `normalizerVersion`: all; always present
- `matcherVersion`: all; always present
- `conceptSetVersion`: all; always present
- `queryType`: all; always present
- `interpretation`: all; always present but null in `concept_match`, `comparison`, `VOCABULARY_DETECTED`; object elsewhere
- `resolution`: present in all except `comparison`
- `message`: present in `no_exact_match`, `rejected_concept`, `VOCABULARY_DETECTED`, `invalid_query`, `unsupported_query_type`, `ambiguous_match`; absent from `concept_match` and `comparison`
- `suggestions`: present only on `no_exact_match`
- `finalState`: only present on `VOCABULARY_DETECTED`
- `rejection`: only present on `rejected_concept`
- `vocabulary`: only present on `VOCABULARY_DETECTED`
- `answer`: only present on `concept_match`
- `mode`: only present on `comparison`
- `comparison`: only present on `comparison`
- `candidates`: only present on `ambiguous_match`

### Nested Fields

Summarize:

resolution:

- `resolution.method`: `concept_match`, `no_exact_match`, `rejected_concept`, `VOCABULARY_DETECTED`, `invalid_query`, `unsupported_query_type`, `ambiguous_match`
- `resolution.conceptId`: `concept_match`, `rejected_concept`
- `resolution.conceptVersion`: `concept_match`

interpretation:

- `interpretation.interpretationType`: `no_exact_match`, `rejected_concept`, `invalid_query`, `unsupported_query_type`, `ambiguous_match`
- `interpretation.message`: same branches as `interpretationType`
- `interpretation.domain`: only some `no_exact_match` pre-resolution guard branches
- `interpretation.targetConceptId`: `rejected_concept` and some `no_exact_match` branches
- `interpretation.concepts`: `rejected_concept`, `ambiguous_match`, and some `no_exact_match` / `unsupported_query_type` branches
- `interpretation.baseConcept`: `unsupported_query_type` only
- `interpretation.actorTerm`: `unsupported_query_type` only
- `interpretation.relationTerm`: `unsupported_query_type` only

concept_match.answer:

- `answer.itemType`
- `answer.title`
- `answer.shortDefinition`
- `answer.coreMeaning`
- `answer.fullDefinition`
- `answer.governanceState`
- `answer.governanceState.trace`
- `answer.registers`
- `answer.registers.canonicalBinding`
- `answer.registers.validation`
- `answer.registers.standard` / `simplified` / `formal`
- `answer.contexts[]`
- `answer.sources[]`
- `answer.relatedConcepts[]`
- `answer.resolutionStatus` is conditionally appended in resolver but not allowed by current product-response validator, so it should be documented as not part of the validated public surface

comparison:

- `comparison.conceptA`
- `comparison.conceptB`
- `comparison.axes[]`
- `comparison.axes[].axis`
- `comparison.axes[].A` / `.B` or `.statement` depending on axis shape

vocabulary:

- `vocabulary.input`
- `vocabulary.normalizedInput`
- `vocabulary.matched`
- `vocabulary.term`
- `vocabulary.classification`
- `vocabulary.relations`
- `vocabulary.relations.closestConcept`
- `vocabulary.relations.contrastWith[]`
- `vocabulary.relations.relatedConcepts[]`
- `vocabulary.systemFlags`

rejection / suggestions / candidates:

- `rejection.status`
- `rejection.decisionType`
- `rejection.finality`
- `suggestions[].conceptId` / `title` / `reason`
- `candidates[].conceptId` / `title` / `shortDefinition` / `basis`

### Observed Variability

Add these bullets exactly as findings:

- resolution is missing entirely from comparison
- message is missing from concept_match and comparison
- suggestions is only present on no_exact_match; invalid_query and unsupported_query_type do not include it
- finalState only exists on VOCABULARY_DETECTED
- type casing is inconsistent because VOCABULARY_DETECTED is uppercase while every other type is lowercase
- interpretation is structurally inconsistent by branch: null for concept_match, comparison, and VOCABULARY_DETECTED, object elsewhere
- resolution.method is branch-dependent and not normalized to a single semantic family
- answer.resolutionStatus is conditionally appended in resolver code, but the current product-response validator does not allow it, so it is not part of the validated public surface
- interpretation.concept is allowed by the validator but is not emitted by the current resolver branches
- comparison.axes[] uses mutually exclusive shapes: either A + B, or statement
- vocabulary.term, vocabulary.classification, and vocabulary.relations are conditional and can be null
- answer.registers.simplified and answer.registers.formal are conditional on the register validator’s availableModes
- answer.governanceState.trace.unavailableReason can be null, which makes the trace object stateful rather than uniform

### Raw Runtime JSON Examples

#### concept_match

- query used: `authority`
- capture status: captured

```json
{"query":"authority","normalizedQuery":"authority","contractVersion":"v1.7","normalizerVersion":"2026-04-01.v2","matcherVersion":"2026-04-01.v4","conceptSetVersion":"20260401.2","queryType":"exact_concept_query","interpretation":null,"type":"concept_match","resolution":{"method":"exact_alias","conceptId":"authority","conceptVersion":1},"answer":{"itemType":"core_concept","title":"Authority","shortDefinition":"Authority is recognized standing to direct, decide, or govern within a governance order.","coreMeaning":"Within the governance domain, authority works by giving a recognized role, office, or position the right to direct. It concerns who may direct, not what can be enforced or whether that standing is valid.","fullDefinition":"Authority is not any ability to produce effects. In ChatPDM v1 it is defined within the governance domain as a structured right to issue direction, make decisions, or govern within a governance order.\n\nIts structure joins the right to direct to a recognized role, office, or position. The concept requires that this right attach to standing rather than to mere capacity.\n\nWithin governance structures, authority organizes who may decide, command, or settle matters. Questions of whether that standing is valid belong to legitimacy, while questions of what outcomes can be produced belong to power.","governanceState":{"source":"validator_artifact","available":true,"validationState":"fully_validated","v3Status":"passing","relationStatus":"passing","lawStatus":"passing","enforcementStatus":"passing","systemValidationState":"law_validated","isBlocked":false,"isStructurallyIncomplete":false,"isFullyValidated":true,"isActionable":true,"trace":{"conceptId":"authority","validatorSource":"validator_artifact","unavailableReason":null,"relationSource":"authored","lawSource":"authored","relationDataPresent":true,"dataSource":"authored_relation_packets"}},"registers":{"readOnly":true,"canonicalBinding":{"conceptId":"authority","conceptVersion":1,"canonicalHash":"8a747e670282bc46334fc54aa72e59c5f85c88d5786437a43b0605b48e6a7025"},"validation":{"availableModes":["standard","simplified","formal"],"modes":{"standard":{"status":"available","reasons":[]},"simplified":{"status":"available","reasons":[]},"formal":{"status":"available","reasons":[]}}},"standard":{"shortDefinition":"Authority is recognized standing to direct, decide, or govern within a governance order.","coreMeaning":"Within the governance domain, authority works by giving a recognized role, office, or position the right to direct. It concerns who may direct, not what can be enforced or whether that standing is valid.","fullDefinition":"Authority is not any ability to produce effects. In ChatPDM v1 it is defined within the governance domain as a structured right to issue direction, make decisions, or govern within a governance order.\n\nIts structure joins the right to direct to a recognized role, office, or position. The concept requires that this right attach to standing rather than to mere capacity.\n\nWithin governance structures, authority organizes who may decide, command, or settle matters. Questions of whether that standing is valid belong to legitimacy, while questions of what outcomes can be produced belong to power."},"simplified":{"shortDefinition":"Authority is the recognized right to direct, decide, or govern in a governing order.","coreMeaning":"In governance, authority marks who may direct from a recognized role or office. It is about who has the right to decide, not about force or validity.","fullDefinition":"Authority is not power. It is the recognized right to direct from a role, office, or post in a governing order.\n\nIt is about recognized status, not force. Power can exist without authority. Authority can exist while legitimacy is disputed.\n\nSo authority tells us who may decide or command. Legitimacy asks whether that status is valid. Power asks what outcomes can actually be produced."},"formal":{"shortDefinition":"Authority is the recognized standing that makes directive acts institutionally operative within a governance order.","coreMeaning":"Within the governance domain, authority assigns directive competence to a recognized role, office, or position within the order. It identifies who may direct or determine, rather than what effects can be produced or whether that standing is valid.","fullDefinition":"Authority is defined, within the governance domain, as the recognized standing to issue direction, make determinations, or govern within a governance order. The concept requires that the right to direct attach to role, office, or position and count as institutionally operative rather than as mere capacity. Authority is distinct from power, which concerns produced outcomes, and from legitimacy, which concerns whether that standing is valid."}},"contexts":[{"label":"governance","appliesTo":["governance"]},{"label":"legal","appliesTo":["legal"]},{"label":"institutional","appliesTo":["institutional"]}],"sources":[{"id":"weber","label":"Max Weber, Economy and Society","type":"book","usedFor":"structural distinction between recognized rule-bound command and mere power"},{"id":"oxford","label":"Oxford Languages","type":"dictionary","usedFor":"definition boundary for recognized right to direct or decide"}],"relatedConcepts":[{"conceptId":"power","title":"Power","relationType":"contrast"},{"conceptId":"legitimacy","title":"Legitimacy","relationType":"contrast"}]}
```

#### comparison

- query used: `authority vs power`
- capture status: captured

```json
{"query":"authority vs power","normalizedQuery":"authority vs power","contractVersion":"v1.7","normalizerVersion":"2026-04-01.v2","matcherVersion":"2026-04-01.v4","conceptSetVersion":"20260401.2","queryType":"comparison_query","interpretation":null,"type":"comparison","mode":"comparison","comparison":{"conceptA":"authority","conceptB":"power","axes":[{"axis":"core_nature","A":"recognized right to direct","B":"effective capacity to produce outcomes"},{"axis":"depends_on","A":"recognized role or standing","B":"resources, force, or influence"},{"axis":"not_equivalent","statement":"authority is not power; power does not require authority"}]}}
```

#### rejected_concept

- query used: `defeasibility`
- capture status: captured

```json
{"query":"defeasibility","normalizedQuery":"defeasibility","contractVersion":"v1.7","normalizerVersion":"2026-04-01.v2","matcherVersion":"2026-04-01.v4","conceptSetVersion":"20260401.2","queryType":"exact_concept_query","interpretation":{"interpretationType":"explicitly_rejected_concept","targetConceptId":"defeasibility","concepts":["defeasibility"],"message":"The concept \"defeasibility\" is explicitly rejected under the current system state."},"type":"rejected_concept","resolution":{"method":"rejection_registry","conceptId":"defeasibility"},"message":"This concept is structurally rejected under the current system state.","rejection":{"status":"REJECTED","decisionType":"STRUCTURAL_REJECTION","finality":true}}
```

#### VOCABULARY_DETECTED

- query used: `obligation`
- capture status: captured

```json
{"query":"obligation","normalizedQuery":"obligation","contractVersion":"v1.7","normalizerVersion":"2026-04-01.v2","matcherVersion":"2026-04-01.v4","conceptSetVersion":"20260401.2","queryType":"exact_concept_query","finalState":"refused","interpretation":null,"type":"VOCABULARY_DETECTED","resolution":{"method":"vocabulary_guard"},"message":"Recognized term is not a core system concept and is excluded from resolution.","vocabulary":{"input":"obligation","normalizedInput":"obligation","matched":true,"term":"obligation","classification":"legal_term","relations":{"closestConcept":"duty","contrastWith":["responsibility"],"relatedConcepts":["duty"]},"systemFlags":{"isCoreConcept":false,"usableInResolver":false,"reasoningAllowed":false}}}
```

#### no_exact_match

- query used: `agreement`
- capture status: captured

```json
{"query":"agreement","normalizedQuery":"agreement","contractVersion":"v1.7","normalizerVersion":"2026-04-01.v2","matcherVersion":"2026-04-01.v4","conceptSetVersion":"20260401.2","queryType":"exact_concept_query","interpretation":{"interpretationType":"visible_only_public_concept","targetConceptId":"agreement","concepts":["agreement"],"message":"The concept \"agreement\" is visible in public scope and detail, but it is not admitted to the live public runtime."},"type":"no_exact_match","resolution":{"method":"out_of_scope"},"message":"No exact canonical concept match was found for this query.","suggestions":[]}
```

#### invalid_query

- query used: `   `
- capture status: captured

```json
{"query":"   ","normalizedQuery":"__empty__","contractVersion":"v1.7","normalizerVersion":"2026-04-01.v2","matcherVersion":"2026-04-01.v4","conceptSetVersion":"20260401.2","queryType":"invalid_query","interpretation":{"interpretationType":"invalid_query","message":"No recognizable concept or supported query structure was detected."},"type":"invalid_query","resolution":{"method":"invalid_query"},"message":"No recognizable concept or supported query structure was detected."}
```

#### unsupported_query_type

- query used: `???`
- capture status: captured

```json
{"query":"???","normalizedQuery":"???","contractVersion":"v1.7","normalizerVersion":"2026-04-01.v2","matcherVersion":"2026-04-01.v4","conceptSetVersion":"20260401.2","queryType":"unsupported_complex_query","interpretation":{"interpretationType":"unsupported_complex","message":"This query does not match a supported concept query form in the current runtime."},"type":"unsupported_query_type","resolution":{"method":"unsupported_query_type"},"message":"This query has recognizable structure, but the current runtime does not support this query type yet."}
```

#### ambiguous_match

- query used: `obligation`
- capture status: not captured
- reason: the current live route resolves `obligation` through the vocabulary boundary first, so the ambiguous disambiguation branch is not reachable from the current authored set
- attempted condition: current authored ambiguous-disambiguation input from `data/concepts/resolve-rules.json`
- observed live result: `VOCABULARY_DETECTED`

---

## Phase C - Surface Reality (Implicit State & Risk Detection)

### 1. Implicit States

Use these findings:

- reviewed_not_live is frontend-derived from detail.reviewState.admission and a local admission allowlist; runtime-page.component.ts and landing-page.component.ts
- visible_only is inferred from detail.conceptId membership plus response.interpretation?.interpretationType === 'visible_only_public_concept'
- blocked is inferred from response.type === 'rejected_concept' or detail.reviewState.admission === 'blocked'
- detailConceptId is reconstructed from query text and local allowlists, not emitted explicitly by the resolver for no_exact_match cases
- pre-resolution refusal labels are derived from interpretation.interpretationType in the frontend, not a dedicated backend status field

### 2. Missing Required Signals

Use these findings:

- finalState is only present on VOCABULARY_DETECTED
- failedLayer does not appear in the public response types or current frontend consumers
- a uniform reason field is not part of the public resolver contract for most branches
- message is absent on concept_match and comparison

### 3. Field Inconsistencies

Use these findings:

- interpretation is null for concept_match, comparison, and VOCABULARY_DETECTED, but an object for refusal and ambiguity branches
- resolution is absent entirely from comparison
- type and queryType are different axes, but the UI often treats them as overlapping state signals
- answer.resolutionStatus exists in frontend type expectations but is not part of the validated backend public surface
- VOCABULARY_DETECTED is the only uppercase response type and the only branch with finalState

### 4. Frontend Reconstruction

Use these findings:

- loadConceptDetail converts a response plus query into an extra detail fetch and returns null on non-404 error, which hides a distinct failure state
- resultDisplayState on the runtime page uses backend type first, then overrides visible state from detail.reviewState and concept visibility checks
- landing page reconstructs refusal presentation through multiple helpers branching on detail.reviewState, isVisibleOnlyRefusal, and response.interpretation
- runtime refusal atlas entries synthesize outcome, interpretation, reason, resolution, and message from mixed backend sources
- refusalResolutionMethod and refusalMessage fall back to response.type and generic strings when fields are missing
- reading-register helpers on the landing page accept partial or missing nested register modes and fall back to canonical fields

### 5. Risk Classification

#### High

- frontend overrides backend truth after extra detail lookup
- visible state depends on detail fetch
- reviewed_not_live, visible_only, blocked, and detailConceptId are implicit or hybrid states

#### Medium

- finalState missing in most responses
- failedLayer absent entirely
- uniform reason not standardized
- comparison and concept_match shape differences are hidden by fallback UI logic

#### Low to Medium

- VOCABULARY_DETECTED casing inconsistency
- presentation-only label mappings that remain structurally distinct from the rest of the contract

---

## Key Observations (Critical)

Add these exact conclusions:

- Backend does not define a single explicit state model across public resolver responses
- Frontend reconstructs truth from multiple backend fields plus detail lookups
- Public contract is implicit rather than fully enforced
- Multiple branches produce structurally different outputs
- Day 1 findings currently reflect code truth and frontend behavior review, and the raw runtime capture pass is complete except for `ambiguous_match`, which is explicitly marked not captured

---

## Day 1 Status

Use this checklist:

- [x] Response types enumerated from code
- [x] Field inventory extracted from code
- [x] Implicit states and frontend reconstruction risks documented
- [x] Raw runtime JSON captured or explicitly marked not captured for each response type

Day 1 status: COMPLETE

Completion note:

- Code-truth inventory complete
- Runtime capture complete for reachable public product responses
- `ambiguous_match` explicitly documented as not captured on the current live route

---

## Next Step (Day 2)

Add:

Build a field matrix with:

- field
- always present?
- response types
- source
- frontend reliance
- contract risk

Expected Output:

- A completed markdown file at /docs/runtime/phase1/day1-inventory.md
- Clean, structured headings
- Accurate preservation of findings
- No code changes
- Clear distinction between captured runtime cases and explicitly not-captured cases
- No HTTP error envelope mixing with product response inventory

Evaluation:

- File is created in the correct path
- Findings are preserved accurately
- Product outputs are kept separate from HTTP error envelopes
- The document reads like an audit snapshot, not a redesign spec
- Pending runtime capture is clearly marked rather than invented
