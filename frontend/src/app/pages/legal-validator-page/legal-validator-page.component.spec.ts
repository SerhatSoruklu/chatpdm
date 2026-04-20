import '@angular/compiler';

import { describe, expect, it } from 'vitest';

import { LegalValidatorPageComponent } from './legal-validator-page.component';

describe('LegalValidatorPageComponent', () => {
  it('describes the bounded runtime surface and contract rows', () => {
    const component = new LegalValidatorPageComponent();

    expect(component.pageTitle).toBe('Legal Validator');
    expect(component.pageEyebrow).toBe('Docs / runtime surface');
    expect(component.pageActions.map((action) => action.label)).toEqual([
      'Open API reference',
      'Run validation',
    ]);
    expect(component.pageActions.map((action) => action.route)).toEqual([
      '/api',
      '/inspect/legal-validator',
    ]);
    expect(component.whatItIsCards.map((card) => card.title)).toEqual([
      'Deterministic validation system',
      'Structured pipeline execution',
      'Bounded domain behavior',
    ]);
    expect(component.pipelineSteps.map((step) => step.title)).toEqual([
      'intake',
      'segmentation',
      'extraction',
      'admissibility',
      'doctrine',
      'authority',
      'mapping',
      'validation',
      'trace',
      'replay',
    ]);
    expect(component.outputContractFields.map((field) => field.field)).toEqual([
      'validationRunId',
      'status',
      'reason',
      'domain',
      'scenarioType',
      'entity',
      'trace',
      'diagnostics',
      'replay',
    ]);
    expect(component.outputContractSkeleton).toContain('"validationRunId"');
    expect(component.refusalBoundaries.map((boundary) => boundary.code)).toEqual([
      'invalid_legal_validator_input',
      'legal_validator_scope_lock_violation',
      'DOCTRINE_NOT_RECOGNIZED',
      'AUTHORITY_SCOPE_VIOLATION',
      'AMBIGUOUS_CONCEPT_MAPPING',
      'REPLAY_ARTIFACT_MISMATCH',
    ]);
    expect(component.whatItIsNotCards.map((card) => card.title)).toEqual([
      'Not legal advice',
      'Not interpretation engine',
      'Not probabilistic reasoning',
    ]);
  });
});
