# Batch 007 Expanded Preflight Report

Final preflight recommendation: blocked_with_reasons

## Queue Range

- Proposed range: 301-500
- Proposed batch size: 200
- Available range: 301-330
- Available scanned terms: 30

## Blocked Reasons

- Approval queue has only 30 records after Batch 006, but expanded Batch 007 requires 200 scanned terms (positions 301-500).

## Slice Ranges

| Slice | Start | End | Available terms |
| --- | --- | --- | --- |
| 007A | 301 | 350 | 30 |
| 007B | 351 | 400 | 0 |
| 007C | 401 | 450 | 0 |
| 007D | 451 | 500 | 0 |

## Summary

| Metric | Count |
| --- | --- |
| termsAlreadyHavingMeaningInLaw | 0 |
| termsAlreadyPresentInGeneratedSource | 0 |
| upfrontSkippedTerms | 2 |
| aliasOrDuplicateSurfaceRisks | 2 |
| blackPrimaryAvailable | 30 |
| blackPrimaryMissing | 0 |
| andersonAvailable | 19 |
| osbornAvailable | 12 |
| whartonAvailable | 1 |
| stroudAvailable | 15 |
| v3ScopeWarningCandidates | 7 |
| historicallyNarrowCandidates | 7 |
| broadOrdinaryWordRiskCandidates | 0 |
| likelyNoBlackProvenanceSkips | 0 |

## Candidate Terms by Slice

### 007A

| Queue # | Term | Black refs | Anderson | Osborn | Wharton | Stroud | Disposition |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 301 | expulsion | 2 | 0 | 0 | 0 | 0 | draft_only_candidate |
| 302 | felony | 2 | 4 | 4 | 0 | 2 | draft_only_with_scope_review |
| 303 | guarantee | 2 | 8 | 1 | 0 | 1 | draft_only_candidate |
| 304 | guarantor | 2 | 2 | 1 | 0 | 0 | draft_only_candidate |
| 305 | immunity | 2 | 0 | 0 | 0 | 0 | draft_only_candidate |
| 306 | impossibility | 2 | 1 | 1 | 0 | 0 | draft_only_candidate |
| 307 | independence | 2 | 1 | 0 | 0 | 0 | draft_only_candidate |
| 308 | inducement | 2 | 2 | 0 | 0 | 0 | draft_only_candidate |
| 309 | inherent power | 2 | 0 | 0 | 0 | 0 | skip_before_draft |
| 310 | inherent_power | 2 | 0 | 0 | 0 | 0 | skip_before_draft |
| 311 | instigation | 2 | 0 | 0 | 0 | 1 | draft_only_candidate |
| 312 | intent | 2 | 2 | 0 | 0 | 1 | draft_only_with_scope_review |
| 313 | legality | 2 | 1 | 0 | 0 | 1 | draft_only_candidate |
| 314 | mandate | 2 | 1 | 1 | 0 | 0 | draft_only_candidate |
| 315 | maxim | 2 | 2 | 0 | 0 | 0 | draft_only_candidate |
| 316 | misdemeanor | 2 | 0 | 0 | 0 | 1 | draft_only_with_scope_review |
| 317 | novation | 2 | 1 | 1 | 0 | 1 | draft_only_candidate |
| 318 | obscenity | 2 | 0 | 0 | 0 | 0 | draft_only_candidate |
| 319 | offer | 2 | 2 | 1 | 0 | 1 | draft_only_candidate |
| 320 | oppression | 2 | 1 | 1 | 0 | 1 | draft_only_candidate |
| 321 | option | 2 | 4 | 1 | 1 | 1 | draft_only_with_scope_review |
| 322 | parole | 2 | 0 | 0 | 0 | 0 | draft_only_with_scope_review |
| 323 | regulation | 2 | 1 | 0 | 0 | 1 | draft_only_candidate |
| 324 | residence | 2 | 0 | 1 | 0 | 0 | draft_only_candidate |
| 325 | retaliation | 2 | 1 | 0 | 0 | 0 | draft_only_with_scope_review |
| 326 | search | 2 | 3 | 1 | 0 | 1 | draft_only_with_scope_review |
| 327 | stipulation | 2 | 1 | 0 | 0 | 1 | draft_only_candidate |
| 328 | suretyship | 2 | 0 | 0 | 0 | 0 | draft_only_candidate |
| 329 | tribunal | 2 | 0 | 0 | 0 | 1 | draft_only_candidate |
| 330 | waiver | 2 | 1 | 1 | 0 | 1 | draft_only_candidate |

### 007B

No available queue records for this slice.

### 007C

No available queue records for this slice.

### 007D

No available queue records for this slice.

## Source Rules

- Require exact Black primary provenance.
- Use Anderson and Osborn as normal comparator context.
- Use Wharton and Stroud as v3 assistive comparator context only if exact normalized match exists.
- Do not use Bouvier, Burrill, or Ballentine.
- If no Black primary provenance, skip.
- If alias/underscore/duplicate surface, skip unless an explicit alias policy exists. No alias policy exists currently.
- If source conflict exists, mark review_needed or skip.
- If historically narrow, jurisdiction-specific, field-specific, or obsolete, draft only with explicit scope.
- If broad ordinary-word meaning is unsafe, skip.
- Do not force 200 accepted meanings; this is 200 scanned, refusal-first.

## OCR-Blocked Source Exclusion

- Bouvier, Burrill, and Ballentine are excluded from Batch 007 preflight assist because they are OCR-blocked.
