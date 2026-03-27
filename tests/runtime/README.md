# ChatPDM Runtime Proof Fixtures

This folder contains controlled runtime proof cases for Phase 7.5.

It also contains the Phase 9 semantic pressure harness, which targets localhost runtime behavior under hostile, messy, population-scale-style query pressure.

These fixtures are not product-response golden outputs. They are expected runtime case definitions used to verify:

- exact match behavior
- noise handling that normalizes into the product `__empty__` path
- canonical_id behavior
- authored ambiguity behavior
- authored suggestion behavior
- query-shape classification
- bounded interpretation metadata
- repeatability under fixed versions

Literal empty string is not included as a product-response fixture because the response schema requires a non-empty `query`. Empty string is rejected at the API boundary before product response generation.

The runtime proof workflow is:

1. authored concepts and resolve rules define allowed runtime inputs
2. fixtures define expected normalized query, query type, outcome type, and target result
3. the verification script runs each fixture repeatedly
4. every runtime output must remain schema-valid and stable

## Phase 9 Pressure Harness

Phase 9 adds:

- [`fixtures/query-stress-pack.v1.json`](/home/serhat/code/chatpdm/tests/runtime/fixtures/query-stress-pack.v1.json)
- [`run-query-stress.js`](/home/serhat/code/chatpdm/tests/runtime/run-query-stress.js)
- generated reports in `tests/runtime/reports/`

The pressure harness is localhost-only and intentionally file-backed. It does not test database scale or infrastructure throughput.

Run it with the backend already running on `localhost:4301`:

```bash
cd /home/serhat/code/chatpdm/backend && npm run pressure:semantic
```

Or directly:

```bash
cd /home/serhat/code/chatpdm && node tests/runtime/run-query-stress.js
```

The runner writes:

- `tests/runtime/reports/query-stress-report.v1.json`
- `tests/runtime/reports/query-stress-summary.v1.md`

These reports are meant for internal boundary review. They do not replace concept review or pairwise authoring judgment.
