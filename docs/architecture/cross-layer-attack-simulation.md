# Cross-Layer Attack Simulation

## Purpose

Phase 9 simulates layer-contamination attempts across:

- vocabulary
- rejected
- visible-only
- live

The objective is to prove that mixed hostile language does not cause layer leakage.

## Fixture

Authored attack inputs live at:

- [phase-9-cross-layer-attacks.json](/home/serhat/code/chatpdm/tests/runtime/fixtures/phase-9-cross-layer-attacks.json)

## Pass Condition

An attack passes only if the system:

- refuses it
- or classifies it without concept promotion

and does not:

- map vocabulary into live concepts
- elevate rejected concepts
- blend live concepts together
- produce valid output from hostile mixed input

## Scripts

Runner:

- [run-cross-layer-attack-simulation.js](/home/serhat/code/chatpdm/backend/scripts/run-cross-layer-attack-simulation.js)

Verifier:

- [verify-cross-layer-attack-simulation.js](/home/serhat/code/chatpdm/backend/scripts/verify-cross-layer-attack-simulation.js)
