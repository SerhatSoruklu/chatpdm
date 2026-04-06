# Lock 11 - Direct Relation Candidate Phrasing Audit

## Purpose

Review a tiny set of alternative phrasings against the frozen direct relation surface and decide whether any one of them preserves the exact current bounded read intent.

The baseline authority is the current direct relation read form:

- `relation between <live concept id> and <live concept id>`

This is a review artifact only. It does not implement any phrasing expansion.

## Candidate Review

| Candidate phrasing | Classification | Boundary reading |
| --- | --- | --- |
| `the relation between authority and power` | `safe_equivalent` | Adds only a definite article. It still asks for the same direct authored relation between exactly two concepts and does not introduce traversal, comparison, explanation, inference, or discovery pressure. |
| `what is the relation between authority and power` | `explanation_seeking` | The interrogative wrapper asks for an explanation-style answer rather than the frozen direct read form. It is still about the same concepts, but the phrasing adds explanatory pressure that the current surface does not admit. |
| `how does authority compare to power` | `comparison_like` | This shifts the intent toward comparison rather than direct relation reading. It widens the read into a different conceptual question and is not semantically equivalent to the current bounded form. |

## Decision

Only the article-prefixed variant appears close enough to be considered for a later decision slice:

- `the relation between authority and power`

The other candidates are not safe equivalents. They introduce explanation or comparison pressure and should remain out of the direct relation surface.

## Audit Result

The current direct relation surface remained bounded by the baseline form at audit time.

Phase 12.9A.C later implemented the approved article-prefixed equivalent phrasing. The rejected candidates remain out of the direct relation surface.
