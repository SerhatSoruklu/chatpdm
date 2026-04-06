# Lock 13 - Normalization Boundary Hardening

## Purpose

Keep the bounded normalization layer observable, regression-safe, and hard to drift.

This lock is about operations, not capability expansion.

## Rule

The normalization boundary stays fixed:

- canonicalize only the locked allowlist
- refuse ambiguous, malformed, too-deep, too-large, or non-text cases
- never widen transform scope without a spec revision

## Allowed Transform Set

- `surface_cleanup`
- `unicode_nfc`
- `percent_decode`
- `base64_decode`
- `hex_decode`
- `reverse_then_base64_decode`
- `reverse_then_hex_decode`

## Excluded Transform Classes

Do not add these without explicit spec revision:

- Base32, Base58, gzip, zlib, or other compression formats
- confusable/homoglyph folding
- transliteration or leetspeak normalization
- speculative or heuristic decoding
- branch search, ranking, or best-match transform selection
- OCR or file/attachment decoding

## Refusal Codes

- `NORMALIZATION_TOO_DEEP`
- `NORMALIZATION_TOO_LARGE`
- `NORMALIZATION_INVALID_ENCODING`
- `NORMALIZATION_AMBIGUOUS`
- `NORMALIZATION_NON_TEXT_OUTPUT`
- `NORMALIZATION_POLICY_BLOCKED`

## Metrics To Watch

- `normalization_attempt_total`
- `normalization_changed_total`
- `normalization_applied_total{transform}`
- `normalization_refused_total{code}`
- `normalization_depth_histogram`
- `normalization_output_expansion_ratio`
- `normalization_ambiguity_total`

## Suspicious Patterns

Watch for:

- spikes in `NORMALIZATION_INVALID_ENCODING`
- repeated ambiguous dual-valid payloads
- repeated max-depth probes
- large expansion-ratio outliers
- many changed attempts from one client or IP range

## Change Control

Any change below requires an explicit spec revision before implementation:

- adding a new transform
- changing transform order
- adding heuristic fallback behavior
- changing refusal semantics
- broadening output type support beyond the current text-only boundary

The point of the layer is boundary integrity, not decoder cleverness.
