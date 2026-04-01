# Concept Detail Contract

Route:

- `GET /api/v1/concepts/:conceptId`

Purpose:

- return inspectable concept metadata for a normalized concept id
- expose `governanceState` and `reviewState` as separate fields
- allow detail lookup for authored concepts and lifecycle-tracked concepts that are not yet authored

Response shape:

```json
{
  "conceptId": "law",
  "title": null,
  "shortDefinition": null,
  "coreMeaning": null,
  "fullDefinition": null,
  "governanceState": {
    "...": "validator-derived runtime metadata"
  },
  "reviewState": {
    "admission": "visible_only_derived",
    "lastValidatedAt": "2026-03-31T00:00:00Z",
    "validationSource": "manual_review"
  },
  "rejection": null
}
```

Rules:

- `governanceState` remains validator-derived runtime metadata only
- `reviewState` remains concept lifecycle/admission metadata only
- `reviewState` is loaded from `data/concepts/review-states/`
- `reviewState.admission` may include `visible_only_derived` for concepts that remain inspectable but are excluded from live runtime matching because they are fully derivable from other primitives
- `reviewState.admission` may include overlap-scan lifecycle states such as `pending_overlap_scan`, `overlap_scan_passed`, `overlap_scan_failed_conflict`, `overlap_scan_failed_duplicate`, `overlap_scan_failed_compression`, and `overlap_scan_boundary_required`
- `reviewState` must be `null` when no review-state artifact exists
- `rejection` must be `null` unless the concept appears in `data/concepts/rejections/`
- authored fields may be `null` when the concept has lifecycle evidence but no authored concept packet yet

Derived concept rule:

- a concept that can be fully computed from admitted primitives must remain detail-backed and visible-only rather than live
- `violation` is the canonical v1 example: inspectable in detail, excluded from runtime primitive matching
