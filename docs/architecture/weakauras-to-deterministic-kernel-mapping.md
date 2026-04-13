# WeakAuras to Deterministic Kernel Mapping

WeakAuras is a flexible trigger/action system. ChatPDM military constraints is not. The only useful transfer is the idea of compositional checks arranged in a clear order. Everything else must stay out.

## What WeakAuras Is Structurally Good At

- Expressing conditions as explicit blocks rather than hidden logic
- Grouping related checks into readable, layered structures
- Making the decision path legible to a human reviewer
- Separating condition structure from downstream outcome

## What Must Not Be Copied

- Event-driven triggers
- Custom scripts or user-defined logic
- Side effects
- Runtime extensibility hooks
- Loose condition matching
- Soft activation behavior
- Any model that treats partial matches as success

## Safe Mapping Table

| WeakAuras concept | Unsafe property | Safe deterministic replacement |
| --- | --- | --- |
| Trigger | Fires on events and can be flexible | Fixed staged gate in a validated bundle |
| Condition block | May be interpreted permissively | Typed predicate over structured facts only |
| Action | Can mutate state or cause side effects | Typed refusal or allow decision only |
| Grouping | May be open-ended and user-defined | Canonical rule grouping with fixed precedence |
| Activation | Often based on runtime conditions | Bundle admission plus gate evaluation |
| Missing data handling | Can be implicit or ignored | `REFUSED_INCOMPLETE` |
| Match success | Can be partial or heuristic | Exact match or refusal |
| Human readability | Often built for live reaction | Trace-only explanation of the gate path |

## Final Model for ChatPDM

ChatPDM should model military constraints as:

- validated bundle
- staged gates
- typed refusal or allow
- trace only

That means:

- bundle admission happens before evaluation
- each gate runs in a fixed order
- missing required facts refuse immediately
- no gate can silently invent meaning
- no runtime behavior is allowed beyond deterministic evaluation and trace emission

The useful lesson from WeakAuras is structural: make the checks visible and layered. The unusable part is the flexibility. ChatPDM keeps the structure and rejects the flexibility.
