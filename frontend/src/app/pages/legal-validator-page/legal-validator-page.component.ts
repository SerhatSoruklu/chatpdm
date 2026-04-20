import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

interface SurfaceCard {
  title: string;
  copy: string;
}

interface PipelineStep {
  step: string;
  title: string;
  copy: string;
}

interface ContractField {
  field: string;
  rule: string;
  condition: string;
}

interface BoundaryCard {
  title: string;
  code: string;
  copy: string;
}

@Component({
  selector: 'app-legal-validator-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './legal-validator-page.component.html',
  styleUrl: './legal-validator-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LegalValidatorPageComponent {
  protected readonly pageTitle = 'Legal Validator';
  protected readonly pageEyebrow = 'Docs / runtime surface';
  protected readonly pageIntro =
    'Deterministic validation system for structured legal arguments.';
  protected readonly pageLead =
    'It executes intake → segmentation → extraction → admissibility → doctrine → authority → mapping → validation → trace → replay under a strict refusal-first contract.';
  protected readonly pageActions = [
    {
      label: 'Open API reference',
      route: '/api',
    },
    {
      label: 'Run validation',
      route: '/inspect/legal-validator',
    },
  ] as const;

  protected readonly whatItIsCards: readonly SurfaceCard[] = [
    {
      title: 'Deterministic validation system',
      copy: 'The same authored inputs and the same authored artifacts produce the same structured outcome.',
    },
    {
      title: 'Structured pipeline execution',
      copy: 'The system runs a fixed pipeline instead of estimating outcomes from open-ended text generation.',
    },
    {
      title: 'Bounded domain behavior',
      copy: 'It stays inside authored scope, explicit contracts, and refusal-first runtime boundaries.',
    },
  ] as const;

  protected readonly pipelineSteps: readonly PipelineStep[] = [
    {
      step: '01',
      title: 'intake',
      copy: 'Admit the matter and source-document shape only when the request matches the runtime wrapper.',
    },
    {
      step: '02',
      title: 'segmentation',
      copy: 'Split source documents into bounded segments that can be replayed and inspected later.',
    },
    {
      step: '03',
      title: 'extraction',
      copy: 'Extract argument units from the segmented source material without widening the scope.',
    },
    {
      step: '04',
      title: 'admissibility',
      copy: 'Check whether the extracted units are admissible under the declared runtime constraints.',
    },
    {
      step: '05',
      title: 'doctrine',
      copy: 'Bind the run to an eligible doctrine artifact and its declared interpretation regime.',
    },
    {
      step: '06',
      title: 'authority',
      copy: 'Resolve the authority scope against the doctrine artifact and the requested evaluation context.',
    },
    {
      step: '07',
      title: 'mapping',
      copy: 'Map the admissible unit into a deterministic concept or authority decision path.',
    },
    {
      step: '08',
      title: 'validation',
      copy: 'Apply the validation kernel and emit valid, invalid, or unresolved state under the authored rules.',
    },
    {
      step: '09',
      title: 'trace',
      copy: 'Persist a trace record that captures the execution inputs, outputs, and replay context.',
    },
    {
      step: '10',
      title: 'replay',
      copy: 'Re-run the preserved validation run and compare the replayed signature against the original record.',
    },
  ] as const;

  protected readonly outputContractFields: readonly ContractField[] = [
    {
      field: 'validationRunId',
      rule: 'required output identifier',
      condition: 'stable run identifier returned by the system and used for inspection and replay',
    },
    {
      field: 'status',
      rule: 'required outcome',
      condition: 'ALLOWED, REFUSED, or REFUSED_INCOMPLETE',
    },
    {
      field: 'reason',
      rule: 'required explanation',
      condition: 'bounded reason text attached to the outcome',
    },
    {
      field: 'domain',
      rule: 'required scope key',
      condition: 'declared domain for the run',
    },
    {
      field: 'scenarioType',
      rule: 'conditional output field',
      condition: 'present only when the validated scenario type is applicable',
    },
    {
      field: 'entity',
      rule: 'conditional output field',
      condition: 'present only when the validated entity is applicable',
    },
    {
      field: 'trace',
      rule: 'required trace record',
      condition: 'execution trace, replay context, and preserved runtime lineage',
    },
    {
      field: 'diagnostics',
      rule: 'required diagnostics record',
      condition: 'stage notes, refusal details, and other bounded inspection metadata',
    },
    {
      field: 'replay',
      rule: 'required replay record',
      condition: 'replay state, replay comparison, and preserved run reconstruction metadata',
    },
  ] as const;

  protected readonly outputContractSkeleton = `{
  "validationRunId": "validation-run-...",
  "status": "ALLOWED | REFUSED | REFUSED_INCOMPLETE",
  "reason": "...",
  "domain": "...",
  "scenarioType": "...",
  "entity": "...",
  "trace": {
    "...": "execution trace and replay context"
  },
  "diagnostics": {
    "...": "bounded validation diagnostics"
  },
  "replay": {
    "...": "replay comparison and reconstruction state"
  }
}`;

  protected readonly refusalBoundaries: readonly BoundaryCard[] = [
    {
      title: 'Invalid intake',
      code: 'invalid_legal_validator_input',
      copy: 'Rejects malformed envelopes, missing top-level input wrappers, and invalid nested request shapes.',
    },
    {
      title: 'Malformed arguments',
      code: 'legal_validator_scope_lock_violation',
      copy: 'Rejects requests that do not match the locked product, scope, and matter boundary.',
    },
    {
      title: 'Doctrine mismatch',
      code: 'DOCTRINE_NOT_RECOGNIZED',
      copy: 'Rejects doctrine artifacts that cannot be recognized or are not runtime eligible.',
    },
    {
      title: 'Authority scope violation',
      code: 'AUTHORITY_SCOPE_VIOLATION',
      copy: 'Rejects authority contexts that fall outside the doctrine scope or required regime.',
    },
    {
      title: 'Mapping inconsistency',
      code: 'AMBIGUOUS_CONCEPT_MAPPING',
      copy: 'Rejects ambiguous or non-deterministic mapping paths instead of inventing a deterministic result.',
    },
    {
      title: 'Replay divergence',
      code: 'REPLAY_ARTIFACT_MISMATCH',
      copy: 'Rejects replay runs that diverge from the preserved trace, doctrine, or execution signature.',
    },
  ] as const;

  protected readonly whatItIsNotCards: readonly SurfaceCard[] = [
    {
      title: 'Not legal advice',
      copy: 'It does not advise a user, interpret facts as counsel, or substitute for a legal professional.',
    },
    {
      title: 'Not interpretation engine',
      copy: 'It does not expand the boundary with latent inference or freeform interpretive guessing.',
    },
    {
      title: 'Not probabilistic reasoning',
      copy: 'It does not score likely meanings. It emits bounded validation or explicit refusal.',
    },
  ] as const;
}
