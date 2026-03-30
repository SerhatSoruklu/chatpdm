# Legal Argument Validator v1 Acceptance Matrix

## Purpose

This matrix defines deterministic acceptance expectations for the v1 kernel laws.

Each case specifies:

- input pattern
- expected result
- expected failure code
- reason

This is not runtime execution.

This is law-layer validation of system behavior.

Only cases that pass this matrix should be promoted into implementation.

## Section 1: Authority Identification

### Case 1.1

Input pattern:

- `This should apply because it is fair.`

Expected result:

- `INVALID`

Failure code:

- `NO_SOURCE_AUTHORITY`

Reason:

- No source-identifiable authority is provided.

### Case 1.2

Input pattern:

- `Legal principles require this outcome.`

Expected result:

- `UNRESOLVED`

Failure code:

- `AUTHORITY_NOT_IDENTIFIABLE`

Reason:

- A source is implied but cannot be identified through doctrine-defined criteria.

### Case 1.3

Input pattern:

- `The statute says X, but fairness requires Y instead.`

Expected result:

- `INVALID`

Failure code:

- `SOURCE_OVERRIDE_ATTEMPT`

Reason:

- An identified authority is overridden by extra-source moral reasoning.

### Case 1.4

Input pattern:

- `A blog post establishes this rule.`

Expected result:

- `INVALID`

Failure code:

- `UNRECOGNIZED_SOURCE_INSTITUTION`

Reason:

- The claimed source does not belong to a recognized authority class.

### Case 1.5

Input pattern:

- `A US regulation applies to a UK employment dispute.`

Expected result:

- `INVALID`

Failure code:

- `AUTHORITY_SCOPE_VIOLATION`

Reason:

- The cited authority falls outside the jurisdiction, temporal, or doctrine scope of the matter.

### Case 1.6

Input pattern:

- `A once-valid regulation is cited even though it was superseded before the evaluation period.`

Expected result:

- `INVALID`

Failure code:

- `SUPERSEDED_AUTHORITY`

Reason:

- The cited authority can be identified, but it is no longer operative for the relevant evaluation period.

## Section 2: Rule Definition

### Case 2.1

Input pattern:

- `From similar cases, we can derive this rule.`

Expected result:

- `INVALID`

Failure code:

- `RULE_NOT_DEFINED`

Reason:

- The claim depends on a rule that is not explicitly authored in the active doctrine artifact.

### Case 2.2

Input pattern:

- `This case is similar to negligence.`

Expected result:

- `UNRESOLVED`

Failure code:

- `PRECEDENT_NOT_STRUCTURED`

Reason:

- Similarity is asserted, but the doctrine artifact does not encode the analogy bridge or similarity rule needed to make the move deterministic.

### Case 2.3

Input pattern:

- `This fits negligence even though it is outside the definition.`

Expected result:

- `INVALID`

Failure code:

- `CATEGORY_BOUNDARY_NOT_AUTHORED`

Reason:

- The claim tries to stretch a concept beyond its authored identity boundary.

### Case 2.4

Input pattern:

- `A court decided this before, so it applies here.`

Expected result:

- `UNRESOLVED`

Failure code:

- `ANALOGY_RULE_NOT_ENCODED`

Reason:

- A precedent source may exist, but the doctrine package has not yet encoded the precedent rule in a deterministic structured form.

### Case 2.5

Input pattern:

- `This falls somewhere between contract and tort.`

Expected result:

- `UNRESOLVED`

Failure code:

- `AMBIGUOUS_CONCEPT_MAPPING`

Reason:

- Multiple plausible concept mappings remain live without deterministic resolution.

## Section 3: Interpretation

### Case 3.1

Input pattern:

- `The statute should be interpreted broadly.`

Expected result:

- `UNRESOLVED`

Failure code:

- `INTERPRETATION_RULE_UNSPECIFIED`

Reason:

- No interpretation regime is defined for the relevant source path.

### Case 3.2

Input pattern:

- `The term "reasonable" applies here.`

Expected result:

- `UNRESOLVED`

Failure code:

- `INSUFFICIENT_DOCTRINE`

Reason:

- A doctrine regime exists, but it lacks deterministic resolution rules for the ambiguity at issue.

### Case 3.3

Input pattern:

- `This text implies a broader obligation not stated.`

Expected result:

- `INVALID`

Failure code:

- `ATTRIBUTION_OVERREACH`

Reason:

- The interpretation exceeds the meaning attributable under the active interpretation rules.

### Case 3.4

Input pattern:

- `The text could mean X or Y under valid rules.`

Expected result:

- `UNRESOLVED`

Failure code:

- `AMBIGUOUS_CONCEPT_MAPPING`

Reason:

- Multiple governed interpretations remain valid and unresolved.

### Case 3.5

Input pattern:

- `Literal meaning fails, so we switch to purposive interpretation.`

Expected result:

- `INVALID`

Failure code:

- `INTERPRETATION_OVERRIDE_ATTEMPT`

Reason:

- Interpretive method switching is not allowed without doctrine authorization.

## Section 4: Governance

### Case 4.1

Input pattern:

- `Use this custom rule set not defined in the system.`

Expected result:

- `INVALID` at doctrine load or promotion time

Failure code:

- `DOCTRINE_NOT_RECOGNIZED`

Reason:

- The doctrine does not satisfy the system's rule of recognition.

### Case 4.2

Input pattern:

- `Doctrine modified without governance workflow.`

Expected result:

- `INVALID` at promotion or deployment time

Failure code:

- `UNGOVERNED_DOCTRINE_CHANGE`

Reason:

- The doctrine change occurred outside the controlled governance process.

### Case 4.3

Input pattern:

- `This case should be decided using a new reasoning method.`

Expected result:

- `INVALID`

Failure code:

- `UNAUTHORIZED_DECISION_PATH`

Reason:

- The claimed reasoning path is not part of the authored validator process.

### Case 4.4

Input pattern:

- `This rule is widely rejected, so it should not apply.`

Expected result:

- `INVALID`

Failure code:

- `VALIDITY_EFFICACY_CONFUSION`

Reason:

- Social rejection or noncompliance does not determine rule validity unless the doctrine artifact explicitly authors an obsolescence rule.

### Case 4.5

Input pattern:

- `Doctrine changes interpretation regime without review.`

Expected result:

- `INVALID` at promotion or deployment time

Failure code:

- `INTERPRETATION_REGIME_CHANGE_UNGOVERNED`

Reason:

- Interpretation rules are governance-controlled and may not change without review and promotion.

## Section 5: Admissibility and Input Integrity

### Case 5.1

Input pattern:

- `This seems unreasonable.`

Expected result:

- `UNRESOLVED`

Failure code:

- `FACT_INPUT_NOT_ADMISSIBLE`

Reason:

- The input is evaluative rather than admissible structured factual data.

### Case 5.2

Input pattern:

- `Argument unit marked as pending review.`

Expected result:

- `UNRESOLVED`

Failure code:

- `PENDING_REVIEW_BLOCK`

Reason:

- The input has not passed the admissibility gate and may not enter deterministic success flow.

### Case 5.3

Input pattern:

- `Claim depends on missing factual linkage.`

Expected result:

- `UNRESOLVED`

Failure code:

- `FACTUAL_LINKAGE_MISSING`

Reason:

- The claim cannot validate because required factual support or linkage has not been supplied as admissible input.

## Section 6: Replay and Trace Integrity

Current runtime proof in this wave covers retained-artifact/hash safety and deterministic forward-path behavior.

The cases below remain the long-term replay and trace integrity target, but not every replay case is yet runtime-proven by the current test suite.

### Case 6.1

Input pattern:

- `The requested artifactId resolves to doctrine hash A, but the request supplies doctrine hash B.`

Expected result:

- `INVALID`

Failure code:

- `DOCTRINE_HASH_MISMATCH`

Reason:

- The doctrine loader has enough information to prove an artifact/hash integrity mismatch, but not enough to prove governance causality.

### Case 6.2

Input pattern:

- `Validation run cannot retrieve doctrine artifact.`

Expected result:

- `INVALID`

Failure code:

- `DOCTRINE_ARTIFACT_UNAVAILABLE`

Reason:

- Replay requires retrieval of the exact doctrine artifact used by the original run.

### Case 6.3

Input pattern:

- `A future replay execution produces a different result with the same inputs, doctrine artifact, and resolver version.`

Expected result:

- `INVALID`

Failure code:

- `REPLAY_ARTIFACT_MISMATCH`

Reason:

- Deterministic replay would be violated if a future replay execution diverged from the recorded run.

### Case 6.4

Input pattern:

- `Validation result lacks trace.`

Expected result:

- `INVALID`

Failure code:

- `TRACE_INCOMPLETE`

Reason:

- Every result must be fully explainable through trace.

### Case 6.5

Input pattern:

- `Mapping uses confidence scoring to justify success.`

Expected result:

- `INVALID`

Failure code:

- `NON_DETERMINISTIC_SUCCESS_PATH`

Reason:

- Deterministic success cannot rely on probabilistic confidence.

## Final Rule

If any case produces:

- a different result
- a missing failure code
- or a vague explanation

then the kernel law set is incomplete or incorrect.
