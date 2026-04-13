# Military Constraint Validation Contract

This contract defines the static validation rules for the Military Constraints Compiler contract pack.

It does not define runtime strategy logic.
It defines the conditions under which a compiled bundle may be admitted as valid and later evaluated.

## Validation order

1. bundle integrity validation
2. schema validation
3. required-fact completeness validation
4. predicate shape validation
5. authority graph validation
6. stage precedence validation
7. same-stage conflict validation

## Rule-shape contract

Every rule must contain:

- `ruleId`
- `version`
- `stage`
- `priority`
- `status`
- `effect`
- `scope`
- `authority`
- `requiredFacts`
- `predicate`
- `sourceRefs`

The rule shape is closed.
`additionalProperties` must be `false` everywhere appropriate.

## Required-fact contract

`requiredFacts` means facts that must exist before predicate evaluation begins.

That means:

- if a rule needs `target.militaryObjectiveStatus` to evaluate a comparison, it belongs in `requiredFacts`
- if a rule checks `exists(target.foo)` or `not_exists(target.foo)`, that fact must not be listed in `requiredFacts`
- a fact cannot be both a required precondition and the subject of an existence test in the same rule

This prevents impossible rules such as:

- `requiredFacts` includes `X`
- predicate checks `not_exists(X)`

If a rule needs to refuse because a fact is missing, the missing fact is expressed through the predicate and the rule effect is `REFUSED_INCOMPLETE`.

## Predicate contract

Allowed operators:

- `all`
- `any`
- `not`
- `eq`
- `neq`
- `gt`
- `gte`
- `lt`
- `lte`
- `in`
- `not_in`
- `exists`
- `not_exists`

Allowed operand forms:

- `{ fact: "dot.path" }`
- `{ value: ... }`

Predicate restrictions:

- no regex
- no custom functions
- no arithmetic expressions
- no fuzzy matching
- no semantic operators
- no confidence fields
- no scoring or weighting
- no runtime JavaScript evaluation

Type restrictions:

- `exists` and `not_exists` accept only `{ fact: "dot.path" }`
- `gt`, `gte`, `lt`, and `lte` accept only numeric or timestamp-compatible operands
- `in` and `not_in` require a scalar left operand and an array right operand
- `value` operands used for comparison must be numbers or `date-time` strings
- `value` operands used for membership must be arrays of scalar values

## Authority contract

Authority is explicit, not inferred.

The bundle must carry an authority graph.
Each rule must declare:

- the minimum authority level required
- whether explicit delegation is required
- which delegation edges are acceptable

Rules must not rely on implicit superiority or unstated delegation.

If a rule requires delegation and no explicit delegation path exists in the admitted authority graph, evaluation must refuse.

## Stage contract

Rule stages are limited to:

- `ADMISSIBILITY`
- `LEGAL_FLOOR`
- `POLICY_OVERLAY`

`BUNDLE_INTEGRITY` is not a normal rule stage.
It is validator logic before stage evaluation begins.

## Conflict contract

Bundle evaluation is refusal-first.

If two active rules conflict at the same stage and the bundle declares `sameStageConflictPolicy = REFUSE`, the bundle is invalid for runtime use.

The contract pack does not allow silent conflict resolution.

## Hashing contract

Canonical hashing is defined in [military-constraint-hashing-contract.md](./military-constraint-hashing-contract.md).

Bundle integrity validation must compare the stored `bundleHash` against the canonical hash of the bundle payload after derived fields are removed.

## Fact contract

Facts are structured only.
They are typed leaf fields with dot-path access.

Allowed leaf types:

- boolean
- string
- enum string
- bounded number
- timestamp
- arrays of scalars where explicitly justified

Not allowed:

- prose evidence fields
- freeform textual reasoning fields
- untyped nested blobs
- arbitrary runtime code

## Refusal contract

The runtime decision space remains closed:

- `ALLOWED`
- `REFUSED`
- `REFUSED_INCOMPLETE`

Refusal reasons must come from the closed reason-code enum in `military-constraint-reason-codes.js`.

