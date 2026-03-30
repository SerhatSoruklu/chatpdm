# Legal Argument Validator Entities

## Purpose

This document defines the first internal schema pass for the Legal Argument Validator data model.

These entities must be documented before runtime behavior is implemented.

The model is centered on deterministic traceability:

`Matter -> SourceDocument -> SourceSegment -> ArgumentUnit -> Mapping -> ValidationRun`

Supporting first-class entities:

- `Concept`
- `AuthorityNode`
- `DoctrineArtifact`
- `OverrideRecord`

## First-Class Additions

Two entities are mandatory and must not remain implicit:

- `DoctrineArtifact`
- `OverrideRecord`

They exist because replay law and override visibility law cannot remain trustworthy if artifact identity and operator exception records are only "understood" rather than modeled.

Concrete schema drafts:

- [doctrine-artifact.schema.json](/home/serhat/code/chatpdm/docs/data-model/schemas/doctrine-artifact.schema.json)
- [override-record.schema.json](/home/serhat/code/chatpdm/docs/data-model/schemas/override-record.schema.json)

## Matter

Role:

A legal matter or case workspace.

Required fields:

- `matterId`
- `title`
- `jurisdiction`
- `practiceArea`
- `status`
- `createdBy`
- `createdAt`
- `updatedAt`

Rules:

- matter scope must state jurisdiction and practice area explicitly
- matter state must remain auditable over time

## SourceDocument

Role:

Any uploaded or retained source used in a matter.

Allowed document types:

- `pleading`
- `witness_statement`
- `statute`
- `regulation`
- `policy`
- `contract`
- `judicial_opinion`
- `legal_memo`
- `correspondence`

Required fields:

- `documentId`
- `matterId`
- `documentType`
- `title`
- `sourceAuthorityType`
- `jurisdiction`
- `effectiveDate`
- `version`
- `originalText`
- `normalizedText`
- `hash`
- `storageKey`
- `isImmutable`
- `createdAt`

Rules:

- original upload is immutable
- normalized text is stored separately from original text
- hash is computed from immutable original artifact
- later reasoning references must resolve back to anchored source segments

## SourceSegment

Role:

An anchored slice of source material preserved from segmentation.

Required fields:

- `segmentId`
- `matterId`
- `documentId`
- `segmentType`
- `text`
- `normalizedText`
- `anchorPath`
- `paragraphStart`
- `paragraphEnd`
- `citationSpan`
- `sequence`
- `createdAt`

Rules:

- source segments are deterministic for a given document version and segmentation ruleset
- original paragraph anchors must always be preserved
- every `ArgumentUnit` must point back to one or more `SourceSegment` records

## ArgumentUnit

Role:

The smallest reasoning unit admitted into validation flow.

Allowed unit types:

- `issue_statement`
- `factual_assertion`
- `legal_rule`
- `application_step`
- `conclusion`
- `exception_claim`
- `rebuttal`

Allowed review states:

- `pending_review`
- `accepted`
- `rejected`
- `auto_accepted`

Allowed admissibility values:

- `admissible`
- `blocked`

Required fields:

- `argumentUnitId`
- `matterId`
- `documentId`
- `sourceSegmentIds`
- `unitType`
- `text`
- `normalizedText`
- `speakerRole`
- `positionSide`
- `sequence`
- `extractionMethod`
- `reviewState`
- `admissibility`
- `unresolvedReason`
- `createdAt`
- `updatedAt`

Rules:

- no `ArgumentUnit` may contribute to successful validation unless `admissibility = admissible`
- unresolved or skipped extraction outputs remain blocked or unresolved
- `pending_review` units do not produce successful deterministic mappings in the MVP path
- extraction method provenance must be retained

## Concept

Role:

A controlled concept registry entry.

Required fields:

- `conceptId`
- `canonicalName`
- `jurisdictionScope`
- `practiceAreaScope`
- `definition`
- `identityBoundary`
- `inclusionRules`
- `exclusionRules`
- `requiredEvidenceTypes`
- `conflictRules`
- `sourceTier`
- `createdAt`
- `updatedAt`

Rules:

- `identityBoundary` must be non-empty
- `exclusionRules` must be non-empty for concepts whose misuse would create material drift
- protected core concepts retain protected identity boundaries across packages
- package doctrine may extend application behavior but may not silently redefine core identity

## AuthorityNode

Role:

A specific legal authority used for support or scope checking.

Required fields:

- `authorityId`
- `authorityType`
- `citation`
- `jurisdiction`
- `text`
- `effectiveDate`
- `endDate`
- `precedentialWeight`
- `status`
- `sourceTier`
- `createdAt`
- `updatedAt`

Rules:

- authority usage must respect jurisdiction
- authority usage must respect effective period
- authority usage must respect doctrine package scope
- superseded or inactive authority must not validate as current support unless historical analysis mode is explicit

## DoctrineArtifact

Role:

An immutable retained doctrine artifact used by a validation run.

Required fields:

- `artifactId`
- `hash`
- `version`
- `packageId`
- `storageKey`
- `manifest`
- `retainedAt`
- `retentionStatus`
- `createdAt`

Rules:

- `hash` identifies the retained immutable artifact, not only a mutable package state
- `storageKey` must resolve to immutable retained content
- `manifest` records the doctrine package identity loaded for validation
- replay must load by retained artifact reference or exact artifact hash backed by retrievable retained content

## Mapping

Role:

Links `ArgumentUnit` records to concepts and authorities.

Allowed status values:

- `success`
- `ambiguous`
- `unresolved`
- `rejected`

Allowed match basis values:

- `exact_canonical`
- `exact_synonym`
- `exact_structural_rule`
- `manual_override`

Required fields:

- `mappingId`
- `argumentUnitId`
- `conceptId`
- `authorityId`
- `mappingType`
- `status`
- `matchBasis`
- `resolverRuleId`
- `manualOverrideReason`
- `failureReason`
- `createdAt`
- `updatedAt`

Rules:

- success requires an exact deterministic basis
- ambiguity must remain ambiguity
- unresolved must remain unresolved
- manual overrides must be explicit and traceable
- manual overrides must never masquerade as automatic exact matches

## OverrideRecord

Role:

An explicit operator exception record applied to mapping or admissibility flow.

Required fields:

- `overrideId`
- `matterId`
- `argumentUnitId`
- `mappingId`
- `overrideType`
- `reason`
- `createdBy`
- `createdAt`
- `reviewStatus`

Rules:

- overrides are exceptions, not normal success paths
- every override must be traceable to a specific operator and reason
- override review state must remain explicit
- override visibility must persist into trace and report surfaces

## ValidationRun

Role:

A deterministic run record for validation.

Required fields:

- `validationRunId`
- `matterId`
- `doctrineVersion`
- `doctrineHash`
- `doctrineArtifactRef`
- `resolverVersion`
- `inputHash`
- `result`
- `failureCodes`
- `trace`
- `createdAt`

Rules:

- `doctrineHash` identifies the exact doctrine artifact used
- `doctrineArtifactRef` resolves to immutable retained doctrine content
- replay must load by `doctrineHash` or `doctrineArtifactRef`, never by current mutable package state
- the real replay target is same input, same doctrine artifact, and same resolver version
- `doctrineVersion` alone is not sufficient unless it resolves immutably
