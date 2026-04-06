# Lock 12 - Direct Relation Candidate Phrasing Decision

## Decision

Approve exactly one safe equivalent phrasing for later implementation:

- `the relation between <concept A> and <concept B>`

This is semantically equivalent to the frozen direct relation read form because it preserves the same bounded intent:

- exactly two admitted concepts
- the same direct authored relation read
- the same resolver path
- the same exposure rules
- the same response contract

The leading article adds no traversal, chaining, explanation, discovery, comparison, or inference pressure.

## Rejected Candidates

| Candidate phrasing | Decision | Reason |
| --- | --- | --- |
| `what is the relation between <concept A> and <concept B>` | `reject` | Explanation pressure. The interrogative form asks for explanatory framing rather than the frozen direct read form. |
| `how does <concept A> compare to <concept B>` | `reject` | Comparison pressure. This shifts the question into a different bounded meaning class and does not preserve the exact current capability. |

## Next Slice

The next slice should implement only the approved equivalent phrasing and keep all other phrasing rejected.

If the implementation cannot preserve the same read path, exposure rules, and response contract, the surface should remain frozen unchanged.

## Implementation Note

Phase 12.9A.C implemented the approved article-prefixed equivalent phrasing and kept the rejected candidates rejected.
