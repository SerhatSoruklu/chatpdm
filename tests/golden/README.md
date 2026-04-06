# ChatPDM Golden Fixtures

Golden fixtures are the approved outputs for ChatPDM product responses.

They exist to detect regressions over time and to keep deterministic behavior reviewable.

## What Golden Tests Are

Golden tests are fixture-based contract checks.

They do not generate product behavior. They lock expected outputs so later changes can be detected and reviewed intentionally.

## Why They Exist

ChatPDM depends on deterministic behavior. That means approved outputs cannot drift silently.

The fixture set exists to catch:

- accidental response-shape changes
- enum drift
- output reordering
- undocumented version changes
- silent contract erosion

## Schema vs Fixtures

- schema = allowed structure
- fixtures = approved outputs

Schema answers:

- is this payload shaped correctly?

Fixtures answer:

- is this still an approved output for this scenario?

Fixtures are not test data.
They are contract commitments.

## Workflow

Use this order:

`contract -> examples -> schema -> fixtures -> validation`

When behavior changes:

1. update the contract if meaning changed
2. update the schema if structure changed
3. update fixtures if approved outputs changed
4. review the version bump
5. commit the new approved outputs

## Updating Fixtures Safely

The safe workflow is:

`change -> version bump -> regenerate or rewrite fixture -> review -> commit`

Do not edit fixtures casually.
Do not reorder arrays casually.
Do not "clean up" wording without the correct version bump.

Array order is part of the contract for:

- `answer.contexts`
- `answer.sources`
- `answer.relatedConcepts`
- `relation.entries`
- `suggestions`
- `candidates`

Reordering without version bump and fixture update is a regression.

## Running Validation

Run the fixture validator directly:

```bash
python chatpdm/tests/golden/golden_test_runner.py
```

The runner currently validates every golden fixture against `docs/product/response-schema.json`.

It does not compare runtime output yet. That comes later.

Some phase-specific surfaces, such as the direct relation read surface, also use dedicated verifiers that compare canonical runtime output against approved golden snapshots.

## Relationship To Docs Examples

The files under `docs/product/examples/` are explanatory examples.

The files under `tests/golden/fixtures/` are the approved output commitments used for regression discipline.
