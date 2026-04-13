# Clause Review Checklist

Use this checklist when reviewing a source-derived clause before any compilation step.

## Source integrity

- Is the `sourceId` present and registered?
- Is the `locator` precise enough to recover the original text?
- Is the raw source text preserved verbatim?
- Is the source role correct?
- Is the source quarantined if it is example-only or methodological?

## Jurisdiction and layer

- Is the jurisdiction explicit?
- Is the clause classified as `LEGAL_FLOOR`, `POLICY_OVERLAY`, or `EXAMPLE_ONLY`?
- Does the layer match the source role and source registry admissibility?
- Has an example-only source been prevented from becoming normative by default?

## Clause shape

- Is the clause type explicit?
- Is the normalized text bounded and reviewable?
- Did normalization avoid paraphrase drift?
- Did normalization preserve the source reference without mutation?
- Is the clause a single coherent unit rather than a fused multi-source synthesis?

## Ambiguity

- Is ambiguity status explicit?
- Is ambiguity still open or unresolved?
- If ambiguity remains, is the clause blocked from compilation readiness?

## Review status

- Is review status explicit?
- Is the clause marked `COMPILATION_READY` only when it is clear and bounded?
- Is `machineCandidate` true only when the clause is clear and approved?
- Are review notes present and specific?

## Classification discipline

- Does the clause belong in the legal floor?
- Does the clause belong in policy overlay?
- Is the clause quarantined as example-only?
- Has any classification jump been explicitly justified?
- If example-only material was promoted, is the override explicit and reviewable?

## Compilation gate

- Is the clause admissible for downstream compilation?
- Are there any unresolved conflicts or ambiguities?
- Has the review left an audit trail that can be reconstructed later?

## Hard stop conditions

Reject the clause from downstream compilation if any of the following are true:

- source provenance is missing
- jurisdiction is implied instead of explicit
- `sourceId` or `locator` changed during review
- raw text was not preserved
- normalized text expands meaning
- ambiguity is unresolved
- example-only material is treated as normative without explicit reclassification
- example-only material is treated as normative without an explicit override record
- review status is `COMPILATION_READY` while ambiguity is open or unresolved
- clause type or layer is not defensible from the source text and review record
