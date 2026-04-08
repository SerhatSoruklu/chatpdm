# Refusal and Narrowing Principles

RMG is refusal-first.

If a query is not supportable under the authored boundary, the system must refuse it rather than inventing a broader answer.

If a query is partially supportable, the system must narrow it to the supported scope instead of stretching it into an unsupported claim.

Failing safely is more important than sounding smart.

RMG must never expand a query beyond its supported scope silently. Any expansion beyond supported scope must be represented explicitly as an unsupported bridge or result in narrowing or refusal.

Unsupported semantic bridges must be surfaced explicitly. A weak signal does not justify a broad collapse claim, a hidden causal chain, or an invented conclusion.

RMG must not aggregate multiple weak signals into a strong claim unless that aggregation is explicitly supported by authored compatibility and evidence rules.

Broad collapse framing is never admitted directly from sub-scope evidence support. It must narrow to supported scoped risks.

Inspectable surfaces must stay structural. They may explain why a query was admitted, narrowed, or refused, but they must not introduce new narrative claims or hidden inference.

Audit surfaces expose proof of bounded behavior. They verify current capability and provenance, but they do not extend the system's reasoning scope.

Supported paths are supported structural paths, not outcome forecasts.
Refusal is a boundary outcome, not evidence that the system lacks intelligence.

Deterministic replay is required for trust. The same input and the same authored artifacts must produce the same output and the same explanation.

Examples of narrowing:

- a broad collapse query narrowed to supported dependency risks
- a vague scenario narrowed to a specific domain scope
- a multi-part request narrowed to the parts with authored support

Examples of refusal:

- a query that requires open-world prediction
- a query that asks for unsupported company collapse claims
- a query that depends on autonomous browsing or external system interaction
- a query that requires causal claims not backed by authored evidence

RMG must always prefer explicit narrowing or refusal over speculative completion.

Direct-path-only behavior is an explicit current invariant. Broad collapse framing may be visible in unsupported bridges, but it must never become supported direct structure.
