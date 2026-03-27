# Boundary Integrity

## Purpose

Phase 9 exists to pressure test semantic boundary integrity before any further concept expansion.

ChatPDM already proves:

- deterministic runtime behavior
- contract-valid product responses
- stable exact match, ambiguity, suggestion, and no-match branches

That is not the same as graph stability.

This phase tests whether the current concept set preserves distinction under hostile, messy, large-population-style query behavior.

The target is not elegant wording. The target is boundary survival.

## Why Localhost and File-Backed Testing Is Correct Now

The current runtime resolves concepts from authored files in [`data/concepts`](/home/serhat/code/chatpdm/data/concepts).

This is the correct test layer because the active risk is semantic integrity, not infrastructure scale.

At this stage, pressure testing must answer:

- does the resolver force matches when it should refuse
- do nearby concepts collapse under phrasing pressure
- do ambiguity and no-match behavior stay honest
- do repeated runs stay byte-stable

These are concept-boundary questions. They do not require a database migration.

## Query-Shape Classification Boundary

Phase 10 adds deterministic query-shape classification on top of the existing runtime.

This layer exists so the system can distinguish between:

- direct concept lookup
- direct canonical lookup
- authored ambiguity
- subtype-shaped phrasing
- comparison-shaped phrasing
- relation-shaped phrasing
- role or actor phrasing
- unsupported complex phrasing

This is structured interpretation, not reasoning.

It does not:

- compose new canonical concepts
- infer new graph nodes
- answer comparisons
- evaluate inter-concept relations
- identify actors or instances

The purpose of the layer is narrower:

- make no-match states more inspectable
- keep refusal behavior honest
- preserve deterministic classification under pressure

## MongoDB Is Out of Scope

MongoDB is intentionally out of scope for this phase.

The only local database currently in use is the feedback store at [`chatpdm-feedback.sqlite`](/home/serhat/code/chatpdm/backend/data/chatpdm-feedback.sqlite).

Phase 9 does not test persistence scale, database throughput, or distributed runtime behavior.

It tests whether the current meaning graph survives pressure while the runtime remains file-backed and locally auditable.

## Locked Cluster

The boundary-integrity sprint uses this locked cluster as its conceptual pressure zone:

- `authority`
- `power`
- `legitimacy`
- `consent`
- `trust`
- `responsibility`
- `law`

Not all of these concepts are authored in the current runtime seed set.

That is acceptable for this phase.

When a concept is not yet authored, the correct runtime behavior is typically an honest `no_exact_match`, not a forced match.

## Failure Labels

Use these labels consistently in review notes and runtime pressure reports:

- `collapse`
  - two concepts effectively become one under pressure
- `drift`
  - the same query or equivalent repeated run does not stay stable
- `wrong_match`
  - the resolver selects the wrong canonical concept or wrong response mode
- `boundary_leak`
  - a response imports a neighboring concept too strongly and weakens the distinction
- `circularity`
  - a concept depends on a neighbor in a way that removes standalone meaning
- `weak_no_match`
  - the system should refuse or suggest, but instead forces a misleading match or otherwise mishandles refusal

## Scoring Model

Score each query from `0` to `2`.

- `2`
  - correct resolution and boundary preserved
- `1`
  - partial success, but leakage, weak refusal, or structural weakness is present
- `0`
  - wrong match, collapse, refusal failure, invalid stability, or major conceptual error

The runner can score:

- response mode
- canonical target
- candidate or suggestion ordering where applicable
- repeatability under repeated execution

The runner cannot fully score:

- deep boundary leakage inside prose
- circularity inside authored concept logic

Those require reviewer judgment.

## Evaluation Thresholds

Use these thresholds for the stress pack as a whole:

- `0.90+ average score`
  - cluster is stable enough for continued boundary work
- `0.75–0.89 average score`
  - borderline; revise resolver expectations or concept boundaries before expanding
- `< 0.75 average score`
  - not stable enough; stop expansion and treat the cluster as unsafe

Also treat any repeated-run drift as a blocking issue, even if average score remains high.

## Revision Rule

Do not rewrite concept prose broadly after a single failure.

Review in this order:

1. resolver or routing failure
2. refusal failure
3. boundary language failure
4. graph-level instability

If a fix to one concept repeatedly forces changes across multiple neighbors, the issue is graph stability, not phrasing polish.

## Semantic Pressure Testing Now vs Infrastructure Load Testing Later

These are different phases.

### Semantic Pressure Testing Now

Current phase:

- localhost only
- file-backed concept runtime
- deterministic query-shape classification
- hostile query pack
- repeatability checks
- boundary failure review

Primary question:

- can the meaning graph stay honest under pressure

### Infrastructure Load Testing Later

Deferred phase:

- request volume
- concurrency
- process saturation
- storage throughput
- distributed deployment concerns

Primary question:

- can the system serve traffic at scale

Infrastructure load testing is not useful if the meaning graph is still unstable.

## Exit Condition

This phase is complete only when:

- the local stress harness runs cleanly
- deterministic repeatability holds
- forced-match failures are visible and reviewable
- boundary hotspots are known explicitly
- scale decisions remain blocked until local-change cascade risk is assessed
