# AGENTS.md

Repo-level guidance for ChatPDM work.

## Project Boundary

ChatPDM is a separate project from 4Kapi.

Do not import:

- 4Kapi CSS naming
- 4Kapi layout utilities
- 4Kapi visual patterns
- 4Kapi product assumptions

unless the user explicitly requests it.

## Main Entry Point

Canonical repository root:

- `/home/serhat/code/chatpdm`

Windows launcher folder:

- `D:\chatpdm.code`

The application now lives directly in this repo root, with:

- [frontend](./frontend)
- [backend](./backend)
- [docs](./docs)
- [data](./data)
- [tests](./tests)

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
- The current visual baseline is [landing-page.component.html](./frontend/src/app/pages/landing/landing-page.component.html).
- Use ChatPDM-specific class naming.
- No CSS variables. Do not add `:root` token systems.
- Light theme is the only active theme for now.
- Future dark mode must be supported structurally, but not fully implemented by default.

### Component Structure Policy

- New Angular UI work should default to component-local files:
  - `component.ts`
  - `component.html`
  - `component.css`
- Do not move component-specific styling into global [styles.css](./frontend/src/styles.css) unless the rule is truly app-wide.
- Keep [styles.css](./frontend/src/styles.css) limited to:
  - reset and base document rules
  - shared typography and spacing foundations
  - global layout constraints
  - deliberately approved cross-app primitives
- If a styling pattern repeats across multiple components, promote it intentionally. Do not dump one-off page styling into the global stylesheet for convenience.

### Spec Policy

- `spec.ts` files are optional for pure presentational leaf components.
- Add a `spec.ts` file when a component has:
  - interaction logic
  - derived or computed UI state
  - SSR-sensitive behavior
  - routing behavior
  - query/rendering conditions that are likely to regress
- Treat specs as expected for behavior-bearing components, even if small presentational wrappers may omit them.

## Backend Guardrails

- Keep routes explicit and simple.
- Keep the runtime deterministic and refusal-first outside authored scope.
- Do not add probabilistic matching, LLM behavior, or hidden semantic guessing into the core path.
- Maintain clear separation between concepts, sources, feedback, and future optional layers.

## Testing Posture

- ChatPDM uses targeted validation rather than a broad formal test suite.
- Frontend relies mainly on Angular build, TypeScript correctness, SSR compile health, and `*.spec.ts` only where needed.
- Backend relies mainly on focused verification scripts and lightweight runtime validation.
- Add tests selectively where regression risk justifies them.

## Validation and Push Safety

- Do not stage or commit secrets, `.env` files, API keys, tokens, private keys, or credentials.
- Do not commit local-only artifacts such as logs, dumps, cache files, or temporary files.
- Do not commit build output (e.g. dist folders) unless explicitly required.

### Validation Severity

Blocking issues (must be fixed before push):

- compile/build failures
- backend startup safety failure (cannot compile or start without immediate crash in local validation mode)
- merge conflicts
- remote divergence requiring merge/rebase decision
- secrets or sensitive files
- unrelated dirty changes

Non-blocking by default:

- low-value warnings
- minor lint/style issues
- SonarQube noise
- optional documentation formatting issues

### Scope Discipline

- Do not bundle unrelated fixes into the same commit.
- If unrelated issues are discovered, surface them separately instead of fixing them during the same task.
- Keep commits tightly scoped to the original intent.

### Backend Validation Notes

- Backend verification scripts are located in [backend/scripts](./backend/scripts).
- Use the smallest relevant script for validation when applicable.
- Do not run all scripts by default unless the change justifies it.
- Treat `push to git` as: review -> validate -> fix safe blockers -> stage correct files -> commit cleanly -> push safely.
- Keep pre-push validation lightweight: Angular build first, TypeScript correctness second, runtime safety third, lint only when already configured and low-noise, SonarQube advisory only.
- For backend changes, include a lightweight startup-safety check before push: compile cleanly, start safely in a local validation mode, and confirm there is no immediate crash or obvious wiring failure.

## Documentation Guidance

- Update docs before broadening implementation scope.
- Data structures should be documented before runtime behavior is added.
- Reference [chatpdm-build-path.txt](./chatpdm-build-path.txt) when the product direction needs clarification.
- Follow [git-push-workflow.md](./docs/git-push-workflow.md) for the default meaning of `push to git` and `push ALL`.

## Responsive Guardrails

The official breakpoint system is documented in:

- [responsive-layout.md](./docs/architecture/responsive-layout.md)

Do not invent random breakpoint values per component.

Use only the official bands unless the breakpoint document is explicitly updated:

- mobile: `0-599px`
- tablet: `600-839px`
- mini laptop: `840-1199px`
- medium desktop: `1200-1439px`
- large desktop: `1440px+`
