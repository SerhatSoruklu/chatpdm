# AGENTS.md

Repo-level guidance for ChatPDM work.

## Project Boundary

ChatPDM is a separate project from 4Kapi.

Do not import:

- 4Kapi CSS naming
- 4Kapi layout utilities
- 4Kapi visual patterns
- 4Kapi product assumptions

unless the user explicitly asks for it.

## Main Entry Point

Canonical repository root:

- `/home/serhat/code/chatpdm`

Windows launcher folder:

- `D:\chatpdm.code`

The application now lives directly in this repo root, with:

- [frontend](/home/serhat/code/chatpdm/frontend)
- [backend](/home/serhat/code/chatpdm/backend)
- [docs](/home/serhat/code/chatpdm/docs)
- [data](/home/serhat/code/chatpdm/data)
- [tests](/home/serhat/code/chatpdm/tests)

## Identity

ChatPDM is a deterministic meaning system.

Do not drift into:

- chatbot UI conventions
- freeform answer generation
- speculative backend logic
- generic AI SaaS framing

## Canonical Source Priority

- When authoring or revising ChatPDM v1 concepts, use `chatpdm-reference` as grounding material.
- Primary canonical grounding sources for v1:
  - `rawls`
  - `nozick`
  - `plato`
  - `sandel`
  - `soames`
  - `carnap`
  - `keet`
- Secondary or optional perspective sources:
  - `ataturk`
  - `mevlana`
  - `quran`
  - `marx`
  - `allemang-hendler-gandon`
  - `priest`
  - `cambridge`

Rules:

- prefer primary sources for canonical v1 definitions
- do not let secondary sources control the canonical definition layer
- secondary sources may inform later perspective layers or bounded comparative notes
- canonical definitions must remain structurally neutral, comparable, and non-ideological
- the reference stack strengthens authoring rigor; it does not authorize ontology work, inference engines, or broad architecture changes by itself

## Frontend Guardrails

- ChatPDM is light, calm, editorial, and web-first.
- It is not chatbot-like and should not drift into generic AI SaaS styling.
- The current visual baseline is [landing-page.component.html](/home/serhat/code/chatpdm/frontend/src/app/pages/landing/landing-page.component.html).
- Use ChatPDM-specific class naming.
- No CSS variables. Do not add `:root` token systems.
- Light theme is the only active theme for now.
- Future dark mode must be supported structurally, but not fully implemented by default.

## Backend Guardrails

- Keep routes explicit and simple.
- Keep the runtime deterministic and refusal-first outside authored scope.
- Do not add probabilistic matching, LLM behavior, or hidden semantic guessing into the core path.
- Maintain clear separation between concepts, sources, feedback, and future optional layers.

## Docs Guidance

- Update docs before broadening implementation scope.
- Data structures should be documented before runtime behavior is added.
- Reference [chatpdm-build-path.txt](/home/serhat/code/chatpdm/chatpdm-build-path.txt) when the product direction needs clarification.

## Responsive Guardrails

The official breakpoint system is documented in:

- [responsive-layout.md](/home/serhat/code/chatpdm/docs/architecture/responsive-layout.md)

Do not invent random breakpoint values per component.

Use only the official bands unless the breakpoint document is explicitly updated:

- mobile: `0-599px`
- tablet: `600-839px`
- mini laptop: `840-1199px`
- medium desktop: `1200-1439px`
- large desktop: `1440px+`
