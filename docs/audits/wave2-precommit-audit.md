# Wave 2 Military Constraints Pre-Commit Audit

Audit date: 2026-04-16

## Scope

This audit reviewed the full current git change set for the military-constraints Wave 2 worktree.

The reviewed set covers the currently implemented scope:

- INTL extraction
- US refactor onto INTL
- UK foundation
- UK domain packs
- NATO / coalition layer

The worktree also contains CA, AU, NL, and TR artifacts. They were reviewed as changed files, but this audit did not extend the runtime model or start new Wave 2 architecture beyond the requested scope.

## Total Files Reviewed

`191`

## Grouped Inventory

| Group | Files |
| --- | ---: |
| Manifests | 34 |
| Reviewed clauses | 32 |
| Regression fact packets | 32 |
| Regression expected decisions | 32 |
| Authority graphs | 7 |
| Runtime/build/validator files | 7 |
| Tests | 24 |
| Frontend truth surfaces | 4 |
| Registry / DAG / docs | 19 |

## Findings By Severity

### Critical

None.

### High

None.

### Medium

| File(s) | Issue | Why it matters | Fix |
| --- | --- | --- | --- |
| `docs/military-constraints/MULTI_PACK_TRUTH_AUDIT.md` | The truth audit said the registry-backed API surface exposed `73` non-umbrella packs. The actual registry has `73` total entries, including `1` umbrella-label entry, so the non-umbrella wording was false. | This was a surfaced-truth mismatch in an audit doc that is supposed to mirror the live registry arithmetic. It could mislead later waves or reviewers about the actual registry composition. | Updated the wording to say `73` registry entries, including `1` umbrella-label entry, and clarified that the planned total includes the umbrella label. |

### Low

None.

## Findings By Category

- Determinism: no findings.
- Pack Contract Integrity: no findings.
- Referential Integrity: no findings.
- Stage Semantics: no findings.
- Cross-Pack Isolation: no findings.
- Boundary Quality: no findings.
- Regression Safety: no findings.
- Surfaced Truth: 1 medium finding, fixed.
- Tooling / Lifecycle: no findings.
- Push / Commit Risk: no findings.

## Validation Evidence

- `node scripts/run-all-military-constraint-checks.js`
- `node --test backend/src/routes/api/v1/__tests__/military-constraints.route.test.js`
- `npm --prefix frontend run typecheck`
- `npm --prefix frontend run build`
- `git diff --check`
- Registry count check: `73` total entries, `58` admitted, `5` baseline, `10` planned, `1` umbrella-label

Validation result:

- Backend heartbeat passed.
- Route tests passed.
- Frontend typecheck passed.
- Frontend build passed.
- Diff hygiene passed.

The frontend build emitted existing `MODULE_TYPELESS_PACKAGE_JSON` warnings from the generation scripts, but the build completed successfully.

## Post-Fix Summary

### What Was Fixed

- Corrected the registry-count wording in `docs/military-constraints/MULTI_PACK_TRUTH_AUDIT.md`.

### What Remains

- No open Critical, High, or Medium findings remain in the current worktree.

### Intentionally Deferred

- CA, AU, NL, and TR expansion beyond the currently implemented Wave 2 scope.
- Any runtime model redesign.
- Overlay unification beyond the explicit families already present in the worktree.

## Final Recommendation

`SAFE TO COMMIT`

Rationale:

- All changed files were reviewed.
- The only audit finding was a Medium surfaced-truth doc mismatch, and it was fixed.
- Determinism, registry validation, route behavior, regression fixtures, and frontend compilation all passed validation.
