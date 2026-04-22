# Phase 1 - Day 2

Contract Gap Analysis
Date: 2026-04-22
Time: 2026-04-22 16:07 BST
Commit/Branch: main @ 0c7f5df0cf37a7adf3704052e4e9743a70e58181

---

## Scope

Classify current resolver contract gaps using:

- Day 1 inventory
- Day 2 field matrix
- current frontend consumers

This document does not propose fixes.
This document only classifies evidence.

Keep public product responses separate from HTTP error envelopes.

---

## Inputs

- docs/runtime/phase1/day1-inventory.md
- docs/runtime/phase1/day2-field-matrix.md
- frontend/src/app/pages/runtime-page/runtime-page.component.ts
- frontend/src/app/pages/landing/landing-page.component.ts

---

## Evidence Model

Define these terms clearly:

- Evidence gap:
  a field, branch, or behavior not yet observed in runtime, even if it exists in code

- Contract gap:
  a backend/frontend shape inconsistency, missing required field, unstable field meaning, or hidden client reconstruction problem that exists regardless of runtime capture completeness

State explicitly:

- `ambiguous_match` remains an evidence gap for runtime capture because it was not captured live
- the rest of the documented issues below are contract gaps unless explicitly stated otherwise

---

## 1. Missing Required Contract Fields

- `finalState` is only present on `VOCABULARY_DETECTED`; it is absent from `concept_match`, `comparison`, `rejected_concept`, `no_exact_match`, `invalid_query`, `unsupported_query_type`, and `ambiguous_match`. The frontend therefore has to infer state from other signals instead of reading one lifecycle field.
- `failedLayer` does not appear in the current public resolver outputs or the frontend consumers. There is no explicit failure-stage field in the current contract surface.
- `reason` is not standardized as a top-level contract field. The UI synthesizes refusal reasoning from `message`, `interpretation`, and local helper logic instead of consuming a consistent backend field.
- `message` is missing from `concept_match` and `comparison`, so those branches do not provide the same user-facing explanation signal as the refusal branches.

Classification: contract gap

---

## 2. Structural Inconsistencies

- `interpretation` is structurally inconsistent: it is `null` for `concept_match`, `comparison`, and `VOCABULARY_DETECTED`, but an object for refusal and ambiguity branches.
- `resolution` is missing entirely from `comparison`, while the other public response types carry a `resolution` object.
- `type` casing is inconsistent because `VOCABULARY_DETECTED` is uppercase while every other public response type is lowercase.
- `comparison.axes[]` uses mutually exclusive shapes: some entries use `A` and `B`, while others use `statement`.
- `targetConceptId` appears only in some branches, so the same semantic idea is not represented uniformly across resolver outputs.
- `answer.resolutionStatus` is visible in frontend type expectations and can be conditionally appended in resolver code, but it is not part of the validated public surface and was not present in the live captures.
- `vocabulary.term`, `vocabulary.classification`, and `vocabulary.relations` are conditional and can be `null`, so the vocabulary branch is not shape-stable.
- `answer.registers.simplified` and `answer.registers.formal` are conditional on available register modes, which makes the answer payload branch-sensitive.
- `answer.governanceState.trace.unavailableReason` can be `null`, so the trace object is not uniformly populated.

Classification: contract gap

---

## 3. Implicit / Inferred Fields

- `reviewed_not_live` is frontend-derived from `detail.reviewState.admission` plus a local allowlist, not emitted as a backend response type.
- `visible_only` is inferred from `detail.conceptId` membership plus `response.interpretation?.interpretationType === 'visible_only_public_concept'`.
- `blocked` is inferred from either `response.type === 'rejected_concept'` or `detail.reviewState.admission === 'blocked'`.
- `detailConceptId` is reconstructed by the client from query text and local rules rather than being directly authoritative in the resolver response.
- Pre-resolution refusal labels are derived from `interpretation.interpretationType` in the frontend rather than from a dedicated backend status field.
- `reason` is effectively reconstructed in the client when building refusal and display copy, which means the backend does not own that meaning end-to-end.

Classification: contract gap

---

## 4. Frontend Dependency Risks

- `resultDisplayState` on the runtime page uses backend `type` first, then overrides visible state using detail lookup and concept visibility checks, so the displayed truth can diverge from the original resolver response.
- `loadConceptDetail` returns `null` on non-404 errors, which collapses distinct failure modes into the same client-side absence state.
- The landing page reconstructs refusal presentation through multiple helpers that branch on `detail.reviewState`, `isVisibleOnlyRefusal`, and `response.interpretation`, so the UI is compensating for backend gaps.
- `detailConceptId` reconstruction means `targetConceptId` is not the sole source of truth for detail lookup behavior.
- `readingRegisters` on the landing page accepts partial nested register data and falls back to canonical fields, which hides missing structure rather than exposing it.
- `comparison` and `concept_match` shape differences are partly masked by frontend fallback logic, which reduces visible breakage but preserves contract inconsistency underneath.

Classification: contract gap

---

## 5. Risk Classification

### Dangerous

- Frontend overrides backend truth after extra detail lookup.
- Visible state depends on a second fetch.
- `reviewed_not_live`, `visible_only`, `blocked`, and `detailConceptId` are implicit or hybrid states.
- Missing `finalState` outside `VOCABULARY_DETECTED` breaks a single explicit lifecycle signal.
- `loadConceptDetail` collapsing errors into `null` shifts meaning into the client.

### Risky

- `failedLayer` is absent entirely but the UI can still render using other signals.
- `reason` is not standardized.
- `interpretation` varies between `null` and object shapes.
- `resolution` is missing in `comparison`.
- `answer.resolutionStatus` exists in type expectations but is not part of the validated backend public surface.
- `targetConceptId` is present in some branches but not used consistently as an authoritative client key.

### Safe

- `VOCABULARY_DETECTED` casing is inconsistent with the rest of the response types.
- Presentation-level label mappings differ across branches but do not by themselves break runtime resolution.
- `comparison.axes[]` shape variation is contained to the comparison branch, though it still reflects contract inconsistency.

Classification basis: dangerous = breaks determinism or shifts truth to frontend; risky = inconsistent but currently recoverable through client behavior; safe = cosmetic or isolated inconsistency that does not currently own truth

---

## 6. Explicit Required Flags

- Missing `finalState`: yes, absent from most public responses and only present on `VOCABULARY_DETECTED`.
- `targetConceptId` present but unused or inconsistent: yes, it appears in some branches but the client reconstructs `detailConceptId` instead of relying on it alone.
- Hidden state reconstructed in client: yes, especially `reviewed_not_live`, `visible_only`, `blocked`, and the refusal presentation helpers.

---

## 7. Evidence Gaps

- `ambiguous_match` is an evidence gap, not yet a contract-proven runtime branch, because it was identified in code but not captured live.
- The current authored ambiguous-disambiguation input is intercepted by vocabulary boundary precedence before the ambiguous branch becomes observable on the live route.
- This does not erase the coded branch. It means runtime evidence is currently incomplete for that branch.

Classification: evidence gap

---

## 8. Day 2 Conclusions

- The current public resolver surface is not contract-stable enough to count as explicit typed truth.
- Frontend rendering still depends on reconstructed or hybrid state.
- The backend does not currently own lifecycle, refusal-stage, and explanation signals in a uniform way.
- Some fields are missing entirely, some are conditionally present, and some are semantically duplicated through client inference.
- `ambiguous_match` remains runtime-unproven on the current live route, but the main Day 2 contract risks are already evidenced without it.

---

## Day 2 Status

- [x] Field matrix completed
- [x] Runtime observation preserved
- [x] Contract gaps classified
- [x] Dangerous / risky / safe distinctions documented
- [x] Evidence gaps separated from contract gaps

---

## Next Step (Day 3)

Add:

Define the target public response contract:

- required fields
- nullable fields
- stable state vocabulary
- refusal semantics
- deterministic contract fields
