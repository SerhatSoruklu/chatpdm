# Document Authority Index

This file is the repo's documentation authority guide.

It does not govern runtime behavior. It governs how markdown documents in this repo should be read, compared, and prioritized when they overlap.

## Role Classes

- `controlling`: defines execution law, runtime truth, policy law, or system boundaries.
- `roadmap`: defines planned execution order or phased delivery.
- `protocol / governance`: defines hard rules, contracts, boundary discipline, or promotion rules.
- `reference`: explains APIs, schemas, data models, or implementation details.
- `implementation`: ties to a subsystem, feature, or operational artifact.
- `evidence`: audit, snapshot, report, or findings material. Evidence only.
- `narrative`: context, philosophy, founder notes, or public framing. Not control law.

## Highest-Authority Control Docs

These docs are the top-level authority layer for their own scopes:

- `AGENTS.md` - repo operating law and publication discipline
- `POLICY.md` - policy-system specification
- `SOVEREIGN_CORE_ARCHITECTURE.md` - runtime architecture law
- `KERNEL_INTEGRITY.md` - kernel containment law
- `LANGUAGE_CONTRACT.md` - canonical meaning and advisory-layer contract
- `ENFORCEMENT_PRINCIPLE.md` - validator-to-runtime enforcement principle
- `ANTI_CORRUPTION/ANTI_CORRUPTION_SYSTEM_LAW.md` - anti-corruption system law

## Supportive Maps and Checklists

These are support docs for enforcing or auditing the law layer. They do not replace the law docs above:

- `KERNEL_INTEGRITY_INVARIANT_MAP.md`
- `ANTI_CORRUPTION/INVARIANT_MAP.md`
- `ANTI_CORRUPTION/INVARIANT_ENFORCEMENT_CHECKLIST.md`
- `DOCS_ENFORCEMENT_MAP.md` - docs tree enforcement map only
- `docs/meta/markdown-audit.md` - repo markdown inventory artifact

## Roadmaps

- `docs/runtime/chatpdm-llgs-roadmap.md` - LLGS completion and hardening roadmap
- `docs/runtime/core-runtime-roadmap.md` - active runtime execution roadmap
- `docs/product/legal-argument-validator-roadmap.md` - subsystem / product roadmap

Roadmap rule:

- a roadmap defines execution order and phase discipline
- a roadmap does not override control docs
- a roadmap does not override evidence

## Protocol Drafts

These docs define target contract surfaces or binding semantic targets for future enforcement.

- `docs/runtime/phase1/day3-contract-spec.md` - Phase 1 target public resolver contract
- `docs/runtime/phase1/day4-finalstate-vocabulary.md` - Phase 1 finalState vocabulary lock
- `docs/runtime/phase1/day4-response-state-mapping.md` - Phase 1 response-state mapping
- `docs/runtime/phase1/day5-refusal-contract.md` - Phase 1 refusal contract
- `docs/runtime/phase1/day5-refusal-mismatches.md` - Phase 1 refusal mismatches
- `docs/runtime/phase1/day6-deterministic-key-spec.md` - Phase 1 deterministic key spec
- `docs/runtime/phase1/day6-deterministic-key-implementation-path.md` - Phase 1 deterministic key implementation path
- `docs/runtime/phase1/day7-week1-baseline-lock.md` - Phase 1 Week 1 baseline lock

Protocol draft rule:

- a protocol draft can define the intended contract target
- a protocol draft does not override control docs
- a protocol draft does not override evidence until it is adopted into control law

## Evidence Docs

Evidence docs record current state, test results, findings, or snapshots.

They are not governing truth.

Examples:

- `docs/audits/*`
- `docs/runtime/phase1/day1-inventory.md`
- `docs/runtime/phase1/day2-field-matrix.md`
- `docs/runtime/phase1/day2-gap-analysis.md`
- `docs/runtime/baseline-metrics-snapshot-*.md`
- `security/FINDINGS_LOG.md`
- `tests/runtime/reports/*.md`

## Narrative Docs

Narrative docs provide context, rationale, founder framing, or visual direction.

They are not runtime law.

Examples:

- `README.md`
- `PRODUCT-IDENTITY.md`
- `WHY_THIS_EXISTS.md`
- `docs/founder/*`
- `docs/architecture/architecture-philosophy.md`
- `docs/architecture/aware-failure-discovery.md`
- `docs/architecture/governance/execution-analogy.md`
- `docs/architecture/mental-model.md`
- `docs/architecture/theme-direction.md`

## Precedence Rules

1. Specific control docs override broader control docs within their stated scope.
2. Control docs override roadmap docs.
3. Roadmap docs override supporting reference and implementation notes only within execution-planning scope.
4. Evidence docs never override control docs or roadmaps.
5. Narrative docs never override control docs, roadmaps, or evidence.
6. `DOCS_ENFORCEMENT_MAP.md` is scoped to `docs/` only and does not become repo-wide markdown law.
7. If two docs conflict, the narrower valid scope wins only if it does not contradict a higher-authority document.

## Use

Before treating any markdown file as governing truth, classify it by role and check whether a higher-authority doc already covers the same scope.

If the file is evidence, roadmap, or narrative, it can inform decisions but it cannot replace control law.
