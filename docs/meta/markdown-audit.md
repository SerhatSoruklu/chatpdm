# ChatPDM Markdown Audit

## Scope

- Audited surface: authored markdown files in the repository workspace, meaning tracked `.md` files plus the one non-ignored untracked draft at `docs/runtime/chatpdm-llgs-roadmap.md`.
- Excluded from the main inventory: ignored/local-only markdown such as `DOCS_ENFORCEMENT_MAP_INTERNAL.local.md` and vendored dependency readmes under `node_modules/`.
- This is an inventory/classification pass only. Existing documents were not rewritten.

## Count Summary

- Total authored markdown files in scope: 188
- Inside `docs/`: 127
- Outside `docs/`: 61

| Category | Count |
| --- | ---: |
| controlling doc | 8 |
| roadmap doc | 3 |
| audit doc | 23 |
| protocol / governance doc | 84 |
| reference doc | 36 |
| implementation doc | 25 |
| decorative / narrative doc | 9 |

| Status | Count |
| --- | ---: |
| controlling | 76 |
| active supporting | 46 |
| reference | 56 |
| decorative | 9 |
| stale | 1 |
| duplicate | 0 |
| unknown | 0 |

## Current Markdown Map Audit

- The existing `DOCS_ENFORCEMENT_MAP.md` is authoritative only for the `docs/` tree as it defines it; it is not a repo-wide markdown map.
- It lists 68 markdown paths and 7 non-markdown artifacts, but it misses 62 current `docs/` markdown files in this workspace and references 3 markdown files that are no longer present.
- It also omits every authored markdown file outside `docs/` by design, which makes it incomplete for repo-wide documentation governance.
- Structural gap: the map mixes markdown docs with JSON/schema/example artifacts, so it is not a pure markdown inventory.
- Practical gap: the map treats several roadmap/snapshot/proof documents as non-authoritative support, which is accurate for snapshots but misleading if used as the repo-wide documentation map.

### Files Listed by the Map but Absent From the Repo

- `docs/product/legal-argument-validator-hart-notes.md`
- `docs/product/legal-argument-validator-levi-notes.md`
- `docs/product/legal-argument-validator-reading-law-notes.md`

### `docs/` Files Missing From the Map

- `docs/architecture/LAYER_DRIFT_AUDIT.md`
- `docs/architecture/PROTOCOL_GRADE.md`
- `docs/architecture/adversarial-scenario-harness.md`
- `docs/architecture/api-truth-audit.md`
- `docs/architecture/bundle-release-contract.md`
- `docs/architecture/clause-normalization-contract.md`
- `docs/architecture/clause-review-checklist.md`
- `docs/architecture/concept-admission-gate.md`
- `docs/architecture/constraint-contract-audit-prompt.md`
- `docs/architecture/constraint-contract-checklist.md`
- `docs/architecture/constraint-contract-drift-prompt.md`
- `docs/architecture/constraint-contract-repair-prompt.md`
- `docs/architecture/core-primitive-collapse-audit.md`
- `docs/architecture/corpus-change-checklist.md`
- `docs/architecture/cross-layer-attack-simulation.md`
- `docs/architecture/derived-concept-stress-test.md`
- `docs/architecture/execution-card-projection-contract.md`
- `docs/architecture/legal-vocabulary-recognition-layer.md`
- `docs/architecture/mental-model.md`
- `docs/architecture/military-constraint-hashing-contract.md`
- `docs/architecture/military-constraint-validation-contract.md`
- `docs/architecture/military-constraints-boundary-audit.md`
- `docs/architecture/military-constraints-compiler-api.md`
- `docs/architecture/military-constraints-compiler-audit.md`
- `docs/architecture/military-constraints-compiler-page.md`
- `docs/architecture/output-validation-exposure-gate.md`
- `docs/architecture/pack-4-source-basis.md`
- `docs/architecture/pack-semantic-drift-audit.md`
- `docs/architecture/phase-6-execution-card-projection.md`
- `docs/architecture/policy-layer-audit.md`
- `docs/architecture/reference-pack-coverage-map.md`
- `docs/architecture/regression-lock-system.md`
- `docs/architecture/resolution-engine.md`
- `docs/architecture/system-layer-definitions.md`
- `docs/architecture/v1-pack-surface-lock.md`
- `docs/architecture/vocabulary-boundary-contract.md`
- `docs/architecture/weakauras-to-deterministic-kernel-mapping.md`
- `docs/architecture/zeroglare-evidence-engine-boundary.md`
- `docs/audits/2026-04-21-llgs-audit.md`
- `docs/audits/final-truth-alignment-audit.md`
- `docs/audits/source-hardening-pr-plan.md`
- `docs/audits/us-pack-prepush-audit.md`
- `docs/audits/wave2-precommit-audit.md`
- `docs/data-model/inspectable-item-semantic-contract.md`
- `docs/founder/personal-failure-awareness-map.md`
- `docs/military-constraints/CA_AU_WAVE_NOTES.md`
- `docs/military-constraints/COALITION_LAYER_BOUNDARY.md`
- `docs/military-constraints/INTL_SHARED_LAYER_BOUNDARY.md`
- `docs/military-constraints/MULTI_PACK_REGISTRY_MIGRATION.md`
- `docs/military-constraints/MULTI_PACK_TRUTH_AUDIT.md`
- `docs/military-constraints/NL_WAVE_NOTES.md`
- `docs/military-constraints/OVERLAY_LAYER_BOUNDARY.md`
- `docs/military-constraints/PACK_DEPENDENCY_DAG_V1.md`
- `docs/military-constraints/PACK_SPEC_V1.md`
- `docs/military-constraints/PACK_SPEC_V1_ALIGNMENT.md`
- `docs/military-constraints/TR_WAVE_NOTES.md`
- `docs/military-constraints/UK_DOMAIN_WAVE_NOTES.md`
- `docs/military-constraints/UK_INTL_BOUNDARY.md`
- `docs/military-constraints/US_INTL_REFACTOR_NOTES.md`
- `docs/product/concept-detail-contract.md`
- `docs/public/vocabulary-registry-console.md`
- `docs/runtime/chatpdm-llgs-roadmap.md`

## Grouped Inventory

### controlling doc (8)

| Path | Status | Role | Short reason |
| --- | --- | --- | --- |
| `AGENTS.md` | controlling | repo operating law | repo-level operating instructions and boundary rules |
| `ANTI_CORRUPTION/ANTI_CORRUPTION_SYSTEM_LAW.md` | controlling | anti-corruption law | system law for anti-corruption constraints |
| `DOCS_ENFORCEMENT_MAP.md` | stale | docs enforcement map / repo docs law | shared docs map, but it only covers docs/ and is now incomplete relative to the repo-wide markdown surface |
| `ENFORCEMENT_PRINCIPLE.md` | controlling | enforcement principle | principle-level enforcement law |
| `KERNEL_ENFORCEMENT_CHECKLIST.md` | controlling | kernel enforcement checklist | kernel enforcement rules and required inputs |
| `KERNEL_INTEGRITY.md` | controlling | kernel integrity law | system kernel rules and governed access path |
| `LANGUAGE_CONTRACT.md` | controlling | language contract | canonical source and advisory boundary law |
| `POLICY.md` | controlling | policy system specification | source of truth for policy page structure and tone |

### roadmap doc (3)

| Path | Status | Role | Short reason |
| --- | --- | --- | --- |
| `docs/product/legal-argument-validator-roadmap.md` | active supporting | feature roadmap | roadmap/planning document; supporting but not runtime-law |
| `docs/runtime/chatpdm-llgs-roadmap.md` | controlling | LLGS completion roadmap | new master LLGS roadmap draft; controlling execution path |
| `docs/runtime/core-runtime-roadmap.md` | active supporting | runtime roadmap | roadmap/planning document; supporting but not runtime-law |

### audit doc (23)

| Path | Status | Role | Short reason |
| --- | --- | --- | --- |
| `backend/docs/risk-mapping/phase-7-audit-surface.md` | reference | risk-mapping audit/review | risk-mapping audit or review note |
| `backend/docs/risk-mapping/safety-review.md` | reference | risk-mapping audit/review | risk-mapping audit or review note |
| `docs/architecture/LAYER_DRIFT_AUDIT.md` | reference | architecture audit | architecture audit or snapshot |
| `docs/architecture/api-truth-audit.md` | reference | architecture audit | architecture audit or snapshot |
| `docs/architecture/constraint-contract-audit-prompt.md` | reference | architecture audit | architecture audit or snapshot |
| `docs/architecture/core-primitive-collapse-audit.md` | reference | architecture audit | architecture audit or snapshot |
| `docs/architecture/military-constraints-boundary-audit.md` | reference | architecture audit | architecture audit or snapshot |
| `docs/architecture/military-constraints-compiler-audit.md` | reference | architecture audit | architecture audit or snapshot |
| `docs/architecture/pack-semantic-drift-audit.md` | reference | architecture audit | architecture audit or snapshot |
| `docs/architecture/policy-layer-audit.md` | reference | architecture audit | architecture audit or snapshot |
| `docs/audits/2026-04-21-llgs-audit.md` | reference | audit snapshot / plan | snapshot or audit planning record |
| `docs/audits/final-truth-alignment-audit.md` | reference | audit snapshot / plan | snapshot or audit planning record |
| `docs/audits/source-hardening-pr-plan.md` | reference | audit snapshot / plan | snapshot or audit planning record |
| `docs/audits/us-pack-prepush-audit.md` | reference | audit snapshot / plan | snapshot or audit planning record |
| `docs/audits/wave2-precommit-audit.md` | reference | audit snapshot / plan | snapshot or audit planning record |
| `docs/military-constraints/CA_AU_WAVE_NOTES.md` | reference | military-constraints notes/audit | constraint note or migration record |
| `docs/military-constraints/NL_WAVE_NOTES.md` | reference | military-constraints notes/audit | constraint note or migration record |
| `docs/military-constraints/TR_WAVE_NOTES.md` | reference | military-constraints notes/audit | constraint note or migration record |
| `docs/military-constraints/UK_DOMAIN_WAVE_NOTES.md` | reference | military-constraints notes/audit | constraint note or migration record |
| `docs/military-constraints/US_INTL_REFACTOR_NOTES.md` | reference | military-constraints notes/audit | constraint note or migration record |
| `docs/runtime/baseline-metrics-snapshot-2026-03-27-16-18-gmt.md` | reference | runtime snapshot | current-state metrics snapshot |
| `security/FINDINGS_LOG.md` | reference | findings log | security findings record / snapshot log |
| `tests/runtime/reports/query-stress-summary.v1.md` | reference | runtime stress summary | runtime proof/report artifact |

### protocol / governance doc (84)

| Path | Status | Role | Short reason |
| --- | --- | --- | --- |
| `ANTI_CORRUPTION/INVARIANT_ENFORCEMENT_CHECKLIST.md` | controlling | invariant enforcement checklist | checklist for invariant enforcement rules |
| `ANTI_CORRUPTION/INVARIANT_MAP.md` | controlling | invariant map | coverage map for invariant enforcement |
| `CODE_OF_CONDUCT.md` | controlling | code of conduct | public conduct policy |
| `CONTRIBUTING.md` | controlling | contribution policy | repo contribution and markdown hygiene policy |
| `KERNEL_INTEGRITY_INVARIANT_MAP.md` | controlling | kernel invariant map | coverage map for kernel invariants |
| `SECURITY.md` | controlling | security policy | public vulnerability-reporting policy |
| `backend/docs/risk-mapping/confidence-contract.md` | active supporting | RMG governance note | subsystem governance or boundary law for risk mapping |
| `backend/docs/risk-mapping/governance-contract.md` | active supporting | RMG governance note | subsystem governance or boundary law for risk mapping |
| `backend/docs/risk-mapping/non-goals.md` | active supporting | RMG governance note | subsystem governance or boundary law for risk mapping |
| `backend/docs/risk-mapping/public-framing.md` | active supporting | RMG governance note | subsystem governance or boundary law for risk mapping |
| `backend/docs/risk-mapping/refusal-and-narrowing-principles.md` | active supporting | RMG governance note | subsystem governance or boundary law for risk mapping |
| `backend/docs/risk-mapping/rmg-charter.md` | active supporting | RMG governance note | subsystem governance or boundary law for risk mapping |
| `backend/docs/risk-mapping/rmg-post-mvp-freeze.md` | active supporting | RMG governance note | subsystem governance or boundary law for risk mapping |
| `backend/docs/risk-mapping/system-boundary.md` | active supporting | RMG governance note | subsystem governance or boundary law for risk mapping |
| `backend/docs/risk-mapping/terminology.md` | active supporting | RMG governance note | subsystem governance or boundary law for risk mapping |
| `docs/INTERGRITY_RUNTIME_LAWS.md` | active supporting | contract/policy | contractual or policy-like doc |
| `docs/architecture/anti-drift/01-canonical-anchor.md` | controlling | anti-drift control | explicit anti-drift control surface |
| `docs/architecture/anti-drift/02-validator-blocks-merge.md` | controlling | anti-drift control | explicit anti-drift control surface |
| `docs/architecture/anti-drift/03-golden-concept-set.md` | controlling | anti-drift control | explicit anti-drift control surface |
| `docs/architecture/anti-drift/04-no-silent-edits.md` | controlling | anti-drift control | explicit anti-drift control surface |
| `docs/architecture/anti-drift/05-diff-lens.md` | controlling | anti-drift control | explicit anti-drift control surface |
| `docs/architecture/anti-drift/06-derived-exposure-only.md` | controlling | anti-drift control | explicit anti-drift control surface |
| `docs/architecture/anti-drift/07-drift-alarm-metrics.md` | controlling | anti-drift control | explicit anti-drift control surface |
| `docs/architecture/anti-drift/08-no-single-register-edits.md` | controlling | anti-drift control | explicit anti-drift control surface |
| `docs/architecture/bundle-release-contract.md` | controlling | architecture contract | contract/boundary/gate law for runtime or docs flow |
| `docs/architecture/clause-normalization-contract.md` | controlling | architecture contract | contract/boundary/gate law for runtime or docs flow |
| `docs/architecture/clause-review-checklist.md` | controlling | architecture contract | contract/boundary/gate law for runtime or docs flow |
| `docs/architecture/concept-admission-gate.md` | controlling | architecture contract | contract/boundary/gate law for runtime or docs flow |
| `docs/architecture/concept-review-checklist.md` | controlling | architecture contract | contract/boundary/gate law for runtime or docs flow |
| `docs/architecture/concept-writing-standard.md` | controlling | architecture contract | contract/boundary/gate law for runtime or docs flow |
| `docs/architecture/constraint-contract-checklist.md` | controlling | architecture contract | contract/boundary/gate law for runtime or docs flow |
| `docs/architecture/constraint-contract-drift-prompt.md` | controlling | architecture contract | contract/boundary/gate law for runtime or docs flow |
| `docs/architecture/constraint-contract-repair-prompt.md` | controlling | architecture contract | contract/boundary/gate law for runtime or docs flow |
| `docs/architecture/corpus-change-checklist.md` | controlling | architecture contract | contract/boundary/gate law for runtime or docs flow |
| `docs/architecture/execution-card-projection-contract.md` | controlling | architecture contract | contract/boundary/gate law for runtime or docs flow |
| `docs/architecture/military-constraint-hashing-contract.md` | controlling | architecture contract | contract/boundary/gate law for runtime or docs flow |
| `docs/architecture/military-constraint-validation-contract.md` | controlling | architecture contract | contract/boundary/gate law for runtime or docs flow |
| `docs/architecture/output-validation-exposure-gate.md` | controlling | architecture contract | contract/boundary/gate law for runtime or docs flow |
| `docs/architecture/phase-1-mapping-entry-contract.md` | controlling | architecture contract | contract/boundary/gate law for runtime or docs flow |
| `docs/architecture/query-normalization-rules.md` | controlling | architecture contract | contract/boundary/gate law for runtime or docs flow |
| `docs/architecture/regression-lock-system.md` | controlling | architecture contract | contract/boundary/gate law for runtime or docs flow |
| `docs/architecture/v1-concept-scope.md` | controlling | architecture contract | contract/boundary/gate law for runtime or docs flow |
| `docs/architecture/v1-pack-surface-lock.md` | controlling | architecture contract | contract/boundary/gate law for runtime or docs flow |
| `docs/architecture/vocabulary-boundary-contract.md` | controlling | architecture contract | contract/boundary/gate law for runtime or docs flow |
| `docs/architecture/zeroglare-evidence-engine-boundary.md` | controlling | architecture contract | contract/boundary/gate law for runtime or docs flow |
| `docs/authoring/phase-6-concept-authoring-and-validation.md` | active supporting | authoring workflow | authoring workflow and review guidance |
| `docs/authoring/phase-6-pairwise-stress-testing.md` | active supporting | authoring workflow | authoring workflow and review guidance |
| `docs/authoring/phase-6-review.md` | active supporting | authoring workflow | authoring workflow and review guidance |
| `docs/boundary-integrity.md` | active supporting | contract/policy | contractual or policy-like doc |
| `docs/governance/AI_AUTOMATED_INTEGRITY_CHECKS.md` | controlling | governance protocol | governance boundary or AI interaction law |
| `docs/governance/AI_INTERACTION_CONTRACT.md` | controlling | governance protocol | governance boundary or AI interaction law |
| `docs/governance/AI_MISUSE_SCENARIOS.md` | controlling | governance protocol | governance boundary or AI interaction law |
| `docs/governance/AI_OUTPUT_SURFACE_SPEC.md` | controlling | governance protocol | governance boundary or AI interaction law |
| `docs/governance/LLGS_AI_BOUNDARY_PROTOCOL.md` | controlling | governance protocol | governance boundary or AI interaction law |
| `docs/product/concept-detail-contract.md` | controlling | product contract / law | product-system contract or validation rule |
| `docs/product/legal-argument-validator-acceptance-matrix.md` | controlling | product contract / law | product-system contract or validation rule |
| `docs/product/legal-argument-validator-laws.md` | controlling | product contract / law | product-system contract or validation rule |
| `docs/product/legal-argument-validator-phase-controls.md` | controlling | product contract / law | product-system contract or validation rule |
| `docs/product/legal-validator.failure-ownership.md` | controlling | product contract / law | product-system contract or validation rule |
| `docs/product/legal-validator.pipeline-contract.md` | controlling | product contract / law | product-system contract or validation rule |
| `docs/product/legal-validator.service-contracts.md` | controlling | product contract / law | product-system contract or validation rule |
| `docs/product/response-contract.md` | controlling | product contract / law | product-system contract or validation rule |
| `docs/product/schema-validation.md` | controlling | product contract / law | product-system contract or validation rule |
| `docs/product/version-bump-policy.md` | controlling | product contract / law | product-system contract or validation rule |
| `docs/public/audit-system.md` | controlling | public governance contract | public-facing contract or governance rule |
| `docs/public/canonical-anchor-contract.md` | controlling | public governance contract | public-facing contract or governance rule |
| `docs/public/change-transparency.md` | controlling | public governance contract | public-facing contract or governance rule |
| `docs/public/concept-lifecycle.md` | controlling | public governance contract | public-facing contract or governance rule |
| `docs/public/policy-claim-registry.md` | controlling | public governance contract | public-facing contract or governance rule |
| `docs/public/promotion-flow.md` | controlling | public governance contract | public-facing contract or governance rule |
| `docs/public/register-contract.md` | controlling | public governance contract | public-facing contract or governance rule |
| `docs/public/review-law.md` | controlling | public governance contract | public-facing contract or governance rule |
| `docs/public/semantic-anchor-contract.md` | controlling | public governance contract | public-facing contract or governance rule |
| `docs/seo-policy.md` | active supporting | contract/policy | contractual or policy-like doc |
| `policies/POLICY_AUDIT_PHASE_A.md` | controlling | policy page | published legal/policy content or audit-backed policy doc |
| `policies/POLICY_AUDIT_PHASE_A_RESULTS.md` | controlling | policy page | published legal/policy content or audit-backed policy doc |
| `policies/POLICY_AUDIT_PHASE_B.md` | controlling | policy page | published legal/policy content or audit-backed policy doc |
| `policies/POLICY_AUDIT_PHASE_D.md` | controlling | policy page | published legal/policy content or audit-backed policy doc |
| `policies/acceptable-use.md` | controlling | policy page | published legal/policy content or audit-backed policy doc |
| `policies/cookies.md` | controlling | policy page | published legal/policy content or audit-backed policy doc |
| `policies/data-retention.md` | controlling | policy page | published legal/policy content or audit-backed policy doc |
| `policies/privacy.md` | controlling | policy page | published legal/policy content or audit-backed policy doc |
| `policies/terms.md` | controlling | policy page | published legal/policy content or audit-backed policy doc |
| `security/THREAT_MODEL.md` | active supporting | threat model | security boundary and threat-model guidance |

### reference doc (36)

| Path | Status | Role | Short reason |
| --- | --- | --- | --- |
| `PRODUCT-IDENTITY.md` | active supporting | product identity note | positioning and product-direction note rather than runtime law |
| `README.md` | active supporting | repo overview | high-level deterministic concept-system overview |
| `backend/docs/risk-mapping/artifact-update-flow.md` | active supporting | risk-mapping implementation note | risk-mapping subsystem documentation |
| `docs/architecture/PROTOCOL_GRADE.md` | reference | architecture reference | architecture documentation or reference material |
| `docs/architecture/examples/concept-writing-examples.md` | reference | examples | example material for authoring or normalization |
| `docs/architecture/examples/normalized-query-examples.md` | reference | examples | example material for authoring or normalization |
| `docs/architecture/failure-modes.md` | reference | architecture reference | architecture documentation or reference material |
| `docs/architecture/legal-vocabulary-recognition-layer.md` | reference | architecture reference | architecture documentation or reference material |
| `docs/architecture/military-constraints-compiler-api.md` | reference | architecture reference | architecture documentation or reference material |
| `docs/architecture/military-constraints-compiler-page.md` | reference | architecture reference | architecture documentation or reference material |
| `docs/architecture/pack-4-source-basis.md` | reference | architecture reference | architecture documentation or reference material |
| `docs/architecture/phase-6-execution-card-projection.md` | reference | architecture reference | architecture documentation or reference material |
| `docs/architecture/reference-pack-coverage-map.md` | reference | architecture reference | architecture documentation or reference material |
| `docs/architecture/resolution-engine.md` | reference | architecture reference | architecture documentation or reference material |
| `docs/architecture/responsive-layout.md` | reference | architecture reference | architecture documentation or reference material |
| `docs/architecture/system-layer-definitions.md` | reference | architecture reference | architecture documentation or reference material |
| `docs/architecture/weakauras-to-deterministic-kernel-mapping.md` | reference | architecture reference | architecture documentation or reference material |
| `docs/conceptual-reference-stack.md` | reference | unspecified | requires manual review |
| `docs/contrast-matrix-v1.md` | reference | unspecified | requires manual review |
| `docs/data-model/concepts-and-sources.md` | reference | data model reference | data model explanation and contract framing |
| `docs/data-model/inspectable-item-semantic-contract.md` | reference | data model reference | data model explanation and contract framing |
| `docs/data-model/legal-argument-validator-entities.md` | reference | data model reference | data model explanation and contract framing |
| `docs/git-push-workflow.md` | reference | unspecified | requires manual review |
| `docs/local-change-cascade-rule.md` | reference | unspecified | requires manual review |
| `docs/military-constraints/COALITION_LAYER_BOUNDARY.md` | active supporting | military constraints note | domain-specific constraints documentation |
| `docs/military-constraints/INTL_SHARED_LAYER_BOUNDARY.md` | active supporting | military constraints note | domain-specific constraints documentation |
| `docs/military-constraints/MULTI_PACK_REGISTRY_MIGRATION.md` | active supporting | military constraints note | domain-specific constraints documentation |
| `docs/military-constraints/MULTI_PACK_TRUTH_AUDIT.md` | active supporting | military constraints note | domain-specific constraints documentation |
| `docs/military-constraints/OVERLAY_LAYER_BOUNDARY.md` | active supporting | military constraints note | domain-specific constraints documentation |
| `docs/military-constraints/PACK_DEPENDENCY_DAG_V1.md` | active supporting | military constraints note | domain-specific constraints documentation |
| `docs/military-constraints/PACK_SPEC_V1.md` | active supporting | military constraints note | domain-specific constraints documentation |
| `docs/military-constraints/PACK_SPEC_V1_ALIGNMENT.md` | active supporting | military constraints note | domain-specific constraints documentation |
| `docs/military-constraints/UK_INTL_BOUNDARY.md` | active supporting | military constraints note | domain-specific constraints documentation |
| `docs/public/golden-standard.md` | active supporting | public reference | public-facing explanatory document |
| `docs/public/vocabulary-registry-console.md` | active supporting | public reference | public-facing explanatory document |
| `standards/golden-concepts/README.md` | reference | standards reference | supporting standards readme, not execution law |

### implementation doc (25)

| Path | Status | Role | Short reason |
| --- | --- | --- | --- |
| `.github/ISSUE_TEMPLATE/#1-bug_report-summary.md` | active supporting | workflow template | repo workflow template/supporting file |
| `.github/ISSUE_TEMPLATE/#2-bug_report-steps.md` | active supporting | workflow template | repo workflow template/supporting file |
| `.github/ISSUE_TEMPLATE/#3-feature_request-summary.md` | active supporting | workflow template | repo workflow template/supporting file |
| `.github/ISSUE_TEMPLATE/#4-feature_request-problem.md` | active supporting | workflow template | repo workflow template/supporting file |
| `.github/pull_request_template.md` | active supporting | workflow template | repo workflow template/supporting file |
| `backend/README.md` | active supporting | subsystem overview | implementation overview and run instructions |
| `backend/src/modules/concepts/README.md` | reference | subsystem overview | module/data/test overview and usage notes |
| `backend/src/modules/feedback/README.md` | reference | subsystem overview | module/data/test overview and usage notes |
| `backend/src/modules/perspectives/README.md` | reference | subsystem overview | module/data/test overview and usage notes |
| `backend/src/modules/sources/README.md` | reference | subsystem overview | module/data/test overview and usage notes |
| `data/concept-audit-log/README.md` | reference | subsystem overview | module/data/test overview and usage notes |
| `data/concept-versions/README.md` | reference | subsystem overview | module/data/test overview and usage notes |
| `data/concepts/README.md` | reference | subsystem overview | module/data/test overview and usage notes |
| `data/concepts/templates/concept-template.md` | active supporting | concept template | authoring template for concept packets |
| `data/policy-claim-registry/README.md` | reference | subsystem overview | module/data/test overview and usage notes |
| `deploy/README.md` | active supporting | subsystem overview | implementation overview and run instructions |
| `docs/architecture/adversarial-scenario-harness.md` | active supporting | architecture implementation note | implementation, stress, or regression-oriented doc |
| `docs/architecture/cross-layer-attack-simulation.md` | active supporting | architecture implementation note | implementation, stress, or regression-oriented doc |
| `docs/architecture/derived-concept-stress-test.md` | active supporting | architecture implementation note | implementation, stress, or regression-oriented doc |
| `docs/authoring/new-concept-workflow-template.md` | active supporting | authoring template | template for authoring/review workflow |
| `docs/authoring/phase-6-review-template.md` | active supporting | authoring template | template for authoring/review workflow |
| `docs/runtime/phase-7-5-runtime-proof.md` | reference | runtime proof artifact | proof/report artifact tied to runtime state |
| `frontend/README.md` | active supporting | subsystem overview | implementation overview and run instructions |
| `tests/golden/README.md` | reference | subsystem overview | module/data/test overview and usage notes |
| `tests/runtime/README.md` | reference | subsystem overview | module/data/test overview and usage notes |

### decorative / narrative doc (9)

| Path | Status | Role | Short reason |
| --- | --- | --- | --- |
| `WHY_THIS_EXISTS.md` | decorative | origin note | problem framing and motivation narrative |
| `docs/architecture/architecture-philosophy.md` | decorative | framing note | conceptual framing rather than enforcement law |
| `docs/architecture/aware-failure-discovery.md` | decorative | framing note | conceptual framing rather than enforcement law |
| `docs/architecture/governance/execution-analogy.md` | decorative | analogy / governance framing | framing or analogy note rather than enforcement |
| `docs/architecture/mental-model.md` | decorative | framing note | conceptual framing rather than enforcement law |
| `docs/architecture/theme-direction.md` | decorative | framing note | conceptual framing rather than enforcement law |
| `docs/founder/personal-failure-awareness-map.md` | decorative | founder narrative | founder/story framing, not execution law |
| `docs/founder/the-shift.md` | decorative | founder narrative | founder/story framing, not execution law |
| `docs/product/legal-argument-validator-raz-notes.md` | decorative | reading notes | notes are explanatory, not authoritative |

## Highest-Risk Overlaps / Conflicts

- `DOCS_ENFORCEMENT_MAP.md` is a local/docs-only map, not a repo-wide map, so it can mislead people who assume it covers root, backend, data, tests, policies, or security markdown.
- Roadmap duplication exists across `docs/runtime/chatpdm-llgs-roadmap.md`, `docs/runtime/core-runtime-roadmap.md`, and `docs/product/legal-argument-validator-roadmap.md`. They do not duplicate exactly, but they overlap in execution-planning authority.
- The root law stack overlaps heavily: `AGENTS.md`, `POLICY.md`, `SOVEREIGN_CORE_ARCHITECTURE.md`, `KERNEL_INTEGRITY.md`, `LANGUAGE_CONTRACT.md`, `ENFORCEMENT_PRINCIPLE.md`, and `ANTI_CORRUPTION/*` all define system boundary or execution law. That is a real authority cluster, not a single clean law document.
- The public/product/governance contract cluster also overlaps: `docs/governance/*`, `docs/public/*`, `docs/product/*`, and `docs/architecture/*contract*` all define adjacent contract surfaces with different scopes.
- Audit artifacts overlap with snapshots and reports: `docs/audits/*`, `docs/runtime/baseline-metrics-snapshot-*.md`, `security/FINDINGS_LOG.md`, and `tests/runtime/reports/query-stress-summary.v1.md` all describe current state rather than control law.
- Decorative or narrative files that can be mistaken for authority include `README.md`, `PRODUCT-IDENTITY.md`, `WHY_THIS_EXISTS.md`, `docs/founder/*`, and the philosophy/analogy notes under `docs/architecture/`.
- The untracked `docs/runtime/chatpdm-llgs-roadmap.md` is currently a local draft. It should be treated as working truth in the workspace, but it is not yet a committed repo baseline.

## Recommended Doc Alignment Order

1. Align the controlling docs first: root law/policy docs, `docs/governance/*`, `docs/public/*`, and the product/runtime contract docs that define current runtime truth.
2. Normalize roadmap hierarchy next: make the LLGS roadmap, runtime roadmap, and product roadmap explicit about which one governs execution and which one is supporting planning.
3. Resolve audit/snapshot/report overlap after that: keep audit artifacts as evidence only and prevent them from being mistaken for control docs.
4. Align implementation/reference docs beneath the governing contracts: backend READMEs, data-model docs, architecture references, and authoring templates should follow the control documents.
5. Declassify or isolate decorative/narrative docs last so they remain useful context without looking authoritative.

## Notes on Uncertainty

- `docs/conceptual-reference-stack.md`, `docs/contrast-matrix-v1.md`, `docs/git-push-workflow.md`, and `docs/local-change-cascade-rule.md` sit between reference and protocol in content and may need a second-pass decision if the repo wants stricter separation.
- `DOCS_ENFORCEMENT_MAP_INTERNAL.local.md` exists on disk as an ignored local notebook. It is intentionally not part of the shared markdown map and was not counted in the main inventory.
- Vendored markdown under `node_modules/` exists on disk but was excluded because it is third-party package payload, not ChatPDM documentation.
