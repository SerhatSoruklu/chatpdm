# PACK_SPEC_V1

## 1. Purpose

This document defines the canonical v1 contract for military constraint packs admitted through the deterministic, refusal-first military-constraints compiler/runtime.

This document formalizes the pack discipline already implemented in the repository. It does not introduce a new runtime model, a new reasoning model, or a new authority model.

## 2. Scope

This specification applies to all packs admitted after the Pack 1 through Pack 5 baseline.

It governs manifest admission, reviewed-clause compilation, bundle assembly, hashing, runtime evaluation, and regression behavior.

Existing Pack 1 through Pack 5 artifacts remain the baseline reference implementation for this specification.

## 3. Core Invariants

The following invariants are mandatory and non-negotiable:

- Deterministic evaluation MUST produce the same outcome for the same admitted bundle and the same structured facts.
- The pack structure MUST be closed-world.
- Evaluation MUST be refusal-first.
- Runtime interpretation of prose, PDFs, or narrative text MUST NOT occur.
- Every runtime fact reference MUST resolve against an explicit fact schema.
- Pack hashing MUST be stable and canonical.
- Every executable rule MUST be source-linked.
- Any rule that uses authority semantics MUST have a declared authority graph path.
- Pack admission MUST fail if any invariant is violated.

## 4. Pack Structure (Canonical Shape)

The following JSON shows the canonical admission manifest shape for an admitted reference pack.

```json
{
  "packId": "mil-us-core-reference",
  "jurisdiction": "US",
  "bundleId": "mil-us-core-reference-bundle",
  "bundleVersion": "0.1.0",
  "reviewedClauseSetIds": [
    "legal-floor-core",
    "authority-core",
    "policy-overlay-core"
  ],
  "authorityGraphId": "AUTH-GRAPH-US-001",
  "sourceRegistryVersion": "1.0.0",
  "regressionSuiteVersion": "1.0.0"
}
```

The compiled bundle is derived from this manifest and MUST satisfy the compiled-bundle contract defined in this document.

## 5. Required Fields Contract

| Artifact | Field | Required | Meaning |
| --- | --- | --- | --- |
| Admission manifest | `packId` | Yes | Canonical immutable pack identifier. |
| Admission manifest | `jurisdiction` | Yes | Governing jurisdiction for source interpretation and bundle admission. |
| Admission manifest | `bundleId` | Yes | Canonical identifier for the compiled bundle artifact. |
| Admission manifest | `bundleVersion` | Yes | Semantic version of the compiled bundle artifact. |
| Admission manifest | `reviewedClauseSetIds` | Yes | Ordered reviewed-clause set identifiers used to compile the bundle. |
| Admission manifest | `authorityGraphId` | Yes | Authority-graph identifier required for compilation and validation. |
| Admission manifest | `sourceRegistryVersion` | Yes | Version of the source registry used for admission. |
| Admission manifest | `regressionSuiteVersion` | Yes | Version of the regression fixture set used for release checks. |
| Compiled bundle | `bundleId` | Yes | Canonical identifier copied from the admitted manifest. |
| Compiled bundle | `bundleVersion` | Yes | Semantic version copied from the admitted manifest. |
| Compiled bundle | `bundleHash` | Yes | Canonical SHA-256 integrity hash of the compiled bundle payload. |
| Compiled bundle | `status` | Yes | Bundle lifecycle state. |
| Compiled bundle | `jurisdiction` | Yes | Governing jurisdiction for the bundle. |
| Compiled bundle | `authorityOwner` | Yes | Declared owner of the authority model. |
| Compiled bundle | `precedencePolicy` | Yes | Deterministic stage ordering and conflict policy. |
| Compiled bundle | `factSchemaVersion` | Yes | Version of the fact schema used by runtime validation. |
| Compiled bundle | `authorityGraphId` | Yes | Authority-graph identifier copied from the manifest. |
| Compiled bundle | `authorityGraph` | Yes | Canonical authority graph used at runtime. |
| Compiled bundle | `sourceRegistrySnapshot` | Yes | Canonical source snapshot projected from the source registry. |
| Compiled bundle | `rules` | Yes | Deterministic executable rule set. |
| Compiled bundle | `compiledAt` | Yes | Compilation timestamp used for release provenance and excluded from hashing. |
| Compiled bundle | `notes` | No | Non-executing descriptive metadata only. |

FAIL IF any required field is missing, empty, or internally inconsistent with the manifest, source registry, authority graph, or compiled bundle produced from it.

## 6. Forbidden Properties

The following properties are forbidden in an admitted pack or compiled bundle:

- Probabilistic scoring.
- Fuzzy matching.
- Confidence fields used for decision making.
- Hidden runtime-only fields.
- Undeclared top-level fields in the manifest or bundle schema.
- Undeclared rule fields in executable objects.
- Natural-language explanation fields inside executable rule logic.
- Source-less rule definitions.
- Rules that reference facts outside the declared fact schema.
- Open-world fact allowance in the executable path.
- Runtime AI inference.
- Runtime prose interpretation.
- Silent rule override behavior.
- Any field excluded from hashing without explicit classification as derived or non-executing.

FAIL IF any forbidden property appears in the admitted pack or in the compiled bundle derived from it.

## 7. Source Contract

The source registry is the authoring and validation input for admission.

Every source registry entry MUST define:

- `sourceId`
- `title`
- `localPath`
- `jurisdiction`
- `role`
- `authorityTier`
- `admissibility`
- `extractionQuality`
- `exampleOnly`

The following fields are permitted when present:

- `sourceVersion`
- `trustTier`
- `locator`
- `normativeOverride`
- `notes`

Source registry rules:

- `sourceId` MUST be unique within the registry.
- `jurisdiction` MUST be explicit.
- `role` MUST be one of `LEGAL_FLOOR`, `ROE_STRUCTURE`, `DOCTRINE_FRAME`, `EXAMPLE_ONLY`, or `EXTRACTION_AID`.
- `authorityTier` MUST be one of `NORMATIVE`, `STRUCTURAL`, `EXAMPLE`, or `METHODOLOGY`.
- `admissibility` MUST be one of `ADMISSIBLE`, `ADMISSIBLE_AFTER_REPAIR`, `BOUNDED_EXAMPLE`, or `NOT_LEGAL_SOURCE`.
- `extractionQuality` MUST be one of `HIGH`, `MEDIUM`, `LOW`, `NOISY`, or `OCR_HEAVY`.
- `exampleOnly` MUST be true when the role is `EXAMPLE_ONLY`.
- `normativeOverride` MUST be true when an example-only source is explicitly allowed to support a normative compilation path.

The compiled bundle MUST carry a projected `sourceRegistrySnapshot` containing only:

- `sourceId`
- `role`
- `sourceVersion`
- `trustTier`
- `locator`
- `notes`

Source admission rules:

- Every source referenced by a rule MUST exist in the source registry.
- Every source used in a compiled bundle MUST match the bundle jurisdiction.
- A source with role `EXAMPLE_ONLY` MUST NOT enter the compilable corpus unless `normativeOverride` is explicitly true.
- A source reference that resolves only by inference or fuzzy matching MUST fail admission.

FAIL IF:

- a source has no `sourceId`
- a source has no `title`
- a source has no `localPath`
- a source has no `jurisdiction`
- a source has no `role`
- a source has no `authorityTier`
- a source has no `admissibility`
- a source has no `extractionQuality`
- a source has no `exampleOnly`
- two sources share the same `sourceId`
- a rule references an unknown source
- a referenced source jurisdiction does not match the bundle jurisdiction
- an example-only source enters the compilable corpus without explicit normative override

## 8. Fact Schema Contract

The fact schema MUST be explicit, closed, typed, and sufficient for every referenced predicate.

The bundle fact schema MUST validate the runtime fact packet before rule evaluation and MUST include the following top-level required fields:

- `bundleId`
- `bundleVersion`
- `bundleHash`
- `actor`
- `action`
- `target`
- `context`
- `threat`
- `civilianRisk`
- `authority`

The fact schema MAY include additional fields only when they are explicitly declared and closed.

The fact schema MUST:

- validate all runtime facts used by executable rules
- declare every fact path used by the pack
- reject undeclared runtime facts
- reject open-ended arbitrary fact input
- distinguish required facts from optional facts
- define any derived fact path explicitly if a derived path is allowed
- remain compatible with deterministic bundle identity checks

The fact schema MUST NOT:

- permit arbitrary blobs in the executable path
- allow undeclared fact paths to influence evaluation
- allow derived facts without explicit derivation semantics
- allow runtime interpretation to substitute for schema coverage

FAIL IF:

- a rule references an undeclared fact path
- a required fact path is missing from the schema
- the schema allows open-world input in the executable path
- a derived fact is used without a declared derivation contract
- the schema cannot validate the runtime fact packet deterministically
- the runtime fact packet does not match the bundle identity fields

## 9. Rule Contract

Every rule MUST define:

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

Rule requirements:

- `ruleId` MUST be unique within the pack.
- `version` MUST be an integer greater than or equal to 1.
- `stage` MUST be one of `ADMISSIBILITY`, `LEGAL_FLOOR`, or `POLICY_OVERLAY`.
- `priority` MUST be a non-negative integer.
- `status` MUST be one of `ACTIVE`, `INACTIVE`, or `SUPERSEDED`.
- `effect.decision` MUST be one of `ALLOWED`, `REFUSED`, or `REFUSED_INCOMPLETE`.
- `effect.reasonCode` MUST resolve to the closed military-constraint reason-code enum.
- `scope` MUST remain within the declared jurisdiction and domain context.
- `scope.domains` MUST use only the declared domain enum values supported by the runtime.
- `sourceRefs` MUST resolve to declared entries in `sources`.
- `predicate` MUST be deterministic and machine-evaluable.
- `predicate` MUST conform to a finite, schema-validated predicate grammar supported by the runtime.
- `authority` MUST be present when the rule depends on authority or delegation semantics.
- `authority.minimumLevelId` MUST reference a declared authority level when authority semantics are used.
- `authority.delegationEdgeIds` MUST reference declared delegation edges when delegation is required.
- `priority` MUST participate only in deterministic ordering where the runtime already uses ordering.

The supported predicate grammar MUST remain finite and schema-validated.

The runtime predicate operator set MUST be limited to:

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

The runtime MUST accept only operand forms that the schema defines, including:

- `{ fact: "dot.path" }`
- `{ value: ... }`

FAIL IF:

- `ruleId` is missing
- `ruleId` is duplicated
- `version` is missing or invalid
- `stage` is invalid
- `priority` is missing or negative
- `status` is invalid
- `sourceRefs` is missing or unresolved
- `predicate` contains undeclared operators
- `predicate` contains runtime-evaluated expressions
- `predicate` contains non-schema-defined structures
- `effect` resolves outside the closed outcome model
- `scope` crosses outside the declared pack scope
- `authority` is required but absent
- `authority.minimumLevelId` is unresolved
- `authority.delegationEdgeIds` reference unknown delegation edges

Same-stage conflicting active rules MUST cause validation failure.

## 10. Stage Semantics

Stage order MUST be fixed as:

1. `ADMISSIBILITY`
2. `LEGAL_FLOOR`
3. `POLICY_OVERLAY`

`BUNDLE_INTEGRITY` is a pre-evaluation validation state, not a rule stage.

Stage behavior:

- `ADMISSIBILITY` MUST check whether the fact packet is sufficient for evaluation.
- `ADMISSIBILITY` MUST produce refusal-incomplete behavior when required facts are missing.
- `ADMISSIBILITY` MUST NOT emit policy interpretation.
- `LEGAL_FLOOR` MUST enforce non-overridable legal constraints.
- `LEGAL_FLOOR` MUST dominate `POLICY_OVERLAY`.
- `POLICY_OVERLAY` MAY further restrict admissible behavior.
- `POLICY_OVERLAY` MUST NOT weaken or relax a `LEGAL_FLOOR` refusal.

Rule evaluation order within a bundle MUST be deterministic and MUST sort by stage order, then priority descending, then ruleId lexicographic order.

FAIL IF:

- a pack reorders the stage sequence
- a later stage attempts to override an earlier refusal
- `POLICY_OVERLAY` weakens a legal-floor decision
- missing required facts are evaluated as if they were present
- two rules in the same stage produce conflicting outcomes for the same predicate space

## 11. Refusal Semantics

The only allowed runtime outcomes are:

- `ALLOWED`
- `REFUSED`
- `REFUSED_INCOMPLETE`

Outcome rules:

- `ALLOWED` MUST be returned only when all required facts are present and no applicable rule refuses.
- `REFUSED` MUST be returned when the bundle evaluates complete facts and the result is disallowed.
- `REFUSED_INCOMPLETE` MUST be returned when required facts are missing or the fact packet is insufficient for evaluation.
- Missing required facts MUST NOT produce `ALLOWED`.
- Unresolved authority MUST NOT pass silently.
- Same-stage conflicts MUST fail validation before runtime admission.
- Bundle-integrity failures MUST be surfaced as `failedStage = BUNDLE_INTEGRITY`.
- Bundle-integrity failures MUST return `REFUSED` unless the failure is caused by incomplete fact input, in which case `REFUSED_INCOMPLETE` applies.

FAIL IF:

- the runtime returns an outcome outside the closed set
- incomplete facts produce `ALLOWED`
- unresolved authority is treated as admissible
- same-stage conflict behavior is ambiguous or non-deterministic
- bundle identity mismatches are hidden from the runtime result

## 12. Authority Graph Contract

If authority semantics are used by any rule, the bundle MUST declare an authority graph.

Authority semantics are considered used if any rule contains:

- an `authority` field
- a delegation requirement
- a minimum authority level requirement
- a reference to authority levels or delegation edges

The authority graph MUST contain:

- a canonical `authorityGraphId`
- a `version`
- a `status`
- `levels`
- `delegationEdges`

Authority graph rules:

- every authority reference in a rule MUST resolve to a declared graph level or delegation edge
- delegation MUST be explicit
- authority resolution MUST be deterministic
- the graph MUST not rely on inferred superiority
- the graph MUST not rely on unstated delegation

`levels` entries MUST define:

- `levelId`
- `rank`

`delegationEdges` entries MUST define:

- `edgeId`
- `fromLevelId`
- `toLevelId`
- `actionKinds`
- `forceLevels`

FAIL IF:

- authority semantics are used and no authority graph is declared
- a rule references authority with no authority graph
- a rule references an unknown authority level
- a rule references an unknown delegation edge
- a delegation edge is missing or unresolved
- the graph contains an invalid cycle where cycles are forbidden by runtime rules
- authority resolution depends on guesswork or unstated precedence

## 13. Deterministic Hashing Contract

The bundle MUST be hash-stable.

Canonical hashing MUST use the compiled bundle payload after canonical serialization.

Canonical serialization MUST:

- encode JSON as UTF-8
- sort object keys lexicographically at every object depth
- preserve the canonical array order established by bundle assembly
- exclude only fields explicitly declared as derived or non-executing
- produce a stable byte sequence for the same executable content

Bundle assembly canonicalizes the following data before hashing:

- `rules` sorted by stage order, then priority descending, then ruleId lexicographic order
- `sourceRegistrySnapshot` sorted by source role priority, then sourceId lexicographic order
- `authorityGraph.levels` sorted by rank descending, then levelId lexicographic order
- `authorityGraph.delegationEdges` sorted by edgeId lexicographic order
- rule-level arrays such as `requiredFacts`, `authority.delegationEdgeIds`, `scope.domains`, `scope.missionTypes`, and `scope.actionKinds` normalized to deterministic order

Hashing rules:

- the canonical digest MUST be SHA-256
- the hash MUST change when executable content changes
- the hash MUST NOT depend on incidental storage order
- the hash MUST NOT depend on derived-only presentation fields
- the hash MUST be reproducible across process runs
- the current hash exclusion set MUST include `bundleHash` and `compiledAt`

FAIL IF:

- the bundle cannot be serialized deterministically
- the hash changes because of unstable key ordering
- derived-only fields alter executable identity
- a field is excluded from hashing without explicit classification
- canonical payload reproduction is not exact

## 14. Validation Classes

The validator MUST classify checks into the following categories:

| Validation class | Meaning |
| --- | --- |
| Structural | Shape, required fields, enums, identifiers, and object closure. |
| Referential | Source, fact, rule, and authority linkage integrity. |
| Semantic | Stage semantics, legal-floor dominance, fact sufficiency, and refusal rules. |
| Deterministic | Canonical serialization, ordering stability, and hash reproducibility. |
| Regression | Snapshot parity, expected decision stability, and drift detection. |

FAIL IF any validation class fails.

## 15. Admission Contract

A pack is admitted only when all of the following are true:

- The admission manifest is structurally valid.
- The reviewed clause corpus validates against the source registry.
- The compiled rules validate against schema and semantic checks.
- The authority graph validates against the bundle and the rule authority references.
- The compiled bundle hash matches the canonical hash.
- The bundle passes regression checks.
- The compiled artifact is emitted through the existing manifest and lifecycle path.

Admission rules:

- File presence alone MUST NOT constitute admission.
- Manual approval alone MUST NOT constitute admission.
- A pack MUST NOT be treated as admitted until the validator-backed lifecycle path succeeds.
- Admitted packs MUST remain immutable after release unless a new bundle version is issued.

FAIL IF any admission criterion is unmet.

## 16. Non-Goals

This specification is not:

- a targeting advisor
- a strategy system
- a natural-language interpreter
- a probabilistic matcher
- a fuzzy classifier
- a dynamic doctrine merger
- an open-world legal reasoning engine
- a runtime AI assistant
- a general concept resolver

Any behavior in those categories MUST be rejected by the compiler/runtime boundary.

## 17. Compatibility Note

This specification formalizes the existing Pack 1 through Pack 5 system behavior already implemented in the repository.

It preserves the existing deterministic runtime model, refusal-first semantics, source-backed validation path, and authority-aware bundle discipline.

Future packs MUST conform to this contract without changing the current bundle or runtime contract.
