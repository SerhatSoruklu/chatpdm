# Boundary Meaning Coverage Audit

Scope: recognized legal vocabulary boundary registry only. This report does not admit terms into runtime ontology and does not author new meanings.

## Implemented / Partial / Missing / Not Evidenced

- Implemented: 244 entries have a non-empty backend `meaningInLaw` value.
- Partial: 0 authored entries were flagged as weak or generic.
- Missing: 3341 entries do not have authored backend `meaningInLaw`.
- Not evidenced: no external legal-source validation was performed in this audit; findings are based on repository data and deterministic heuristics only.

## Exact Counts

- Total recognized legal vocabulary terms: 3585
- Terms with authored "Meaning in law": 244
- Terms without authored meaning: 3341
- Published concept packets reported by boundary surface: 10
- Current runtime boundary reported by boundary surface: 6
- Registry dataset path: `data/legal-vocabulary/legal-vocabulary-dataset.txt`

## Counts By Bucket

| Bucket | Total | Authored meaning | Missing meaning | Weak authored |
| --- | --- | --- | --- | --- |
| carrier | 240 | 105 | 135 | 0 |
| derived | 610 | 67 | 543 | 0 |
| procedural | 179 | 70 | 109 | 0 |
| rejected_candidate | 5 | 0 | 5 | 0 |
| unknown_structure | 2551 | 2 | 2549 | 0 |

## Counts By Family

| Family | Total | Authored meaning | Missing meaning |
| --- | --- | --- | --- |
| Meta / Stress / Edge Terms | 2517 | 2 | 2515 |
| Property / Title / Possession | 83 | 39 | 44 |
| Contract / Agreement / Consensus | 77 | 5 | 72 |
| Law / Rule / Sources | 77 | 8 | 69 |
| Criminal / Public Order | 67 | 4 | 63 |
| Procedure / Adjudication | 67 | 35 | 32 |
| Duty / Obligation / Constraint | 64 | 4 | 60 |
| Responsibility / Attribution / Liability | 61 | 1 | 60 |
| Power / Force / Control | 61 | 3 | 58 |
| Remedies / Responses / Outcomes | 60 | 24 | 36 |
| Authority / Validity / Institutional Status | 56 | 1 | 55 |
| Labor / Organizational / Associational | 54 | 15 | 39 |
| Commerce / Finance / Allocation | 53 | 25 | 28 |
| Evidence / Proof / Epistemic | 53 | 11 | 42 |
| Defences / Justifications / Excuses | 52 | 12 | 40 |
| Status / Person / Relation | 50 | 26 | 24 |
| Constitutional / Political | 50 | 9 | 41 |
| Failure / Breach / Noncompliance | 48 | 20 | 28 |
| Core / Governance | 35 | 0 | 35 |

## Duplicate / Canonicalization Audit

- Likely alias groups: 1278
- Terms inside likely alias groups: 2556
- Exact duplicate authored meaning groups: 2
- Raw duplicate display-name groups: 419
- Generated surface collision groups: 594

Likely aliases are mostly spaced/underscored variants created by recognition-surface expansion. They should be canonicalized before large-scale authoring so one meaning can govern aliases without duplicated prose.

## Placeholder / Weak Content Audit

- Missing: 3341
- Empty: 0
- Placeholder: 0
- Generic authored: 0
- Too short authored: 0

## Structural-Risk Audit

- High risk queue: 2691
- Risk counts: high 2691, medium 660, low 234

High risk here means "manual review before batch meaning authoring"; it is not a claim that a term should become a runtime concept.

## Top 10 Safest Families / Groups

| Rank | Family | Bucket | Low-risk missing | Medium-risk missing | High-risk missing | Alias terms |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Procedure / Adjudication | procedural | 12 | 20 | 0 | 24 |
| 2 | Commerce / Finance / Allocation | carrier | 13 | 10 | 5 | 14 |
| 3 | Remedies / Responses / Outcomes | procedural | 9 | 24 | 3 | 26 |
| 4 | Status / Person / Relation | carrier | 6 | 16 | 2 | 18 |
| 5 | Property / Title / Possession | carrier | 12 | 24 | 8 | 34 |
| 6 | Labor / Organizational / Associational | carrier | 7 | 26 | 6 | 32 |
| 7 | Failure / Breach / Noncompliance | derived | 0 | 26 | 2 | 12 |
| 8 | Defences / Justifications / Excuses | derived | 0 | 39 | 1 | 34 |
| 9 | Constitutional / Political | derived | 0 | 39 | 2 | 32 |
| 10 | Evidence / Proof / Epistemic | procedural | 6 | 16 | 20 | 36 |

## Recommendation

- Safest first batch: start with the highest-ranked procedural/carrier families from `safe-batch-candidates.json`, skipping alias duplicates until canonical-display policy is set.
- The top 10 table includes lower-risk procedural/carrier families first, then the least risky derived families as cautious follow-on groups.
- Recommended first batch size: 100 terms.
- Use 100-term batches for low-risk procedural/carrier rows, 50-term batches for derived rows, and 25-term review queues for unknown-structure or rejected-candidate rows.
- Blockers before scale authoring: canonicalize spaced/underscored aliases, decide whether packet-backed rows should inherit packet wording or receive registry-specific wording, and keep every output explicitly registry-only.

## Generated Artifacts

- `docs/boundary/meaning-coverage-summary.md`
- `docs/boundary/meaning-coverage-audit.json`
- `docs/boundary/duplicate-term-groups.json`
- `docs/boundary/high-risk-meaning-queue.json`
- `docs/boundary/safe-batch-candidates.json`
