# Military Constraints Compiler: Phase 0 Audit

This is an audit-only document for a new bounded ChatPDM subsystem.

The subsystem is a closed deterministic constraint compiler plus validator.
It is not a ROE reader, not a strategy engine, not a targeting system, and not part of general concept resolution.

The required operating shape is:

source text, reviewed offline
-> clause extraction, reviewed offline
-> typed constraint primitives
-> bundle validation
-> structured-facts-only runtime validation
-> `ALLOWED` / `REFUSED` / `REFUSED_INCOMPLETE`

Default deny applies on ambiguity, missing required facts, unresolved authority, invalid bundle state, or unresolved source conflict.

## 1. System boundary

The Military Constraints Compiler is a domain-bounded enforcement subsystem.
Its job is to decide whether a proposed action is admissible under a validated military constraint bundle.

It must only evaluate structured facts.
It must not read PDFs, prose, or narrative text at runtime.
It must not invent missing facts.
It must not infer permissibility from vague language.
It must not optimize tactics, strategy, or targeting.

The subsystem has two layers:

- Legal floor
  - non-overridable baseline constraints derived from law-of-war and LOAC sources
- ROE / policy overlay
  - mission-specific authorizations, restrictions, delegations, caveats, and reserved authorities

The runtime contract is closed-world.
If the bundle is invalid, the facts are incomplete, the authority chain is unresolved, or the sources conflict without a declared resolution, the answer is refusal.

## 2. Architectural fit within ChatPDM

This subsystem fits beside ChatPDM's existing boundary and refusal machinery, not inside concept resolution.

It should be treated as a separate governance lane with its own:

- source registry
- primitive schema
- bundle manifest
- conflict policy
- refusal catalog
- runtime validator

It should reuse ChatPDM's existing architectural discipline:

- exact admission instead of fuzzy acceptance
- versioned artifacts instead of silent drift
- typed refusal instead of explanatory improvisation
- traceable boundary checks instead of hidden reasoning

What it must not become:

- a general meaning layer
- a natural-language policy assistant
- a tactical reasoning surface
- a concept family inside the canonical concept graph

ZeroGlare can still serve as a drift or pressure detector, but it does not decide military admissibility.
The military compiler decides only from compiled constraints and structured facts.

## 3. Admitted domain and refused capabilities

### Admitted domain

- military operational constraint evaluation
- ROE-derived permissions, restrictions, delegations, and reservations
- law-of-war / LOAC legal floor evaluation
- source-governed compilation of offline source material
- bundle integrity checks and rule trace emission

### Refused capabilities

- runtime prose interpretation
- freeform policy reasoning
- strategy or mission planning advice
- targeting recommendations
- live tactical optimization
- guessing authority, intent, or status from rhetoric alone
- blending conflicting jurisdictions into one synthetic rulebook
- allowing policy overlay to weaken the legal floor
- using handbook examples as if they were universal law
- resolving missing facts by approximation

Runtime input must stay structured-facts-only.
If a fact is not present, typed, and required by the rule, the system refuses.

## 4. Source taxonomy

The local source set is mixed on purpose. It must be classified by role, not flattened into one authority class.

| Source | Local file | Audit role | Status | Notes |
| --- | --- | --- | --- | --- |
| DoD Law of War Manual | `chatpdm-military_constraints/DOD-LAW-OF-WAR-MANUAL-JUNE-2015-UPDATED-JULY 2023.pdf` | Legal floor baseline | Admissible as primary floor source | 1254 pages; the first extractable pages show a formal manual structure and table of contents, so this is the strongest local floor reference. |
| UK Ministry of Defence LOAC guide | `chatpdm-military_constraints/UK-Ministry-of-defence.pdf` | Legal floor corroboration / training guide | Admissible only after extraction repair | 52 pages; the file is present, but the first 15 pages did not yield clean text through local extraction, so it is OCR-heavy and should not drive machine rules until repaired. |
| Newport ROE Handbook | `chatpdm-military_constraints/Newport Rules of Engagement Handbook.pdf` | ROE drafting, structure, and approval process | Admissible as structural ROE source | 121 pages; first-page text identifies it as the Stockton Center's 2022 handbook, which makes it appropriate for rule structure and authoring flow. |
| ROE doctrine revision | `chatpdm-military_constraints/10 CA X - Rules of Engagement 2020.pdf` | Doctrine / policy framing | Admissible as overlay framing source | 194 pages; the first page frames it as a doctrine revision supporting joint and combined interoperability, so it belongs in the policy-structure layer rather than the legal-floor layer. |
| UNODC ROE handbook | `chatpdm-military_constraints/UNODC_GMCP_Rules_of_Engagement_Handbook.pdf` | Mission-specific example set | Admissible only as bounded example source | 25 pages; the title page shows VBSS and gangway / access control point context, so it is useful for example ladders but not for universal doctrine. |
| extracting-constraint-primitives | `chatpdm-military_constraints/extracting-constraint-primitivesONLY._rules_of_engagement.pdf` | Extraction methodology aid | Not a legal source | 116 pages; the local text extraction is noisy and scanner-like, so it is useful for shaping compiler discipline but not for controlling doctrine. |

The taxonomy rule is strict:

- sources enter only through classification, mapping, and conflict review
- source presence alone does not grant admission
- a source can be useful without being authoritative
- a source can be authoritative for structure without being authoritative for law

## 5. Source priority policy

Source priority must be bundle-local, not global.
The bundle must declare jurisdiction, mission context, and authority owner before any rule can be admitted.

Recommended precedence order:

1. Bundle declaration and jurisdiction context
2. Legal floor for the declared jurisdiction
3. National caveats and reserved authorities
4. Mission-specific ROE and policy overlay
5. Delegated local instructions, only if explicitly admitted
6. Handbooks and example materials
7. Extraction methodology references

Rules for priority:

- legal floor cannot be weakened by policy overlay
- national caveats outrank coalition permissiveness
- mission ROE may narrow permissions, but not broaden the floor
- examples may illustrate a pattern, but they may not override a normative source
- concordant sources may coalesce only when they produce identical machine-checkable meaning
- any unresolved conflict at the same authority tier blocks compilation

This pack contains U.S., UK, and UNODC material.
The compiler must not flatten those sources into one universal law.
If a single bundle needs more than one jurisdiction, that jurisdictional mix must be explicit and conflict-safe.

## 6. Constraint primitive families

The compiler should only emit closed primitive families.
No primitive family may depend on open-text interpretation at runtime.

Allowed primitive value kinds:

- boolean
- enumerated string
- bounded number
- timestamp
- ID reference
- set of ID references

Recommended primitive families:

| Family | Purpose | Typical facts |
| --- | --- | --- |
| Provenance and bundle identity | Track source, version, and integrity | `source_id`, `bundle_version`, `bundle_hash`, `jurisdiction`, `authority_owner` |
| Actor | Identify who is acting and under what authority | `actor.id`, `actor.role`, `actor.authority_level` |
| Action | Describe the proposed act in machine terms | `action.kind`, `action.force_level`, `action.method`, `action.domain` |
| Target | Describe what is affected and whether it is protected | `target.status`, `target.protected_class`, `target.military_objective_status`, `target.hors_de_combat_status` |
| Context | Describe mission and environment context | `geo.zone`, `time.window`, `mission.type`, `operation.phase`, `coalition.mode` |
| Threat and self-defense | Evaluate hostile act / hostile intent gates | `hostile_act`, `hostile_intent`, `imminence`, `necessity`, `available_less_lethal_options` |
| Civilian risk | Evaluate precaution and proportionality inputs | `civilian_presence`, `civilian_object_presence`, `estimated_incidental_harm`, `feasible_precautions_taken`, `expected_military_advantage` |
| Authority | Resolve delegated, reserved, and caveated authorities | `requires_high_authority`, `reserved_to_higher_command`, `delegated_to_unit`, `coalition_restriction`, `national_caveat` |
| Output and trace | Emit a typed, auditable decision | `decision`, `typed_reason`, `failed_stage`, `failing_rule_ids`, `missing_fact_ids`, `authority_trace` |

The legal floor is primarily evaluated through target and civilian-risk primitives.
The ROE overlay is primarily evaluated through context and authority primitives.

If a source clause cannot be compiled into one of these primitive families without ambiguity, it must be rejected.

## 7. Runtime contract

Runtime accepts structured facts only.
Runtime does not accept source prose as evidence.
Runtime does not read PDFs, OCR text, or ad hoc notes.

Required input groups:

- bundle reference
  - `bundle_id`, `bundle_version`, `bundle_hash`
- actor
  - who is acting and under what authority
- action
  - what is proposed
- target
  - what is affected and whether it is protected
- context
  - mission, zone, phase, coalition, and time window
- threat / self-defense
  - hostile act, hostile intent, imminence, necessity
- civilian risk
  - presence, expected incidental harm, precautions, expected military advantage
- authority
  - delegations, reservations, caveats, and command limits

Required output groups:

- `decision`
  - `ALLOWED`
  - `REFUSED`
  - `REFUSED_INCOMPLETE`
- `reason_code`
- `failed_stage`
  - `ADMISSIBILITY`
  - `LEGAL_FLOOR`
  - `POLICY_OVERLAY`
  - `BUNDLE_INTEGRITY`
- `missing_fact_ids`
- `failing_rule_ids`
- `bundle_version`
- `bundle_hash`
- `authority_trace`
- `rule_trace`

Fixed evaluation order:

1. bundle integrity
2. required fact completeness
3. legal floor
4. national caveats and reserved authorities
5. mission-specific ROE and policy overlay
6. delegated commander authorities
7. any lower-priority preferences

If a required fact is missing or unresolved, the result is `REFUSED_INCOMPLETE`.
If a source conflict, authority conflict, or bundle integrity failure remains unresolved, the result is `REFUSED`.

## 8. Determinism requirements

Determinism here means more than repeatable prose.
It means fixed bundle plus fixed facts plus fixed precedence yields the same decision and the same trace.

Non-negotiable requirements:

1. No prose at runtime.
2. No hidden defaults except deny.
3. No fuzzy matching.
4. No silent source merging.
5. No legal-floor weakening by overlay.
6. No inferred missing facts.
7. No unversioned bundle changes.
8. No untyped refusal reasons.
9. No allow without trace.
10. No rule without required-fact declarations.
11. No ambiguous terms left uncompiled.
12. No jurisdiction declared only by implication.

Ambiguous terms such as `reasonable`, `appropriate`, `necessary`, or `feasible` do not survive compilation unless the bundle turns them into explicit, machine-evaluable conditions.

The runtime state space must be bounded by:

- bundle version
- bundle hash
- structured facts
- declared precedence

If any of those change, the output may change.
If none of them change, the output must not change.

## 9. Risks and unresolved pressure points

The hardest problem is not parsing text.
The hardest problem is fact sufficiency under a strict refusal-first regime.

Unresolved pressure points:

- proportionality cannot be left as prose; it needs a preauthored numeric or categorical envelope, or the compiler must refuse
- hostile act and hostile intent definitions vary by jurisdiction and mission, so they must be explicit or the bundle must refuse
- civilian-risk estimation depends on upstream evidence quality, and incomplete evidence must not be papered over
- multi-jurisdiction packs can conflict silently unless the bundle declares precedence and authority ownership
- OCR-heavy files can generate false primitives, so extraction quality must be audited before use
- example handbooks can contaminate normative rules if they are not quarantined as examples only
- ambiguous modal language must be compiled out or rejected
- reserved authorities and delegation chains can be partial, and partial authority is not authority
- any drift toward strategy, targeting, or tactical advice must be blocked at the boundary

The main unresolved question is not whether the system can say something.
It is whether the system can say only what the structured facts actually support.

## 10. Implemented / Partial / Missing / Not evidenced

This section is a gap audit for the proposed subsystem, not a claim that the subsystem already exists.

### Implemented

- ChatPDM already has a refusal-first, boundary-enforced architecture.
- The repo already uses versioned artifacts, audit docs, and exact admission patterns.
- Existing boundary patterns show that typed refusal, traceability, and strict structural checks are already part of the system culture.
- The local military source pack already exists in `chatpdm-military_constraints/`.

### Partial

- The source roles are legible from the local files, but not all documents are equally machine-ready.
- `DOD-LAW-OF-WAR-MANUAL-JUNE-2015-UPDATED-JULY 2023.pdf` and `Newport Rules of Engagement Handbook.pdf` are visibly usable as local references.
- `UK-Ministry-of-defence.pdf` is present, but local extraction did not yield clean text in the first pages.
- `extracting-constraint-primitivesONLY._rules_of_engagement.pdf` exists, but the current extraction looks noisy and needs repair before it can influence machine rules.
- The legal floor versus ROE overlay split is conceptually clear, but not yet formalized as a dedicated military bundle schema.

### Missing

- a dedicated military source registry
- a jurisdiction declaration field for each bundle
- a compiled bundle schema
- a closed primitive schema
- a precedence matrix
- an authority graph
- a typed refusal catalog for this domain
- a bundle validation gate
- a runtime validator over structured facts
- a deterministic conflict resolution policy for mixed-authority packs
- a provenance hash and version format for military bundles

### Not evidenced

- any evidence that runtime should interpret prose
- any evidence that the subsystem belongs inside general concept resolution
- any evidence that source presence alone is enough for admission
- any evidence that example handbooks should control normative law
- any evidence that the current source pack can support deterministic proportionality without an explicit upstream policy envelope
- any evidence that hostile-intent definitions are already standardized across the admitted sources

The current pack is enough to audit.
It is not enough to implement safely.

## 11. Recommended phased build order

### Phase 0: Freeze the audit

- approve the subsystem boundary
- approve the source roles
- approve the refusal posture
- approve the source priority policy

Exit condition:

- the subsystem is explicitly separate from concept resolution
- legal floor and ROE overlay are separated
- runtime prose interpretation is explicitly forbidden

### Phase 1: Source registry and jurisdiction declaration

- classify each local source
- declare admissibility and trust tier
- record extraction quality
- declare bundle jurisdiction and authority owner

Exit condition:

- every source has a role, a tier, and a conflict rule

### Phase 2: Primitive schema and refusal catalog

- define the closed primitive families
- define required facts per rule type
- define reason codes and failed-stage labels
- define the default-deny output contract

Exit condition:

- every rule shape has machine-evaluable fields and typed refusal paths

### Phase 3: Offline clause extraction

- convert source clauses into candidate primitives
- remove ambiguity
- reject unresolved modal language
- quarantine example material from normative material

Exit condition:

- every accepted clause maps cleanly to a primitive family

### Phase 4: Bundle compilation and validation

- compile candidate clauses into a versioned bundle
- detect source conflicts
- detect authority conflicts
- compute bundle hash
- reject anything that cannot be validated deterministically

Exit condition:

- the bundle is immutable, versioned, hashed, and conflict-safe

### Phase 5: Runtime validator

- evaluate structured facts only
- short-circuit in the fixed precedence order
- emit `ALLOWED`, `REFUSED`, or `REFUSED_INCOMPLETE`
- emit rule trace and failing rule IDs

Exit condition:

- identical facts plus identical bundle yield identical output

### Phase 6: Optional execution card projection

- derive a human-readable execution card from the already validated bundle
- keep it strictly downstream of the validated machine bundle
- do not allow it to create new meaning

Exit condition:

- the human artifact is only a projection, never a source of authority

