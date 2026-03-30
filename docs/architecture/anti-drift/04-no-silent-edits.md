# Lock 4 - No Silent Edits

## Purpose

Make register and meaning changes visible in review.

Drift often enters through small edits that appear harmless because their intent is not stated.

## Rule

Register-affecting edits should carry explicit intent in the commit or PR framing.

Suggested tags:

- `[register-change]`
- `[semantic-change]`

Examples:

- `[register-change] authority - simplified tightening`
- `[semantic-change] power - adjust boundary vs legitimacy`

## What It Protects

This lock prevents:

- hidden meaning edits
- ambiguous review scope
- low-signal prose changes that bypass proper scrutiny

## Review Standard

Use the intent tag to determine review depth:

- `register-change`: validator plus human register review
- `semantic-change`: harder review against canonical anchors and adjacent concepts

## Merge Standard

If the change affects register behavior or meaning boundaries, the intent should be visible from the commit or PR, not inferred after the fact.
