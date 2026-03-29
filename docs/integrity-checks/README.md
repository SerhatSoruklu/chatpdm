# Integrity Checks

This folder stores the append-only platform integrity evidence ledger for executable ChatPDM runtime checks.

It records measured runtime evidence. It does not define trust doctrine. That role belongs to `docs/TRUST_INTEGRITY_STACK.md`.

## Rotation Rule

- Each integrity volume may contain a maximum of `25` run blocks.
- After the 25th run block, the next run rotates into the next sequential volume.
- Closed volumes remain append-closed after rotation.
- Historical repair requires deliberate explicit tooling or manual correction.

## Naming Contract

- Volume files use the form `INTEGRITY_CHECK_NNN.md`.
- Numbering is zero-padded and sequential: `001`, `002`, `003`.

## Active Volume

- Latest active volume: [INTEGRITY_CHECK_001.md](./INTEGRITY_CHECK_001.md)

## Relationship To Trust Doctrine

- `docs/TRUST_INTEGRITY_STACK.md` defines the constitutional operational law above this ledger.
- `docs/INTERGRITY_RUNTIME_LAWS.md` defines the binding runtime-law constraints for deterministic truth, refusal boundaries, contract shape, and integrity recording.
- This folder remains subordinate runtime evidence, not doctrine.

## Volumes

- [INTEGRITY_CHECK_001.md](./INTEGRITY_CHECK_001.md)
