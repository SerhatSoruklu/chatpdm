# Approval Queue v2 Summary

Approval Queue v2 is queue-only. It does not write meanings, create drafts, create writeback previews, alter runtime ontology, alter concept packets, alter resolver behavior, or add aliases.

Black remains mandatory primary provenance. Anderson and Osborn are comparator context. Wharton and Stroud are Comparator v3 assistive-only sources. Bouvier, Burrill, and Ballentine were not used because they are OCR-blocked.

## Counts

| Metric | Count |
| --- | --- |
| Total registry entries considered | 3585 |
| Existing meanings excluded | 293 |
| Batch 007 pending excluded | 30 |
| Eligible future candidates | 301 |
| Review-risk candidates | 96 |
| Ranked candidate count | 397 |
| Skipped/blocked count | 3188 |
| Wharton v3 supported candidates | 4 |
| Stroud v3 supported candidates | 236 |

## Eligibility Counts

| Decision | Count |
| --- | --- |
| eligible_for_future_batch | 301 |
| review_risk | 96 |
| skip_alias_surface | 1273 |
| skip_batch_007_pending | 30 |
| skip_duplicate_alias_group | 1273 |
| skip_existing_meaning | 293 |
| skip_no_black_primary | 319 |

## Proposed Batch Plan

| Batch | Candidates | Queue v2 range |
| --- | --- | --- |
| batch_008 | 200 | 1-200 |
| batch_009 | 197 | 201-397 |
| batch_010 | 0 | none |
| batch_011 | 0 | none |
| batch_012 | 0 | none |

## Safety

- Queue v2 ranks candidates only.
- No Batch 008 draft artifacts were created.
- No writeback preview was created.
- No writeback was applied.
- OCR-blocked v3 sources were excluded.
- Wharton and Stroud cannot originate meanings or override Black.
