# ChatPDM Query Normalization and Matching Rules

## 1. Purpose

ChatPDM preserves the raw query, but it does not use the raw query as the canonical resolution key.

That separation exists for three reasons:

- the raw query is needed for auditability and response echo
- the resolution layer needs a stable key that is not sensitive to casing, surrounding whitespace, or a small closed list of filler phrases
- silent drift in normalization or matching can break determinism even when the visible query appears unchanged

`normalizedQuery` exists so the system can resolve authored concepts against one inspectable, deterministic key.

This layer must be versioned because it is one of the main risk surfaces for hidden non-determinism. A small change in trimming, filler stripping, or matching precedence can change product outcomes without changing the visible interface.

“Same input, same output” is too vague for ChatPDM.

The real guarantee is:

- same raw query + same `normalizerVersion` -> same `normalizedQuery`
- same `normalizedQuery` + same `matcherVersion` + same `conceptSetVersion` + same `contractVersion` -> same product outcome and same canonical answer payload

## 2. Scope of v1

ChatPDM v1 includes:

- lowercasing
- trimming
- whitespace collapse
- closed-list leading filler phrase stripping
- canonical_id lookup
- exact alias matching
- normalized alias matching
- authored ambiguity handling
- authored no-match suggestions
- deterministic `no_exact_match` behavior

ChatPDM v1 excludes:

- LLM rewriting
- embeddings
- semantic search
- fuzzy guessing
- hidden paraphrasing
- runtime synonym generation
- broad inference
- chatbot-style best-effort interpretation

## 3. Normalization Rules

The v1 normalizer is a strict ordered pipeline. The order is part of the system definition.

### Required order

1. Preserve the raw query verbatim for the response `query` field.
2. Trim leading and trailing whitespace.
3. Convert the full string to lowercase.
4. Collapse all internal whitespace runs to a single space.
5. Strip one leading filler phrase only, if present, using exact prefix match against this closed list:
   - <code>what is</code>
   - <code>define</code>
   - <code>explain</code>
   - <code>tell me</code>
   - <code>can you</code>
6. Trim again after filler stripping.
7. The final result is `normalizedQuery`.

Punctuation is preserved in Phase 0. Normalization standardizes surface form, but it does not delete non-word characters in order to force an exact concept key.

### Normalization rules

- No regex-based interpretation beyond these exact operations unless explicitly documented in a later version.
- No stemming.
- No transliteration.
- No accent folding.
- No synonym replacement.
- No punctuation deletion.
- Non-ASCII characters are preserved as-is in v1.
- Any change to this pipeline or the filler phrase list requires a `normalizerVersion` bump.

### Special case: empty-after-normalization

If step 8 would produce the empty string, v1 must replace the result with the reserved normalized value `__empty__`.

That reserved value is deterministic normalizer output for the empty-after-normalization case.

Rules for `__empty__`:

- it must short-circuit matching
- no canonical_id lookup or alias lookup is attempted after `__empty__` is produced
- the outcome must be `no_exact_match`
- suggestions must be `[]`
- changing this reserved value or this behavior requires a `normalizerVersion` bump

## 4. Matching Rules

Matching uses strict precedence. Later stages must not override earlier successful stages.

### Required precedence

1. canonical_id lookup when raw `query` starts with the exact prefix `concept:`
2. exact alias match on `normalizedQuery` against the authored alias table in the current `conceptSetVersion`
3. normalized alias match on `normalizedQuery` against the authored normalized alias table in the current `conceptSetVersion`
4. authored explicit disambiguation rules
5. authored deterministic suggestion lookup
6. `no_exact_match`

### Matching rules

- No probabilistic ranking.
- No fuzzy matching.
- No hidden semantic interpretation.
- Alias tables and disambiguation rules belong to the current `conceptSetVersion`.
- The matcher must stop as soon as one stage produces a valid final product outcome.

### Canonical ID lookup

Canonical ID lookup is deliberately strict.

Canonical ID detection and resolution use the raw-query path only. `normalizedQuery` is still produced for contract consistency, logging, and debugging, but it does not participate in the canonical_id decision in this branch.

In v1, canonical_id lookup is a directed query mode, not a general search entry point. Failed canonical_id lookup does not fall through by design.

Rules:

- it uses the raw `query`, not `normalizedQuery`
- the query must start with the exact prefix `concept:`
- no leading whitespace is tolerated for canonical_id detection
- the substring after `concept:` is treated as the requested `conceptId`

If the requested canonical id does not exist:

- the matcher must stop immediately
- it must return `no_exact_match`
- it must not fall through to alias matching
- suggestions must be `[]` unless there is an authored explicit suggestion rule for the exact resulting `normalizedQuery`

If the substring after `concept:` is empty:

- the matcher must return `no_exact_match`
- suggestions must be `[]`

### Exact alias match

Exact alias match compares `normalizedQuery` to the primary authored alias table inside the current `conceptSetVersion`.

This stage exists for published alias entries that are already stored in final lookup form and can resolve directly without any secondary normalization mapping.

If exactly one canonical concept matches, the product outcome is `concept_match`.

If more than one concept matches, ambiguity rules apply.

### Normalized alias match

Normalized alias match compares `normalizedQuery` to the published normalized alias table in the current `conceptSetVersion`.

This stage exists because some published inputs need to resolve through a separately authored normalized alias table rather than the primary alias table.

The normalized alias table is still authored and inspectable. It is not semantic search, fuzzy matching, or hidden semantic interpretation.

If exactly one canonical concept matches, the product outcome is `concept_match`.

If more than one concept matches, ambiguity rules apply.

## 5. Ambiguity Rules

`ambiguous_match` is a valid product outcome in ChatPDM v1.

Ambiguity exists when a single `normalizedQuery` maps to more than one plausible canonical concept and no authored rule resolves that ambiguity to one concept.

In v1, ambiguity is triggered when:

- multiple canonical concepts share the same exact alias
- multiple canonical concepts share the same normalized alias
- an authored disambiguation set explicitly lists more than one candidate for the query

Authored disambiguation rules may resolve ambiguity only when they map the current `normalizedQuery` to exactly one canonical concept in the current `conceptSetVersion`.

The backend must stop and return `ambiguous_match` when:

- multiple candidates remain after alias matching
- no authored single-concept disambiguation rule exists
- an authored disambiguation rule intentionally exposes multiple candidates

The backend must not “pick the best one” unless an authored rule explicitly authorizes one final concept.

Candidate order is deterministic and contract-significant.

Order rule for v1:

- if an authored disambiguation rule provides an explicit candidate order, use that order
- otherwise use the stable published candidate order from the current `conceptSetVersion`

### Ambiguous term rule

If a key term admits multiple valid interpretations and no definition has been fixed, the system must not classify as though one interpretation were already settled.

Rule:

- if a key term admits multiple valid interpretations
- and no explicit definition or scope has been fixed
- then the system must either:
  - request clarification
  - or explicitly declare the interpretation chosen before classification

Internal analytical label:

- `Definition Scope Ambiguity` = a condition where a key term has multiple valid interpretations and no explicit scope has been fixed prior to classification

## 6. No-Exact-Match Rules

`no_exact_match` is the honest product outcome when no canonical concept is resolved.

It must be returned when:

- `normalizedQuery` does not resolve through canonical_id, exact alias, normalized alias, or authored disambiguation
- canonical_id lookup was explicitly attempted and failed
- normalization produced `__empty__`

The system must not fabricate an answer in this state.

`no_exact_match` must preserve the contract shape already defined in the response contract. Suggestions may be empty. No fallback paragraph is allowed.

## 7. Suggestions Policy

Suggestions are strict in v1.

Rules:

- suggestions come from authored mappings only
- no rule-generated semantic neighbors
- no dynamic search behavior
- no probabilistic ranking
- no runtime synonym expansion
- maximum suggestion count is 5
- suggestions may be `[]`

Ordering rule:

- suggestion ordering must be stable and authored or rule-declared
- ordering must never be probabilistic

Suggestions must be omitted entirely, meaning `[]`, when:

- no authored suggestion mapping exists for the final `normalizedQuery`
- normalization produced `__empty__`
- canonical_id lookup failed and no authored explicit mapping exists for that normalized form

## 8. Deterministic Ordering Rule

Ordering is contract-significant.

This applies at minimum to:

- `concept_match.answer.contexts`
- `concept_match.answer.sources`
- `concept_match.answer.relatedConcepts`
- `ambiguous_match.candidates`
- `no_exact_match.suggestions`

Ordering is part of both equality and rendering consistency.

Reordering without:

- the correct version bump
- updated fixtures

is a regression.

## 9. Versioning Implications

| Version field | Bump when |
| --- | --- |
| `normalizerVersion` | any change affecting `normalizedQuery` output, including filler stripping, punctuation preservation, empty-after-normalization behavior, or reserved sentinel behavior |
| `matcherVersion` | any change affecting precedence, resolution behavior, ambiguity handling, suggestion behavior, or deterministic ordering |
| `conceptSetVersion` | any change to published concepts, aliases, contexts, sources, related concepts, or authored disambiguation/suggestion mappings |
| `contractVersion` | any change to response shape or field semantics |

This document must stay aligned with the existing version bump policy. If they diverge, that is a product bug.

## 10. Examples

See:

- [normalized-query-examples.md](/home/serhat/code/chatpdm/docs/architecture/examples/normalized-query-examples.md)

## 11. Non-Goals

This layer does not:

- emulate human interpretation
- maximize recall
- guess beyond authored boundaries
- behave like a chatbot
- optimize for helpfulness over correctness

## 12. Implementation Guidance for Future Developers

- implement the normalizer as a deterministic ordered pipeline
- keep every rule inspectable and documented
- log `normalizedQuery` together with `normalizerVersion`, `matcherVersion`, and `conceptSetVersion` for debugging
- do not introduce hidden heuristics
- test runtime behavior against golden fixtures once runtime exists
- do not change normalization or matching rules casually without version bumps
