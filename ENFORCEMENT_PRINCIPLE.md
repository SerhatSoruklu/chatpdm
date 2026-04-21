# Enforcement Principle

This note defines the operational enforcement stance for the ChatPDM kernel.

It complements:

- [KERNEL_INTEGRITY.md](./KERNEL_INTEGRITY.md)
- [KERNEL_INTEGRITY_INVARIANT_MAP.md](./KERNEL_INTEGRITY_INVARIANT_MAP.md)
- [ANTI_CORRUPTION/ANTI_CORRUPTION_SYSTEM_LAW.md](./ANTI_CORRUPTION/ANTI_CORRUPTION_SYSTEM_LAW.md)

## Principle

Validation decides.
Runtime obeys.

## Document Role

- Role: controlling enforcement principle for the kernel runtime.
- Scope: how validator output is consumed and enforced at runtime.
- Governs: refusal, blocking, and non-reinterpretation of validator state.
- Does not govern: canonical meaning authoring, policy-page structure, or roadmap sequencing.
- Related docs: [KERNEL_INTEGRITY.md](./KERNEL_INTEGRITY.md), [KERNEL_INTEGRITY_INVARIANT_MAP.md](./KERNEL_INTEGRITY_INVARIANT_MAP.md), [document-authority-index.md](./docs/meta/document-authority-index.md).
- Precedence: this principle refines runtime obedience; it does not replace validator output or the kernel law that consumes it.

If validator output marks a state as blocked, runtime must not treat that state as normal, actionable, or equivalent to a valid concept.

## Operational Rules

### 1. No Reinterpretation

Runtime must consume validator-derived state.

It must not invent a second law layer, a second validity layer, or a more permissive interpretation.

### 2. Blocking Is Operational

`blocked` is not a warning.

It means:

- do not resolve as a valid concept
- do not keep the state actionable
- do not allow downstream use as if the block did not exist

### 3. Degradation Must Stay Visible

If a state is structurally incomplete or warning-bearing, runtime must keep that condition explicit.

It must not silently upgrade the state into apparent normality.

### 4. Fallback Must Stay Explicit

Fallback truth may exist only when:

- its source is visible
- its use is traceable
- strict mode can disable it

### 5. Refusal Is a Correct Outcome

If the kernel cannot safely allow the state to propagate, refusal is the correct response.

Usability does not outrank enforcement.

### 6. Canonical Path Over Convenience

Any new concept-serving path must follow the governed path rather than inventing a shortcut around:

- validator artifacts
- governance state
- enforcement flags
- runtime traces

## Current Limitation

The canonical runtime path obeys these rules.

The repo does not yet make every future path obey them automatically.

That is a kernel hardening gap, not a reason to weaken the principle.
