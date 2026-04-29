# Lexicon Pipeline Controller Report

Status: REPORT_ONLY. No vocabulary meanings, runtime ontology, concept packets, live concept meanings, or writeback state were modified.

## Controller Answer

- Current completed batch count: 5
- Recommended next batch: batch_006
- Recommended next batch size: 50
- Escalation allowed: false
- Escalation reason: Batch 006 remains at 50; batch 007 may increase to 100 only if both batch 005 and batch 006 are clean.
- Active source lanes: black_1891_a, black_1891_b, black_1891_c, black_1891_d-e, black_1891_f-h, black_1891_i-j, black_1891_k-m, black_1891_n-o, black_1891_p-q, black_1891_r-s, black_1891_t-z, blacks_1910
- Recommended next source proof: stroud_1903
- Next batch should wait for another source: false
- Writeback/provenance safe to continue: true

## Batch Statuses

| Batch | Status | Drafts | Skipped | Skip rate | Revised | Revision rate | Hard gates | Quality gates |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| batch_001 | clean | 50 | 5 | 10% | 7 | 14% | true | true |
| batch_002 | clean | 50 | 5 | 10% | 11 | 22% | true | true |
| batch_003 | quality_gate_hold | 50 | 2 | 4% | 16 | 32% | true | false |
| batch_004 | clean | 50 | 5 | 10% | 7 | 14% | true | true |
| batch_005 | clean | 50 | 2 | 4% | 6 | 12% | true | true |

## Source Lanes

Current authoring lane: Black primary lane with Anderson, Osborn exact-term comparator context where available

### Usable Comparator Lanes

| Source | Readiness | Quality tier | Full extraction ready | Use |
| --- | --- | --- | --- | --- |
| anderson_1889 | ready_for_direct_text | provisional | true | exact-term comparator support |
| osborn_1927 | ready_for_direct_text | provisional | true | exact-term comparator support |
| stroud_1903 | ready_for_direct_text | provisional | false | proof/full-extraction required before authoring use |

### OCR-Blocked Lanes

| Source | Title | Year | Pages |
| --- | --- | --- | --- |
| ballentine_1916 | Ballentine's Law Dictionary | 1916 | 646 |
| bouvier_1839_v1 | Bouvier's Law Dictionary | 1839 | 573 |
| bouvier_1839_v2 | Bouvier's Law Dictionary | 1839 | 639 |
| burrill_1860 | A Law Dictionary and Glossary | 1860 | 1404 |

## Source Decision Notes

- Continue Black + Anderson + Osborn while hard and quality gates remain clean.
- Do not block the next batch on unused sources.
- Proof another source only in parallel.
- Do not promote a new source into authoring until bounded proof, full extraction, and alignment pass are complete.
- OCR sources remain blocked until OCR tooling is installed and validated.
- Extra sources are exact-term support only for wrong-sense correction or historically narrow terms.

## Hard Gates

- allCompletedBatchesHardGatePassed: true
- latestBatchHardGatePassed: true
- provenanceCoverage: 100
- provenanceCoverageComplete: true

## Quality Gates

- allCompletedBatchesQualityGatePassed: false
- latestBatchQualityGatePassed: true
- latestBatchSkipRate: 4
- latestBatchRevisionRate: 12
- latestBatchFailureRate: 0

## Exact Next Prompt

Task: Prepare batch 006 draft-only meaning candidates using the current Black lane plus Anderson and Osborn comparator context where available, with a target batch size of 50. Do not modify the live vocabulary dataset, runtime ontology, concept packets, or existing meaning text; preserve exact-term provenance only and keep this as draft-only preparation. Deliver batch_006_sixth_50_drafts.json, batch_006_review.md, batch_006_skipped.json, and batch_006_writeback_NOT_APPLIED.json.
