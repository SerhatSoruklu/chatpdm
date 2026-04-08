# Confidence Contract

Bounded confidence in RMG is a support class, not a prediction.

It describes how strong the current authored support is inside the bounded system.
It must be read as bounded support confidence, not forecast confidence.

Allowed classes:

- `LOW_BOUNDED_SUPPORT`
- `MEDIUM_BOUNDED_SUPPORT`
- `HIGH_BOUNDED_SUPPORT`

Bounded confidence is derived only from authored structural signals:

- evidence coverage report
- admissibility decision
- supported paths
- unsupported bridge ledger
- assumptions ledger
- unknowns ledger
- falsifier ledger

It explicitly does not mean:

- probability
- likelihood
- odds
- forecast
- prediction
- numeric score

Confidence remains capped when structural limits remain visible.
Supported paths, in this contract, are supported structural paths within admitted scope.

Examples of caps:

- unsupported bridges inside the admitted claim surface
- current unknowns that prevent stronger direct support
- narrowed output that reflects broad-collapse framing

Falsifiers remain visible in the confidence explanation, but they do not automatically force the lowest class unless the explicit classification rules say so.

This contract exists to keep confidence deterministic, bounded, and inspectable without turning it into open-ended reasoning.
