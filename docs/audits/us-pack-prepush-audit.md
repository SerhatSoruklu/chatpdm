# US Pack Pre-Push Audit

Audit date: April 15, 2026.

## Scope

This audit covers the current working-tree change set for the first US military-constraints implementation wave before push.

It reviews the actual changed files in git, including runtime data artifacts, regression fixtures, lifecycle code, surfaced API/frontend truth, and documentation.

It does not start second-wave jurisdiction work.

It does not perform source/reference hardening beyond findings that prove a current correctness or safety bug.

## Files Reviewed

Total files reviewed: `145`

- Core pack definitions: `27`
- Reference fact packets: `26`
- Reference expected decisions: `26`
- Reviewed clause corpora: `26`
- Tests and regression helpers: `22`
- Runtime and lifecycle modules: `3`
- API, frontend, and docs: `15`

Inventory groups reviewed:

- `backend/src/modules/military-constraints/pack-registry.json`
- `backend/src/modules/military-constraints/reference-pack-manifest.*.json`
- `backend/src/modules/military-constraints/reviewed-clauses/*-core.json`
- `backend/src/modules/military-constraints/__tests__/fixtures/regression/reference-fact-packets.*.json`
- `backend/src/modules/military-constraints/__tests__/fixtures/regression/reference-expected-decisions.*.json`
- `backend/src/modules/military-constraints/__tests__/*.js`
- `backend/src/modules/military-constraints/list-reference-packs.js`
- `backend/src/modules/military-constraints/reference-pack-lifecycle.js`
- `backend/src/modules/military-constraints/reference-pack-utils.js`
- `backend/src/routes/api/v1/military-constraints.route.js`
- `backend/src/routes/api/v1/__tests__/military-constraints.route.test.js`
- `frontend/src/app/pages/military-constraints-compiler-page/*`
- `frontend/src/app/pages/terms-page/*`
- `frontend/scripts/verify-terms-page-view-model.ts`
- `docs/military-constraints/*`
- `docs/architecture/military-constraints-compiler-api.md`
- `docs/architecture/constraint-contract-checklist.md`
- `frontend/src/app/core/layout/site-footer/site-footer.component.html`

## Review Method

- Grouped the working-tree files by artifact type.
- Inspected runtime/lifecycle/API/frontend/doc diffs directly.
- Parsed registry, manifests, reviewed clauses, fact packets, and expected decisions.
- Rebuilt every manifest-backed pack and reran per-pack regression comparisons against the current fixtures.
- Spot-checked high-risk overlay and domain artifacts where boundary leakage was most likely.
- Verified surfaced truth against registry truth.

## Pre-Fix Findings

### Critical

#### 1. Admitted Pack 6+ IDs are publicly listed but rejected by the API

- Category: `API / Frontend / Surfaced Truth`
- Files:
  - `backend/src/routes/api/v1/military-constraints.route.js`
  - `backend/src/routes/api/v1/__tests__/military-constraints.route.test.js`
- Exact issue:
  - The route-level `packId` validator only accepts lowercase identifiers matching `^[a-z0-9.-]+$`.
  - The current admitted Pack 6+ surface uses uppercase underscore IDs such as `US_AIRSPACE_CONTROL_V1`.
  - `GET /api/v1/military-constraints/packs` lists those packs, but `GET /api/v1/military-constraints/packs/:packId` and `POST /api/v1/military-constraints/evaluate` reject them as invalid requests.
- Why it matters:
  - This is a surfaced-truth correctness bug.
  - The API advertises admitted runtime-backed packs that clients cannot actually inspect or evaluate.
  - It blocks real use of the expanded admitted surface even though the registry, manifests, and regression fixtures all say those packs are live.
- Recommended action:
  - Broaden `packId` validation to accept the actual admitted identifier set.
  - Add API tests that exercise uppercase underscore admitted packs on both detail and evaluate paths.

### High

#### 1. The public API test suite missed the admitted-pack identifier break

- Category: `Test and Validator Coverage`
- Files:
  - `backend/src/routes/api/v1/__tests__/military-constraints.route.test.js`
- Exact issue:
  - The changed route tests only exercised baseline lowercase pack IDs.
  - No route test attempted detail or evaluate requests for an admitted Pack 6+ identifier.
- Why it matters:
  - The critical API bug above passed the current test suite unchanged.
  - This is a direct coverage gap in the surfaced public contract.
- Recommended action:
  - Add admitted-pack detail and evaluate cases using an uppercase underscore ID.

### Medium

#### 1. API documentation still contains locked-v1 wording after the multi-pack expansion

- Category: `API / Frontend / Surfaced Truth`
- Files:
  - `docs/architecture/military-constraints-compiler-api.md`
- Exact issue:
  - The document now shows registry-backed multi-pack counts and Pack 6+ identifiers, but still says:
    - `Returns the locked v1 pack catalog.`
    - `packId must match a known locked-v1 pack identifier`
- Why it matters:
  - The changed doc partially reflects the new surface but still describes the old one.
  - This is documentation drift in a file that is supposed to describe the current public API.
- Recommended action:
  - Replace the locked-v1 wording with current admitted-surface wording.

#### 2. The pack spec alignment note still talks about future admitted-pack work

- Category: `API / Frontend / Surfaced Truth`
- Files:
  - `docs/military-constraints/PACK_SPEC_V1_ALIGNMENT.md`
- Exact issue:
  - The follow-up section still says `If future admitted-pack work introduces new manifest fields...`.
  - Pack 6 already exists in the current admitted surface.
- Why it matters:
  - This is stale documentation in a changed artifact that is meant to track current alignment truth.
- Recommended action:
  - Update the wording so it refers to future admitted-pack work rather than a specific pack wave.

#### 3. Overlay boundary coverage is still thin and largely triplet-based

- Category: `Regression Safety`
- Files:
  - `backend/src/modules/military-constraints/__tests__/overlay-wave-a.shared.js`
  - `backend/src/modules/military-constraints/__tests__/overlay-wave-b.shared.js`
  - `backend/src/modules/military-constraints/__tests__/fixtures/regression/reference-fact-packets.*.json`
  - `backend/src/modules/military-constraints/reviewed-clauses/religious-site-protection-core.json`
  - `backend/src/modules/military-constraints/reviewed-clauses/cultural-property-protection-core.json`
- Exact issue:
  - The new overlay packs are validated mainly through one allowed case, one refusal case, and one incomplete case per pack.
  - Several overlays are primarily activated by `context.operationPhase` and a small number of generic facts.
  - `US_RELIGIOUS_SITE_PROTECTION_V1` and `US_CULTURAL_PROPERTY_PROTECTION_V1` still rely on `target.objectType = OTHER`, which makes the site-type boundary rest mostly on the declared protection slice rather than a richer target model.
- Why it matters:
  - This does not currently break determinism or admission, but it limits how much boundary quality the regression suite actually proves.
  - It is a realistic drift risk for later source/reference hardening.
- Recommended action:
  - Defer to later source/reference hardening unless a current boundary bug is proven.
  - Add richer negative fixtures before broadening the jurisdiction surface.

#### 4. The working tree still contains an unrelated footer change outside the US pack surface

- Category: `Production Push Risk`
- Files:
  - `frontend/src/app/core/layout/site-footer/site-footer.component.html`
- Exact issue:
  - The current working tree includes a footer-template whitespace fix unrelated to the US military-constraints surface.
- Why it matters:
  - It does not threaten runtime correctness, but it does widen the push scope and weakens release isolation for this audit target.
- Recommended action:
  - Split or exclude it before a military-constraints-only push.

### Low

No low-severity-only items were recorded before the fix pass. The remaining non-blocking concerns are covered by the medium findings above.

## Findings By Category

- Determinism: no pre-fix deterministic bundle/regression mismatches found in the changed pack artifacts.
- Pack Contract Integrity: no manifest/registry count drift found in the changed surface.
- Referential Integrity: no changed-pack source or fixture reference failures found in the pre-fix sweep.
- Stage Semantics: no changed-pack legal-floor dominance break found in the pre-fix sweep.
- Regression Safety: medium coverage thinness remains in the new overlay wave.
- Pack Boundary Quality: medium boundary thinness remains in some protection overlays.
- API / Frontend / Surfaced Truth: one critical runtime bug and two documentation drifts found.
- Test and Validator Coverage: one high-severity coverage gap found.
- Production Push Risk: one medium scope-isolation issue found.

## Pre-Fix Recommendation

`DO NOT PUSH`

Reason:

- The public API rejects the newly admitted Pack 6+ identifiers that it already surfaces as admitted packs.

## Post-Fix Summary

### Fixed

- The public API now accepts the actual admitted identifier surface used by Pack 6+:
  - `backend/src/routes/api/v1/military-constraints.route.js`
- The public API test suite now exercises admitted uppercase underscore IDs on both detail and evaluate paths:
  - `backend/src/routes/api/v1/__tests__/military-constraints.route.test.js`
- The changed public API doc no longer describes the pack catalog as locked-v1 only:
  - `docs/architecture/military-constraints-compiler-api.md`
- The pack spec alignment note now refers to future admitted-pack work:
  - `docs/military-constraints/PACK_SPEC_V1_ALIGNMENT.md`

### Remaining

- Overlay boundary coverage remains thin and largely triplet-based in the newly added overlay wave.
- `US_RELIGIOUS_SITE_PROTECTION_V1` and `US_CULTURAL_PROPERTY_PROTECTION_V1` still rely on a generic target object type and the declared protection slice rather than a richer target model.
- The working tree still contains an unrelated footer template change outside the US military-constraints surface.

### Intentionally Deferred

- Broader source/reference hardening for overlay boundary richness.
- Fact-model expansion for richer site typing beyond the current closed-world schema.
- Any second-wave jurisdiction work.

### Validation Evidence

Commands run after fixes:

- `node --test backend/src/routes/api/v1/__tests__/military-constraints.route.test.js backend/src/modules/military-constraints/__tests__/*.test.js`
- `npm --prefix frontend run typecheck`
- `npm --prefix frontend run validate:terms-page-view-model`
- `npx markdownlint-cli2 docs/audits/us-pack-prepush-audit.md docs/architecture/military-constraints-compiler-api.md docs/military-constraints/PACK_SPEC_V1_ALIGNMENT.md docs/military-constraints/PACK_DEPENDENCY_DAG_V1.md docs/military-constraints/PACK_SPEC_V1.md docs/military-constraints/MULTI_PACK_TRUTH_AUDIT.md docs/architecture/constraint-contract-checklist.md`

Results:

- Backend and route tests: `126` passed, `0` failed
- Frontend typecheck: passed
- Terms-page truth validator: passed
- Markdownlint on touched docs: passed

### Final Recommendation

`SAFE TO PUSH WITH NOTED MEDIUM/LOW RISK`

Reason:

- The determinism, lifecycle admission, regression surface, API detail/evaluate paths, frontend truth copy, and changed docs are now aligned for the admitted US pack surface.
- The remaining issues are boundary-depth and push-scope concerns, not current correctness or determinism failures.
