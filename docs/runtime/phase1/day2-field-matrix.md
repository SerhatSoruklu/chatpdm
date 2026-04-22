# Phase 1 - Day 2

Field Matrix
Date: 2026-04-22
Time: 2026-04-22 16:07 BST
Commit/Branch: main @ 0c7f5df0cf37a7adf3704052e4e9743a70e58181

---

## Scope

Construct a field matrix for the public resolver response surface using the Day 1 code inventory and runtime JSON captures.
HTTP error envelopes remain excluded.

---

## Status

- Runtime capture is complete for the reachable public product responses
- `ambiguous_match` is not captured on the current live route because the current authored ambiguous input is intercepted by vocabulary boundary precedence before the ambiguous branch can resolve
- `yes` means directly used in frontend rendering or state logic
- `inferred` means used indirectly, through telemetry, typed payload handling, or UI reconstruction logic
- `no` means no current frontend dependency was found in the inspected frontend files

---

## Top-Level Fields

| field | always present? | response types used in | source module | frontend reliance? | notes |
| --- | --- | --- | --- | --- | --- |
| `type` | yes | all public resolver response types | `backend/src/modules/concepts/resolver.js`; `backend/src/lib/product-response-validator.js` | yes | Type discriminator for all product responses; `VOCABULARY_DETECTED` is the only uppercase branch. |
| `query` | yes | all public resolver response types | `backend/src/modules/concepts/resolver.js` | yes | Raw query echo used by the UI for detail lookup and feedback context. |
| `normalizedQuery` | yes | all public resolver response types | `backend/src/modules/concepts/normalizer.js`; `backend/src/modules/concepts/resolver.js` | yes | Normalized query echo; used by frontend detail lookup and feedback payloads. |
| `contractVersion` | yes | all public resolver response types | `backend/src/modules/concepts/constants.js`; `backend/src/modules/concepts/resolver.js` | inferred | Version stamp surfaced in feedback payloads and response metadata. |
| `normalizerVersion` | yes | all public resolver response types | `backend/src/modules/concepts/constants.js`; `backend/src/modules/concepts/resolver.js` | inferred | Version stamp surfaced in feedback payloads and response metadata. |
| `matcherVersion` | yes | all public resolver response types | `backend/src/modules/concepts/constants.js`; `backend/src/modules/concepts/resolver.js` | inferred | Version stamp surfaced in feedback payloads and response metadata. |
| `conceptSetVersion` | yes | all public resolver response types | `backend/src/modules/concepts/constants.js`; `backend/src/modules/concepts/resolver.js` | inferred | Version stamp surfaced in feedback payloads and response metadata. |
| `queryType` | yes | all public resolver response types | `backend/src/modules/concepts/query-shape-classifier.js`; `backend/src/modules/concepts/resolver.js` | yes | Different axis from `type`; used in labels, refusal logic, and feedback context. |
| `interpretation` | yes | all public resolver response types; null in `concept_match`, `comparison`, and `VOCABULARY_DETECTED` | `backend/src/modules/concepts/query-shape-classifier.js`; `backend/src/modules/concepts/resolver.js` | yes | Structurally inconsistent by branch: object for refusals and ambiguity, null for executable/matching branches. |
| `resolution` | conditional | `concept_match`, `no_exact_match`, `rejected_concept`, `VOCABULARY_DETECTED`, `invalid_query`, `unsupported_query_type`, `ambiguous_match` | `backend/src/modules/concepts/resolver.js`; `backend/src/modules/concepts/matcher.js` | yes | Absent from `comparison`; branch-dependent method family. |
| `mode` | conditional | `comparison` | `backend/src/modules/concepts/resolver.js` | inferred | Present only on `comparison`; not currently a direct frontend branch condition. |
| `message` | conditional | `no_exact_match`, `rejected_concept`, `VOCABULARY_DETECTED`, `invalid_query`, `unsupported_query_type`, `ambiguous_match` | `backend/src/modules/concepts/constants.js`; `backend/src/modules/concepts/query-shape-classifier.js`; `backend/src/modules/concepts/resolver.js` | yes | Absent from `concept_match` and `comparison`. |
| `suggestions` | conditional | `no_exact_match` | `backend/src/modules/concepts/matcher.js`; `backend/src/modules/concepts/resolver.js` | yes | Only present on `no_exact_match`; empty arrays are captured in live output. |
| `finalState` | conditional | `VOCABULARY_DETECTED` | `backend/src/modules/concepts/resolver.js` | no | Only present on the vocabulary boundary branch; live value is `refused`. |
| `rejection` | conditional | `rejected_concept` | `backend/src/modules/concepts/rejection-registry-loader.js`; `backend/src/modules/concepts/resolver.js` | no | Explicit structural rejection payload; not directly read in the inspected frontend files. |
| `vocabulary` | conditional | `VOCABULARY_DETECTED` | `backend/src/vocabulary/vocabulary-classifier.ts`; `backend/src/vocabulary/vocabulary-service.ts`; `backend/src/modules/concepts/resolver.js` | inferred | Boundary-only vocabulary payload; not a core concept payload. |
| `answer` | conditional | `concept_match` | `backend/src/modules/inspectable-item-contract.js`; `backend/src/modules/concepts/concept-validation-state-loader.js`; `backend/src/modules/concepts/reading-registers.js`; `backend/src/modules/concepts/resolver.js` | yes | Canonical concept payload. |
| `comparison` | conditional | `comparison` | `backend/src/modules/concepts/comparison-resolver.js`; `backend/src/modules/concepts/resolver.js` | yes | Compare payload; structurally distinct from all refusal branches. |
| `candidates` | conditional | `ambiguous_match` | `backend/src/modules/concepts/matcher.js`; `backend/src/modules/concepts/resolver.js` | yes | Ambiguous-choice payload; current live route did not capture this branch. |

---

## Resolution Fields

| field | always present? | response types used in | source module | frontend reliance? | notes |
| --- | --- | --- | --- | --- | --- |
| `resolution.method` | conditional | `concept_match`, `no_exact_match`, `rejected_concept`, `VOCABULARY_DETECTED`, `invalid_query`, `unsupported_query_type`, `ambiguous_match` | `backend/src/modules/concepts/matcher.js`; `backend/src/modules/concepts/resolver.js` | yes | Branch-dependent method family; not normalized to a single semantic axis. |
| `resolution.conceptId` | conditional | `concept_match`, `rejected_concept` | `backend/src/modules/concepts/resolver.js` | yes | Used for scope/detail lookup and feedback context. |
| `resolution.conceptVersion` | conditional | `concept_match` | `backend/src/modules/concepts/resolver.js` | inferred | Present only on the live concept match branch. |

---

## Interpretation Fields

| field | always present? | response types used in | source module | frontend reliance? | notes |
| --- | --- | --- | --- | --- | --- |
| `interpretation.interpretationType` | conditional | `no_exact_match`, `rejected_concept`, `invalid_query`, `unsupported_query_type`, `ambiguous_match` | `backend/src/modules/concepts/query-shape-classifier.js`; `backend/src/modules/concepts/resolver.js` | yes | Null in `concept_match`, `comparison`, and `VOCABULARY_DETECTED`. |
| `interpretation.message` | conditional | `no_exact_match`, `rejected_concept`, `invalid_query`, `unsupported_query_type`, `ambiguous_match` | `backend/src/modules/concepts/query-shape-classifier.js`; `backend/src/modules/concepts/resolver.js` | yes | Used by the frontend as the primary refusal explanation when present. |
| `interpretation.domain` | conditional | some `no_exact_match` pre-resolution guard branches | `backend/src/modules/concepts/pre-resolution-guard.js`; `backend/src/modules/concepts/resolver.js` | inferred | Only appears on some guard outputs. |
| `interpretation.targetConceptId` | conditional | `rejected_concept` and some `no_exact_match` branches | `backend/src/modules/concepts/query-shape-classifier.js`; `backend/src/modules/concepts/resolver.js` | yes | Used by the UI to anchor the refusal to a concept. |
| `interpretation.concepts` | conditional | `rejected_concept`, `ambiguous_match`, and some `no_exact_match` / `unsupported_query_type` branches | `backend/src/modules/concepts/query-shape-classifier.js`; `backend/src/modules/concepts/resolver.js` | yes | Structural array used to reconstruct ambiguity or scope in the UI. |
| `interpretation.baseConcept` | conditional | `unsupported_query_type` only | `backend/src/modules/concepts/query-shape-classifier.js` | inferred | Validator-allowed; used only in unsupported role/actor branches. |
| `interpretation.actorTerm` | conditional | `unsupported_query_type` only | `backend/src/modules/concepts/query-shape-classifier.js` | inferred | Validator-allowed; used only in unsupported role/actor branches. |
| `interpretation.relationTerm` | conditional | `unsupported_query_type` only | `backend/src/modules/concepts/query-shape-classifier.js` | inferred | Validator-allowed; used only in relation refusal branches. |
| `interpretation.concept` | conditional | validator-allowed only; not emitted by current resolver branches | `backend/src/lib/product-response-validator.js` | no | Allowed by validator, but not present in the captured live responses. |

---

## `concept_match.answer`

| field | always present? | response types used in | source module | frontend reliance? | notes |
| --- | --- | --- | --- | --- | --- |
| `answer.itemType` | yes | `concept_match` | `backend/src/modules/inspectable-item-contract.js`; `backend/src/modules/concepts/resolver.js` | inferred | Live capture uses `core_concept`. |
| `answer.title` | yes | `concept_match` | `backend/src/modules/inspectable-item-contract.js`; `backend/src/modules/concepts/resolver.js` | yes | Canonical title surfaced to the UI. |
| `answer.shortDefinition` | yes | `concept_match` | `backend/src/modules/inspectable-item-contract.js`; `backend/src/modules/concepts/resolver.js` | yes | Canonical short definition. |
| `answer.coreMeaning` | yes | `concept_match` | `backend/src/modules/inspectable-item-contract.js`; `backend/src/modules/concepts/resolver.js` | yes | Canonical core meaning. |
| `answer.fullDefinition` | yes | `concept_match` | `backend/src/modules/inspectable-item-contract.js`; `backend/src/modules/concepts/resolver.js` | yes | Canonical full definition. |
| `answer.resolutionStatus` | conditional | code-only in `concept_match`; not part of validated public surface | `backend/src/modules/concepts/resolver.js`; `backend/src/lib/product-response-validator.js`; `frontend/src/app/core/concepts/concept-resolver.types.ts` | inferred | Conditionally appended in resolver code, but the validator does not allow it and the live capture did not include it. |
| `answer.governanceState` | yes | `concept_match` | `backend/src/modules/concepts/concept-validation-state-loader.js`; `backend/src/lib/product-response-validator.js` | yes | Governance snapshot object used by frontend validation trace rendering. |
| `answer.registers` | yes | `concept_match` | `backend/src/modules/concepts/reading-registers.js`; `backend/src/lib/product-response-validator.js` | yes | Reading register bundle used by the frontend reading-lens UI. |
| `answer.contexts[]` | yes | `concept_match` | `backend/src/modules/concepts/resolver.js` | yes | Context chips are used in the UI. |
| `answer.sources[]` | yes | `concept_match` | `backend/src/modules/concepts/resolver.js` | yes | Source list is surfaced in the UI. |
| `answer.relatedConcepts[]` | yes | `concept_match` | `backend/src/modules/concepts/resolver.js` | yes | Related concept links are surfaced in the UI. |

---

## `answer.governanceState`

| field | always present? | response types used in | source module | frontend reliance? | notes |
| --- | --- | --- | --- | --- | --- |
| `answer.governanceState.source` | yes | `concept_match` | `backend/src/modules/concepts/concept-validation-state-loader.js` | yes | Used by runtime trace labels. |
| `answer.governanceState.available` | yes | `concept_match` | `backend/src/modules/concepts/concept-validation-state-loader.js` | yes | Used by runtime validation trace and review labels. |
| `answer.governanceState.validationState` | yes | `concept_match` | `backend/src/modules/concepts/concept-validation-state-loader.js` | inferred | Captured live as `fully_validated`. |
| `answer.governanceState.v3Status` | yes | `concept_match` | `backend/src/modules/concepts/concept-validation-state-loader.js` | inferred | Captured live as `passing`. |
| `answer.governanceState.relationStatus` | yes | `concept_match` | `backend/src/modules/concepts/concept-validation-state-loader.js` | inferred | Captured live as `passing`. |
| `answer.governanceState.lawStatus` | yes | `concept_match` | `backend/src/modules/concepts/concept-validation-state-loader.js` | inferred | Captured live as `passing`. |
| `answer.governanceState.enforcementStatus` | yes | `concept_match` | `backend/src/modules/concepts/concept-validation-state-loader.js` | inferred | Captured live as `passing`. |
| `answer.governanceState.systemValidationState` | yes | `concept_match` | `backend/src/modules/concepts/concept-validation-state-loader.js` | yes | Used by runtime trace state label and frontend review text. |
| `answer.governanceState.isBlocked` | yes | `concept_match` | `backend/src/modules/concepts/concept-validation-state-loader.js` | inferred | Captured live as `false`. |
| `answer.governanceState.isStructurallyIncomplete` | yes | `concept_match` | `backend/src/modules/concepts/concept-validation-state-loader.js` | inferred | Captured live as `false`. |
| `answer.governanceState.isFullyValidated` | yes | `concept_match` | `backend/src/modules/concepts/concept-validation-state-loader.js` | inferred | Captured live as `true`. |
| `answer.governanceState.isActionable` | yes | `concept_match` | `backend/src/modules/concepts/concept-validation-state-loader.js` | inferred | Captured live as `true`. |
| `answer.governanceState.trace` | yes | `concept_match` | `backend/src/modules/concepts/concept-validation-state-loader.js` | yes | Trace object used by runtime trace rows. |
| `answer.governanceState.trace.conceptId` | yes | `concept_match` | `backend/src/modules/concepts/concept-validation-state-loader.js` | yes | Trace anchor used in runtime trace rows. |
| `answer.governanceState.trace.validatorSource` | yes | `concept_match` | `backend/src/modules/concepts/concept-validation-state-loader.js` | yes | Runtime trace source label depends on this value. |
| `answer.governanceState.trace.unavailableReason` | yes | `concept_match` | `backend/src/modules/concepts/concept-validation-state-loader.js` | yes | Null in the live capture; frontend renders it when present. |
| `answer.governanceState.trace.relationSource` | yes | `concept_match` | `backend/src/modules/concepts/concept-validation-state-loader.js` | inferred | Live capture used `authored`. |
| `answer.governanceState.trace.lawSource` | yes | `concept_match` | `backend/src/modules/concepts/concept-validation-state-loader.js` | inferred | Live capture used `authored`. |
| `answer.governanceState.trace.relationDataPresent` | yes | `concept_match` | `backend/src/modules/concepts/concept-validation-state-loader.js` | inferred | Live capture used `true`. |
| `answer.governanceState.trace.dataSource` | yes | `concept_match` | `backend/src/modules/concepts/concept-validation-state-loader.js` | inferred | Live capture used `authored_relation_packets`. |

---

## `answer.registers`

| field | always present? | response types used in | source module | frontend reliance? | notes |
| --- | --- | --- | --- | --- | --- |
| `answer.registers.readOnly` | yes | `concept_match` | `backend/src/modules/concepts/reading-registers.js` | yes | Captured live as `true`. |
| `answer.registers.canonicalBinding` | yes | `concept_match` | `backend/src/modules/concepts/reading-registers.js` | yes | Canonical identity bundle. |
| `answer.registers.canonicalBinding.conceptId` | yes | `concept_match` | `backend/src/modules/concepts/reading-registers.js` | yes | Matches the resolved concept ID. |
| `answer.registers.canonicalBinding.conceptVersion` | yes | `concept_match` | `backend/src/modules/concepts/reading-registers.js` | yes | Captured live as `1`. |
| `answer.registers.canonicalBinding.canonicalHash` | yes | `concept_match` | `backend/src/modules/concepts/reading-registers.js` | yes | Used by frontend hash display logic. |
| `answer.registers.validation` | yes | `concept_match` | `backend/src/modules/concepts/reading-registers.js`; `backend/src/lib/product-response-validator.js` | yes | Validation bundle used to expose available reading modes. |
| `answer.registers.validation.availableModes` | yes | `concept_match` | `backend/src/modules/concepts/reading-registers.js` | yes | Used by frontend to expose simplified/formal modes. |
| `answer.registers.validation.modes.standard.status` | yes | `concept_match` | `backend/src/modules/concepts/reading-registers.js` | inferred | Live capture used `available`. |
| `answer.registers.validation.modes.standard.reasons[]` | yes | `concept_match` | `backend/src/modules/concepts/reading-registers.js` | inferred | Live capture used an empty array. |
| `answer.registers.validation.modes.simplified.status` | yes | `concept_match` | `backend/src/modules/concepts/reading-registers.js` | inferred | Live capture used `available`. |
| `answer.registers.validation.modes.simplified.reasons[]` | yes | `concept_match` | `backend/src/modules/concepts/reading-registers.js` | inferred | Live capture used an empty array. |
| `answer.registers.validation.modes.formal.status` | yes | `concept_match` | `backend/src/modules/concepts/reading-registers.js` | inferred | Live capture used `available`. |
| `answer.registers.validation.modes.formal.reasons[]` | yes | `concept_match` | `backend/src/modules/concepts/reading-registers.js` | inferred | Live capture used an empty array. |
| `answer.registers.standard` | yes | `concept_match` | `backend/src/modules/concepts/reading-registers.js` | yes | Always present in the live capture. |
| `answer.registers.simplified` | conditional | `concept_match` | `backend/src/modules/concepts/reading-registers.js` | yes | Present when exposed in `availableModes`; conditional by branch/validation. |
| `answer.registers.formal` | conditional | `concept_match` | `backend/src/modules/concepts/reading-registers.js` | yes | Present when exposed in `availableModes`; conditional by branch/validation. |

---

## `answer.contexts`, `answer.sources`, `answer.relatedConcepts`

| field | always present? | response types used in | source module | frontend reliance? | notes |
| --- | --- | --- | --- | --- | --- |
| `answer.contexts[].label` | yes | `concept_match` | `backend/src/modules/concepts/resolver.js` | yes | Used for context chips. |
| `answer.contexts[].appliesTo[]` | yes | `concept_match` | `backend/src/modules/concepts/resolver.js` | yes | Used by frontend `contextUsages(...)` filtering logic. |
| `answer.sources[].id` | yes | `concept_match` | `backend/src/modules/concepts/resolver.js` | yes | Used as the source anchor in the UI. |
| `answer.sources[].label` | yes | `concept_match` | `backend/src/modules/concepts/resolver.js` | yes | Display label for each source. |
| `answer.sources[].type` | yes | `concept_match` | `backend/src/modules/concepts/resolver.js` | yes | Rendered by source type label helpers. |
| `answer.sources[].usedFor` | yes | `concept_match` | `backend/src/modules/concepts/resolver.js` | yes | Displayed as source usage text. |
| `answer.relatedConcepts[].conceptId` | yes | `concept_match` | `backend/src/modules/concepts/resolver.js` | yes | Used for related concept navigation. |
| `answer.relatedConcepts[].title` | yes | `concept_match` | `backend/src/modules/concepts/resolver.js` | yes | Displayed title for related concept links. |
| `answer.relatedConcepts[].relationType` | yes | `concept_match` | `backend/src/modules/concepts/resolver.js` | yes | Rendered as relation label. |

---

## Comparison Fields

| field | always present? | response types used in | source module | frontend reliance? | notes |
| --- | --- | --- | --- | --- | --- |
| `comparison.conceptA` | yes | `comparison` | `backend/src/modules/concepts/comparison-resolver.js`; `backend/src/modules/concepts/resolver.js` | yes | Captured live as `authority`. |
| `comparison.conceptB` | yes | `comparison` | `backend/src/modules/concepts/comparison-resolver.js`; `backend/src/modules/concepts/resolver.js` | yes | Captured live as `power`. |
| `comparison.axes[]` | yes | `comparison` | `backend/src/modules/concepts/comparison-resolver.js`; `backend/src/modules/concepts/resolver.js` | yes | Array of axis objects; each axis uses one of two shapes. |
| `comparison.axes[].axis` | yes | `comparison` | `backend/src/modules/concepts/comparison-resolver.js` | yes | Axis label used by UI helpers. |
| `comparison.axes[].A` | conditional | `comparison` | `backend/src/modules/concepts/comparison-resolver.js` | inferred | Present on pairwise axis objects only. |
| `comparison.axes[].B` | conditional | `comparison` | `backend/src/modules/concepts/comparison-resolver.js` | inferred | Present on pairwise axis objects only. |
| `comparison.axes[].statement` | conditional | `comparison` | `backend/src/modules/concepts/comparison-resolver.js` | inferred | Present on statement-style axis objects only. |

---

## Vocabulary Fields

| field | always present? | response types used in | source module | frontend reliance? | notes |
| --- | --- | --- | --- | --- | --- |
| `vocabulary.input` | yes | `VOCABULARY_DETECTED` | `backend/src/vocabulary/vocabulary-classifier.ts` | inferred | Captured live as `obligation`. |
| `vocabulary.normalizedInput` | yes | `VOCABULARY_DETECTED` | `backend/src/vocabulary/vocabulary-classifier.ts` | inferred | Captured live as `obligation`. |
| `vocabulary.matched` | yes | `VOCABULARY_DETECTED` | `backend/src/vocabulary/vocabulary-classifier.ts` | inferred | Captured live as `true`. |
| `vocabulary.term` | conditional | `VOCABULARY_DETECTED` | `backend/src/vocabulary/vocabulary-classifier.ts` | inferred | Null when unmatched; live capture used `obligation`. |
| `vocabulary.classification` | conditional | `VOCABULARY_DETECTED` | `backend/src/vocabulary/vocabulary-classifier.ts` | inferred | Null when unmatched; live capture used `legal_term`. |
| `vocabulary.relations` | conditional | `VOCABULARY_DETECTED` | `backend/src/vocabulary/vocabulary-classifier.ts`; `backend/src/vocabulary/vocabulary.constants.ts` | inferred | Null when unmatched; live capture used a populated relations object. |
| `vocabulary.relations.closestConcept` | conditional | `VOCABULARY_DETECTED` | `backend/src/vocabulary/vocabulary-classifier.ts`; `backend/src/vocabulary/vocabulary.constants.ts` | inferred | Present in the live capture. |
| `vocabulary.relations.contrastWith[]` | conditional | `VOCABULARY_DETECTED` | `backend/src/vocabulary/vocabulary-classifier.ts`; `backend/src/vocabulary/vocabulary.constants.ts` | inferred | Present in the live capture. |
| `vocabulary.relations.relatedConcepts[]` | conditional | `VOCABULARY_DETECTED` | `backend/src/vocabulary/vocabulary-classifier.ts`; `backend/src/vocabulary/vocabulary.constants.ts` | inferred | Present in the live capture. |
| `vocabulary.systemFlags.isCoreConcept / usableInResolver / reasoningAllowed` | yes | `VOCABULARY_DETECTED` | `backend/src/vocabulary/vocabulary-classifier.ts` | inferred | Live capture used all three flags as `false`. |

---

## Rejection, Suggestions, and Candidates

| field | always present? | response types used in | source module | frontend reliance? | notes |
| --- | --- | --- | --- | --- | --- |
| `rejection.status` | yes | `rejected_concept` | `backend/src/modules/concepts/rejection-registry-loader.js`; `backend/src/modules/concepts/resolver.js` | no | Captured live as `REJECTED`. |
| `rejection.decisionType` | yes | `rejected_concept` | `backend/src/modules/concepts/rejection-registry-loader.js`; `backend/src/modules/concepts/resolver.js` | no | Captured live as `STRUCTURAL_REJECTION`. |
| `rejection.finality` | yes | `rejected_concept` | `backend/src/modules/concepts/rejection-registry-loader.js`; `backend/src/modules/concepts/resolver.js` | no | Captured live as `true`. |
| `suggestions[]` | conditional | `no_exact_match` | `backend/src/modules/concepts/matcher.js`; `backend/src/modules/concepts/resolver.js` | yes | Present only on `no_exact_match`; live capture used an empty array. |
| `suggestions[].conceptId` | conditional | `no_exact_match` | `backend/src/modules/concepts/matcher.js`; `backend/src/modules/concepts/resolver.js` | yes | Present only when suggestions exist. |
| `suggestions[].title` | conditional | `no_exact_match` | `backend/src/modules/concepts/matcher.js`; `backend/src/modules/concepts/resolver.js` | yes | Display title for suggestion selection. |
| `suggestions[].reason` | conditional | `no_exact_match` | `backend/src/modules/concepts/matcher.js`; `backend/src/modules/concepts/resolver.js` | yes | Live type values are `similar_term`, `broader_topic`, `related_concept`. |
| `candidates[]` | conditional | `ambiguous_match` | `backend/src/modules/concepts/matcher.js`; `backend/src/modules/concepts/resolver.js` | yes | Current live route did not capture this branch; code-derived and runtime-fixture-backed only. |
| `candidates[].conceptId` | conditional | `ambiguous_match` | `backend/src/modules/concepts/matcher.js`; `backend/src/modules/concepts/resolver.js` | yes | Used for disambiguation selection. |
| `candidates[].title` | conditional | `ambiguous_match` | `backend/src/modules/concepts/matcher.js`; `backend/src/modules/concepts/resolver.js` | yes | Used for disambiguation selection. |
| `candidates[].shortDefinition` | conditional | `ambiguous_match` | `backend/src/modules/concepts/matcher.js`; `backend/src/modules/concepts/resolver.js` | yes | Used for disambiguation selection. |
| `candidates[].basis` | conditional | `ambiguous_match` | `backend/src/modules/concepts/matcher.js`; `backend/src/modules/concepts/resolver.js` | yes | Live capture not available; code and runtime fixtures show `shared_alias`, `normalized_overlap`, and `author_defined_disambiguation`. |

---

## Matrix Notes

- `concept_match`, `comparison`, `rejected_concept`, `VOCABULARY_DETECTED`, `no_exact_match`, `invalid_query`, and `unsupported_query_type` were captured live
- `ambiguous_match` remains not captured on the live route and is marked accordingly in the matrix
- `interpretation` is structurally inconsistent by branch
- `resolution` is missing entirely from `comparison`
- `message` is missing from `concept_match` and `comparison`
- `finalState` only appears on `VOCABULARY_DETECTED`
- `VOCABULARY_DETECTED` is the only uppercase response type
- `answer.resolutionStatus` is code-visible but not part of the validated public surface
