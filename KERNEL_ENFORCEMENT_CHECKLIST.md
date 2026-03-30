# Kernel Enforcement Checklist

Use this checklist before adding any new concept-serving route, resolver, service, or helper.

## Required Inputs

- Consume governance state from [backend/src/modules/concepts/concept-validation-state-loader.js](./backend/src/modules/concepts/concept-validation-state-loader.js).
- Preserve `v3Status`, `relationStatus`, `lawStatus`, `enforcementStatus`, and `systemValidationState`.
- Prefer the canonical resolver path in [backend/src/modules/concepts/resolver.js](./backend/src/modules/concepts/resolver.js) unless there is a strong reason not to.

## Required Runtime Rules

- If `isBlocked` or `systemValidationState === 'law_blocked'`, do not keep the concept actionable.
- If `isStructurallyIncomplete`, keep that degraded state explicit.
- Do not present blocked or degraded states as fully valid.

## Required Relation Rules

- Load relation truth through [backend/src/modules/concepts/concept-relation-loader.js](./backend/src/modules/concepts/concept-relation-loader.js).
- Preserve relation source traceability, including fallback markers.
- Honor `REQUIRE_AUTHORED_RELATIONS` via [backend/src/modules/concepts/relation-policy.js](./backend/src/modules/concepts/relation-policy.js).

## Required Traceability

- Preserve `governanceState.trace` where a response exposes governance state.
- Keep internal logging or trace output for blocked and warning-bearing runtime states where relevant.
- Do not create a path that hides enforcement decisions.

## Required Review Questions

- Does this path consume validator-derived governance state?
- Can this path accidentally serve a blocked concept as valid?
- Can this path hide fallback usage or law warnings?
- Does this path create a side door around the canonical kernel?

## Minimum Proof Before Merge

- Run the smallest relevant backend verifier for the new path.
- Run `npm run validate:registers` when governance-state behavior changed.
- Update [KERNEL_INTEGRITY_INVARIANT_MAP.md](./KERNEL_INTEGRITY_INVARIANT_MAP.md) if the enforcement surface or bypass risk changed.
