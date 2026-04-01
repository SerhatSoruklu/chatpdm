import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

interface VersionLayerCard {
  field: 'contractVersion' | 'normalizerVersion' | 'matcherVersion' | 'conceptSetVersion';
  controls: string;
  changesWhen: string;
}

interface VersionOwnershipRow {
  field: VersionLayerCard['field'];
  ownership: string;
}

interface ChangeTriggerRow {
  change: string;
  version: VersionLayerCard['field'];
  why: string;
}

interface StabilityClass {
  title: string;
  copy: string;
}

interface DeclarationRow {
  field: VersionLayerCard['field'];
  value: string;
}

@Component({
  selector: 'app-version-policy-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './version-policy-page.component.html',
  styleUrl: './version-policy-page.component.css',
})
export class VersionPolicyPageComponent {
  protected readonly versionLayers: readonly VersionLayerCard[] = [
    {
      field: 'contractVersion',
      controls: 'Semantic meaning of runtime result shapes and field behavior.',
      changesWhen: 'Contract semantics or the allowed meaning of a result field changes.',
    },
    {
      field: 'normalizerVersion',
      controls: 'Deterministic normalization of the incoming query into normalizedQuery.',
      changesWhen: 'Normalization logic changes in a way that can alter normalized query behavior.',
    },
    {
      field: 'matcherVersion',
      controls: 'Resolution behavior from normalized input to runtime outcome.',
      changesWhen: 'Matching or admission logic changes in a way that can alter result selection or refusal behavior.',
    },
    {
      field: 'conceptSetVersion',
      controls: 'Published snapshot of canonical concepts, aliases, source metadata, relations, and authored comparison payloads.',
      changesWhen: 'The authored concept snapshot changes.',
    },
  ] as const;

  protected readonly versionOwnership: readonly VersionOwnershipRow[] = [
    {
      field: 'contractVersion',
      ownership: 'Owns output semantics.',
    },
    {
      field: 'normalizerVersion',
      ownership: 'Owns normalization behavior.',
    },
    {
      field: 'matcherVersion',
      ownership: 'Owns resolution behavior, including the current comparison-pair allowlist.',
    },
    {
      field: 'conceptSetVersion',
      ownership: 'Owns authored concept state, including definitions, aliases, sources, relations, and authored comparison axes.',
    },
  ] as const;

  protected readonly changeTriggers: readonly ChangeTriggerRow[] = [
    {
      change: 'Response field semantics changed',
      version: 'contractVersion',
      why: 'Semantic meaning of the public result contract changed.',
    },
    {
      change: 'Normalization rule changed',
      version: 'normalizerVersion',
      why: 'The transformation from query to normalizedQuery changed.',
    },
    {
      change: 'Match behavior changed',
      version: 'matcherVersion',
      why: 'The resolver can now choose, refuse, or classify results differently for the same normalized input.',
    },
    {
      change: 'Concept definition, alias, relation, or source changed',
      version: 'conceptSetVersion',
      why: 'The published authored concept snapshot changed.',
    },
    {
      change: 'Comparison pair admission changed',
      version: 'matcherVersion',
      why: 'Current runtime pair admissibility is owned by matcher logic through the comparison allowlist.',
    },
    {
      change: 'Comparison axis content changed',
      version: 'conceptSetVersion',
      why: 'Current authored comparison payloads live in the published concept snapshot.',
    },
  ] as const;

  protected readonly stabilityClasses: readonly StabilityClass[] = [
    {
      title: 'Semantic change',
      copy: 'A change in what public output fields mean. This belongs to contractVersion.',
    },
    {
      title: 'Normalization change',
      copy: 'A change in how the same raw query is normalized. This belongs to normalizerVersion.',
    },
    {
      title: 'Resolution change',
      copy: 'A change in how normalized input is matched, refused, or classified. This belongs to matcherVersion.',
    },
    {
      title: 'Content snapshot change',
      copy: 'A change in the authored concept set or authored comparison payloads. This belongs to conceptSetVersion.',
    },
  ] as const;

  protected readonly replayTuple = [
    'query',
    'normalizedQuery',
    'contractVersion',
    'normalizerVersion',
    'matcherVersion',
    'conceptSetVersion',
  ] as const;

  protected readonly nonMeanings = [
    'Version increase does not imply broader coverage.',
    'Version increase does not imply more intelligence.',
    'Versioning exists to preserve traceability, not momentum.',
  ] as const;

  protected readonly currentDeclarations: readonly DeclarationRow[] = [
    {
      field: 'contractVersion',
      value: 'v1.4',
    },
    {
      field: 'normalizerVersion',
      value: '2026-03-27.v1',
    },
    {
      field: 'matcherVersion',
      value: '2026-03-27.v3',
    },
    {
      field: 'conceptSetVersion',
      value: '20260327.4',
    },
  ] as const;
}
