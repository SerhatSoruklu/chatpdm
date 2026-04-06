# ChatPDM

ChatPDM guarantees that rewriting or simplifying text never changes its meaning.

It resolves text to a canonical concept, then returns fixed views of that same meaning.
If it cannot preserve meaning safely, it refuses instead of guessing.

## Why This Exists

Most systems treat wording as flexible. That is fine for chat, but unsafe when meaning must stay anchored.
A rewrite, summary, or simplification can silently change the semantic payload.
ChatPDM exists to stop that drift.

## Normal Systems vs ChatPDM

| Normal system | ChatPDM |
| --- | --- |
| Rewriting can change meaning | Rewriting or simplifying keeps the same canonical meaning |
| Answers vary by wording | Same concept, same versions, same output |
| Ambiguity gets smoothed over | Unsafe ambiguity is refused |
| The system guesses when it is unsure | The system stops at the boundary |

## Concrete Example

A user asks about `authority`.

A normal system might answer with slightly different meanings depending on the wording: "the power to command", "recognized standing", or "legitimate control".
Those are not guaranteed to stay identical across rewrites.

ChatPDM resolves `authority` to one canonical concept and returns fixed views of that concept, such as a short definition, core meaning, and full definition.
Different wording. Same meaning. Guaranteed.

## API Examples

### Supported query

```bash
GET /api/v1/concepts/resolve?q=authority
```

```json
{
  "type": "concept_match",
  "query": "authority",
  "normalizedQuery": "authority",
  "queryType": "exact_concept_query",
  "resolution": {
    "method": "exact_alias",
    "conceptId": "authority"
  },
  "answer": {
    "itemType": "core_concept",
    "title": "Authority",
    "shortDefinition": "Authority is recognized standing to direct, decide, or govern within a governance order."
  }
}
```

### Refusal case

```bash
GET /api/v1/concepts/resolve?q=civic%20duty
```

```json
{
  "type": "no_exact_match",
  "queryType": "unsupported_complex_query",
  "interpretation": {
    "interpretationType": "unsupported_complex",
    "message": "This query does not match a supported concept query form in the current runtime.",
    "concepts": [
      "duty"
    ]
  },
  "resolution": {
    "method": "no_exact_match"
  },
  "message": "No exact canonical concept match was found for this query.",
  "suggestions": [
    {
      "conceptId": "duty",
      "title": "Duty",
      "reason": "broader_topic"
    }
  ]
}
```

That is the intended posture: resolve authored concepts deterministically, and refuse unsupported composition honestly.

## What ChatPDM Does

- Resolves authored concepts into fixed, bounded outputs.
- Keeps the concept layer inspectable instead of opaque.
- Returns refusal when the runtime cannot support a request safely.
- Preserves the same output shape under the same declared versions.

## How It Behaves

- Input is normalized before matching.
- Matching is bounded by authored concepts and explicit contract rules.
- Resolution is deterministic, not probabilistic.
- Unsupported queries do not get a guessed answer.
- Meaning is authored before runtime and then resolved through fixed views, not invented on demand.

## What ChatPDM Is / Is Not

ChatPDM is:

- a deterministic meaning system
- a bounded concept engine
- authored, versioned, and inspectable
- refusal-first outside authored scope

ChatPDM is not:

- a chatbot
- a generic Q&A system
- open-world reasoning
- an inference engine
- a universal ontology platform
- Product Data Management software

## Canonical Implementation Posture

This repository is the canonical reference implementation of ChatPDM.

Forks may diverge, but they are not guaranteed to preserve:

- closed-world enforcement
- refusal guarantees
- governance integrity
- deterministic meaning resolution

The working rule is simple: preserve the contract, do not improvise new behavior.

## What PDM Means

PDM stands for **Predefined Deterministic Meaning**.

Meaning is authored before runtime, executed within explicit boundaries, and rejected when the system cannot resolve it safely.

## What Problem It Solves

Most concept tools drift into one of two failures:

- fluent answers that can change meaning when text is reworded
- flat lookup behavior that cannot represent ambiguity or refusal cleanly

ChatPDM sits between those failures.
It resolves only authored concepts, returns fixed views of the same meaning, and refuses the rest.

## Governance Scope Policy

Certain core concepts are governance-scoped in ChatPDM v1:

- authority
- power
- legitimacy

These are not universal definitions across all domains.

Rules:

- these concepts are defined only within the governance domain
- they must not be presented as domain-neutral or universally exhaustive
- scope must be preserved in canonical outputs, comparison outputs, relation outputs, documentation, and UI/API surfaces
- non-governance usage must produce scoped clarification or explicit `out_of_scope` refusal

## AI Governance Boundary

If AI is introduced, it remains advisory only.
It must not become canonical authority.

Current governance boundary docs:

- [LLGS AI Boundary Protocol](./docs/governance/LLGS_AI_BOUNDARY_PROTOCOL.md)
- [AI Interaction Contract](./docs/governance/AI_INTERACTION_CONTRACT.md)
- [AI Output Surface Spec](./docs/governance/AI_OUTPUT_SURFACE_SPEC.md)
- [AI Misuse Scenarios](./docs/governance/AI_MISUSE_SCENARIOS.md)
- [AI Automated Integrity Checks](./docs/governance/AI_AUTOMATED_INTEGRITY_CHECKS.md)
- [Language Contract](./LANGUAGE_CONTRACT.md)

Known AI governance regressions are stored as machine-readable replay fixtures under [governance/violations](./governance/violations).

## Current Status

The repo is in active beta development.

Current runtime posture:

- Angular SSR beta query surface
- Express runtime resolver
- file-backed canonical concept set
- response contract and schema validation
- semantic pressure-testing harness
- live runtime seed concepts: `authority`, `power`, `legitimacy`, `responsibility`, `duty`

The live runtime is intentionally smaller than the authored v1 scope.

## Repository Layout

- [frontend](./frontend): Angular SSR user interface
- [backend](./backend): Express resolver runtime and validation scripts
- [docs](./docs): product, architecture, governance, and validation docs
- [data](./data): canonical source artifacts and concept packets
- [tests](./tests): golden fixtures and runtime pressure harnesses
- [governance](./governance): machine-readable governance replay fixtures and supporting artifacts
- [chatpdm-reference](./chatpdm-reference): grounding stack for concept authoring discipline

## Local Development

From the repo root:

```bash
npm install
npm run bootstrap
npm run dev
```

Useful commands:

```bash
npm run build
npm run check
npm run scan:ai-governance
npm run replay:ai-violations
```

Run subprojects directly:

```bash
cd frontend && npm start
cd frontend && npm run serve:ssr:frontend
cd backend && npm run dev
```

## Ports / Runtime Split

- Backend: `http://127.0.0.1:4301`
- Frontend: `http://127.0.0.1:4200`
- These ports are fixed for deterministic local validation.

Production runtime split:

- `chatpdm-web`: Angular SSR Node process
- `chatpdm-api`: Express resolver API
- `nginx`: public edge for `chatpdm.com` and `api.chatpdm.com`

## Testing Posture

ChatPDM uses targeted validation rather than a broad formal test suite.

- Frontend relies mainly on Angular build, TypeScript correctness, SSR compile health, and `*.spec.ts` where behavior warrants it.
- Backend relies mainly on focused verification scripts and lightweight startup-safety checks.
- Add tests selectively when regression risk justifies them.

## Documentation Map

Start here:

- [Determinism as Architecture](./docs/architecture/architecture-philosophy.md)
- [Response Contract](./docs/product/response-contract.md)
- [Concept Detail Contract](./docs/product/concept-detail-contract.md)
- [Inspectable Item Semantic Contract](./docs/data-model/inspectable-item-semantic-contract.md)
- [V1 Concept Scope](./docs/architecture/v1-concept-scope.md)
- [Boundary Integrity](./docs/boundary-integrity.md)
- [Conceptual Reference Stack](./docs/conceptual-reference-stack.md)
- [Git Push Workflow](./docs/git-push-workflow.md)

## Source Integrity Layer

ChatPDM enforces strict source integrity at the concept level.

Each concept must define a `sourcePriority` array with:

- index 0: primary canonical source for the concept
- index 1: `oxford` as the dictionary boundary anchor

Rules:

- only sources registered in `source-registry.json` are allowed
- only `tier: "core"` sources may be used in `sourcePriority`
- `oxford` is mandatory and must be at index 1
- `sourcePriority` must exactly match `sources[]`
- duplicate sources are not allowed

Current primary source bindings:

- `authority` -> `weber`
- `power` -> `lukes`
- `legitimacy` -> `beetham`
- `responsibility` -> `hart`
- `duty` -> `hohfeld`

This layer enforces data integrity at load time only.
It does not change runtime behavior.

## Roadmap Posture

ChatPDM is being built in phases.

Current posture:

- keep the runtime narrow
- validate meaning before scale
- prefer stronger authoring and pressure testing over premature growth

The repo should not drift into:

- broad concept expansion without validation
- chatbot behavior
- feature growth that outruns semantic discipline

## Community

- [Code of Conduct](./CODE_OF_CONDUCT.md)
- [Bug report template](./.github/ISSUE_TEMPLATE/bug_report.md)
- [Feature request template](./.github/ISSUE_TEMPLATE/feature_request.md)

## Author

### Operating Model

SS-CYP-CPDM-PSM-2406  
Serhat Soruklu | Coupyn | ChatPDM  
PSM = Principled Strategy Model  

Core Hash:  
PSM-5 = Strategy / Long-Term / People / Execution / Trust  

Full Operating Code:  
SS::CYP::CPDM::GREEN-PSM-5::NO-DECEPTION::SIGNAL-INTEGRITY
