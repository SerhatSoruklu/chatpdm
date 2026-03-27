# Contrast Matrix v1

This matrix defines the minimum boundary distinctions that must survive hostile query pressure in the current v1 cluster.

The matrix is a reviewer artifact. It does not change runtime behavior by itself.

## Governance Core Triad Lock

For ChatPDM v1, `authority`, `power`, and `legitimacy` form a non-collapsible governance-core triad.

Their roles are:

- `authority` = structural
- `power` = operational
- `legitimacy` = evaluative

These three concepts are governance-scoped canonical concepts. They must not be presented as domain-neutral or universally exhaustive across all human uses of the same words.

Any future definition, relation, or comparison that merges their roles is invalid.

## Authority vs Power

- Distinction to preserve:
  - `authority` is recognized standing to direct within a structure
  - `power` is effective capacity to produce outcomes with or without recognition
- What must not collapse:
  - authority must not be described as mere force
  - power must not require recognized right
- Common user confusion:
  - casual language treats command ability as equivalent to authority
- Hostile / friction queries:
  - `authority vs power`
  - `is authority just power`
  - `power with no authority`
  - `authority is force`
- Notes for reviewer:
  - watch for “recognized force” phrasing that smears the boundary

## Authority vs Legitimacy

- Distinction to preserve:
  - `authority` is the standing or right itself
  - `legitimacy` is accepted validity of that standing, rule, or office
- What must not collapse:
  - legitimacy must not be treated as the office or right itself
  - authority must not require moral or accepted validity in its definition
- Common user confusion:
  - people often assume a recognized office is automatically legitimate
- Hostile / friction queries:
  - `authority vs legitimacy`
  - `authority without legitimacy`
  - `legitimate authority`
  - `who has authority if not legitimate`
- Notes for reviewer:
  - this is the highest-risk live boundary in the current authored seed set

## Power vs Legitimacy

- Distinction to preserve:
  - `power` is capacity
  - `legitimacy` is accepted validity
- What must not collapse:
  - power must not require acceptance
  - legitimacy must not be described as mere effectiveness
- Common user confusion:
  - users often assume stable power is legitimate by default
- Hostile / friction queries:
  - `power vs legitimacy`
  - `can power exist without legitimacy`
  - `legitimacy is power`
  - `power that everyone accepts`
- Notes for reviewer:
  - queries about acceptance should not silently turn power into legitimacy

## Consent vs Authority

- Distinction to preserve:
  - `consent` is voluntary acceptance or agreement
  - `authority` is role-bound standing to direct or decide
- What must not collapse:
  - consent must not become the definition of all authority
  - authority must not be reduced to one person's approval
- Common user confusion:
  - users often treat obedience or agreement as equivalent to recognized standing
- Hostile / friction queries:
  - `consent vs authority`
  - `does consent create authority`
  - `authority without consent`
  - `voluntary obedience is authority`
- Notes for reviewer:
  - current runtime does not author `consent`; honest no-match is preferable to a forced approximation

## Trust vs Legitimacy

- Distinction to preserve:
  - `trust` concerns confidence, reliance, or expected fidelity
  - `legitimacy` concerns accepted validity of standing, rule, or order
- What must not collapse:
  - trust must not be treated as public legitimacy
  - legitimacy must not be reduced to personal confidence
- Common user confusion:
  - people often use “trusted” and “legitimate” interchangeably
- Hostile / friction queries:
  - `trust vs legitimacy`
  - `trusted but not legitimate`
  - `legitimate because trusted`
  - `why trust authority`
- Notes for reviewer:
  - this is a likely future bleed zone once `trust` is authored

## Responsibility vs Duty

- Distinction to preserve:
  - `responsibility` is answerable connection to actions, roles, or outcomes
  - `duty` is required conduct owed under a rule, role, or obligation
- What must not collapse:
  - responsibility must not become mere obligation
  - duty must not become generic answerability
- Common user confusion:
  - everyday speech often treats both as “what you should do”
- Hostile / friction queries:
  - `responsibility vs duty`
  - `responsibility without duty`
  - `duty makes you responsible`
  - `is responsibility just duty`
- Notes for reviewer:
  - this pair currently holds well and should stay a calibration anchor

## Law vs Legitimacy

- Distinction to preserve:
  - `law` concerns formal rule structure
  - `legitimacy` concerns whether that rule or order counts as valid
- What must not collapse:
  - law must not be treated as automatically legitimate
  - legitimacy must not be reduced to whatever is formalized
- Common user confusion:
  - users often equate legality with legitimacy
- Hostile / friction queries:
  - `law vs legitimacy`
  - `law without legitimacy`
  - `is all law legitimate`
  - `legitimacy without law`
- Notes for reviewer:
  - current runtime does not author `law`; honest refusal is correct until the concept exists

## Reviewer Use

Use this matrix together with:

- [`docs/boundary-integrity.md`](/home/serhat/code/chatpdm/docs/boundary-integrity.md)
- [`docs/local-change-cascade-rule.md`](/home/serhat/code/chatpdm/docs/local-change-cascade-rule.md)
- [`tests/runtime/fixtures/query-stress-pack.v1.json`](/home/serhat/code/chatpdm/tests/runtime/fixtures/query-stress-pack.v1.json)

If a response survives schema validation but weakens one of the distinctions above, treat that as a semantic failure, not a cosmetic issue.
