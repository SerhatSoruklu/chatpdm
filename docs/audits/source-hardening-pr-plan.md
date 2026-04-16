# Military Constraints Source / Reference Hardening Audit Plan

Date: 2026-04-16

## Scope

This is a verification-only audit of the current military-constraints source/reference hardening surface.

Constraints followed:

- No code fixes were applied.
- No runtime model redesign was introduced.
- No new packs, jurisdictions, or overlays were added.
- The existing three-stage model remains unchanged:
  `ADMISSIBILITY -> LEGAL_FLOOR -> POLICY_OVERLAY`
- The existing outcome model remains unchanged:
  `ALLOWED`, `REFUSED`, `REFUSED_INCOMPLETE`
- Findings were grounded in current repo files, tests, and targeted read-only runtime probes.

## Verification Method

The audit used three evidence sources:

- direct inspection of the current backend runtime, validator, lifecycle, and route files
- targeted Node test execution against the current test files
- small read-only Node probes on cloned fixtures and temporary directories to verify behavior that was not obvious from static inspection alone

Targeted tests run during verification:

- `node --test backend/src/modules/military-constraints/__tests__/source-clause-contract.test.js backend/src/modules/military-constraints/__tests__/contract-pack.test.js backend/src/modules/military-constraints/__tests__/reference-pack-tooling.test.js backend/src/routes/api/v1/__tests__/military-constraints.route.test.js`

Observed result:

- `35/35` passed

Read-only probes were used to confirm:

- duplicate source registry overwrite behavior
- duplicate pack registry overwrite behavior
- reversed stage order acceptance
- dangling provenance parent behavior
- malformed matched-effect behavior
- authority graph fallback behavior
- dependency cycle handling

## PR Buckets

The buckets below are intentionally non-overlapping. Each finding is assigned to the narrowest fix surface that would close it.

### PR1

Blockers, lifecycle, precedence, authority fallback, and public-boundary issues.

Use this for:

- registry admission and listing boundary enforcement
- stage precedence enforcement
- authority graph resolution boundary behavior
- lifecycle gating and public discovery consistency
- any confirmed public surface leak

### PR2

Provenance, dependency, and determinism hardening.

Use this for:

- clause provenance chain resolution
- source identity and registry index determinism
- dependency-order hardening
- any explicit graph validation work that keeps the model unchanged

### PR3

Cleanup, low-risk hardening, and semantics tightening.

Use this for:

- evaluator edge-case semantics
- missing regression coverage
- isolated contract tightening that does not change the runtime model shape

## Findings

| Copilot finding | Status | Files | Severity | Push-blocking | Evidence / explanation | Minimal fix direction | PR bucket |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Provenance chain enforcement | PARTIALLY CONFIRMED | `backend/src/modules/military-constraints/validate-reviewed-clause-corpus.js`<br>`backend/src/modules/military-constraints/source-clause.schema.json`<br>`backend/src/modules/military-constraints/compile-clause-to-rule.js` | Medium | No | The repo already enforces provenance shape and the `COMPOSED` / `parentClauseIds` rule, but it does not resolve parents against the corpus or detect dangling parent references. A probe that set `parentClauseIds` to `NONEXISTENT-PARENT` still validated successfully. | Add corpus-level parent resolution and refuse dangling or cyclic provenance chains. Keep the downstream compiler unchanged. | PR2 |
| Registry enforcement | CONFIRMED | `backend/src/modules/military-constraints/reference-pack-utils.js`<br>`backend/src/modules/military-constraints/list-reference-packs.js`<br>`backend/src/modules/military-constraints/reference-pack-lifecycle.js` | High | Yes | `buildPackRegistryIndex()` is last-wins for both `packId` and `manifestPackId`, and `listReferencePacks()` uses that raw index directly. A duplicate manifest-facing entry changed the public listing metadata for `mil-us-core-reference` instead of failing closed. `validatePackRegistry()` already exists, but the public discovery path does not use it. | Fail closed on duplicate registry keys before discovery/listing, or validate the registry before building the public index. Do not let later entries overwrite earlier public metadata silently. | PR1 |
| Authority graph fallback | PARTIALLY CONFIRMED | `backend/src/modules/military-constraints/reference-pack-utils.js`<br>`backend/src/modules/military-constraints/validate-reference-pack.js` | Low | No | `getAuthorityGraphPath()` still performs jurisdiction/known-ID fallback resolution, including a default authority-graph fixture path. The runtime is not bypassed, though: `validateReferencePack()` fails closed when the loaded graph ID does not match the manifest. So the finding is partially real, but not a bypass. | Make authority-graph resolution explicit to the manifest ID, or document the fallback as test-harness-only and keep the load boundary narrow. | PR1 |
| Malformed matched-effect handling | CONFIRMED | `backend/src/modules/military-constraints/evaluate-rule.js`<br>`backend/src/modules/military-constraints/evaluate-bundle.js`<br>`backend/src/modules/military-constraints/military-constraint-validator.js`<br>`backend/src/modules/military-constraints/military-constraint-rule.schema.json` | High | Yes | The rule schema constrains persisted rule shape, but `validateContractPack()` does not re-assert the `effect` shape on the assembled bundle, and `evaluateBundle()` continues past a matched rule whose `effect` lacks a `decision` string. In the probe, mutating a matched rule to `effect: {}` changed the runtime path instead of failing closed. | Validate rule effect shape during bundle admission and make the evaluator refuse closed when a matched effect is malformed. Do not silently skip malformed matched effects. | PR3 |
| Stage order enforcement | CONFIRMED | `backend/src/modules/military-constraints/assemble-bundle.js`<br>`backend/src/modules/military-constraints/evaluate-bundle.js`<br>`backend/src/modules/military-constraints/military-constraint-bundle.schema.json`<br>`backend/src/modules/military-constraints/military-constraint-validator.js` | High | Yes | The bundle schema only constrains `stageOrder` membership and length, not the exact sequence. A probe that reversed the stage order still passed validation and changed the runtime failure stage from `LEGAL_FLOOR` to `POLICY_OVERLAY`. That is a real precedence bug. | Enforce the exact `ADMISSIBILITY -> LEGAL_FLOOR -> POLICY_OVERLAY` order in bundle validation, and keep the evaluator keyed to that fixed order. | PR1 |
| Source index duplication | CONFIRMED | `backend/src/modules/military-constraints/reference-pack-utils.js`<br>`backend/src/modules/military-constraints/assemble-bundle.js`<br>`backend/src/modules/military-constraints/compile-clause-to-rule.js`<br>`backend/src/modules/military-constraints/validate-reviewed-clause-corpus.js` | High | Yes | The source registry index builders are also last-wins. A duplicate `DOD-LOW-2023` entry silently replaced the earlier record and changed the bundle snapshot metadata to the duplicate values (`sourceVersion`, `trustTier`, `notes`). This is a silent identity drift across compile, assembly, and reviewed-corpus validation paths. | Reject duplicate `sourceId` values at source-registry validation time and make every index builder fail closed instead of overwriting earlier entries. | PR2 |
| Regression coverage gaps | CONFIRMED | `backend/src/modules/military-constraints/__tests__/source-clause-contract.test.js`<br>`backend/src/modules/military-constraints/__tests__/contract-pack.test.js`<br>`backend/src/modules/military-constraints/__tests__/reference-pack-tooling.test.js`<br>`backend/src/modules/military-constraints/__tests__/runtime-evaluation.test.js`<br>`backend/src/routes/api/v1/__tests__/military-constraints.route.test.js` | Low | No | The current suite covers positive paths and a few negative paths, but it does not cover the now-confirmed failure cases in this audit: duplicate source registry entries, reversed stage order, dangling provenance parents, malformed matched effects, or the public trace boundary. | Add focused negative tests for each confirmed gap before the next fix PRs land. | PR3 |
| Dependency cycle detection | NOT CONFIRMED | `backend/src/modules/military-constraints/reference-pack-utils.js`<br>`backend/src/modules/military-constraints/reference-pack-lifecycle.js` | Low | No | A synthetic two-node cycle did not prove a gap. The current linear registry validation already rejected the test cycle as an unknown dependency because the dependency had not been declared earlier in the registry. No separate cycle bypass was demonstrated. | No change required for the current model. If dependency semantics are later widened, add explicit graph traversal then. | PR2 |
| Trace exposure concerns | NOT CONFIRMED | `backend/src/routes/api/v1/military-constraints.route.js`<br>`backend/src/routes/api/v1/__tests__/military-constraints.route.test.js` | Low | No | This is a false positive against the current route. `buildEvaluateResponse()` returns only the bounded public projection, and the route test explicitly asserts that `authorityTrace` and `ruleTrace` are absent from the HTTP response. | No code change required. If a future route leak is proven, it belongs in the public-boundary bucket. | PR1 |
| Lifecycle hardening details | PARTIALLY CONFIRMED | `backend/src/modules/military-constraints/reference-pack-lifecycle.js`<br>`backend/src/modules/military-constraints/list-reference-packs.js`<br>`backend/src/modules/military-constraints/reference-pack-utils.js` | Medium | No | Release admission already uses validated registry logic and blocks `planned` and `umbrella-label` packs. The weaker spot is the public discovery surface: `listReferencePacks()` still derives its metadata from the raw registry index. That is not a runtime bypass, but it means lifecycle semantics are not enforced uniformly across release and discovery surfaces. | Either validate the registry before discovery or explicitly document that the listing surface is descriptive and not admission-gated. Keep the release path unchanged. | PR1 |

## Bucket Summary

### PR1

- Registry enforcement
- Stage order enforcement
- Authority graph fallback
- Lifecycle hardening details
- Trace exposure concerns remains a false positive, but if it is ever re-proven it belongs here

### PR2

- Provenance chain enforcement
- Source index duplication
- Dependency cycle detection remains unconfirmed, but if explicit traversal is added later it belongs here

### PR3

- Malformed matched-effect handling
- Regression coverage gaps

## Final Audit Result

This audit found:

- 4 confirmed findings
- 3 partially confirmed findings
- 3 not confirmed findings

The three PR buckets above are practical as-is:

- PR1 closes the public boundary, precedence, and lifecycle-admission surface.
- PR2 closes provenance and source-identity determinism without widening the model.
- PR3 closes the isolated evaluator semantics issue and adds the missing regression coverage.

No fixes were applied during this audit.
