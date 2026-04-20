import { describe, expect, it } from 'vitest';

import { POLICY_SURFACE_DATA } from '../../policies/policy-surface.data';
import { buildTermsPageViewModel } from './terms-page.view-model';

describe('buildTermsPageViewModel', () => {
  it('adds a separate Shared Intake Router contract section without changing the core terms surface', () => {
    const viewModel = buildTermsPageViewModel(POLICY_SURFACE_DATA.terms);

    expect(viewModel.title).toBe('Current public API reference.');
    expect(viewModel.intro).toBe(
      'This page models the public API as a scoped runtime section plus separate Shared Intake Router, Risk Mapping Governance, Military Constraints Compiler, Legal Validator, and ZEE surfaces. The hero counts are scoped to the runtime section only.',
    );
    expect(viewModel.sectionGroups.map((group) => group.label)).toEqual([
      'Overview',
      'Concepts',
      'Feedback',
      'Risk Mapping Governance',
      'Military Constraints Compiler',
      'ZeroGlare Evidence Engine',
      'Legal Validator',
      'Shared Intake Router',
      'Support / Notes',
    ]);
    expect(viewModel.sectionGroups.map((group) => group.sections.length)).toEqual([
      1, 1, 1, 1, 1, 1, 1, 1, 3,
    ]);
    expect(viewModel.sectionOrder.map((section) => section.id)).toEqual([
      'overview',
      'endpoint-contract',
      'field-contract',
      'risk-mapping-governance',
      'military-constraints',
      'zee-api',
      'legal-validator-api',
      'shared-intake-router',
      'platform-rules',
      'runtime-boundaries',
      'refusal-boundaries',
    ]);
    expect(viewModel.sectionOrder[0]).toMatchObject({
      id: 'overview',
      groupId: 'overview',
      groupLabel: 'Overview',
      sectionLabel: 'Overview',
      title: 'Current public API reference.',
      summary:
        'This page models the public API as a scoped runtime section plus separate Shared Intake Router, Risk Mapping Governance, Military Constraints Compiler, Legal Validator, and ZEE surfaces. The hero counts are scoped to the runtime section only.',
    });
    expect(viewModel.sectionOrder[3]).toMatchObject({
      id: 'risk-mapping-governance',
      groupId: 'risk-mapping-governance',
      groupLabel: 'Risk Mapping Governance',
      sectionLabel: 'Risk Mapping Governance API',
      title: 'Risk Mapping Governance API',
      summary:
        'Risk Mapping Governance is exposed separately as a bounded API surface. The current route set includes discovery, governance, diff, explain, resolve, and registry endpoints. The query contract accepts entity, timeHorizon, scenarioType, domain, scope, evidenceSetVersion, and optional queryText; queryText is normalized by the contract but not forwarded by the route handler.',
    });
    expect(viewModel.sectionOrder[4]).toMatchObject({
      id: 'military-constraints',
      groupId: 'military-constraints',
      groupLabel: 'Military Constraints Compiler',
      sectionLabel: 'Military Constraints Compiler API',
      title: 'Military Constraints Compiler API',
      summary:
        'Military Constraints Compiler is exposed as a deterministic admissibility surface under validated packs. It accepts structured facts only, fails closed, and returns ALLOWED, REFUSED, or REFUSED_INCOMPLETE. The current backend exposes discovery, pack catalog, pack detail, and evaluation routes only; pack metadata now includes admitted/planned/umbrella registry state. No /schema or /examples routes are implemented.',
    });
    expect(viewModel.sectionOrder[5]).toMatchObject({
      id: 'zee-api',
      groupId: 'zee-api',
      groupLabel: 'ZeroGlare Evidence Engine',
      sectionLabel: 'ZeroGlare Evidence Engine API',
      title: 'ZeroGlare Evidence Engine API',
      summary:
        'ZeroGlare Evidence Engine is exposed through a read-only ZEE scaffold and a separate zeroglare analysis route. The ZEE scaffold exposes discovery, contract, explain, and audit metadata only; the zeroglare analysis route accepts structured text input through q or input and returns bounded diagnostics.',
    });
    expect(viewModel.sectionOrder[6]).toMatchObject({
      id: 'legal-validator-api',
      groupId: 'legal-validator-api',
      groupLabel: 'Legal Validator',
      sectionLabel: 'Legal Validator API',
      title: 'Legal Validator API',
      summary:
        'Legal Validator is exposed separately as a bounded runtime surface. The backend exposes intake, orchestrate, replay, runs, and governance routes under a strict refusal-first contract.',
    });
    expect(viewModel.sectionOrder[7]).toMatchObject({
      id: 'shared-intake-router',
      groupId: 'shared-intake-router',
      groupLabel: 'Shared Intake Router',
      sectionLabel: 'Shared Intake Router API',
      title: 'Shared Intake Router API',
      summary:
        'The shared intake router accepts one input and dispatches it deterministically to Concepts or Risk Mapping by input shape. Unstructured raw text goes to Concepts; explicit RiskMapQuery field blocks or structured RiskMapQuery objects go to Risk Mapping. Mixed prose/field blocks are refused.',
    });
    expect(viewModel.sectionOrder[9]).toMatchObject({
      id: 'runtime-boundaries',
      groupId: 'support-notes',
      groupLabel: 'Support / Notes',
      sectionLabel: 'Runtime boundaries',
      title: 'Runtime boundaries',
      summary:
        'The Legal Validator is a deterministic validation system for structured argument analysis. It does not provide legal advice, interpretation, or recommendations.',
    });
    expect(viewModel.badges).toEqual(
      [
        { label: 'Endpoints', value: '8 public' },
        { label: 'Field rules', value: '22 typed' },
        { label: 'Platform rules', value: '1 active' },
        { label: 'Boundaries', value: '9 mapped' },
      ],
      'Terms hero badges must be derived from typed terms truth.',
    );
    expect(viewModel.legalValidatorTitle).toBe('Legal Validator API');
    expect(viewModel.legalValidatorIntro).toBe(
      'Legal Validator is exposed separately as a bounded runtime surface. The backend exposes intake, orchestrate, replay, runs, and governance routes under a strict refusal-first contract.',
    );
    expect(viewModel.legalValidatorCountsLine).toBe(
      'Legal Validator adds 5 endpoints, 26 request fields, and 6 refusal boundaries.',
    );
    expect(viewModel.legalValidatorInspectRoute).toBe('/inspect/legal-validator');
    expect(viewModel.endpointRows).toEqual(
      [
        {
          claimId: 'terms-40',
          operation: 'concept discovery',
          method: 'GET',
          path: '/api/v1/concepts',
          input: 'none',
          evidence: 'backend/src/routes/api/v1/concepts.route.js:33-39',
        },
        {
          claimId: 'terms-1',
          operation: 'concept resolution',
          method: 'GET',
          path: '/api/v1/concepts/resolve',
          input: 'query: q',
          evidence: 'backend/src/routes/api/v1/concepts.route.js:16-31',
        },
        {
          claimId: 'terms-35',
          operation: 'concept resolution',
          method: 'POST',
          path: '/api/v1/concepts/resolve',
          input: 'request body',
          evidence: 'backend/src/routes/api/v1/concepts.route.js:49-55',
        },
        {
          claimId: 'terms-36',
          operation: 'concept detail',
          method: 'GET',
          path: '/api/v1/concepts/:conceptId',
          input: 'route: conceptId',
          evidence: 'backend/src/routes/api/v1/concepts.route.js:57-93',
        },
        {
          claimId: 'terms-37',
          operation: 'feedback index',
          method: 'GET',
          path: '/api/v1/feedback',
          input: 'none',
          evidence: 'backend/src/routes/api/v1/feedback.route.js:12-18',
        },
        {
          claimId: 'terms-2',
          operation: 'feedback submission',
          method: 'POST',
          path: '/api/v1/feedback',
          input: 'request body',
          evidence: 'backend/src/routes/api/v1/feedback.route.js:20-23',
        },
        {
          claimId: 'terms-38',
          operation: 'feedback export',
          method: 'GET',
          path: '/api/v1/feedback/session/:sessionId/export',
          input: 'route: sessionId',
          evidence: 'backend/src/routes/api/v1/feedback.route.js:45-68',
        },
        {
          claimId: 'terms-39',
          operation: 'feedback delete',
          method: 'DELETE',
          path: '/api/v1/feedback/session/:sessionId',
          input: 'route: sessionId',
          evidence: 'backend/src/routes/api/v1/feedback.route.js:70-93',
        },
      ],
      'Endpoint contract rows must remain separate from field and boundary rows.',
    );
    expect(viewModel.riskMappingTitle).toBe('Risk Mapping Governance API');
    expect(viewModel.riskMappingTrustRoute).toBe('/risk-mapping-governance');
    expect(viewModel.riskMappingEndpointRows.map((row) => row.path)).toEqual([
      '/api/v1/risk-mapping/',
      '/api/v1/risk-mapping/governance',
      '/api/v1/risk-mapping/diff',
      '/api/v1/risk-mapping/resolve',
      '/api/v1/risk-mapping/explain',
      '/api/v1/risk-mapping/audit',
      '/api/v1/risk-mapping/registries/nodes',
      '/api/v1/risk-mapping/registries/threats',
      '/api/v1/risk-mapping/registries/compatibility',
      '/api/v1/risk-mapping/registries/falsifiers',
    ]);
    expect(viewModel.riskMappingFieldRows).toEqual([
      {
        claimId: 'rmg-field-1',
        field: 'entity',
        rule: 'required request field',
        condition: 'authoritative entity lookup key',
        evidence: 'backend/src/modules/risk-mapping/contracts/riskMapQueryContract.js:46-74',
      },
      {
        claimId: 'rmg-field-2',
        field: 'timeHorizon',
        rule: 'required request field',
        condition: 'temporal horizon selector',
        evidence: 'backend/src/modules/risk-mapping/contracts/riskMapQueryContract.js:46-74',
      },
      {
        claimId: 'rmg-field-3',
        field: 'scenarioType',
        rule: 'required request field',
        condition: 'scenario classifier',
        evidence: 'backend/src/modules/risk-mapping/contracts/riskMapQueryContract.js:46-74',
      },
      {
        claimId: 'rmg-field-4',
        field: 'domain',
        rule: 'required request field',
        condition: 'domain scoping key',
        evidence: 'backend/src/modules/risk-mapping/contracts/riskMapQueryContract.js:46-74',
      },
      {
        claimId: 'rmg-field-5',
        field: 'scope',
        rule: 'required request field',
        condition: 'non-empty string array',
        evidence: 'backend/src/modules/risk-mapping/contracts/riskMapQueryContract.js:62-72',
      },
      {
        claimId: 'rmg-field-6',
        field: 'evidenceSetVersion',
        rule: 'required request field',
        condition: 'evidence set version key',
        evidence: 'backend/src/modules/risk-mapping/contracts/riskMapQueryContract.js:46-74',
      },
      {
        claimId: 'rmg-field-7',
        field: 'queryText',
        rule: 'optional request field',
        condition: 'accepted by the contract and normalized when present; not forwarded by the route handler',
        evidence:
          'backend/src/modules/risk-mapping/contracts/riskMapQueryContract.js:46-74 | backend/src/modules/risk-mapping/normalizers/normalizeRiskMapQuery.js:23-43',
      },
    ]);
    expect(viewModel.riskMappingBoundaryRows).toEqual([
      {
        claimId: 'rmg-boundary-1',
        boundary: 'invalid query contract',
        condition:
          'missing or malformed entity, timeHorizon, scenarioType, domain, scope, evidenceSetVersion, or optional queryText',
        effect: 'rejected with invalid_risk_map_query',
        evidence:
          'backend/src/routes/api/v1/risk-mapping.route.js:70-113 | backend/src/modules/risk-mapping/contracts/riskMapQueryContract.js:38-74',
      },
      {
        claimId: 'rmg-boundary-2',
        boundary: 'registry domain required',
        condition: 'registry routes omit domain or supply an empty domain',
        effect: 'rejected with invalid_risk_map_query',
        evidence: 'backend/src/routes/api/v1/risk-mapping.route.js:161-203',
      },
      {
        claimId: 'rmg-boundary-3',
        boundary: 'diff artifact unavailable',
        condition: 'no generated diff report is present',
        effect: 'rejected with risk_map_diff_unavailable',
        evidence: 'backend/src/routes/api/v1/risk-mapping.route.js:124-136',
      },
    ]);
    expect(viewModel.militaryConstraintsTitle).toBe('Military Constraints Compiler API');
    expect(viewModel.militaryConstraintsIntro).toBe(
      'Military Constraints Compiler is exposed as a deterministic admissibility surface under validated packs. It accepts structured facts only, fails closed, and returns ALLOWED, REFUSED, or REFUSED_INCOMPLETE. The current backend exposes discovery, pack catalog, pack detail, and evaluation routes only; pack metadata now includes admitted/planned/umbrella registry state. No /schema or /examples routes are implemented.',
    );
    expect(viewModel.militaryConstraintsHighlights).toEqual([
      {
        label: 'Decision contract',
        value: 'ALLOWED / REFUSED / REFUSED_INCOMPLETE',
      },
      {
        label: 'Input',
        value: 'Structured facts only',
      },
      {
        label: 'Posture',
        value: 'Refusal-first',
      },
      {
        label: 'Scope',
        value: 'Validated packs only',
      },
      {
        label: 'Not',
        value: 'Prose interpreter or tactical advice',
      },
    ]);
    expect(viewModel.militaryConstraintsEndpointRows).toEqual([
      {
        claimId: 'mc-api-1',
        operation: 'surface summary',
        method: 'GET',
        path: '/api/v1/military-constraints',
        input: 'none',
        evidence: 'backend/src/routes/api/v1/military-constraints.route.js:101-107',
      },
      {
        claimId: 'mc-api-2',
        operation: 'pack catalog',
        method: 'GET',
        path: '/api/v1/military-constraints/packs',
        input: 'none',
        evidence: 'backend/src/routes/api/v1/military-constraints.route.js:110-115',
      },
      {
        claimId: 'mc-api-3',
        operation: 'pack detail',
        method: 'GET',
        path: '/api/v1/military-constraints/packs/:packId',
        input: 'route: packId',
        evidence: 'backend/src/routes/api/v1/military-constraints.route.js:118-146',
      },
      {
        claimId: 'mc-api-4',
        operation: 'evaluate surface',
        method: 'POST',
        path: '/api/v1/military-constraints/evaluate',
        input: 'body: packId, facts',
        evidence: 'backend/src/routes/api/v1/military-constraints.route.js:149-207',
      },
    ]);
    expect(viewModel.militaryConstraintsFieldRows).toEqual([
      {
        claimId: 'mc-field-1',
        field: 'packId',
        rule: 'required request field',
        condition: 'must match one of the locked v1 pack identifiers',
        evidence: 'backend/src/routes/api/v1/military-constraints.route.js:149-181',
      },
      {
        claimId: 'mc-field-2',
        field: 'facts',
        rule: 'required request field',
        condition: 'must be a plain object and must pass the military-constraints fact schema',
        evidence: 'backend/src/routes/api/v1/military-constraints.route.js:149-205',
      },
    ]);
    expect(viewModel.militaryConstraintsBoundaryRows).toEqual([
      {
        claimId: 'mc-boundary-1',
        boundary: 'missing packId or facts',
        condition: 'request body does not contain only packId and facts',
        effect: 'rejected with invalid_military_constraints_request',
        evidence: 'backend/src/routes/api/v1/military-constraints.route.js:149-176',
      },
      {
        claimId: 'mc-boundary-2',
        boundary: 'unknown packId',
        condition: 'packId does not match a locked v1 pack',
        effect: 'rejected with military_constraints_pack_not_found',
        evidence: 'backend/src/routes/api/v1/military-constraints.route.js:178-182',
      },
      {
        claimId: 'mc-boundary-3',
        boundary: 'unsupported request shape',
        condition: 'top-level request body contains extra keys or freeform prose',
        effect: 'rejected with invalid_military_constraints_request',
        evidence: 'backend/src/routes/api/v1/military-constraints.route.js:154-176',
      },
      {
        claimId: 'mc-boundary-4',
        boundary: 'malformed facts payload',
        condition: 'facts is not a plain object or does not match the fact schema',
        effect: 'rejected with invalid_military_constraints_facts',
        evidence: 'backend/src/routes/api/v1/military-constraints.route.js:164-197',
      },
      {
        claimId: 'mc-boundary-5',
        boundary: 'invalid enum values',
        condition: 'fact schema enum values do not match declared allowed values',
        effect: 'rejected with invalid_military_constraints_facts',
        evidence: 'backend/src/routes/api/v1/military-constraints.route.js:195-197 | backend/src/modules/military-constraints/military-constraint-fact.schema.json',
      },
    ]);
    expect(viewModel.militaryConstraintsTrustRoute).toBe('/military-constraints-compiler');
    expect(viewModel.zeeApiTitle).toBe('ZeroGlare Evidence Engine API');
    expect(viewModel.zeeApiIntro).toBe(
      'ZeroGlare Evidence Engine is exposed through a read-only ZEE scaffold and a separate zeroglare analysis route. The ZEE scaffold exposes discovery, contract, explain, and audit metadata only; the zeroglare analysis route accepts structured text input through q or input and returns bounded diagnostics.',
    );
    expect(viewModel.zeeApiEndpointRows).toEqual([
      {
        claimId: 'zee-api-0',
        operation: 'surface summary',
        method: 'GET',
        path: '/api/v1/zee',
        input: 'none',
        evidence: 'backend/src/routes/api/v1/zee.route.js:36-43',
      },
      {
        claimId: 'zee-api-1',
        operation: 'contract surface',
        method: 'GET',
        path: '/api/v1/zee/contract',
        input: 'none',
        evidence: 'backend/src/routes/api/v1/zee.route.js:45-53',
      },
      {
        claimId: 'zee-api-2',
        operation: 'explain surface',
        method: 'GET',
        path: '/api/v1/zee/explain',
        input: 'none',
        evidence: 'backend/src/routes/api/v1/zee.route.js:55-74',
      },
      {
        claimId: 'zee-api-3',
        operation: 'audit surface',
        method: 'GET',
        path: '/api/v1/zee/audit',
        input: 'none',
        evidence: 'backend/src/routes/api/v1/zee.route.js:76-88',
      },
    ]);
    expect(viewModel.zeroglareEndpointRows).toEqual([
      {
        claimId: 'zg-api-0',
        operation: 'surface summary',
        method: 'GET',
        path: '/api/v1/zeroglare',
        input: 'none',
        evidence: 'backend/src/routes/api/v1/zeroglare.route.js:56-63',
      },
      {
        claimId: 'zg-api-1',
        operation: 'analysis surface',
        method: 'GET',
        path: '/api/v1/zeroglare/analyze',
        input: 'query: q',
        evidence: 'backend/src/routes/api/v1/zeroglare.route.js:65-71',
      },
      {
        claimId: 'zg-api-2',
        operation: 'analysis surface',
        method: 'POST',
        path: '/api/v1/zeroglare/analyze',
        input: 'query: q or body: input',
        evidence: 'backend/src/routes/api/v1/zeroglare.route.js:12-22,73-79',
      },
    ]);
    expect(viewModel.zeroglareFieldRows).toEqual([
      {
        claimId: 'zg-field-1',
        field: 'q',
        rule: 'required query field for GET analyze; accepted on POST analyze',
        condition: 'must be a non-empty string',
        evidence: 'backend/src/routes/api/v1/zeroglare.route.js:12-22,65-79',
      },
      {
        claimId: 'zg-field-2',
        field: 'input',
        rule: 'required body field for POST analyze when q is absent',
        condition: 'must be a non-empty string',
        evidence: 'backend/src/routes/api/v1/zeroglare.route.js:12-22,73-79',
      },
    ]);
    expect(viewModel.zeroglareBoundaryRows).toEqual([
      {
        claimId: 'zg-boundary-1',
        boundary: 'missing analysis input',
        condition: 'q and input are both missing or empty',
        effect: 'rejected with invalid_zeroglare_input',
        evidence: 'backend/src/routes/api/v1/zeroglare.route.js:24-33,65-79',
      },
      {
        claimId: 'zg-boundary-2',
        boundary: 'oversized analysis input',
        condition: 'input exceeds 1,000,000 characters',
        effect: 'rejected with INPUT_TOO_LARGE',
        evidence: 'backend/src/routes/api/v1/zeroglare.route.js:35-40',
      },
    ]);
    expect(viewModel.legalValidatorEndpointRows).toEqual([
      {
        claimId: 'lv-api-1',
        operation: 'intake',
        method: 'POST',
        path: '/api/v1/legal-validator/intake',
        input: 'body: input',
        evidence: 'backend/src/routes/api/v1/legal-validator-intake.route.js:27-98',
      },
      {
        claimId: 'lv-api-2',
        operation: 'orchestrate',
        method: 'POST',
        path: '/api/v1/legal-validator/orchestrate',
        input: 'body: input',
        evidence: 'backend/src/routes/api/v1/legal-validator-orchestrate.route.js:28-90',
      },
      {
        claimId: 'lv-api-3',
        operation: 'replay',
        method: 'POST',
        path: '/api/v1/legal-validator/replay',
        input: 'body: input',
        evidence: 'backend/src/routes/api/v1/legal-validator-replay.route.js:27-101',
      },
      {
        claimId: 'lv-api-4',
        operation: 'run inspection',
        method: 'GET',
        path: '/api/v1/legal-validator/runs/:validationRunId',
        input: 'route: validationRunId',
        evidence: 'backend/src/routes/api/v1/legal-validator-runs.route.js:494-515',
      },
      {
        claimId: 'lv-api-5',
        operation: 'governance',
        method: 'GET',
        path: '/api/v1/legal-validator/governance',
        input: 'none',
        evidence: 'backend/src/routes/api/v1/legal-validator-governance.route.js:132-155',
      },
    ]);
    expect(viewModel.legalValidatorIntakeFieldRows.map((row) => row.field)).toEqual([
      'input',
      'matter',
      'sourceDocumentIds',
      'matter.matterId',
      'matter.title',
      'matter.jurisdiction',
      'matter.practiceArea',
      'matter.status',
      'matter.createdBy',
    ]);
    expect(viewModel.legalValidatorOrchestrateFieldRows.map((row) => row.field)).toEqual([
      'input',
      'product',
      'scope',
      'matterId',
      'jurisdiction',
      'practiceArea',
      'sourceDocumentId',
      'doctrineArtifactId',
      'authorityInput',
      'resolverDecision',
      'validationDecision',
      'traceInput',
      'traceInput.validationRunId',
      'traceInput.resolverVersion',
      'traceInput.inputHash',
    ]);
    expect(viewModel.legalValidatorReplayFieldRows.map((row) => row.field)).toEqual([
      'input',
      'validationRunId',
    ]);
    expect(viewModel.legalValidatorBoundaryRows).toEqual([
      {
        claimId: 'lv-boundary-1',
        boundary: 'invalid validator input',
        condition: 'request body is not a single-input wrapper or required strings are empty',
        effect: 'rejected with invalid_legal_validator_input',
        evidence:
          'backend/src/routes/api/v1/legal-validator.route.js:43-90 | backend/src/routes/api/v1/legal-validator-intake.route.js:27-39 | backend/src/routes/api/v1/legal-validator-orchestrate.route.js:28-45 | backend/src/routes/api/v1/legal-validator-replay.route.js:27-39',
      },
      {
        claimId: 'lv-boundary-2',
        boundary: 'scope lock violation',
        condition: 'product, scope, matterId, jurisdiction, or practiceArea do not match the locked boundary',
        effect: 'rejected with legal_validator_scope_lock_violation',
        evidence:
          'backend/src/routes/api/v1/legal-validator.route.js:61-90 | backend/src/routes/api/v1/legal-validator-orchestrate.route.js:36-45 | backend/src/modules/legal-validator/shared/legal-validator-runtime.contract.js:89-157,285-314',
      },
      {
        claimId: 'lv-boundary-3',
        boundary: 'doctrine mismatch',
        condition: 'the doctrine artifact cannot be recognized or does not satisfy the runtime-eligible doctrine contract',
        effect: 'rejected with DOCTRINE_NOT_RECOGNIZED',
        evidence: 'backend/src/modules/legal-validator/doctrine/doctrine-loader.service.js:57-106',
      },
      {
        claimId: 'lv-boundary-4',
        boundary: 'authority scope violation',
        condition: 'authority falls outside doctrine scope, jurisdiction, or required interpretation regime',
        effect: 'rejected with AUTHORITY_SCOPE_VIOLATION',
        evidence: 'backend/src/modules/legal-validator/authority/authority-registry.service.js:274-369',
      },
      {
        claimId: 'lv-boundary-5',
        boundary: 'mapping conflict',
        condition: 'resolver output is ambiguous, non-deterministic, or uses an unapproved override record',
        effect: 'rejected with AMBIGUOUS_CONCEPT_MAPPING',
        evidence: 'backend/src/modules/legal-validator/mapping/resolver.service.js:277-379,443-463',
      },
      {
        claimId: 'lv-boundary-6',
        boundary: 'replay divergence',
        condition: 'the replayed trace diverges from the recorded run signature or retained doctrine artifact',
        effect: 'rejected with REPLAY_ARTIFACT_MISMATCH',
        evidence: 'backend/src/modules/legal-validator/validation/trace.service.js:917-975,1084-1143,1237-1278',
      },
    ]);
    expect(viewModel.sharedIntakeTitle).toBe('Shared Intake Router API');
  expect(viewModel.sharedIntakeIntro).toBe(
    'The shared intake router accepts one input and dispatches it deterministically to Concepts or Risk Mapping by input shape. Unstructured raw text goes to Concepts; explicit RiskMapQuery field blocks or structured RiskMapQuery objects go to Risk Mapping. Mixed prose/field blocks are refused.',
  );
    expect(viewModel.sharedIntakeEndpointRows).toEqual([
      {
        claimId: 'intake-api-0',
        operation: 'surface summary',
        method: 'GET',
        path: '/api/v1/intake',
        input: 'none',
        evidence: 'backend/src/routes/api/v1/intake.route.js:69-75',
      },
      {
        claimId: 'intake-api-1',
        operation: 'dispatch surface',
        method: 'POST',
        path: '/api/v1/intake',
        input: 'body: input',
        evidence: 'backend/src/routes/api/v1/intake.route.js:21-65',
      },
    ]);
  expect(viewModel.sharedIntakeFieldRows).toEqual([
    {
      claimId: 'intake-field-1',
      field: 'input',
      rule: 'required request field',
      condition:
        'must be a non-empty string for Concepts dispatch or an explicit RiskMapQuery field block or structured RiskMapQuery object for Risk Mapping dispatch',
      evidence:
        'backend/src/routes/api/v1/intake.route.js:21-65 | backend/src/modules/intake/shared-intake-router.js:54-210',
    },
  ]);
  expect(viewModel.sharedIntakeBoundaryRows).toEqual([
      {
        claimId: 'intake-boundary-1',
        boundary: 'missing input payload',
        condition: 'request body omits the input field or supplies a body shape other than a single-field wrapper',
        effect: 'rejected with invalid_intake_input',
        evidence: 'backend/src/routes/api/v1/intake.route.js:21-45',
      },
      {
        claimId: 'intake-boundary-2',
      boundary: 'empty text input',
      condition: 'input is an empty string',
      effect: 'rejected with invalid_intake_input',
      evidence: 'backend/src/modules/intake/shared-intake-router.js:164-189',
    },
    {
      claimId: 'intake-boundary-3',
      boundary: 'invalid structured input',
      condition: 'input is an object that does not satisfy the RiskMapQuery contract',
      effect: 'rejected with invalid_intake_input',
      evidence: 'backend/src/modules/intake/shared-intake-router.js:192-203',
    },
    {
      claimId: 'intake-boundary-4',
      boundary: 'mixed structured text',
      condition:
        'input mixes free prose with explicit RiskMapQuery field assignments or omits required fields from an explicit field block',
      effect: 'rejected with invalid_intake_input',
      evidence: 'backend/src/modules/intake/shared-intake-router.js:54-161',
    },
  ]);
    expect(viewModel.zeeApiTrustRoute).toBe('/zeroglare-evidence-engine');
    expect(viewModel.summaryLine).toBe(
      'Runtime section shows 8 public endpoints, 22 field rules, 1 platform rule, 1 runtime boundary, and 8 refusal boundaries. Legal Validator adds 5 endpoints, 26 request fields, and 6 refusal boundaries.',
    );
  });
});
