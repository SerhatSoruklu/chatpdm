# Normalization Transform Admission Gate

Area: normalization boundary policy.

## Required evidence before any new transform is admitted

- [ ] A current miss exists in real traces, or labeled surrogate evidence is archived.
- [ ] Regression fixtures are added first.
- [ ] A deterministic behavior review is complete.
- [ ] A bounded cost review is complete.
- [ ] An ambiguity risk review is complete.
- [ ] An explicit spec revision exists before implementation begins.

## Admission rules

- [ ] Do not change transform order without a spec revision.
- [ ] Do not change normalization semantics without a spec revision.
- [ ] Do not add heuristic fallback, best-match selection, or branch search.
- [ ] Do not widen the public resolver schema as part of transform admission.

## Evidence labeling

- [ ] `live` means observed traffic, captured traces, or operational metrics.
- [ ] `surrogate` means replayed fixtures or captured artifacts used as substitute evidence.
- [ ] Structural review must use refusal code, transform path, depth, size bucket, and raw fingerprint hash.
