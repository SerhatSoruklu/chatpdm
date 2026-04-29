# Docs Enforcement Map

This file classifies the current [`/docs`](./docs) tree by enforcement reality, not by title or intention.

It answers:

- which docs already govern system behavior
- which docs define rules that should be mapped into code
- which docs are descriptive and do not need enforcement

This map covers `docs/` only. It does not replace the root-level law and invariant sets under [ANTI_CORRUPTION](./ANTI_CORRUPTION) or the root kernel-integrity docs.
For repo-wide document authority, see [docs/meta/document-authority-index.md](./docs/meta/document-authority-index.md).

## Authority Lock

- This file is the authoritative shared enforcement map for the repository `docs/` tree only.
- Any durable finding, classification change, contradiction, priority change, or conversion decision discovered in local notes must be promoted here before it is treated as shared truth.
- Any durable finding must be promoted before:
  - a commit is finalized
  - a PR is opened
  - or a related code change is merged
- Local-only notebooks may assist analysis, but they must not be the only place where a standing decision lives.
- If a local note and this file diverge, this file remains the shared source of truth until it is explicitly updated.
- This file is not repo-wide markdown law and does not override control docs, roadmaps, or evidence outside the `docs/` tree.

## Summary

| Category | Count |
| --- | ---: |
| `ENFORCED` | 27 |
| `MAPPABLE` | 32 |
| `DECORATIVE` | 17 |
| Total | 76 |

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
| [docs/governance/AI_AUTOMATED_INTEGRITY_CHECKS.md](./docs/governance/AI_AUTOMATED_INTEGRITY_CHECKS.md) | Blocker-grade repo scanning, CI replay, captured violation fixtures, and minimal runtime guards now connect this document to live enforcement behavior. |

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
| [docs/authoring/new-concept-workflow-template.md](./docs/authoring/new-concept-workflow-template.md) | `medium` | `pipeline` | Require two-phase admission and implementation review, including source-grounding, conflict, cascade, and runtime-isolation checks before a new concept is published. | It defines hard stop conditions for new concept admission that are stronger than the current validator and workflow gates. |
| [docs/authoring/phase-6-pairwise-stress-testing.md](./docs/authoring/phase-6-pairwise-stress-testing.md) | `medium` | `pipeline` | Require pairwise verifier coverage for each mandated concept pair. | Some pairs are enforced, but the full required stress regimen is not. |
| [docs/conceptual-reference-stack.md](./docs/conceptual-reference-stack.md) | `medium` | `other` | Require source-priority proof in authoring/review workflow. | Source-priority law is still review guidance, not validator-backed. |
| [docs/data-model/concepts-and-sources.md](./docs/data-model/concepts-and-sources.md) | `medium` | `schema` | Formalize authored concept/source packet schema. | The concept/source model is documented but not fully schema-bound. |
| [docs/data-model/legal-argument-validator-entities.md](./docs/data-model/legal-argument-validator-entities.md) | `medium` | `schema` | Bind entity model fields to explicit schemas/contracts. | Entity definitions outpace formal schema enforcement. |
| [docs/data-model/schemas/doctrine-artifact.schema.json](./docs/data-model/schemas/doctrine-artifact.schema.json) | `medium` | `schema` | Validate doctrine artifacts against this JSON schema in CI/runtime. | The schema file exists but is not the live validation source. |
| [docs/data-model/schemas/override-record.schema.json](./docs/data-model/schemas/override-record.schema.json) | `medium` | `schema` | Validate override records against this JSON schema in CI/runtime. | The schema file exists but is not the live validation source. |
| [docs/git-push-workflow.md](./docs/git-push-workflow.md) | `medium` | `pipeline` | Add branch/publish safety checks that reflect the documented workflow. | It defines contributor workflow rules but relies on convention. |
| [docs/governance/AI_INTERACTION_CONTRACT.md](./docs/governance/AI_INTERACTION_CONTRACT.md) | `high` | `guard` | Require any future AI integration to use labeled, non-authoritative, read-only interaction surfaces and to prevent advisory output from reaching canonical paths. | Scanner blockers and runtime guards now enforce part of this contract, but there are still no AI-facing adapters or full surface-specific controls because AI is not in the canonical path today. |
| [docs/governance/AI_MISUSE_SCENARIOS.md](./docs/governance/AI_MISUSE_SCENARIOS.md) | `high` | `guard` | Require future AI integration review to detect writeback, authority leakage, hidden dependency, prompt drift, UI blending, and ungated expansion before release. | Active blockers and replay fixtures now cover several high-risk misuse paths, but the broader misuse model is not yet fully enforced through dedicated review gates, outage checks, or full-surface scanners. |
| [docs/governance/AI_OUTPUT_SURFACE_SPEC.md](./docs/governance/AI_OUTPUT_SURFACE_SPEC.md) | `high` | `guard` | Require any future AI UI surface to keep advisory output visibly distinct, explicitly labeled, and structurally separate from canonical LLGS content. | Missing advisory labels now block core-page AI surfaces, but no live AI-facing UI surfaces exist yet and broader visual-separation rules still rely on future UI guards. |
| [docs/governance/LLGS_AI_BOUNDARY_PROTOCOL.md](./docs/governance/LLGS_AI_BOUNDARY_PROTOCOL.md) | `high` | `guard` | Require any future AI or LLM integration to stay non-authoritative, read-only against canonical artifacts, validator-gated, and unable to replace deterministic meaning resolution. | Scanner blockers and runtime guards now defend part of this boundary, but full AI integration boundaries still depend on future adapters because AI is not in the canonical path today. |
| [docs/local-change-cascade-rule.md](./docs/local-change-cascade-rule.md) | `medium` | `pipeline` | Add diff-based cascade detection and warnings. | Cascade thresholds are policy, not a live guard. |
| [docs/product/examples/ambiguous_match.json](./docs/product/examples/ambiguous_match.json) | `medium` | `schema` | Validate it against `response-schema.json` and runtime fixture expectations. | The contract example can drift from runtime because it is not in the enforced fixture path. |
| [docs/product/examples/concept_match.json](./docs/product/examples/concept_match.json) | `medium` | `schema` | Validate it against `response-schema.json` and runtime fixture expectations. | The contract example can drift from runtime because it is not in the enforced fixture path. |
| [docs/product/examples/no_exact_match.json](./docs/product/examples/no_exact_match.json) | `medium` | `schema` | Validate it against `response-schema.json` and runtime fixture expectations. | The contract example can drift from runtime because it is not in the enforced fixture path. |
| [docs/product/legal-argument-validator-acceptance-matrix.md](./docs/product/legal-argument-validator-acceptance-matrix.md) | `high` | `pipeline` | Map each acceptance row to test coverage. | Acceptance criteria should be executable, not only written. |
| [docs/product/legal-argument-validator-laws.md](./docs/product/legal-argument-validator-laws.md) | `high` | `validator` | Promote legal-validator laws into rule and reason-code enforcement. | It declares subsystem laws that are not all encoded as explicit rule checks. |
| [docs/product/legal-argument-validator-phase-controls.md](./docs/product/legal-argument-validator-phase-controls.md) | `medium` | `pipeline` | Enforce allowed phase/wave execution in CI/runtime flags. | Phase authorization is documented but not globally gated. |
| [docs/product/legal-validator.failure-ownership.md](./docs/product/legal-validator.failure-ownership.md) | `medium` | `other` | Require ownership tagging and escalation on failing validator paths. | Ownership rules are process law, not system-enforced. |
| [docs/product/version-bump-policy.md](./docs/product/version-bump-policy.md) | `high` | `pipeline` | Fail when response/schema/contract changes lack the required version bump. | Version-bump policy is still manual and can drift behind contract changes. |
| [docs/product/WHO_IS_IT_FOR.md](./docs/product/WHO_IS_IT_FOR.md) | `medium` | `pipeline` | Require Phase 6 feature and validation work to name a primary profile, document workflow, and operational wording risk. | It defines the first-user hypothesis and product boundary, but enforcement is currently review-based. |
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
| [docs/governance/AI_MISUSE_SCENARIOS.md](./docs/governance/AI_MISUSE_SCENARIOS.md) | If future AI integration lacks misuse detection, corruption paths can enter the system before anyone notices authority or writeback drift. | Add explicit AI misuse checks and review gates before any LLM-facing capability is allowed into the system. |
| [docs/governance/AI_INTERACTION_CONTRACT.md](./docs/governance/AI_INTERACTION_CONTRACT.md) | If future AI interaction surfaces are added without strict input/output boundaries, advisory output can leak into canonical behavior. | Add explicit AI interaction guards, labeling rules, and no-writeback enforcement before any LLM-facing feature is allowed into the system. |
| [docs/governance/LLGS_AI_BOUNDARY_PROTOCOL.md](./docs/governance/LLGS_AI_BOUNDARY_PROTOCOL.md) | If future AI enters the system without a hard boundary, probabilistic output can leak into canonical authority. | Add explicit AI integration guards before any LLM-facing feature is allowed into the canonical path. |
| [docs/governance/AI_OUTPUT_SURFACE_SPEC.md](./docs/governance/AI_OUTPUT_SURFACE_SPEC.md) | If future AI UI surfaces are introduced without hard separation, advisory content can visually borrow canonical authority. | Add explicit AI UI-surface guards before any AI advisory panel or explanation surface is allowed into the product. |

## Pressure Points

- [docs/product/version-bump-policy.md](./docs/product/version-bump-policy.md) is normative, but enforcement is still manual; contract drift can exist until a human bumps the version.
- [docs/product/examples/concept_match.json](./docs/product/examples/concept_match.json), [docs/product/examples/ambiguous_match.json](./docs/product/examples/ambiguous_match.json), and [docs/product/examples/no_exact_match.json](./docs/product/examples/no_exact_match.json) behave like contract artifacts, but they are outside the current enforced test fixture path.
- [docs/public/review-law.md](./docs/public/review-law.md), [docs/public/change-transparency.md](./docs/public/change-transparency.md), and [docs/git-push-workflow.md](./docs/git-push-workflow.md) read like hard governance/process law, but they are still mostly convention-backed.
- [docs/governance/AI_AUTOMATED_INTEGRITY_CHECKS.md](./docs/governance/AI_AUTOMATED_INTEGRITY_CHECKS.md) now has blocker-grade scanner enforcement, replayed violation fixtures, and minimal runtime guards, but it still covers only the highest-risk patterns rather than the full AI misuse surface.
- [docs/governance/AI_INTERACTION_CONTRACT.md](./docs/governance/AI_INTERACTION_CONTRACT.md) defines the AI interaction surface cleanly, but it remains a mapped guard target until the repo has actual AI-facing adapters and full surface-specific enforcement.
- [docs/governance/AI_MISUSE_SCENARIOS.md](./docs/governance/AI_MISUSE_SCENARIOS.md) defines realistic AI corruption patterns and detection rules, and some are now replay-backed, but it remains a mapped guard target until the repo has broader AI misuse checks and review gates.
- [docs/governance/AI_OUTPUT_SURFACE_SPEC.md](./docs/governance/AI_OUTPUT_SURFACE_SPEC.md) defines how AI must appear in UI, but it remains a mapped guard target until the repo has AI-facing UI surfaces and enforcement checks for them.
- [docs/governance/LLGS_AI_BOUNDARY_PROTOCOL.md](./docs/governance/LLGS_AI_BOUNDARY_PROTOCOL.md) defines a critical future boundary, and while part of it is now defended, it remains a mapped guard target until full AI integration boundaries exist around any future LLM-facing adapters.
- [docs/architecture/responsive-layout.md](./docs/architecture/responsive-layout.md) and [docs/seo-policy.md](./docs/seo-policy.md) define strong rules, but current enforcement is light compared with the rest of the validator-driven system.
- [docs/authoring/new-concept-workflow-template.md](./docs/authoring/new-concept-workflow-template.md) defines stricter admission and publish discipline for new concepts than the current authoring and publish pipeline enforces automatically.
- The legal-validator docs under [`docs/product`](./docs/product) mix active subsystem contracts with future/planning notes, so some “law” documents there still outpace enforcement.

## Conversion Backlog

### High

- Expand [docs/governance/AI_AUTOMATED_INTEGRITY_CHECKS.md](./docs/governance/AI_AUTOMATED_INTEGRITY_CHECKS.md) beyond the current blocker and replay set so more misuse scenarios gain precise CI and runtime enforcement without adding noisy failures.
- Add explicit AI misuse checks for [docs/governance/AI_MISUSE_SCENARIOS.md](./docs/governance/AI_MISUSE_SCENARIOS.md) before any LLM-facing integration is allowed into the system.
- Add explicit AI interaction guards for [docs/governance/AI_INTERACTION_CONTRACT.md](./docs/governance/AI_INTERACTION_CONTRACT.md) before any LLM-facing assistive surface is allowed into the system.
- Add explicit AI UI-surface guards for [docs/governance/AI_OUTPUT_SURFACE_SPEC.md](./docs/governance/AI_OUTPUT_SURFACE_SPEC.md) before any AI advisory panel or explanation surface is allowed into the product.
- Add explicit AI boundary guards for [docs/governance/LLGS_AI_BOUNDARY_PROTOCOL.md](./docs/governance/LLGS_AI_BOUNDARY_PROTOCOL.md) before any LLM-facing integration enters the canonical path.
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
