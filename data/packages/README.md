# ChatPDM Package Contracts

This directory holds authored package-side contract data.

It defines what a package is allowed to say about:

- package identity
- package-local doctrine
- activation boundary
- core-equivalent references
- anti-bleed constraints

It does not activate packages.
It does not change backend runtime behavior.
It does not override kernel sovereignty.

Canonical contract files:

- `package-manifest.schema.json`
- `package-concept.schema.json`

Expected package layout:

- `data/packages/<packageId>/manifest.json`
- `data/packages/<packageId>/concepts/*.json`

Contract rules:

- package doctrine is local, explicit, and non-transitive
- package-local concepts may reference core concepts through `coreEquivalent`
- package-local concepts may not silently redefine core meaning identity
- `canAffectCore` remains `false` in package data
- any change that should affect core meaning must move through constitutional review rather than back-propagate from package data

Example or stub packages may exist here for contract illustration.
They are not active doctrine by default.
