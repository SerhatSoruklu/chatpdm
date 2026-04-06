# Change Transparency

This document defines how ChatPDM classifies and reviews concept changes so register drift cannot hide inside ordinary edits.

## Commit Intent Prefixes

Every change set that affects concept meaning, register prose, reference standards, or structural content behavior should carry one of these prefixes:

- `[semantic-change]`
- `[register-change]`
- `[refactor]`
- `[golden-update]`

## Prefix Meanings

### `[semantic-change]`

Use when a concept boundary, exclusion, adjacent relation, or canonical anchor meaning changes.

This tag means review should focus on meaning movement, not only wording movement.

### `[register-change]`

Use when `standard`, `simplified`, or `formal` prose changes while canonical meaning is intended to remain the same.

This tag means review should focus on register separation, contract compliance, and drift risk.

### `[refactor]`

Use when the change is structural, tooling-oriented, or implementation-facing without intended movement in concept meaning or authored register behavior.

### `[golden-update]`

Use when the frozen golden set itself changes.

This tag should be rare. It means the reference surface is moving and requires deliberate review.

## Diff Lens

Review should not rely on ordinary line diff alone.

Use:

```bash
node scripts/diff-registers.js authority --ref origin/main
```

The diff lens shows:

- previous vs current, per register
- `standard` vs `simplified`
- `standard` vs `formal`

This keeps both vertical drift and horizontal collapse visible.

## Optional Local Warning

For local workflow, run:

```bash
npm run check:commit-intent -- --message "[register-change] authority tightening"
```

This is warning-only. It does not block by itself.

It exists to make missing intent visible before review.

## Review Standard

Every concept-facing PR should make it obvious:

- what type of change this is
- which concepts are affected
- whether meaning moved or only wording moved
- whether register separation improved, weakened, or stayed stable

## README Fixes

When editing `README.md` or other public Markdown docs:

- use real headings for section labels
- do not use bold or emphasis text as a heading surrogate
- keep heading structure MD036-safe so the README stays lint-clean
