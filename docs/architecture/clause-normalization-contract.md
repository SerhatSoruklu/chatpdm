# Clause Normalization Contract

This contract defines the offline bridge between source text and reviewed clause artifacts for the Military Constraints Compiler.

It is not a runtime contract.
It does not permit direct source-to-bundle compilation.
It does not allow prose interpretation at execution time.

## Scope

Normalization is the controlled transformation from preserved source text into a reviewed clause artifact.

The clause artifact must retain:

- source identity
- source locator
- raw source text
- reviewed normalized text
- jurisdiction
- layer
- clause type
- ambiguity state
- review state
- review notes

## Allowed normalization

Normalization may only perform bounded, reviewable edits that do not change meaning:

- whitespace normalization
- line-break normalization
- quotation normalization
- section-label normalization
- stable punctuation cleanup where meaning is unchanged
- explicit citation trimming when the preserved locator remains intact

Normalization may not:

- paraphrase substantive meaning
- infer missing legal content
- infer authority
- infer proportionality
- infer hostile act or hostile intent
- merge multiple sources into one clause unless the merge is explicitly reviewed and documented
- rewrite provenance fields
- change `sourceId` or `locator`
- promote example material into normative material by default
- mark example-only material normative unless an explicit override is reviewed and recorded

## Classification rules

### Legal floor

Use `LEGAL_FLOOR` when the clause expresses a non-overridable baseline such as:

- direct attack prohibitions on protected persons or objects
- military objective constraints
- precaution requirements
- protected-status restrictions

### Policy overlay

Use `POLICY_OVERLAY` when the clause expresses mission-specific control such as:

- delegated authority
- reserved authority
- force authorizations
- caveats
- theater or operation-specific restrictions

### Example-only quarantine

Use `EXAMPLE_ONLY` when the clause originates from a quarantined example source.

Example-only clauses do not become compilation-ready unless a separate review action explicitly reclassifies them.
If an example-only source is intentionally promoted to normative status, the review record must include an explicit override decision and justification.

## Hard prohibitions

Normalization must never:

- create a new normative rule from a descriptive passage
- turn an example into law by implication
- collapse multiple sources into a single synthetic rule
- hide unresolved ambiguity
- erase source provenance
- make a clause compilation-ready while ambiguity remains open or unresolved

## Ambiguity handling

Unresolved ambiguity blocks compilation downstream.

If a clause is:

- `AMBIGUOUS`
- `OPEN`
- `UNRESOLVED`

then it must not be marked `COMPILATION_READY`.

The review result must remain explicitly non-compilable until the ambiguity is resolved or the clause is quarantined.

## Downstream rule

Only reviewed clauses with:

- bounded provenance
- correct layer classification
- explicit clause type
- clear ambiguity state
- explicit review approval

may enter later bundle compilation work.

Reviewed clause artifacts are the only admissible bridge between source text and compiled rule construction.
