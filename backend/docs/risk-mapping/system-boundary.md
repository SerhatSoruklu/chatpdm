# RMG System Boundary

LLGS ends where concept resolution ends.

RMG begins at the query-shape boundary when a request is recognized as a risk-oriented scenario query rather than a concept-resolution query.

Routing principle:

- query-shape classification chooses LLGS or RMG
- LLGS continues to govern concept resolution
- RMG governs bounded scenario structure

RMG is a parallel subsystem, not a modification of core concept resolution. It must not be mixed into LLGS internals or treated as a fallback prediction layer.

RMG operates against explicit artifact versions. Domain manifests, registries, and evidence packs must be versioned and pinned during resolution. Runtime behavior must not depend on mutable or untracked data sources.

RMG operates only within authored artifacts:

- domain manifests
- registries
- evidence packs
- contracts

If a query is outside the authored domain, unsupported by the registry boundary, or not covered by the evidence pack, RMG must narrow or refuse. It must not drift into broader interpretation.

Boundary rule:

- supported input may be admitted or narrowed
- unsupported input must be narrowed or refused
- unsupported causal expansion must never be invented at runtime
- runtime behavior must not depend on implicit version drift or unpinned authored data
