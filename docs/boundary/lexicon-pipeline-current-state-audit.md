# ChatPDM Legal Vocabulary Pipeline Current State Audit

Generated: 2026-04-29

## Executive Summary

The current legal vocabulary registry has **3,585 registry entries**. The boundary response currently exposes **244 entries with `meaningInLaw`** and **3,341 entries without `meaningInLaw`**.

The exact source-backed vocabulary meaning source file is:

- `backend/src/modules/legal-vocabulary/vocabulary-meaning-sources.generated.json`

It currently contains **242 source-backed terms**. That confirms the live source-backed meaning count is **242**, not just "around 242". The boundary response count is **244** because `breach` and `commitment` are packet-backed concept entries with `meaningInLaw` text but no lexicon source-provenance records.

Batch 001 through Batch 005 have draft, review, writeback-preview, and applied-report artifacts. Their reviewed eligible candidates are present in `vocabulary-meaning-sources.generated.json`.

Batch 006 is complete as a draft/review artifact set but is **not written back**. Current evidence shows Batch 006 has:

- 50 queue records scanned.
- 48 draft candidates.
- 2 skipped terms.
- 48 wording-review records already present.
- 37 approved and 11 revised in wording review.
- 0 rejected in wording review.
- 0 Batch 006 terms currently live in `vocabulary-meaning-sources.generated.json`.
- No Batch 006 writeback preview.
- No Batch 006 applied writeback report.

## Current Meaning Counts

| Metric | Count | Evidence |
| --- | ---: | --- |
| Total boundary registry entries | 3,585 | `buildVocabularyBoundaryResponse().entries.length` |
| Entries with `meaningInLaw` | 244 | Boundary response count |
| Entries without `meaningInLaw` | 3,341 | Boundary response count |
| Entries with displayed source provenance | 242 | Boundary response entries with non-empty `meaningSources` |
| Terms in `vocabulary-meaning-sources.generated.json` | 242 | Generated source JSON term keys |
| Generated source terms missing any provenance record | 0 | Every generated term has at least one source record |
| Generated source terms missing Black primary provenance | 1 | `debenture` has Osborn-only provenance |
| `meaningInLaw` entries without lexicon source provenance | 2 | `breach`, `commitment`; both are packet-backed concept entries |

Interpretation:

- The current source-backed legal vocabulary meaning count is **242**.
- The current boundary response meaning count is **244** only if packet-backed `breach` and `commitment` are included.
- If Black primary provenance is treated as mandatory for every source-backed vocabulary meaning, the current required-provenance gap is **1**: `debenture`.

## Batch State Table

The "live generated meanings" count below is the count of reviewed eligible candidates from that batch that are currently present in `vocabulary-meaning-sources.generated.json`.

| Batch | Draft artifact | Review artifact | Writeback preview | Applied report | Draft candidates | Skipped/rejected terms | Live generated meanings | Current state |
| --- | --- | --- | --- | --- | ---: | ---: | ---: | --- |
| 001 | yes | yes | yes | yes | 50 | 5 | 45 | applied |
| 002 | yes | yes | yes | yes | 50 | 5 | 45 | applied |
| 003 | yes | yes | yes | yes | 50 | 2 | 48 | applied |
| 004 | yes | yes | yes | yes | 50 | 5 | 45 | applied |
| 005 | yes | yes | yes | yes | 50 | 2 | 48 | applied |
| 006 | yes | yes | no | no | 48 | 2 | 0 | reviewed, not previewed, not applied |

Note: a raw intersection of all scanned terms with the generated source file is higher for some earlier batches because some skipped/rejected terms are now present through comparator/manual seed provenance. The table uses reviewed eligible candidates for the batch-applied count.

## Batch 006 Status

| Check | Status |
| --- | --- |
| Draft-only run complete | yes |
| Wording review has been run | yes |
| Writeback preview has been run | no |
| Writeback has been applied | no |
| Batch 006 terms currently live in generated source file | 0 |
| Runtime ontology changes detected | no |
| Concept packet changes detected | no |
| Resolver behavior changes detected | no |

Batch 006 skipped terms:

| Term | Reason |
| --- | --- |
| `provision` | Exact Black support concerns commercial funds or ecclesiastical provision, not the queued Law / Rule / Sources sense. |
| `accord_and_satisfaction` | Duplicate alias surface of `accord and satisfaction`; skipped to avoid alias fan-out. |

## Artifact Paths

| Artifact | Exists | Path |
| --- | --- | --- |
| Batch 006 drafts | yes | `/mnt/c/Users/coupy/Desktop/vocabulary-reference-lexicons/vocabulary_reference_lexicons/draft_meanings/batch_006_sixth_50_drafts.json` |
| Batch 006 draft review report | yes | `/mnt/c/Users/coupy/Desktop/vocabulary-reference-lexicons/vocabulary_reference_lexicons/draft_meanings/reports/batch_006_review.md` |
| Batch 006 skipped report | yes | `/mnt/c/Users/coupy/Desktop/vocabulary-reference-lexicons/vocabulary_reference_lexicons/draft_meanings/reports/batch_006_skipped.json` |
| Batch 006 writeback placeholder | yes | `/mnt/c/Users/coupy/Desktop/vocabulary-reference-lexicons/vocabulary_reference_lexicons/draft_meanings/batch_006_writeback_NOT_APPLIED.json` |
| Batch 006 wording review markdown | yes | `/mnt/c/Users/coupy/Desktop/vocabulary-reference-lexicons/vocabulary_reference_lexicons/draft_meanings/review/batch_006_wording_review.md` |
| Batch 006 wording review JSON | yes | `/mnt/c/Users/coupy/Desktop/vocabulary-reference-lexicons/vocabulary_reference_lexicons/draft_meanings/review/batch_006_wording_review.json` |
| Batch 006 revised drafts pre-writeback | yes | `/mnt/c/Users/coupy/Desktop/vocabulary-reference-lexicons/vocabulary_reference_lexicons/draft_meanings/review/batch_006_revised_drafts_PRE_WRITEBACK.json` |
| Batch 006 writeback preview JSON | no | `/mnt/c/Users/coupy/Desktop/vocabulary-reference-lexicons/vocabulary_reference_lexicons/draft_meanings/writeback_preview/batch_006_writeback_preview_NOT_APPLIED.json` |
| Batch 006 writeback diff preview | no | `/mnt/c/Users/coupy/Desktop/vocabulary-reference-lexicons/vocabulary_reference_lexicons/draft_meanings/writeback_preview/batch_006_writeback_diff_preview.md` |
| Batch 006 writeback validation report | no | `/mnt/c/Users/coupy/Desktop/vocabulary-reference-lexicons/vocabulary_reference_lexicons/draft_meanings/writeback_preview/batch_006_writeback_validation_report.json` |
| Batch 006 applied writeback report | no | `/mnt/c/Users/coupy/Desktop/vocabulary-reference-lexicons/vocabulary_reference_lexicons/draft_meanings/writeback_applied/batch_006_applied_writeback_report.md` |
| Batch 006 applied diff | no | `/mnt/c/Users/coupy/Desktop/vocabulary-reference-lexicons/vocabulary_reference_lexicons/draft_meanings/writeback_applied/batch_006_applied_diff.json` |

## Dirty Working Tree Summary

Tracked modified files before this audit report was added:

- `.gitignore`
- `backend/src/modules/legal-vocabulary/vocabulary-boundary.js`
- `backend/tests/vocabulary/vocabulary-boundary.test.js`
- `frontend/src/app/core/vocabulary/vocabulary-boundary.types.ts`
- `frontend/src/app/pages/vocabulary-page/vocabulary-page.component.css`
- `frontend/src/app/pages/vocabulary-page/vocabulary-page.component.html`
- `frontend/src/app/pages/vocabulary-page/vocabulary-page.component.spec.ts`
- `frontend/src/app/pages/vocabulary-page/vocabulary-page.component.ts`
- `frontend/src/app/pages/vocabulary-page/vocabulary-page.model.ts`

Untracked lexicon script reorganization files are under:

- `backend/scripts/lexicon/alignment/`
- `backend/scripts/lexicon/architecture/`
- `backend/scripts/lexicon/audit/`
- `backend/scripts/lexicon/comparator/`
- `backend/scripts/lexicon/draft/`
- `backend/scripts/lexicon/extraction/`
- `backend/scripts/lexicon/pipeline/`
- `backend/scripts/lexicon/proof/`
- `backend/scripts/lexicon/provenance/`
- `backend/scripts/lexicon/reports/`
- `backend/scripts/lexicon/review/`
- `backend/scripts/lexicon/writeback/`

Other untracked lexicon artifacts:

- `backend/src/modules/legal-vocabulary/vocabulary-meaning-sources.generated.json`
- Existing `docs/boundary/*` reports for comparator stabilization, duplicate groups, coverage, provenance, safe candidates, and display cleanup.

Display cleanup / frontend vocabulary page cleanup files:

- `backend/src/modules/legal-vocabulary/vocabulary-boundary.js`
- `backend/tests/vocabulary/vocabulary-boundary.test.js`
- `frontend/src/app/core/vocabulary/vocabulary-boundary.types.ts`
- `frontend/src/app/pages/vocabulary-page/vocabulary-page.component.css`
- `frontend/src/app/pages/vocabulary-page/vocabulary-page.component.html`
- `frontend/src/app/pages/vocabulary-page/vocabulary-page.component.spec.ts`
- `frontend/src/app/pages/vocabulary-page/vocabulary-page.component.ts`
- `frontend/src/app/pages/vocabulary-page/vocabulary-page.model.ts`

Batch 006 artifacts were created outside the repo under:

- `/mnt/c/Users/coupy/Desktop/vocabulary-reference-lexicons/vocabulary_reference_lexicons/draft_meanings/`

No modified files were detected under:

- `data/concepts/`
- `backend/src/modules/concepts/`
- `backend/scripts/verify-resolver.js`
- `backend/scripts/verify-admission-boundary.js`
- `backend/scripts/verify-blocked-concept-admission.js`
- `backend/scripts/verify-pre-admission-contract-path.js`
- `backend/scripts/verify-public-resolver-regression.js`

## Safety Confirmations

| Safety rule | Current evidence |
| --- | --- |
| No alias fan-out for Batch 006 | Confirmed by skipped `accord_and_satisfaction`; no Batch 006 writeback preview or apply artifact exists. |
| No concept packet changes | Confirmed by no diff under `data/concepts/`. |
| No runtime ontology admission changes | Confirmed by tests and no diff under concept admission/runtime modules. |
| No resolver behavior changes | Confirmed by no diff to resolver verification targets and resolver regression pass. |
| No production vocabulary dataset mutation by this audit | Confirmed; this audit only adds report files under `docs/boundary/`. |
| No Batch 006 writeback | Confirmed; no Batch 006 writeback preview/applied artifacts and 0 Batch 006 live generated meanings. |
| No silent modification of existing meaning text in this audit | Confirmed; no vocabulary data files were edited by this audit. |

## Validation Commands and Results

| Command | Result |
| --- | --- |
| `git status --short` | Completed; showed lexicon/frontend dirty tree listed above. |
| `git diff --stat` | Completed; before this report, tracked diff was 9 files, 1,326 insertions, 20 deletions. |
| `node --check backend/scripts/lexicon/draft/draft-lexicon-meaning-batch-006.js` | Pass |
| `node --test backend/tests/vocabulary/vocabulary-boundary.test.js backend/tests/vocabulary/vocabulary-boundary-anti-leak.test.js backend/tests/vocabulary/vocabulary-classification.freeze.test.js backend/tests/vocabulary/vocabulary-classifier.test.js` | Pass; 18 tests passed. |
| `node backend/scripts/verify-vocabulary-boundary-contract.js` | Pass |
| `node backend/scripts/verify-legal-vocabulary-recognition.js` | Pass |
| `node backend/scripts/verify-resolver.js` | Pass; 65 cases passed. |
| `node backend/scripts/verify-admission-boundary.js` | Pass |
| `node backend/scripts/verify-blocked-concept-admission.js` | Pass |
| `node backend/scripts/verify-pre-admission-contract-path.js` | Pass |
| `node backend/scripts/verify-public-resolver-regression.js` | Pass |
| `npm --prefix frontend run typecheck` | Pass |

Path note: the requested vocabulary tests are present under `backend/tests/vocabulary/`, so validation used the available repo paths.

## Next Recommended Step

Because Batch 006 wording review artifacts already exist, the next safe step is **not** to apply writeback. The next safe pipeline step is:

1. Human-review the existing Batch 006 wording review files:
   - `/mnt/c/Users/coupy/Desktop/vocabulary-reference-lexicons/vocabulary_reference_lexicons/draft_meanings/review/batch_006_wording_review.md`
   - `/mnt/c/Users/coupy/Desktop/vocabulary-reference-lexicons/vocabulary_reference_lexicons/draft_meanings/review/batch_006_wording_review.json`
   - `/mnt/c/Users/coupy/Desktop/vocabulary-reference-lexicons/vocabulary_reference_lexicons/draft_meanings/review/batch_006_revised_drafts_PRE_WRITEBACK.json`
2. Keep `provision` and `accord_and_satisfaction` out of writeback.
3. If the wording review is accepted, generate a **Batch 006 writeback preview only**.
4. Do not apply writeback until the preview is inspected and explicitly approved.
