# ZEE Boundary Contract

ZEE (ZeroGlare Evidence Engine) is a separate ChatPDM public surface for deterministic evidence analysis.
It is not part of the ChatPDM resolver, concept registry, or admission logic, and it must stay
architecturally isolated from the runtime path.

## Core Invariant

ZEE outputs are non-authoritative and cannot be consumed as inputs by any other system surface.

This invariant exists to prevent future coupling drift, accidental runtime reuse, and the common
“just plug it in later” expansion pattern that turns a surface into an authority.

## Do Not Touch

Do not connect ZEE to:

- resolver logic
- concept registry behavior
- admission logic
- existing Zeroglare runtime behavior
- runtime output shaping
- resolver logging or runtime inspection paths

High-risk surfaces:

- [`backend/src/modules/concepts/resolver.js`](../../backend/src/modules/concepts/resolver.js)
- [`backend/src/modules/concepts/pipeline-runner.js`](../../backend/src/modules/concepts/pipeline-runner.js)
- [`backend/src/routes/api/v1/zeroglare.route.js`](../../backend/src/routes/api/v1/zeroglare.route.js)
- [`backend/src/modules/concepts/zeroglare-diagnostics.js`](../../backend/src/modules/concepts/zeroglare-diagnostics.js)
- [`frontend/src/app/zeroglare/`](../../frontend/src/app/zeroglare)
- [`frontend/src/index.html`](../../frontend/src/index.html)

## Safe Extension

ZEE may extend only these surfaces in this implementation pass:

- new frontend page scaffold under `frontend/src/app/pages/zeroglare-evidence-engine-page/`
- route wiring for `/zeroglare-evidence-engine`
- footer/system navigation entry
- SEO registry entry and sitemap regeneration
- read-only backend scaffold under `/api/v1/zee/*`
- test coverage for isolation and read-only contract behavior

## Insertion Plan

1. Audit and lock the boundary before any content or route code is added.
2. Build the standalone public page scaffold without linking it to runtime execution.
3. Add the bounded content model and the infographic layout.
4. Expose the page through the system footer only.
5. Register SEO, canonical URL, and sitemap data through the existing registry flow.
6. Add a read-only backend scaffold that states plainly it is non-operational.
7. Verify that no ZEE output appears inside resolver logs or runtime outputs.
8. Harden wording and routing before public exposure.

## Failure Condition

If any ZEE output appears inside resolver logs or runtime outputs, the implementation fails the boundary
contract and must not be treated as release-safe.
