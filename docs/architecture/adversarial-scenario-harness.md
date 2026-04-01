# Adversarial Scenario Harness

## Purpose

Phase 6 attacks the full `0 -> 5` pipeline end to end.

This is proof work, not ontology expansion.

## Scope

Each adversarial scenario runs through:

- Phase 0 normalization
- Phase 1 vocabulary recognition
- Phase 2 admission gate
- Phase 3 concept-state routing
- Phase 4 resolution engine
- Phase 5 output validation and exposure

## Output Contract

The harness records only:

- `input`
- `final_state`
- `phase_path`
- `violation`

## Failure Conditions

The harness marks a scenario as violated when:

- inference appears
- vocabulary leaks into concept space
- rejected content is softened
- mixed hostile input produces a valid concept result
- the final gate fails closed with `output_validation_failed`

## Current Fixture

The authored adversarial fixture lives at:

- [phase-6-adversarial-scenarios.json](/home/serhat/code/chatpdm/tests/runtime/fixtures/phase-6-adversarial-scenarios.json)

The current fixture now includes:

- mixed hostile concept inputs
- indirect rejected-concept pressure
- vocabulary leakage pressure
- structural paradox pressure against the locked six-core

Structural paradox scenarios are expected to refuse rather than invent:

- authority without legitimacy
- conflicting duties without priority
- responsibility without identifiable actor
- law without enforceable authority or power
- retroactive legitimacy change

The harness runner prints structured JSON results:

- [run-adversarial-scenario-harness.js](/home/serhat/code/chatpdm/backend/scripts/run-adversarial-scenario-harness.js)

The verification script fails the build if any scenario leaks:

- [verify-adversarial-scenario-harness.js](/home/serhat/code/chatpdm/backend/scripts/verify-adversarial-scenario-harness.js)
