# Output Validation & Exposure Gate

## Purpose

Phase 5 is the final integrity firewall.

It validates Phase 4 output before exposure and fails closed when structure is invalid.

## Input

- Phase 4 resolution-engine output

## Allowed Final States

- `valid`
- `refused`
- `classified`

## Deterministic Mapping

- `LIVE_RESOLUTION` -> `valid`
- `VISIBLE_INSPECTION` -> `valid`
- `STRUCTURAL_REJECTION` -> `refused`
- `NO_MATCH` -> `refused`
- `VOCAB_CLASSIFICATION` -> `classified`

## Output Shape

Successful validation returns:

```json
{
  "state": "valid",
  "type": "LIVE_RESOLUTION",
  "payload": {}
}
```

Failed validation returns:

```json
{
  "state": "refused",
  "reason": "output_validation_failed"
}
```

## Hard Constraints

The gate must enforce:

- no semantic alteration
- no fallback logic
- no cross-layer leakage
- no mixed states
- deterministic output only

Vocabulary classification must remain non-conceptual. If vocabulary payload leaks concept-facing fields, the gate refuses it.
