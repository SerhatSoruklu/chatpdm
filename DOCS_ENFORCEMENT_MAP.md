# Docs Enforcement Map

This file classifies the current [`/docs`](./docs) tree by enforcement reality, not by title or intention.

It answers:

- which docs already govern system behavior
- which docs define rules that should be mapped into code
- which docs are descriptive and do not need enforcement

This map covers `docs/` only. It does not replace the root-level law and invariant sets under [ANTI_CORRUPTION](./ANTI_CORRUPTION) or the root kernel-integrity docs.

## Authority Lock

- This file is the authoritative shared enforcement map for the repository `docs/` tree.
- Any durable finding, classification change, contradiction, priority change, or conversion decision discovered in local notes must be promoted here before it is treated as shared truth.
- Any durable finding must be promoted before:
  - a commit is finalized
  - a PR is opened
  - or a related code change is merged
- Local-only notebooks may assist analysis, but they must not be the only place where a standing decision lives.
- If a local note and this file diverge, this file remains the shared source of truth until it is explicitly updated.

## Summary

| Category | Count |
| --- | ---: |
| `ENFORCED` | 26 |
| `MAPPABLE` | 26 |
| `DECORATIVE` | 17 |
| Total | 69 |

## Classification Legend

- `ENFORCED`: already connected to runtime behavior, validation logic, guards, schema checks, or pipeline constraints
- `MAPPABLE`: defines rules or invariants that should be enforced but are not yet fully mapped to code
- `DECORATIVE`: explanatory, narrative, historical, or philosophical; no direct enforcement target

## ENFORCED

| file_path | reason |
| --- | --- |
| [docs/INTERGRITY_RUNTIME_LAWS.md](./docs/INTERGRITY_RUNTIME_LAWS.md) | Its runtime laws map to live refusal, contract-shape, and governance-state behavior in the canonical resolver path. |
| [docs/architecture/anti-drift/01-canonical-anchor.md](./docs/architecture/anti-drift/01-canonical-anchor.md) | Canonical-anchor presence and parity are already checked by register-validation logic. |
| [docs/architecture/anti-drift/02-validator-blocks-merge.md](./docs/architecture/anti-drift/02-validator-blocks-merge.md) | Validator gating already exists in the register-validation / CI path. |
| [docs/architecture/anti-drift/03-golden-concept-set.md](./docs/architecture/anti-drift/03-golden-concept-set.md) | Golden snapshot and drift reporting already exist in the validator pipeline. |
| [docs/architecture/anti-drift/04-no-silent-edits.md](./docs/architecture/anti-drift/04-no-silent-edits.md) | Silent-edit risks are already surfaced through edit-discipline, diff, and audit workflow logic. |
| [docs/architecture/anti-drift/05-diff-lens.md](./docs/architecture/anti-drift/05-diff-lens.md) | Concept diffing and change-type/risk derivation already exist in governance tooling. |
| [docs/architecture/anti-drift/06-derived-exposure-only.md](./docs/architecture/anti-drift/06-derived-exposure-only.md) | Exposure is already derived from validation/runtime state rather than hand-authored output. |
| [docs/architecture/anti-drift/07-drift-alarm-metrics.md](./docs/architecture/anti-drift/07-drift-alarm-metrics.md) | Drift metrics and alert categories are already emitted by `validate-registers`. |
| [docs/architecture/anti-drift/08-no-single-register-edits.md](./docs/architecture/anti-drift/08-no-single-register-edits.md) | Single-register edit discipline already emits a dedicated warning signal. |
| [docs/architecture/query-normalization-rules.md](./docs/architecture/query-normalization-rules.md) | Normalizer, matcher, and query-shape classifier already implement this contract. |
| [docs/architecture/v1-concept-scope.md](./docs/architecture/v1-concept-scope.md) | Governance-scope enforcement and refusal behavior already implement the live scope boundary. |
| [docs/boundary-integrity.md](./docs/boundary-integrity.md) | Query-shape, refusal, and scope boundaries are already active in runtime behavior. |
| [docs/contrast-matrix-v1.md](./docs/contrast-matrix-v1.md) | The key contrast pairs are now validator-bound through boundary-collapse checks. |
| [docs/product/legal-validator.pipeline-contract.md](./docs/product/legal-validator.pipeline-contract.md) | The legal-validator pipeline has live service/pipeline enforcement and tests. |
| [docs/product/legal-validator.service-contracts.md](./docs/product/legal-validator.service-contracts.md) | Service contracts are reflected in backend module boundaries and test coverage. |
| [docs/product/response-contract.md](./docs/product/response-contract.md) | The runtime response contract is enforced through schema validation and response assertion. |
| [docs/product/response-schema.json](./docs/product/response-schema.json) | It is the live schema used by product-response validation and tests. |
| [docs/product/schema-validation.md](./docs/product/schema-validation.md) | It describes an active schema-validation path that already exists in code. |
| [docs/public/audit-system.md](./docs/public/audit-system.md) | Audit-record creation and append-only storage are already implemented. |
| [docs/public/canonical-anchor-contract.md](./docs/public/canonical-anchor-contract.md) | Canonical anchor requirements are already enforced by validators. |
| [docs/public/concept-lifecycle.md](./docs/public/concept-lifecycle.md) | Lifecycle states and promotion flow are already represented in governance workflow code. |
| [docs/public/golden-standard.md](./docs/public/golden-standard.md) | Golden-standard behavior already maps to golden snapshot and drift checks. |
| [docs/public/policy-claim-registry.md](./docs/public/policy-claim-registry.md) | Policy claims are registry-backed and validated through generator/governance scripts. |
| [docs/public/promotion-flow.md](./docs/public/promotion-flow.md) | Promotion and publish flow are already implemented in workflow code. |
| [docs/public/register-contract.md](./docs/public/register-contract.md) | Register invariants and exposure rules already map to validator logic. |
| [docs/public/semantic-anchor-contract.md](./docs/public/semantic-anchor-contract.md) | Semantic-anchor requirements already map to invariance and parity checks. |

## MAPPABLE

| file_path | priority | candidate | what_to_enforce | reason |
| --- | --- | --- | --- | --- |
| [docs/architecture/concept-review-checklist.md](./docs/architecture/concept-review-checklist.md) | `medium` | `pipeline` | Require checklist/result attachment or equivalent review-state proof before publish. | Review obligations are still mostly manual. |
| [docs/architecture/concept-writing-standard.md](./docs/architecture/concept-writing-standard.md) | `high` | `validator` | Codify prose/field constraints and forbidden authoring patterns. | It defines stricter writing rules than current validators enforce. |
| [docs/architecture/examples/normalized-query-examples.md](./docs/architecture/examples/normalized-query-examples.md) | `medium` | `pipeline` | Convert examples into runtime normalization fixtures. | These examples define behavior but are not a formal test source. |
| [docs/architecture/failure-modes.md](./docs/architecture/failure-modes.md) | `medium` | `validator` | Map documented failure modes to explicit reason/error taxonomy. | It defines failure classes that are not yet fully aligned to runtime/validator codes. |
| [docs/architecture/phase-1-mapping-entry-contract.md](./docs/architecture/phase-1-mapping-entry-contract.md) | `medium` | `schema` | Add a mapping-entry schema and CI validation. | It is a contract document without a live schema gate. |
| [docs/architecture/responsive-layout.md](./docs/architecture/responsive-layout.md) | `medium` | `pipeline` | Lint or verify allowed breakpoint bands in frontend styles/templates. | Breakpoint rules are documented but not machine-enforced. |
| [docs/authoring/phase-6-concept-authoring-and-validation.md](./docs/authoring/phase-6-concept-authoring-and-validation.md) | `medium` | `pipeline` | Enforce authoring packet completeness and phase prerequisites. | It defines authoring flow beyond what the current validators guarantee. |
| [docs/authoring/phase-6-pairwise-stress-testing.md](./docs/authoring/phase-6-pairwise-stress-testing.md) | `medium` | `pipeline` | Require pairwise verifier coverage for each mandated concept pair. | Some pairs are enforced, but the full required stress regimen is not. |
| [docs/conceptual-reference-stack.md](./docs/conceptual-reference-stack.md) | `medium` | `other` | Require source-priority proof in authoring/review workflow. | Source-priority law is still review guidance, not validator-backed. |
| [docs/data-model/concepts-and-sources.md](./docs/data-model/concepts-and-sources.md) | `medium` | `schema` | Formalize authored concept/source packet schema. | The concept/source model is documented but not fully schema-bound. |
| [docs/data-model/legal-argument-validator-entities.md](./docs/data-model/legal-argument-validator-entities.md) | `medium` | `schema` | Bind entity model fields to explicit schemas/contracts. | Entity definitions outpace formal schema enforcement. |
| [docs/data-model/schemas/doctrine-artifact.schema.json](./docs/data-model/schemas/doctrine-artifact.schema.json) | `medium` | `schema` | Validate doctrine artifacts against this JSON schema in CI/runtime. | The schema file exists but is not the live validation source. |
| [docs/data-model/schemas/override-record.schema.json](./docs/data-model/schemas/override-record.schema.json) | `medium` | `schema` | Validate override records against this JSON schema in CI/runtime. | The schema file exists but is not the live validation source. |
| [docs/git-push-workflow.md](./docs/git-push-workflow.md) | `medium` | `pipeline` | Add branch/publish safety checks that reflect the documented workflow. | It defines contributor workflow rules but relies on convention. |
| [docs/local-change-cascade-rule.md](./docs/local-change-cascade-rule.md) | `medium` | `pipeline` | Add diff-based cascade detection and warnings. | Cascade thresholds are policy, not a live guard. |
| [docs/product/examples/ambiguous_match.json](./docs/product/examples/ambiguous_match.json) | `medium` | `schema` | Validate it against `response-schema.json` and runtime fixture expectations. | The contract example can drift from runtime because it is not in the enforced fixture path. |
| [docs/product/examples/concept_match.json](./docs/product/examples/concept_match.json) | `medium` | `schema` | Validate it against `response-schema.json` and runtime fixture expectations. | The contract example can drift from runtime because it is not in the enforced fixture path. |
| [docs/product/examples/no_exact_match.json](./docs/product/examples/no_exact_match.json) | `medium` | `schema` | Validate it against `response-schema.json` and runtime fixture expectations. | The contract example can drift from runtime because it is not in the enforced fixture path. |
| [docs/product/legal-argument-validator-acceptance-matrix.md](./docs/product/legal-argument-validator-acceptance-matrix.md) | `high` | `pipeline` | Map each acceptance row to test coverage. | Acceptance criteria should be executable, not only written. |
| [docs/product/legal-argument-validator-laws.md](./docs/product/legal-argument-validator-laws.md) | `high` | `validator` | Promote legal-validator laws into rule and reason-code enforcement. | It declares subsystem laws that are not all encoded as explicit rule checks. |
| [docs/product/legal-argument-validator-phase-controls.md](./docs/product/legal-argument-validator-phase-controls.md) | `medium` | `pipeline` | Enforce allowed phase/wave execution in CI/runtime flags. | Phase authorization is documented but not globally gated. |
| [docs/product/legal-validator.failure-ownership.md](./docs/product/legal-validator.failure-ownership.md) | `medium` | `other` | Require ownership tagging and escalation on failing validator paths. | Ownership rules are process law, not system-enforced. |
| [docs/product/version-bump-policy.md](./docs/product/version-bump-policy.md) | `high` | `pipeline` | Fail when response/schema/contract changes lack the required version bump. | Version-bump policy is still manual and can drift behind contract changes. |
| [docs/public/change-transparency.md](./docs/public/change-transparency.md) | `medium` | `pipeline` | Enforce change-classification metadata in PR/commit flow. | Change-prefix and transparency rules are not automatically checked. |
| [docs/public/review-law.md](./docs/public/review-law.md) | `high` | `pipeline` | Require review-state and change-type gating before promotion/publish. | Review law is strong but not universally wired into publish flow. |
| [docs/seo-policy.md](./docs/seo-policy.md) | `high` | `pipeline` | Add route/meta verification against SEO policy. | SEO rules exist, but there is no global validator ensuring route/title/description compliance. |

## DECORATIVE

| file_path | reason |
| --- | --- |
| [docs/architecture/architecture-philosophy.md](./docs/architecture/architecture-philosophy.md) | Architectural rationale, not a machine-enforceable contract. |
| [docs/architecture/aware-failure-discovery.md](./docs/architecture/aware-failure-discovery.md) | Conceptual framing rather than a live rule surface. |
| [docs/architecture/examples/concept-writing-examples.md](./docs/architecture/examples/concept-writing-examples.md) | Pure examples for authors, not contract-bearing artifacts. |
| [docs/architecture/governance/execution-analogy.md](./docs/architecture/governance/execution-analogy.md) | Analogy and explanation only. |
| [docs/architecture/theme-direction.md](./docs/architecture/theme-direction.md) | Visual direction guidance, not a current enforcement target. |
| [docs/authoring/phase-6-review-template.md](./docs/authoring/phase-6-review-template.md) | Template artifact, not a runtime/validator contract. |
| [docs/authoring/phase-6-review.md](./docs/authoring/phase-6-review.md) | Historical review record, not an enforceable rule source. |
| [docs/data-model/examples/concept-authority.example.json](./docs/data-model/examples/concept-authority.example.json) | Illustrative example only. |
| [docs/founder/the-shift.md](./docs/founder/the-shift.md) | Founder and strategy note. |
| [docs/product/legal-argument-validator-hart-notes.md](./docs/product/legal-argument-validator-hart-notes.md) | Reading notes only. |
| [docs/product/legal-argument-validator-levi-notes.md](./docs/product/legal-argument-validator-levi-notes.md) | Reading notes only. |
| [docs/product/legal-argument-validator-raz-notes.md](./docs/product/legal-argument-validator-raz-notes.md) | Reading notes only. |
| [docs/product/legal-argument-validator-reading-law-notes.md](./docs/product/legal-argument-validator-reading-law-notes.md) | Reading notes only. |
| [docs/product/legal-argument-validator-roadmap.md](./docs/product/legal-argument-validator-roadmap.md) | Roadmap and planning, not an enforcement source. |
| [docs/runtime/baseline-metrics-snapshot-2026-03-27-16-18-gmt.md](./docs/runtime/baseline-metrics-snapshot-2026-03-27-16-18-gmt.md) | Snapshot artifact, not a behavioral contract. |
| [docs/runtime/core-runtime-roadmap.md](./docs/runtime/core-runtime-roadmap.md) | Roadmap and planning document. |
| [docs/runtime/phase-7-5-runtime-proof.md](./docs/runtime/phase-7-5-runtime-proof.md) | Proof/report artifact, not an active enforcement source. |

## Highest-Risk Mappable

| file_path | why high-risk | next conversion target |
| --- | --- | --- |
| [docs/product/version-bump-policy.md](./docs/product/version-bump-policy.md) | Contract drift can exist until a human bumps the version. | Add a version-bump CI rule keyed to contract/schema/example changes. |
| [docs/architecture/concept-writing-standard.md](./docs/architecture/concept-writing-standard.md) | It governs the quality of canonical truth objects, but much of it is still review-only. | Promote the highest-signal writing rules into validators. |
| [docs/public/review-law.md](./docs/public/review-law.md) | Publish/review discipline can still be bypassed outside the strongest workflow path. | Gate promotion/publish on explicit review-state evidence. |
| [docs/product/legal-argument-validator-acceptance-matrix.md](./docs/product/legal-argument-validator-acceptance-matrix.md) | Acceptance criteria are easy to claim and easy to drift without executable coverage. | Convert rows into tests. |
| [docs/seo-policy.md](./docs/seo-policy.md) | Public route and metadata drift can happen silently because the policy is mostly declarative today. | Add a route/meta verification script. |

## Pressure Points

- [docs/product/version-bump-policy.md](./docs/product/version-bump-policy.md) is normative, but enforcement is still manual; contract drift can exist until a human bumps the version.
- [docs/product/examples/concept_match.json](./docs/product/examples/concept_match.json), [docs/product/examples/ambiguous_match.json](./docs/product/examples/ambiguous_match.json), and [docs/product/examples/no_exact_match.json](./docs/product/examples/no_exact_match.json) behave like contract artifacts, but they are outside the current enforced test fixture path.
- [docs/public/review-law.md](./docs/public/review-law.md), [docs/public/change-transparency.md](./docs/public/change-transparency.md), and [docs/git-push-workflow.md](./docs/git-push-workflow.md) read like hard governance/process law, but they are still mostly convention-backed.
- [docs/architecture/responsive-layout.md](./docs/architecture/responsive-layout.md) and [docs/seo-policy.md](./docs/seo-policy.md) define strong rules, but current enforcement is light compared with the rest of the validator-driven system.
- The legal-validator docs under [`docs/product`](./docs/product) mix active subsystem contracts with future/planning notes, so some “law” documents there still outpace enforcement.

## Conversion Backlog

### High

- Add CI enforcement for [docs/product/version-bump-policy.md](./docs/product/version-bump-policy.md).
- Bind [docs/architecture/concept-writing-standard.md](./docs/architecture/concept-writing-standard.md) to validator rules.
- Gate publish/review flow using [docs/public/review-law.md](./docs/public/review-law.md).
- Convert [docs/product/legal-argument-validator-acceptance-matrix.md](./docs/product/legal-argument-validator-acceptance-matrix.md) into executable tests.
- Add route/meta verification for [docs/seo-policy.md](./docs/seo-policy.md).

### Medium

- Turn normalized-query examples into runtime fixtures.
- Add schemas for mapping-entry and broader concept/source model contracts.
- Bind doctrine and override JSON schema files to live validation.
- Add diff-based enforcement for local change cascade and contributor workflow rules.
- Add authoring-phase and pairwise-stress-test gating where the process is already stable.

### Low

- Expand source-priority enforcement from review guidance into workflow proof requirements.
- Add optional formal checks for frontend breakpoint usage if style noise can be kept low.
