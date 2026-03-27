# Local Change Cascade Rule

## Purpose

This rule determines whether the concept graph is stable enough to scale.

The test is simple:

- add exactly one candidate concept
- measure how many existing concepts must be revised

This is a graph-stability test, not a prose-quality test.

## Candidate Concept

Use one tightly bounded candidate concept for the probe.

Default probe:

- `influence`

The candidate concept must not be published in runtime during this phase.

It exists only to test whether the existing cluster can absorb one nearby node without widespread revision.

## Procedure

1. Draft the candidate concept packet privately.
2. Review it against the current cluster.
3. Count how many existing concepts require revision in order to keep boundaries clean.
4. Count only real revisions to existing concepts, not reviewer notes.

Questions to ask:

- does `authority` need revision
- does `power` need revision
- does `legitimacy` need revision
- does `trust` need revision
- does any other nearby concept need revision

## Thresholds

- `0 to 1` revisions
  - stable graph
- `2 to 3` revisions
  - borderline graph
- `4+` revisions
  - unstable graph

If the candidate concept forces broad rewrites, the graph is not ready for scale.

## Blocking Rule

Scale readiness is blocked when the cascade count exceeds the threshold.

Do not add large concept batches while a single nearby concept still causes multi-node rewrite pressure.

## What Counts as a Revision

Count it as a revision when an existing concept needs:

- a rewritten short definition
- a rewritten core meaning
- rewritten full-definition boundary language
- revised `what_it_is_not` boundary notes
- revised must-not-collapse neighbor list

Do not count:

- spelling cleanup
- source formatting cleanup
- minor alias cleanup that does not affect concept meaning

## Relationship to Phase 9

Boundary integrity can pass local runtime pressure tests and still fail the cascade test.

That is normal.

Local runtime correctness proves current behavior.
The cascade rule tests whether the graph can grow without widespread semantic churn.

## Optional Probe Fixtures

If cascade probes are recorded in the stress pack, keep them marked as non-runtime review cases.

Do not fake runtime support for the candidate concept during this phase.
