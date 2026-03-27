# ChatPDM

Deterministic concept resolution for a bounded, authored concept system.

ChatPDM is a public development repo for a meaning engine that answers only within a defined concept set. It is designed to return stable, inspectable outputs for authored concepts and to refuse unsupported queries honestly instead of improvising.

## What Problem It Solves

Most concept tools drift into one of two failure modes:

- chatbot-style answers that sound plausible but are not structurally grounded
- dictionary-style lookup that cannot represent ambiguity, refusal, or bounded interpretation cleanly

ChatPDM is built to sit in between those extremes.

It aims to:

- resolve authored concepts deterministically
- preserve explicit ambiguity when a query should not auto-resolve
- return honest `no_exact_match` when the system should refuse
- classify query shape without pretending to reason beyond authored scope

## What ChatPDM Is

ChatPDM is:

- a deterministic meaning system
- a bounded concept engine
- authored, versioned, and inspectable
- refusal-first outside the authored concept boundary

ChatPDM is not:

- a chatbot
- a generic Q&A system
- semantic search
- an inference engine
- a full ontology platform

## Governance Scope Policy (Phase 12.5)

Certain core concepts are explicitly governance-scoped in ChatPDM v1:

- authority
- power
- legitimacy

These are not universal definitions across all domains.

### Rules

- These concepts are defined only within the governance domain
- They must not be presented as domain-neutral or universally exhaustive
- Their scope must be preserved in:
  - canonical outputs
  - comparison outputs
  - relation outputs
  - documentation
  - UI/API surfaces

### Non-governance handling

Queries implying non-governance usage must result in:

- scoped clarification, or
- explicit out_of_scope refusal

This policy is enforced at runtime and must not be bypassed.

## Current Status

The repo is in active beta development.

Current state:

- Angular SSR beta query surface
- Express runtime resolver
- file-backed canonical concept set
- response contract and schema validation
- semantic pressure-testing harness
- query-shape classification for:
  - exact concept queries
  - canonical ID queries
  - ambiguity
  - subtype-shaped phrasing
  - comparison-shaped phrasing
  - relation-shaped phrasing
  - role or actor phrasing

Current runtime seed concepts:

- `governance-scoped enforcement for authority, power, legitimacy`
- `source-integrity enforcement via sourcePriority (Phase 12.6)`
- `authority`
- `power`
- `legitimacy`
- `responsibility`
- `duty`

Locked v1 scope is broader than the live seed runtime, but the runtime intentionally expands slowly.

## Minimal Example

Example resolver call:

```bash
curl "http://localhost:4301/api/v1/concepts/resolve?q=civic%20duty"
```

Representative response shape:

```json
{
  "type": "no_exact_match",
  "query": "civic duty",
  "normalizedQuery": "civic duty",
  "queryType": "subtype_query",
  "interpretation": {
    "interpretationType": "narrower_subtype",
    "baseConcept": "duty",
    "modifier": "civic"
  },
  "resolution": {
    "method": "no_exact_match"
  },
  "suggestions": [
    {
      "conceptId": "duty",
      "reason": "broader_topic"
    }
  ]
}
```

This is the intended posture:

- recognize what kind of query was asked
- refuse unsupported composition honestly
- point to the nearest authored concept when a deterministic rule exists

## Repository Layout

```text
chatpdm/
├─ AGENTS.md
├─ PRODUCT-IDENTITY.md
├─ README.md
├─ backend/
├─ chatpdm-reference/
├─ data/
├─ docs/
├─ frontend/
└─ package.json
```

Key areas:

- [frontend](/home/serhat/code/chatpdm/frontend): Angular beta surface
- [backend](/home/serhat/code/chatpdm/backend): Express resolver runtime
- [docs](/home/serhat/code/chatpdm/docs): product, architecture, authoring, and validation docs
- [data](/home/serhat/code/chatpdm/data): canonical concept source artifacts
- [tests](/home/serhat/code/chatpdm/tests): golden fixtures and semantic pressure harness
- [chatpdm-reference](/home/serhat/code/chatpdm/chatpdm-reference): conceptual grounding stack for authoring discipline

Frontend structure policy:

- new Angular UI work should default to `ts/html/css` component-local files
- `spec.ts` files are optional for pure presentational components and expected for behavior-bearing ones
- global [styles.css](/home/serhat/code/chatpdm/frontend/src/styles.css) should stay limited to app-wide foundations, not component-specific styling

## Local Development

From the repo root:

```bash
npm install
npm run bootstrap
npm run dev
```

Useful commands:

```bash
npm run dev:frontend
npm run dev:backend
npm run build
npm run check
```

Run subprojects directly:

```bash
cd frontend && npm start
cd frontend && npm run serve:ssr:frontend
cd backend && npm run dev
```

## Local Dev Ports

- Backend: `http://127.0.0.1:4301`
- Frontend: `http://127.0.0.1:4200`
- These ports are intentionally fixed for deterministic local validation.

SSR production build output:

```text
frontend/dist/frontend/browser
frontend/dist/frontend/server
```

Production runtime split:

- `chatpdm-web`: Angular SSR Node process
- `chatpdm-api`: Express resolver API
- `nginx`: public edge for `chatpdm.com` and `api.chatpdm.com`

## Testing Posture

ChatPDM currently uses targeted validation rather than a broad formal test suite.

- Frontend relies mainly on Angular build, TypeScript correctness, SSR compile health, and `*.spec.ts` only where needed.
- Backend relies mainly on focused verification scripts and lightweight runtime validation.
- Add tests selectively where regression risk justifies them.

## Documentation Map

Start here if you want the project model before touching code:

- [Response contract](/home/serhat/code/chatpdm/docs/product/response-contract.md)
- [Response schema](/home/serhat/code/chatpdm/docs/product/response-schema.json)
- [Query normalization and matching rules](/home/serhat/code/chatpdm/docs/architecture/query-normalization-rules.md)
- [Concept writing standard](/home/serhat/code/chatpdm/docs/architecture/concept-writing-standard.md)
- [V1 concept scope](/home/serhat/code/chatpdm/docs/architecture/v1-concept-scope.md)
- [Boundary integrity](/home/serhat/code/chatpdm/docs/boundary-integrity.md)
- [Conceptual reference stack](/home/serhat/code/chatpdm/docs/conceptual-reference-stack.md)
- [Git push workflow](/home/serhat/code/chatpdm/docs/git-push-workflow.md)

## Reference Stack

ChatPDM uses a structured reference stack under [chatpdm-reference](/home/serhat/code/chatpdm/chatpdm-reference) to improve concept authoring rigor and boundary discipline.

That stack informs:

- canonical source grounding
- concept contrast work
- semantic review
- long-term authoring consistency

It does not by itself authorize:

- ontology engineering
- inference engines
- graph database migration
- broad architecture changes

See [conceptual-reference-stack.md](/home/serhat/code/chatpdm/docs/conceptual-reference-stack.md) for the active v1.1 policy.

## Design Principles

- deterministic runtime behavior under fixed versions
- authored concepts over generated meaning
- enforced source grounding for canonical definitions
- governance-domain scoping for core structural concepts
- honest refusal over fake completeness
- calm, bounded product surfaces over AI theater
- narrow expansion with validation before scale

## Source Integrity Layer (Phase 12.6)

ChatPDM enforces strict source integrity at the concept level.

Each concept must define a `sourcePriority` array with:

- index 0 → primary canonical source (concept-specific)
- index 1 → `oxford` (dictionary boundary anchor)

### Source Rules

- Only sources registered in `source-registry.json` are allowed
- Only `tier: "core"` sources may be used in `sourcePriority`
- `oxford` is mandatory and must be at index 1
- The primary source must match the concept binding:
  - authority → weber
  - power → lukes
  - legitimacy → beetham
  - responsibility → hart
  - duty → hohfeld
- `sourcePriority` must exactly match `sources[]` (no extra or missing sources)
- Duplicate sources are not allowed

### Purpose

This ensures:

- deterministic grounding of definitions
- no silent source drift
- no injection of extended or technical references into canonical outputs

This layer does not change runtime behavior. It enforces data integrity at load time only.

## Roadmap Posture

ChatPDM is being built in phases.

The current posture is:

- keep the runtime narrow
- validate meaning before scale
- prefer stronger authoring and pressure testing over premature feature growth

This repo should not drift into:

- broad concept expansion without validation
- ontology panic
- chatbot behavior
- feature growth that outruns semantic discipline
