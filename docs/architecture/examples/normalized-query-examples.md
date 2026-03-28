# ChatPDM Normalized Query Examples

The examples below illustrate how the v1 normalizer and matcher are expected to behave.

These examples explain the rule system. They are not runtime fixtures and they do not override the response contract.

For the `canonical_id` rows below, the match path comes from raw-query prefix detection on `concept:`. The shown `normalizedQuery` is still produced for contract consistency, logging, and debugging, but it is not what decides the `canonical_id` branch.

| Raw query | normalizedQuery | Expected outcome type | Expected match path or reason |
| --- | --- | --- | --- |
| `What is authority?` | `authority` | `concept_match` | `exact_alias` |
| ` define justice ` | `justice` | `concept_match` | `exact_alias` |
| `meaning of power` | `power` | `concept_match` | `exact_alias` |
| `meaning of public duty` | `public duty` | `concept_match` | `normalized_alias`; resolved through the published normalized alias table |
| `Tell me about legitimacy` | `legitimacy` | `concept_match` | `exact_alias` |
| `rights` | `rights` | `ambiguous_match` | `ambiguous_alias`; multiple canonical concepts share the alias |
| `define moral weather` | `moral weather` | `no_exact_match` | no authored concept and no authored suggestion mapping |
| `define civic duty` | `civic duty` | `no_exact_match` | no canonical concept; authored suggestion mapping returns `public duty` |
| `human rights` | `human rights` | `concept_match` | `exact_alias` |
| `what is legal rights?` | `legal rights` | `concept_match` | `exact_alias` |
| `authority` | `authority` | `concept_match` | `exact_alias` |
| `AUTHORITY` | `authority` | `concept_match` | `exact_alias`; case normalization only |
| `What is authority!!!` | `authority` | `concept_match` | `exact_alias`; punctuation removed, filler stripped once |
| `???` | `__empty__` | `no_exact_match` | empty-after-normalization short-circuits matching; suggestions `[]` |
| `concept:authority` | `conceptauthority` | `concept_match` | `canonical_id`; raw query exact prefix triggers directed canonical lookup before alias stages |
| `concept:missing-id` | `conceptmissing-id` | `no_exact_match` | `canonical_id`; directed lookup fails and does not fall through to alias matching |
| `what is what is authority` | `what is authority` | `no_exact_match` | one filler strip only; no second pass |
| <code> concept:authority</code> | `conceptauthority` | `no_exact_match` | raw query does not start with exact `concept:` prefix because of leading whitespace |
| `Explain   HUMAN RIGHTS!!!` | `human rights` | `concept_match` | `exact_alias`; whitespace collapse, lowercase, punctuation removal, filler strip |
| `what are rights` | `rights` | `ambiguous_match` | `ambiguous_alias`; filler stripped once, alias remains shared |
