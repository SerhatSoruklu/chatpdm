# Legal Argument Validator Raz Notes

These notes capture architecture-relevant extraction from Joseph Raz's `Authority, Law and Morality`.

They are not a generic summary. They exist to turn the reading into deterministic system inputs for the Legal Argument Validator.

Primary source:

- [authority-law-and-morality.pdf](/home/serhat/code/chatpdm/chatpdm-sources/law/authority-law-and-morality.pdf)

## Continued Extraction Log

### 1. Sources Thesis as default validity posture

Source:

- Book: `Authority, Law and Morality`
- Chapter / section: opening theses
- Page(s): 295-296

Raw idea:

- Raz frames the essay around rival positions and aims to defend the Sources Thesis over the Incorporation and Coherence theses.

Classification:

- Invariant

System mapping:

- Why it matters for the Legal Argument Validator: the validator needs a default legal-validity posture that does not silently import moral supplementation.
- Which roadmap phase it maps to: `Pre-A1`, `D1`, `G2`
- Which entity or subsystem it affects: `Concept`, `AuthorityNode`, `ValidationRun`, doctrine loader

Evidence level:

- Directly stated in the text

Deterministic implication:

- What the validator should do because of this: treat source-identifiability as the default gate for legal validity.
- What the validator must refuse because of this: free moral supplementation as if it were automatically part of law.

### 2. Legitimate authority and de facto authority must remain distinct

Source:

- Book: `Authority, Law and Morality`
- Chapter / section: `1. Authority and Justification`
- Page(s): 296-297

Raw idea:

- Authority in general can be divided into legitimate authority and de facto authority, and practical authority gives reasons for action to its subjects.

Classification:

- Concept

System mapping:

- Why it matters for the Legal Argument Validator: the system must distinguish claimed authority, effective authority, and validated authority instead of collapsing them.
- Which roadmap phase it maps to: `D1`, `E1`, `G2`
- Which entity or subsystem it affects: `AuthorityNode`, `Concept`, validation kernel

Evidence level:

- Directly stated in the text

Deterministic implication:

- What the validator should do because of this: model authority status separately from mere source existence or social effectiveness.
- What the validator must refuse because of this: treating any directive as valid authority merely because it exists or is followed.

### 3. Dependence thesis requires applicability conditions

Source:

- Book: `Authority, Law and Morality`
- Chapter / section: `1. Authority and Justification`
- Page(s): 299

Raw idea:

- Authoritative directives should be based on reasons that already apply to the subjects and circumstances covered by the directives.

Classification:

- Constraint

System mapping:

- Why it matters for the Legal Argument Validator: doctrine packages need applicability conditions linking rules to the persons, facts, and circumstances they actually govern.
- Which roadmap phase it maps to: `D1`, `E2`, `G2`
- Which entity or subsystem it affects: `Concept`, `AuthorityNode`, `Mapping`, validation kernel

Evidence level:

- Directly stated in the text

Deterministic implication:

- What the validator should do because of this: require doctrine-scoped applicability conditions before validating rule application.
- What the validator must refuse because of this: applying authority outside encoded subject or circumstance scope.

### 4. Legitimacy theory is not a free runtime calculation

Source:

- Book: `Authority, Law and Morality`
- Chapter / section: `1. Authority and Justification`
- Page(s): 299-300

Raw idea:

- Authority is justified when following it helps subjects better comply with the reasons already applying to them than acting directly on those reasons.

Classification:

- Concept

System mapping:

- Why it matters for the Legal Argument Validator: this is a theory of justified authority, but not a safe runtime license for machine moral evaluation.
- Which roadmap phase it maps to: `Pre-A1`, `D1`, `G2`
- Which entity or subsystem it affects: product law, doctrine package design, validation kernel

Evidence level:

- Directly stated in the text

Deterministic implication:

- What the validator should do because of this: treat legitimacy assessments as doctrine-authored or out of scope.
- What the validator must refuse because of this: ad hoc runtime claims that authority is legitimate because it seems fairer, better, or more reasonable.

### 5. Preemption blocks double counting

Source:

- Book: `Authority, Law and Morality`
- Chapter / section: `1. Authority and Justification`
- Page(s): 297-300

Raw idea:

- An authoritative directive replaces some of the reasons on which one would otherwise act, and counting both as independent support is double counting.

Classification:

- Invariant

System mapping:

- Why it matters for the Legal Argument Validator: once a claim is supported by identified authority, the same dependent reasons should not be counted again as separate legal support.
- Which roadmap phase it maps to: `F1`, `G2`, `H1`
- Which entity or subsystem it affects: `Mapping`, validation kernel, failure-code registry

Evidence level:

- Directly stated in the text

Deterministic implication:

- What the validator should do because of this: distinguish source-based authority support from dependent reasons.
- What the validator must refuse because of this: double-counted support or source-override attempts disguised as extra reasonableness support.

### 6. Law claims authority without guaranteeing legitimacy

Source:

- Book: `Authority, Law and Morality`
- Chapter / section: `2. Authority and the Law`
- Page(s): 300-303

Raw idea:

- Law necessarily claims authority, but a legal system may lack legitimate authority while still possessing the non-moral prerequisites needed to count as law.

Classification:

- Concept

System mapping:

- Why it matters for the Legal Argument Validator: the validator must separate authority claim, authority status, and current validation outcome.
- Which roadmap phase it maps to: `D1`, `E1`, `G2`
- Which entity or subsystem it affects: `AuthorityNode`, `ValidationRun`, authority validator

Evidence level:

- Directly stated in the text

Deterministic implication:

- What the validator should do because of this: record authority claims as source facts, then validate them under explicit package rules.
- What the validator must refuse because of this: assuming that any claimed authority is automatically legitimate or automatically decisive.

### 7. Source-identifiable authority is the clean validator rule

Source:

- Book: `Authority, Law and Morality`
- Chapter / section: `2. Authority and the Law`
- Page(s): 303-305

Raw idea:

- A directive can be authoritatively binding only if it is identifiable independently of the considerations it was supposed to decide upon.

Classification:

- Invariant

System mapping:

- Why it matters for the Legal Argument Validator: this is the strongest source-facing rule for authority identification.
- Which roadmap phase it maps to: `Pre-A1`, `D2`, `E1`, `G2`
- Which entity or subsystem it affects: `AuthorityNode`, `Mapping`, doctrine loader, validation kernel

Evidence level:

- Directly stated in the text

Deterministic implication:

- What the validator should do because of this: validate only authorities whose content can be located and attributed through recognized source criteria and doctrine-encoded interpretation rules.
- What the validator must refuse because of this: authority reconstructed only from desired outcomes, fairness, or post-hoc balancing.

### 8. The validator must reject implication inflation

Source:

- Book: `Authority, Law and Morality`
- Chapter / section: incorporation thesis critique
- Page(s): 312-314

Raw idea:

- Raz rejects the move from source-based law to all of its logical or moral consequences being part of law.

Classification:

- Constraint

System mapping:

- Why it matters for the Legal Argument Validator: doctrine packages must not auto-expand legal content into all derivable implications or moral consequences.
- Which roadmap phase it maps to: `D2`, `F2`, `K1`
- Which entity or subsystem it affects: doctrine loader, synonym governance, promotion controls

Evidence level:

- Directly stated in the text

Deterministic implication:

- What the validator should do because of this: allow only explicit source content, doctrine-authored implications, and governed interpretation rules into validation.
- What the validator must refuse because of this: auto-generated doctrinal expansion or free entailment closure.

### 9. Interpretation regimes are doctrine content, not runtime choice

Source:

- Book: `Authority, Law and Morality`
- Chapter / section: `5. The Sources Thesis`
- Page(s): 315-318

Raw idea:

- The sources thesis does not dictate a single rule of interpretation; interpretation rules vary across legal systems and are themselves matters of social fact.

Classification:

- Process Step

System mapping:

- Why it matters for the Legal Argument Validator: the active doctrine artifact must declare the interpretation regime used to attribute content to sources.
- Which roadmap phase it maps to: `D2`, `E1`, `K1`
- Which entity or subsystem it affects: `DoctrineArtifact`, doctrine loader, governance workflow

Evidence level:

- Directly stated in the text

Deterministic implication:

- What the validator should do because of this: require doctrine packages to encode interpretation rules instead of choosing them at runtime.
- What the validator must refuse because of this: switching interpretive method ad hoc because one reading seems morally better.

### 10. Applied validation depends on admissible brute facts, not evaluative overflow

Source:

- Book: `Authority, Law and Morality`
- Chapter / section: `5. The Sources Thesis`
- Page(s): 318-320

Raw idea:

- The sources thesis can apply to applied legal statements when the contingent facts are brute social facts rather than moral facts; courts may exercise discretion, but not as ideal moral dictators.

Classification:

- Process Step

System mapping:

- Why it matters for the Legal Argument Validator: applied validation depends on structured admissible facts plus doctrine, and overflow into judicial discretion must be bounded.
- Which roadmap phase it maps to: `C2`, `G1`, `G3`, `H1`
- Which entity or subsystem it affects: `ArgumentUnit`, `Mapping`, validation kernel, failure-code registry

Evidence level:

- Directly stated in the text, with strong implementation inference for the system rule

Deterministic implication:

- What the validator should do because of this: validate applied claims only from admissible structured facts and source-defined standards; return unresolved when doctrine leaves the decision to discretion the system cannot encode.
- What the validator must refuse because of this: simulating ideal judicial judgment or converting evaluative overflow into fake certainty.

### 11. Procedure and convention are part of authority identity

Source:

- Book: `Authority, Law and Morality`
- Chapter / section: `6. The Role of Values in Legal Theory`
- Page(s): 320-322

Raw idea:

- Legal procedures and conventions matter because they are the way institutions express collective and binding judgment.

Classification:

- Invariant

System mapping:

- Why it matters for the Legal Argument Validator: authority status and source content must be tied to procedure-recognized source creation and interpretation conventions.
- Which roadmap phase it maps to: `Pre-A2`, `E1`, `K1`
- Which entity or subsystem it affects: `DoctrineArtifact`, `AuthorityNode`, governance controls

Evidence level:

- Directly stated in the text

Deterministic implication:

- What the validator should do because of this: require doctrine artifacts to encode source classes, status rules, and interpretation conventions as explicit metadata.
- What the validator must refuse because of this: treating a text as authoritative merely because its reasoning appears strong.

## Failure-Code Candidates

### MVP-critical

- `NO_SOURCE_AUTHORITY`: the claim presents no recognized legal source for the asserted legal effect. Use this when support consists only of fairness, morality, policy, or bare assertion.
- `AUTHORITY_NOT_IDENTIFIABLE`: a purported source or directive is named, cited, or implied, but the validator cannot identify the authority deterministically through doctrine-encoded source criteria and attribution rules.
- `SOURCE_OVERRIDE_ATTEMPT`: the claim tries to defeat identified authority solely by extra-source moral, fairness, or reasonableness appeal.
- `AUTHORITY_SCOPE_VIOLATION`: the cited authority exists but falls outside jurisdiction, temporal, source-class, or package scope.
- `SUPERSEDED_AUTHORITY`: the cited authority is no longer operative for the evaluation period.
- `INTERPRETATION_RULE_UNSPECIFIED`: the active doctrine artifact does not encode the interpretation regime needed to attribute content to the source.
- `ATTRIBUTION_OVERREACH`: the claim attributes to a source or institution content not supportable under doctrine-encoded attribution rules.
- `INSUFFICIENT_DOCTRINE`: a recognizable legal standard exists, but the doctrine package lacks deterministic rules to resolve it.
- `EVALUATIVE_FACT_NOT_ADMISSIBLE`: the applied claim depends on evaluative fact assertions that have not entered the system as admissible structured factual input.

### Later-phase candidate

- `DOUBLE_COUNTED_REASONS`: dependent reasons and the authoritative directive are being counted as separate legal support when one should replace the other.

Reason for later-phase status:

- This is not MVP-critical unless a simple mechanical detection rule exists.
- A candidate mechanical rule would be: emit it only when the same `ArgumentUnit` both cites an authoritative source and separately presents overlapping dependent-reason text as independent legal support.

## Human-Judgment Boundaries

### Legitimacy assessment boundary

Raz's normal justification thesis is a theory of when authority is justified, but the validator cannot compute that from scratch without turning into a moral evaluator.

Safe system posture:

- legitimacy must be authored in doctrine or treated as out of deterministic scope

### Interpretation boundary

Raz explicitly allows different legal systems to have different interpretation rules.

Safe system posture:

- the validator must not choose an interpretive method ad hoc
- if the doctrine package does not encode one, the result is `UNRESOLVED`

### Discretion boundary

Raz acknowledges that courts sometimes exercise discretion and participate in law-making.

Safe system posture:

- the validator must not simulate ideal judicial choice
- unresolved discretion must remain unresolved unless the doctrine package encodes the choice structure

### Applied-facts boundary

Raz's application of the sources thesis to applied statements depends on contingent facts being brute social facts rather than moralized or evaluative facts.

Safe system posture:

- if facts arrive as evaluative assertions rather than structured admissible facts, deterministic validation should refuse or stay unresolved

### Collective-convention boundary

Raz ties legal force to institutional procedures and conventions.

Safe system posture:

- a machine must not infer those conventions from raw text alone
- they must be encoded in `DoctrineArtifact` and governance controls

## Open Questions

### Source-supported uncertainty

- Raz does not prove that every moral consequence is never attributable to law; he rejects broad incorporation, but leaves room for narrower attributed consequences in some legal systems.
- Raz says the sources thesis is compatible with several interpretation regimes. The essay does not tell us which one any given doctrine package should adopt.
- Raz distinguishes law's claim to authority from legitimate authority, but the essay does not provide a machine-ready rule for when the latter should count as satisfied in a bounded validator.

### Implementation uncertainty

- What minimum fields must `DoctrineArtifact` carry to encode interpretation regime, source classes, and attribution limits cleanly enough for replay?
- Should `AUTHORITY_NOT_IDENTIFIABLE` and `INTERPRETATION_RULE_UNSPECIFIED` be emitted at mapping time (`F1`) or validation time (`G2`)?
- When an open-textured standard such as `reasonable` appears in a valid source, what is the threshold for `INVALID` versus `UNRESOLVED`?
- How should `NO_SOURCE_AUTHORITY` and `AUTHORITY_NOT_IDENTIFIABLE` be surfaced differently in the analyst workbench so operators understand whether the problem is source absence or source attribution failure?
- Do we need an explicit `claimed_authority_status` field on `AuthorityNode` or `Mapping` to preserve the distinction between claimed authority and validated authority?
