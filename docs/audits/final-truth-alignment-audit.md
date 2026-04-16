# Final Truth Alignment Audit

Date: 2026-04-16

## Scope

This audit covers the current military-constraints worktree after the source/reference hardening phase.
It checks implementation truth, documentation truth, API truth, and frontend truth against the same admitted surface.

Implemented scope reviewed:

- INTL extraction
- US refactor onto INTL
- UK foundation
- UK domains
- NATO / coalition layer
- source/reference hardening

## Inventory

Total changed files reviewed: 103

### Runtime / Compiler / Validator / Lifecycle (88)

- backend/src/modules/military-constraints/assemble-bundle.js
- backend/src/modules/military-constraints/compile-clause-to-rule.js
- backend/src/modules/military-constraints/evaluate-bundle.js
- backend/src/modules/military-constraints/evaluate-rule.js
- backend/src/modules/military-constraints/execution-card.schema.json
- backend/src/modules/military-constraints/fixtures/military-source-registry.json
- backend/src/modules/military-constraints/fixtures/source-clause.example.json
- backend/src/modules/military-constraints/military-constraint-bundle.schema.json
- backend/src/modules/military-constraints/military-constraint-rule.schema.json
- backend/src/modules/military-constraints/military-constraint-validator.js
- backend/src/modules/military-constraints/military-source-registry.schema.json
- backend/src/modules/military-constraints/project-execution-card.js
- backend/src/modules/military-constraints/reference-pack-utils.js
- backend/src/modules/military-constraints/reviewed-clauses/aid-delivery-security-core.json
- backend/src/modules/military-constraints/reviewed-clauses/airspace-control-core.json
- backend/src/modules/military-constraints/reviewed-clauses/allied-authority-merge-core.json
- backend/src/modules/military-constraints/reviewed-clauses/allied-roe-merge-core.json
- backend/src/modules/military-constraints/reviewed-clauses/au-airspace-control-core.json
- backend/src/modules/military-constraints/reviewed-clauses/au-command-authority-core.json
- backend/src/modules/military-constraints/reviewed-clauses/au-delegation-chain-core.json
- backend/src/modules/military-constraints/reviewed-clauses/au-national-base-core.json
- backend/src/modules/military-constraints/reviewed-clauses/au-roe-base-core.json
- backend/src/modules/military-constraints/reviewed-clauses/authority-civilian-school-core.json
- backend/src/modules/military-constraints/reviewed-clauses/authority-core.json
- backend/src/modules/military-constraints/reviewed-clauses/authority-maritime-vbss-core.json
- backend/src/modules/military-constraints/reviewed-clauses/authority-medical-core.json
- backend/src/modules/military-constraints/reviewed-clauses/authority-protected-person-core.json
- backend/src/modules/military-constraints/reviewed-clauses/ca-airspace-control-core.json
- backend/src/modules/military-constraints/reviewed-clauses/ca-command-authority-core.json
- backend/src/modules/military-constraints/reviewed-clauses/ca-delegation-chain-core.json
- backend/src/modules/military-constraints/reviewed-clauses/ca-national-base-core.json
- backend/src/modules/military-constraints/reviewed-clauses/ca-roe-base-core.json
- backend/src/modules/military-constraints/reviewed-clauses/checkpoint-admissibility-core.json
- backend/src/modules/military-constraints/reviewed-clauses/coalition-interop-core.json
- backend/src/modules/military-constraints/reviewed-clauses/collateral-damage-assessment-core.json
- backend/src/modules/military-constraints/reviewed-clauses/command-authority-core.json
- backend/src/modules/military-constraints/reviewed-clauses/cultural-property-protection-core.json
- backend/src/modules/military-constraints/reviewed-clauses/delegation-chain-core.json
- backend/src/modules/military-constraints/reviewed-clauses/detention-handling-core.json
- backend/src/modules/military-constraints/reviewed-clauses/evacuation-route-core.json
- backend/src/modules/military-constraints/reviewed-clauses/ground-maneuver-core.json
- backend/src/modules/military-constraints/reviewed-clauses/hospital-protection-core.json
- backend/src/modules/military-constraints/reviewed-clauses/intl-loac-base-core.json
- backend/src/modules/military-constraints/reviewed-clauses/intl-protected-person-base-core.json
- backend/src/modules/military-constraints/reviewed-clauses/intl-protected-site-base-core.json
- backend/src/modules/military-constraints/reviewed-clauses/isr-retention-core.json
- backend/src/modules/military-constraints/reviewed-clauses/legal-floor-civilian-school-core.json
- backend/src/modules/military-constraints/reviewed-clauses/legal-floor-core.json
- backend/src/modules/military-constraints/reviewed-clauses/legal-floor-maritime-vbss-core.json
- backend/src/modules/military-constraints/reviewed-clauses/legal-floor-medical-core.json
- backend/src/modules/military-constraints/reviewed-clauses/legal-floor-protected-person-core.json
- backend/src/modules/military-constraints/reviewed-clauses/loac-compliance-core.json
- backend/src/modules/military-constraints/reviewed-clauses/nato-interop-base-core.json
- backend/src/modules/military-constraints/reviewed-clauses/nato-roe-compat-core.json
- backend/src/modules/military-constraints/reviewed-clauses/night-operation-core.json
- backend/src/modules/military-constraints/reviewed-clauses/nl-airspace-control-core.json
- backend/src/modules/military-constraints/reviewed-clauses/nl-command-authority-core.json
- backend/src/modules/military-constraints/reviewed-clauses/nl-delegation-chain-core.json
- backend/src/modules/military-constraints/reviewed-clauses/nl-national-base-core.json
- backend/src/modules/military-constraints/reviewed-clauses/nl-roe-base-core.json
- backend/src/modules/military-constraints/reviewed-clauses/no-fly-zone-core.json
- backend/src/modules/military-constraints/reviewed-clauses/policy-overlay-civilian-school-core.json
- backend/src/modules/military-constraints/reviewed-clauses/policy-overlay-core.json
- backend/src/modules/military-constraints/reviewed-clauses/policy-overlay-medical-core.json
- backend/src/modules/military-constraints/reviewed-clauses/policy-overlay-protected-person-core.json
- backend/src/modules/military-constraints/reviewed-clauses/protected-site-core.json
- backend/src/modules/military-constraints/reviewed-clauses/religious-site-protection-core.json
- backend/src/modules/military-constraints/reviewed-clauses/roe-base-core.json
- backend/src/modules/military-constraints/reviewed-clauses/school-zone-restriction-core.json
- backend/src/modules/military-constraints/reviewed-clauses/search-and-seizure-core.json
- backend/src/modules/military-constraints/reviewed-clauses/signal-interference-core.json
- backend/src/modules/military-constraints/reviewed-clauses/target-approval-core.json
- backend/src/modules/military-constraints/reviewed-clauses/tr-airspace-control-core.json
- backend/src/modules/military-constraints/reviewed-clauses/tr-command-authority-core.json
- backend/src/modules/military-constraints/reviewed-clauses/tr-delegation-chain-core.json
- backend/src/modules/military-constraints/reviewed-clauses/tr-national-base-core.json
- backend/src/modules/military-constraints/reviewed-clauses/tr-roe-base-core.json
- backend/src/modules/military-constraints/reviewed-clauses/uk-airspace-control-core.json
- backend/src/modules/military-constraints/reviewed-clauses/uk-command-authority-core.json
- backend/src/modules/military-constraints/reviewed-clauses/uk-delegation-chain-core.json
- backend/src/modules/military-constraints/reviewed-clauses/uk-ground-maneuver-core.json
- backend/src/modules/military-constraints/reviewed-clauses/uk-national-base-core.json
- backend/src/modules/military-constraints/reviewed-clauses/uk-roe-base-core.json
- backend/src/modules/military-constraints/reviewed-clauses/weapon-status-core.json
- backend/src/modules/military-constraints/reviewed-clauses/weather-limitation-core.json
- backend/src/modules/military-constraints/runtime-decision.schema.json
- backend/src/modules/military-constraints/source-clause.schema.json
- backend/src/modules/military-constraints/validate-reviewed-clause-corpus.js

### Tests / Regressions (11)

- backend/src/modules/military-constraints/__tests__/compiler-integration.test.js
- backend/src/modules/military-constraints/__tests__/execution-card.test.js
- backend/src/modules/military-constraints/__tests__/fixtures/bundle-conflict-policy.json
- backend/src/modules/military-constraints/__tests__/fixtures/invalid-missing-fact-rule.json
- backend/src/modules/military-constraints/__tests__/fixtures/legal-floor-prohibition.rule.json
- backend/src/modules/military-constraints/__tests__/fixtures/valid-contract-pack.json
- backend/src/modules/military-constraints/__tests__/reference-bundle-regression.test.js
- backend/src/modules/military-constraints/__tests__/runtime-evaluation.test.js
- backend/src/modules/military-constraints/__tests__/runtime-invariants.test.js
- backend/src/modules/military-constraints/__tests__/source-backed-integration.test.js
- backend/src/modules/military-constraints/__tests__/source-clause-contract.test.js

### Docs (4)

- docs/architecture/clause-normalization-contract.md
- docs/architecture/military-constraint-validation-contract.md
- docs/military-constraints/PACK_SPEC_V1.md
- docs/military-constraints/PACK_SPEC_V1_ALIGNMENT.md

### API Surfaces (0 changed files)

- none in the changed file set
- reviewed live route: `backend/src/routes/api/v1/military-constraints.route.js`

### Frontend Surfaces (0 changed files)

- none in the changed file set
- reviewed live page: `frontend/src/app/pages/military-constraints-compiler-page/military-constraints-compiler-page.component.ts`
- reviewed live page template: `frontend/src/app/pages/military-constraints-compiler-page/military-constraints-compiler-page.component.html`

## Findings by Severity

### Medium

| File(s) | Mismatch type | Issue | Why it matters | Minimal fix |
| --- | --- | --- | --- | --- |
| `docs/architecture/military-constraints-compiler-api.md` | docs > implementation, API > runtime | The doc says the public API returns the runtime decision exactly as produced by the evaluator. The live route returns a bounded projection and omits internal trace fields such as `authorityTrace` and `ruleTrace`. | This overstates the public surface and blurs the boundary between internal evaluator output and the actual HTTP response. | Rewrite the claim to say the public API returns a bounded decision projection, and add a boundary note that the public route does not expose internal trace or source/provenance fields. |
| `docs/architecture/military-constraint-validation-contract.md` | docs < implementation | The rule-shape contract omits `provenance`, even though the current rule schema and validators require it. | The canonical validation contract under-describes the runtime hardening that now exists. | Add `provenance` to the required rule fields and keep it explicitly audit-only. |

### Low

| File(s) | Mismatch type | Issue | Why it matters | Minimal fix |
| --- | --- | --- | --- | --- |
| `docs/military-constraints/PACK_SPEC_V1.md` | docs > implementation, ambiguous wording | The rule requirement says `sourceRefs` must resolve to entries in `sources`, but `sources` is undefined in the spec and the implementation validates against the source registry and derived snapshot. | This leaves the source-link contract ambiguous at the exact place where the source/reference hardening phase depends on precision. | Replace `sources` with `source registry` or `sourceRegistrySnapshot` wording that matches the implementation. |

## Findings by Mismatch Type

| Mismatch type | File(s) | Summary |
| --- | --- | --- |
| docs > implementation | `docs/architecture/military-constraints-compiler-api.md`, `docs/military-constraints/PACK_SPEC_V1.md` | Public API wording and source-link wording overstate or blur the live surface. |
| docs < implementation | `docs/architecture/military-constraint-validation-contract.md` | Rule provenance is enforced in code but omitted from the written validation contract. |
| API > runtime | `docs/architecture/military-constraints-compiler-api.md` | The doc implies the public API exposes the full evaluator decision, but the route only exposes the bounded projection. |
| frontend > API/runtime | none found | The reviewed compiler page copy remained aligned with the public bounded surface. |

## Implementation Truth Review

- The source/reference hardening runtime is implemented in the backend validator, compiler, bundle assembler, and bundle evaluator.
- The evaluator now carries deterministic internal trace data, but the public HTTP route still returns the bounded decision projection only.
- The public route does not expose `authorityTrace`, `ruleTrace`, or source/provenance trace fields.
- Existing admitted packs still validate under the current runtime checks.

## Validation Evidence

- `node scripts/run-all-military-constraint-checks.js` passed with `valid: true`.
- `node --test backend/src/routes/api/v1/__tests__/military-constraints.route.test.js` passed `6/6`.
- `npm --prefix frontend run typecheck` passed.
- `npm --prefix frontend run build` passed.
- `git diff --check` passed.

## What Was Fixed

- `docs/architecture/military-constraints-compiler-api.md` now describes the public route as a bounded decision projection and explicitly states that the public API does not expose internal trace or source/provenance fields.
- `docs/architecture/military-constraint-validation-contract.md` now includes `provenance` in the rule-shape contract and marks it audit-only.
- `docs/military-constraints/PACK_SPEC_V1.md` now says `sourceRefs` resolve to declared entries in the source registry instead of an undefined `sources` container.

## What Remains

- No Critical or High truth mismatches remain in the current worktree.
- The public military-constraints route remains intentionally bounded and does not expose internal trace fields.
- Frontend truth remains static and aligned with the bounded public surface.
- The remaining changed files are the implemented source/reference hardening runtime, tests, and aligned docs already validated in this pass.

## Intentionally Deferred

- No new packs or jurisdictions were added.
- No runtime model redesign was introduced.
- The public HTTP route was not expanded to expose internal trace or provenance data.

## Final Recommendation

SAFE TO PUSH
