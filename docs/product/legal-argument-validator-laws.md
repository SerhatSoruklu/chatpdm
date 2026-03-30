# Legal Argument Validator Laws

## Pre-A

### Authority Identification Law

A legal claim cannot validate unless its authority is identifiable by recognized source criteria in the loaded doctrine package.

The system does not validate claims based on free moral reasoning, fairness assertions, or extra-source justification alone.

### Restrictive Attribution Law

The validator may attribute legal content to a source or institution only through doctrine-encoded attribution and interpretation rules.

It must not promote all logical, policy, or moral consequences of a source into legal content.

## D

### Authority Concept Law

Authority is a source-recognized directive or legal source whose binding force is identified through origin and source criteria, not through post-hoc moral evaluation alone.

Claimed authority, effective authority, and validated authority are distinct states and must not be collapsed.

### Doctrine Non-Expansion Law

Doctrine packages may encode explicit implications, interpretation rules, and scope conditions.

They may not silently redefine legal content by auto-expanding source text into all entailed consequences or by importing extra-source morality.

## E

### Source and Interpretation Law

A mapped authority is valid only if it:

- belongs to a recognized source class
- matches jurisdiction scope
- matches temporal scope
- is included or allowed by the active doctrine package
- is interpreted under the package's declared attribution rules

## G

### Deterministic Overflow Law

If a claim lacks source-identifiable authority, return `INVALID`.

If a claim relies on extra-source morality to defeat or replace identified authority, return `INVALID`.

If a recognizable legal standard exists but the doctrine package lacks deterministic resolution rules, return `UNRESOLVED`.
