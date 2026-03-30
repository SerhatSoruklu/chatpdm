# Policy Claim Registry

This directory stores the structured source-of-truth claim registry for the inspectable policy
surface.

## File Shape

One JSON file exists per policy surface:

- `privacy.json`
- `terms.json`
- `cookies.json`
- `data-retention.json`
- `acceptable-use.json`

Each file contains:

- surface `key`
- surface `version`
- surface `state`
- published and future versioned claim entries

## Claim Requirements

Each claim entry must include:

- `id`
- `version`
- `state`
- `policyFile`
- `section`
- `policySentence`
- `canonicalClaim`
- `claimClass`
- `status`
- `notes`
- `lifecycle`
- `evidenceLinks`

## Source-Of-Truth Rule

The frontend policy generator reads this registry directly.

`policies/POLICY_AUDIT_PHASE_D.md` is no longer the primary claim source.

## Editing Rule

Edit claim registry files intentionally and keep claim IDs stable.

If a claim meaning changes materially, increment the claim version and preserve the old version as
`superseded` instead of silently overwriting published truth.
