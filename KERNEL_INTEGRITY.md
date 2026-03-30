# Kernel Integrity

This document defines the operational kernel that contains invalid states inside ChatPDM.

It sits beside, not instead of, the anti-corruption law set in [ANTI_CORRUPTION/ANTI_CORRUPTION_SYSTEM_LAW.md](./ANTI_CORRUPTION/ANTI_CORRUPTION_SYSTEM_LAW.md).

The distinction is deliberate:

- anti-corruption law defines what the system must not become
- kernel integrity defines how invalid states must be contained, refused, or marked before they can be served or acted upon

## Kernel Rules

### 1. Single Governed Access Path

Concept-serving runtime paths should consume validator-derived governance state before they expose or act on a concept.

The canonical governed path today is:

- validator artifact
- concept validation-state loader
- runtime resolver

### 2. Validator Supremacy

Validator output is the authoritative source for:

- structural completeness
- relation correctness
- law status
- enforcement status

Runtime must consume that result, not reinterpret it.

### 3. Runtime Obedience Is Mandatory

Runtime must use validator-derived state such as:

- `v3Status`
- `relationStatus`
- `lawStatus`
- `enforcementStatus`
- `systemValidationState`

Blocked concepts must not stay actionable.

### 4. Invalid States Must Not Propagate

If a concept is blocked or otherwise invalid in the canonical kernel path, it must not:

- resolve as a valid exact match
- remain in actionable candidate lists
- remain in related concept output as if it were normal
- continue into downstream concept use as if nothing happened

### 5. Blocking Means Blocking

If the validator says a concept cluster is blocked, runtime must treat that state as operationally real.

Blocking is not advisory.

### 6. No Silent Fallback Truth

Fallback relation data may exist only when it is:

- explicit
- traceable
- reported

Authored relations remain primary truth.

### 7. No Side Doors

New routes, services, or helpers must not create alternate concept-serving paths that bypass the governed kernel.

If a path serves concepts without consuming governance state, it is outside the kernel and should be treated as non-compliant.

### 8. Trace Is Required

Kernel decisions must remain reconstructable through:

- validator artifacts
- runtime governance state
- relation source markers
- enforcement traces

### 9. Invalid States Should Be Unrepresentable Where Possible

The kernel should normalize runtime state into safe flags and statuses so invalid states are harder to misuse accidentally.

Where the system cannot make them fully unrepresentable yet, it must make them explicit.

### 10. CI Must Defend the Kernel

Kernel compliance should be checked continuously.

CI is not just for syntax or build health. It must also defend:

- validator authority
- relation integrity
- runtime obedience in canonical paths
- refusal behavior for blocked states

## Current Boundary

The kernel is materially enforced in the canonical validator/runtime path, but it is not yet globally non-bypassable.

That means:

- the main runtime path is governed
- future non-compliant routes could still bypass that governance if they are added carelessly

See [KERNEL_INTEGRITY_INVARIANT_MAP.md](./KERNEL_INTEGRITY_INVARIANT_MAP.md) for the audit map, and [ANTI_CORRUPTION/INVARIANT_MAP.md](./ANTI_CORRUPTION/INVARIANT_MAP.md) for the drift-prevention law map.
