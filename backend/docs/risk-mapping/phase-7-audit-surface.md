# Phase 7 Audit Surface

The Phase 7 audit surface is a bounded inspection layer over existing RMG behavior.

It does not add new reasoning power.
It does not add multi-hop paths.
It does not add confidence scoring.
It does not expand the compatibility graph.

The audit surface exists to prove that the current system is:

- deterministic
- replayable
- inspectable
- provenance-locked
- structurally bounded

The audit surface includes:

- normalized input
- final compact resolve output
- bounded explanation output
- provenance hash for authored artifacts
- structural invariants about the emitted compact formats

The audit surface explicitly excludes:

- raw evidence records
- raw registry internals beyond read models
- hidden stack traces
- narrative summaries
- probabilistic claims
- semantic expansion

The audit surface differs from final resolve output in one important way:

- final resolve output remains the compact operational contract
- audit output is a trusted inspection artifact for verification and drift detection

The audit surface exists so the system can prove why its current behavior can be trusted without pretending to be broader or smarter than it is.
Its wording should remain structural: supported structural paths, explicit boundary outcomes, and bounded support confidence.
