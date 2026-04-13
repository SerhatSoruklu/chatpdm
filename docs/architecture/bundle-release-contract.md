# Bundle Release Contract

The military constraints bundle is an immutable compiled artifact. A bundle version is never edited in place.

## Version Rules

- Any change to canonicalized bundle content creates a new bundle hash.
- Any new bundle hash requires a new bundle version.
- Bundle content includes rules, precedence policy, authority graph, source registry snapshot, jurisdiction, and other serialized admission data.
- Derived runtime traces, logs, and test output are not part of the bundle hash.

## Version Semantics

- `patch`: non-behavioral metadata-only adjustments that do not change validated bundle behavior. Even then, if serialized bundle content changes, the bundle hash changes and the bundle version must advance.
- `minor`: additive reviewed-clause or source-snapshot changes that preserve existing reference decisions but may add new coverage. Regression snapshots must be reviewed and updated if new cases are introduced.
- `major`: any change that can alter an existing reference decision, stage order, authority behavior, scope behavior, or refusal outcome. Major changes require explicit review and refreshed regression snapshots.

## Regression Update Rules

- Regression snapshots must be updated whenever a bundle change alters any of:
  - `decision`
  - `reasonCode`
  - `failedStage`
  - `failingRuleIds`
- Regression snapshots must also be updated when new cases are added to the reference pack.
- The reference bundle is the source of truth for the regression suite, not the reverse.

## Immutability

- A released bundle version is immutable.
- If behavior must change, publish a new bundle version.
- Do not reuse a bundle ID/version pair for a different compiled artifact.

## Review Gate

- New bundle versions require corpus review, compiler admission, semantic validation, and regression re-run.
- No bundle release is considered stable until it passes the frozen reference suite.
