# Lock 2 - Validator Blocks Merge

## Purpose

Make the validator a hard gate instead of an advisory tool.

If drift is only reported but not enforced, it will eventually ship.

## Rule

No concept register change should merge unless the register validator passes.

Warnings may remain non-blocking, but failures must block merge.

## What It Protects

This lock prevents:

- prefix regressions
- near-duplicate registers
- missing zones
- contract-violating `simplified` and `formal` prose

## Required CI Gate

Run the register validator in CI:

```bash
npm run validate:registers
```

## Failure Model

These should block merge:

- missing `standard`
- missing required zones
- empty text
- exact equality
- normalized equality
- prefix-only mutation
- too-close comparison failures
- register contract failures

Warnings may remain visible without blocking:

- borderline overlap
- borderline sentence length
- drift tendency indicators

## Merge Standard

If the validator fails, the PR does not merge. No manual exception should be required for ordinary content edits.
