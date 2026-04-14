# V1 Pack Surface Lock

The ChatPDM military-constraints v1 pack surface is intentionally locked at Packs 1 through 5.

## Locked Surface

- Pack 1: core strike / legal-floor reference
- Pack 2: maritime VBSS / access-control
- Pack 3: medical / protected-object
- Pack 4: civilian / school-protection
- Pack 5: protected-person state

These five packs define the complete v1 invariant coverage surface for the deterministic military-constraints compiler.

## What The Lock Means

- Pack 6+ is post-v1 expansion only.
- New packs are not routine additions to the v1 surface.
- Any new pack requires explicit justification and review.
- No new pack may widen kernel semantics without a new explicit architecture phase.
- The all-pack heartbeat remains mandatory for the locked v1 surface.

## What Remains True

- Packs 1 through 5 remain frozen reference packs.
- Pack regressions remain part of the release discipline.
- Cross-pack isolation remains a required invariant.
- Release artifacts remain versioned and immutable.

## Related Documents

- [Reference Pack Coverage Map](./reference-pack-coverage-map.md)
- [Military Constraints Compiler Audit](./military-constraints-compiler-audit.md)
- [Phase 6 Execution Card Projection](./phase-6-execution-card-projection.md)
