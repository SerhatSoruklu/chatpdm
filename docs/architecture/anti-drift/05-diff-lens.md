# Lock 5 - Diff Lens

## Purpose

Separate wording changes from meaning changes during review.

Normal diffs show line edits, but they do not automatically show whether register separation improved, collapsed, or drifted.

## Rule

Before merging register changes, inspect two comparison views:

- current register versus previous version
- register versus register inside the same concept

## Required Comparisons

For version-to-version review:

- `standard` vs previous `standard`
- `simplified` vs previous `simplified`
- `formal` vs previous `formal`

For same-version integrity review:

- `standard` vs `simplified`
- `standard` vs `formal`
- `simplified` vs `formal`

## What It Protects

This lock prevents:

- accidental collapse between registers
- unnoticed meaning movement during wording edits
- review that focuses only on changed lines instead of changed behavior

## Review Questions

Ask these directly:

- what changed in wording
- what changed in register profile
- what changed in concept boundary

If the answer to the last question is "nothing," that should be demonstrable.
