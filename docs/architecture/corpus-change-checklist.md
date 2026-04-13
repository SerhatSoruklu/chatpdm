# Corpus Change Checklist

Use this checklist before adding, editing, or promoting any reviewed clause.

## Required Checks

- Source role valid.
- Jurisdiction valid.
- Ambiguity resolved.
- Layer classification valid.
- Provenance preserved.
- Quarantine boundary preserved.
- Regression impact reviewed.
- Bundle version impact reviewed.

## Additional Review Questions

- Does the clause preserve sourceId, locator, and review notes?
- Does the clause stay within the admitted layer for its source role?
- If the clause is example-only, is the explicit override present before promotion?
- If the clause is compilable, does it remain CLEAR and COMPILATION_READY?
- Does the clause change any frozen reference decision?

## Release Rule

- If any required check fails, do not publish the clause into the reference corpus.
- If any frozen regression decision changes, update the bundle version and refresh the regression snapshots together.
