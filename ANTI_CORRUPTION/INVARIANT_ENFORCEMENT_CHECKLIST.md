# Invariant Enforcement Checklist

Use this checklist before adding any new validator path, API route, runtime resolver, or concept-serving helper.

## Required Validator Inputs

- Consume validator-derived governance state through [backend/src/modules/concepts/concept-validation-state-loader.js](../backend/src/modules/concepts/concept-validation-state-loader.js).
- Preserve `v3Status`, `relationStatus`, `lawStatus`, `enforcementStatus`, and `systemValidationState`.
- Do not recompute cross-concept law in runtime code when validator output already exists.

## Required Runtime Behavior

- If `isBlocked` or `systemValidationState === 'law_blocked'`, do not treat the concept as actionable.
- If `isStructurallyIncomplete`, keep the concept explicitly degraded; do not present it as fully validated.
- Do not suppress validator outcomes in responses, logs, or internal decision branches.

## Required Relation Behavior

- Load authored relations through [backend/src/modules/concepts/concept-relation-loader.js](../backend/src/modules/concepts/concept-relation-loader.js).
- Do not add implicit or inferred relations outside the authored relation schema.
- If fallback is used, preserve `source`, `dataSource`, `strictMode`, and `fallbackUsed` traceability.
- Honor `REQUIRE_AUTHORED_RELATIONS` through [backend/src/modules/concepts/relation-policy.js](../backend/src/modules/concepts/relation-policy.js).

## Required Traceability

- Keep a reconstructable link from runtime behavior back to validator artifact state.
- Preserve `answer.governanceState.trace` or an equivalent internal trace surface.
- Add or update a focused verifier when a new path consumes governance state.

## Required Review Questions

- Does the new path consume validator governance state instead of bypassing it?
- Can the new path accidentally present a blocked concept as valid?
- Can the new path hide fallback usage, degraded structure, or law warnings?
- Does the new path introduce a second truth source for relations or enforcement?

## Never Do

- Do not bypass [scripts/validate-registers.js](../scripts/validate-registers.js) as the authoritative validation artifact source.
- Do not treat boundary-collapse warnings as semantic approval.
- Do not synthesize canonical truth from AI, heuristics, or silent fallback behavior.
- Do not add a concept-serving route that ignores `enforcementStatus` and `systemValidationState`.

## Minimum Proof Before Merge

- Run the smallest relevant verifier for the new path.
- Run `npm run validate:registers` if governance-state handling changed.
- Update [INVARIANT_MAP.md](./INVARIANT_MAP.md) if a new enforcement point, reason code, or bypass risk was introduced.
