# Baseline Metrics Snapshot

- Snapshot time: `2026-03-27 16:18:34 GMT` (UK)
- Repo commit: `5de7d3b`
- Snapshot status: frozen
- Update rule: do not update this file unless the user explicitly asks for this file to be updated

## Purpose

This snapshot records the current evidence-backed baseline for ChatPDM system behavior.

It does not claim philosophical truth, objective correctness across all interpretations, or a universal factuality score.

It records what the current system evidence actually proves.

## Core Reading

Current grounded interpretation:

- ChatPDM has strong evidence for deterministic behavior and refusal integrity within scope.
- ChatPDM does not yet have a proven "truth percentage."
- The system currently proves that it behaves consistently and avoids unsupported guessing under the tested boundary.

One-line baseline:

> ChatPDM has not proven truth. It has proven high deterministic reliability and strong non-guessing behavior within scope.

## Evidence Base

This snapshot is grounded in these repo artifacts:

- [Phase 7.5 runtime proof](/home/serhat/code/chatpdm/docs/runtime/phase-7-5-runtime-proof.md)
- [Boundary integrity](/home/serhat/code/chatpdm/docs/boundary-integrity.md)
- [Response schema validation](/home/serhat/code/chatpdm/docs/product/schema-validation.md)
- [Runtime proof fixtures README](/home/serhat/code/chatpdm/tests/runtime/README.md)
- [Query stress summary v1](/home/serhat/code/chatpdm/tests/runtime/reports/query-stress-summary.v1.md)
- [Query stress report v1](/home/serhat/code/chatpdm/tests/runtime/reports/query-stress-report.v1.json)
- [Golden fixtures README](/home/serhat/code/chatpdm/tests/golden/README.md)

This snapshot also includes a current local backend verification run executed at snapshot time:

```text
npm --prefix backend run check
```

Observed result:

- backend shell verified
- runtime proof passed for `14` cases
- feedback verification passed

## Evidence-Backed Baseline Metrics

These are system-behavior metrics, not metaphysical truth metrics.

| Metric | Current baseline | What the evidence supports |
| --- | --- | --- |
| Deterministic consistency | `100%` in current stress evidence | [query-stress-summary.v1.md](/home/serhat/code/chatpdm/tests/runtime/reports/query-stress-summary.v1.md) shows `150/150` passed and `0` deterministic failures |
| Runtime proof coverage | `14/14` controlled cases passed | current `backend check` run passed all Phase 7.5 runtime-proof cases |
| Feedback path verification | `5/5` checks passed in current local run | current `backend check` run passed all feedback verification steps |
| Refusal integrity | strong, evidence-backed | pressure reports show `0` for `weak_no_match`, `wrong_match`, and `boundary_leak` in the current stress summary |
| Query-shape classification stability | strong, evidence-backed | stress summary shows all query-shape buckets passing with no partial or failed cases |
| Schema / contract validity discipline | present and documented | [schema-validation.md](/home/serhat/code/chatpdm/docs/product/schema-validation.md) and golden fixtures define shape and regression discipline |

## What Is Proven

### 1. Deterministic repeatability

What is proven:

- repeated execution stability is part of the Phase 7.5 runtime proof
- the stress harness explicitly checks deterministic repeatability
- the current stress summary reports `0` deterministic failures

Evidence:

- [phase-7-5-runtime-proof.md](/home/serhat/code/chatpdm/docs/runtime/phase-7-5-runtime-proof.md)
- [run-query-stress.js](/home/serhat/code/chatpdm/tests/runtime/run-query-stress.js)
- [query-stress-summary.v1.md](/home/serhat/code/chatpdm/tests/runtime/reports/query-stress-summary.v1.md)

### 2. In-scope runtime branch correctness

What is proven:

- exact match behavior is covered
- noise input handling is covered
- canonical ID success and failure are covered
- authored ambiguity is covered
- authored suggestion behavior is covered

Evidence:

- [phase-7-5-runtime-proof.md](/home/serhat/code/chatpdm/docs/runtime/phase-7-5-runtime-proof.md)
- [verify-resolver.js](/home/serhat/code/chatpdm/backend/scripts/verify-resolver.js)
- [phase-7-5-cases.json](/home/serhat/code/chatpdm/tests/runtime/fixtures/phase-7-5-cases.json)

### 3. Refusal-first behavior under pressure

What is proven:

- the system is not forcing unsupported matches in the current stress pack
- ambiguity and no-match branches remain visible instead of being collapsed

Evidence:

- [boundary-integrity.md](/home/serhat/code/chatpdm/docs/boundary-integrity.md)
- [query-stress-summary.v1.md](/home/serhat/code/chatpdm/tests/runtime/reports/query-stress-summary.v1.md)

### 4. Query-shape classification behavior

What is proven:

- query-shape buckets for subtype, comparison, relation, role/actor, and unsupported phrasing currently pass the recorded stress pack

Evidence:

- [boundary-integrity.md](/home/serhat/code/chatpdm/docs/boundary-integrity.md)
- [query-stress-summary.v1.md](/home/serhat/code/chatpdm/tests/runtime/reports/query-stress-summary.v1.md)
- [query-stress-pack.v1.json](/home/serhat/code/chatpdm/tests/runtime/fixtures/query-stress-pack.v1.json)

## What Is Not Proven

### 1. Truth percentage

Not proven:

- no current artifact proves a universal truth score
- no current artifact proves philosophical correctness across competing source interpretations

### 2. Factual accuracy percentage

Not proven:

- no current artifact measures broad factual accuracy in the way a general retrieval or QA system would

### 3. Fully automated semantic boundary scoring

Not proven:

- [boundary-integrity.md](/home/serhat/code/chatpdm/docs/boundary-integrity.md) explicitly states that deep boundary leakage and circularity still require reviewer judgment

## Safe Working Summary

If one short summary number is needed, use behavior-language, not truth-language:

- deterministic consistency: `100%` in the current recorded stress evidence
- runtime proof status: `14/14` current controlled cases passed
- refusal integrity: strong under the current recorded stress pack

Do not say:

- "ChatPDM is 97% true"
- "ChatPDM has proven factual truth"

Safer statement:

- "ChatPDM currently shows strong deterministic reliability, strong refusal integrity, and stable behavior under the tested boundary."

## Next Metrics That Would Be Legitimate Later

Future metrics can become stronger if explicitly added later:

- broader messy-query classification coverage
- more pairwise concept stress testing
- contradiction or conflict review across source-grounded concept packets
- human-reviewed semantic boundary scoring with explicit criteria

Those do not exist as proven percentages in this snapshot yet.
