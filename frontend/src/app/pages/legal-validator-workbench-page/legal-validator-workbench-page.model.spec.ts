import { describe, expect, it } from 'vitest';

import {
  buildIntakeRequest,
  buildInspectionRequest,
  buildOrchestrateRequest,
  buildReplayRequest,
  createBlankLegalValidatorWorkbenchDraft,
  splitDelimitedText,
} from './legal-validator-workbench-page.model';

describe('legal-validator workbench model', () => {
  it('creates a blank draft with inspection-safe defaults', () => {
    const draft = createBlankLegalValidatorWorkbenchDraft();

    expect(draft.matterStatus).toBe('active');
    expect(draft.resolverStatus).toBe('success');
    expect(draft.resolverMatchBasis).toBe('exact_structural_rule');
    expect(draft.validationStatus).toBe('valid');
    expect(draft.traceResolverVersion).toBe('resolver-v1');
  });

  it('splits delimited text into a stable deduplicated list', () => {
    expect(splitDelimitedText('a, b\nc, a\n')).toEqual(['a', 'b', 'c']);
  });

  it('builds intake, orchestrate, inspection, and replay requests from the draft', () => {
    const draft = createBlankLegalValidatorWorkbenchDraft();
    Object.assign(draft, {
      matterId: 'matter-1',
      matterTitle: 'Inspection matter',
      matterJurisdiction: 'UK',
      matterPracticeArea: 'negligence',
      matterCreatedBy: 'analyst',
      sourceDocumentId: 'source-document-1',
      doctrineArtifactId: 'artifact-1',
      validationRunId: 'validation-run-1',
      authorityId: 'authority-1',
      authorityCitation: 'Health and Safety at Work Act 1974 s.2',
      authorityEvaluationDate: '2020-06-01T00:00:00Z',
      authorityRequiredInterpretationRegimeId: 'uk-textual-v1',
      resolverMappingId: 'mapping-1',
      resolverConceptId: 'duty_of_care',
      resolverAuthorityId: 'authority-1',
      resolverRuleId: 'resolver-rule-1',
      traceInputHash: 'a'.repeat(64),
      traceSourceAnchorsText: 'anchor-1, anchor-2',
      traceInterpretationUsed: true,
      traceInterpretationRegimeId: 'uk-textual-v1',
      traceManualOverrideUsed: true,
      traceOverrideIdsText: 'override-1',
    });

    expect(buildIntakeRequest(draft)).toEqual({
      input: {
        matter: {
          matterId: 'matter-1',
          title: 'Inspection matter',
          jurisdiction: 'UK',
          practiceArea: 'negligence',
          status: 'active',
          createdBy: 'analyst',
        },
        sourceDocumentIds: ['source-document-1'],
      },
    });

    expect(buildOrchestrateRequest(draft)).toMatchObject({
      input: {
        product: 'legal-argument-validator',
        scope: 'bounded-legal-validation',
        matterId: 'matter-1',
        jurisdiction: 'UK',
        practiceArea: 'negligence',
        sourceDocumentId: 'source-document-1',
        doctrineArtifactId: 'artifact-1',
        authorityInput: {
          authorityId: 'authority-1',
          citation: 'Health and Safety at Work Act 1974 s.2',
          evaluationDate: '2020-06-01T00:00:00Z',
          requiredInterpretationRegimeId: 'uk-textual-v1',
        },
        resolverDecision: {
          status: 'success',
          mappingId: 'mapping-1',
          mappingType: 'combined',
          matchBasis: 'exact_structural_rule',
          conceptId: 'duty_of_care',
          authorityId: 'authority-1',
          resolverRuleId: 'resolver-rule-1',
        },
        traceInput: {
          validationRunId: 'validation-run-1',
          resolverVersion: 'resolver-v1',
          inputHash: 'a'.repeat(64),
          sourceAnchors: ['anchor-1', 'anchor-2'],
          interpretationUsed: true,
          manualOverrideUsed: true,
          interpretationRegimeId: 'uk-textual-v1',
          overrideIds: ['override-1'],
        },
      },
    });

    expect(buildInspectionRequest(draft)).toEqual({
      input: {
        validationRunId: 'validation-run-1',
      },
    });

    expect(buildReplayRequest(draft)).toEqual({
      input: {
        validationRunId: 'validation-run-1',
      },
    });
  });
});
