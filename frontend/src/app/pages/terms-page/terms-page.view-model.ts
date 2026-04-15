import type {
  PolicyTermsEndpointContract,
  PolicyTermsFieldContract,
  PolicyTermsPlatformRule,
  PolicyTermsRefusalBoundary,
  PolicyTermsRuntimeBoundary,
  PolicySurfaceDefinition,
} from '../../policies/policy-surface.types';
import { MCPP_ROUTE_PATH } from '../military-constraints-compiler-page/military-constraints-compiler-page.constants.js';
import { ZEE_ROUTE_PATH } from '../zeroglare-evidence-engine-page/zeroglare-evidence-engine-page.constants.js';

export type TermsPageSectionGroupId =
  | 'overview'
  | 'concepts'
  | 'feedback'
  | 'risk-mapping-governance'
  | 'military-constraints'
  | 'zee-api'
  | 'support-notes';

export interface TermsPageSection {
  id: string;
  groupId: TermsPageSectionGroupId;
  groupLabel: string;
  sectionLabel: string;
  title: string;
  summary?: string;
  endpointOperation?: string;
}

export interface TermsPageSectionGroup {
  id: TermsPageSectionGroupId;
  label: string;
  sections: readonly TermsPageSection[];
}

export const TERMS_PAGE_SECTION_GROUPS = [
  {
    id: 'overview',
    label: 'Overview',
    sections: [
      {
        id: 'overview',
        groupId: 'overview',
        groupLabel: 'Overview',
        sectionLabel: 'Overview',
        title: 'Current public API reference.',
        summary:
          'This page models the public API as a scoped runtime section plus separate Risk Mapping Governance, Military Constraints Compiler, and ZEE surfaces. The hero counts are scoped to the runtime section only.',
      },
    ],
  },
  {
    id: 'concepts',
    label: 'Concepts',
    sections: [
      {
        id: 'endpoint-contract',
        groupId: 'concepts',
        groupLabel: 'Concepts',
        sectionLabel: 'Endpoint contract',
        title: 'Endpoint contract',
      },
    ],
  },
  {
    id: 'feedback',
    label: 'Feedback',
    sections: [
      {
        id: 'field-contract',
        groupId: 'feedback',
        groupLabel: 'Feedback',
        sectionLabel: 'Field contract',
        title: 'Field contract',
      },
    ],
  },
  {
    id: 'risk-mapping-governance',
    label: 'Risk Mapping Governance',
    sections: [
      {
        id: 'risk-mapping-governance',
        groupId: 'risk-mapping-governance',
        groupLabel: 'Risk Mapping Governance',
        sectionLabel: 'Risk Mapping Governance API',
        title: 'Risk Mapping Governance API',
        summary:
          'Risk Mapping Governance is exposed separately as a bounded API surface. The current route set includes discovery, governance, diff, explain, resolve, and registry endpoints. The query contract accepts entity, timeHorizon, scenarioType, domain, scope, evidenceSetVersion, and optional queryText; queryText is normalized by the contract but not forwarded by the route handler.',
      },
    ],
  },
  {
    id: 'military-constraints',
    label: 'Military Constraints Compiler',
    sections: [
      {
        id: 'military-constraints',
        groupId: 'military-constraints',
        groupLabel: 'Military Constraints Compiler',
        sectionLabel: 'Military Constraints Compiler API',
        title: 'Military Constraints Compiler API',
        summary:
          'Military Constraints Compiler is exposed as a deterministic admissibility surface under validated packs. It accepts structured facts only, fails closed, and returns ALLOWED, REFUSED, or REFUSED_INCOMPLETE. The current backend exposes discovery, pack catalog, pack detail, and evaluation routes only; pack metadata now includes admitted/planned/umbrella registry state. No /schema or /examples routes are implemented.',
      },
    ],
  },
  {
    id: 'zee-api',
    label: 'ZeroGlare Evidence Engine',
    sections: [
      {
        id: 'zee-api',
        groupId: 'zee-api',
        groupLabel: 'ZeroGlare Evidence Engine',
        sectionLabel: 'ZeroGlare Evidence Engine API',
        title: 'ZeroGlare Evidence Engine API',
        summary:
          'ZeroGlare Evidence Engine is exposed through a read-only ZEE scaffold and a separate zeroglare analysis route. The ZEE scaffold exposes discovery, contract, explain, and audit metadata only; the zeroglare analysis route accepts structured text input through q or input and returns bounded diagnostics.',
      },
    ],
  },
  {
    id: 'support-notes',
    label: 'Support / Notes',
    sections: [
      {
        id: 'platform-rules',
        groupId: 'support-notes',
        groupLabel: 'Support / Notes',
        sectionLabel: 'Platform rules',
        title: 'Platform rules',
      },
      {
        id: 'runtime-boundaries',
        groupId: 'support-notes',
        groupLabel: 'Support / Notes',
        sectionLabel: 'Runtime boundaries',
        title: 'Runtime boundaries',
      },
      {
        id: 'refusal-boundaries',
        groupId: 'support-notes',
        groupLabel: 'Support / Notes',
        sectionLabel: 'Refusal boundaries',
        title: 'Refusal boundaries',
      },
    ],
  },
] as const satisfies readonly TermsPageSectionGroup[];

export function flattenTermsPageSections(
  groups: readonly TermsPageSectionGroup[],
): readonly TermsPageSection[] {
  return groups.flatMap((group) => group.sections);
}

export interface TermsPageBadge {
  label: string;
  value: string;
}

export interface TermsPageEndpointRow {
  claimId: string;
  operation: string;
  method: string;
  path: string;
  input: string;
  evidence: string;
}

export interface TermsPageFieldRow {
  claimId: string;
  field: string;
  rule: string;
  condition: string;
  evidence: string;
}

export interface TermsPageRuleRow {
  claimId: string;
  rule: string;
  effect: string;
  evidence: string;
}

export interface TermsPageBoundaryRow {
  claimId: string;
  boundary: string;
  condition: string;
  effect: string;
  evidence: string;
}

export interface TermsPageViewModel {
  eyebrow: string;
  title: string;
  intro: string;
  summaryLine: string;
  badges: readonly TermsPageBadge[];
  sectionGroups: readonly TermsPageSectionGroup[];
  sectionOrder: readonly TermsPageSection[];
  endpointRows: readonly TermsPageEndpointRow[];
  requestFieldRows: readonly TermsPageFieldRow[];
  acceptedValueRows: readonly TermsPageFieldRow[];
  platformRuleRows: readonly TermsPageRuleRow[];
  runtimeBoundaryRows: readonly TermsPageBoundaryRow[];
  refusalBoundaryRows: readonly TermsPageBoundaryRow[];
  riskMappingTitle: string;
  riskMappingIntro: string;
  riskMappingEndpointRows: readonly TermsPageEndpointRow[];
  riskMappingFieldRows: readonly TermsPageFieldRow[];
  riskMappingBoundaryRows: readonly TermsPageBoundaryRow[];
  riskMappingTrustRoute: string;
  militaryConstraintsTitle: string;
  militaryConstraintsIntro: string;
  militaryConstraintsHighlights: readonly TermsPageBadge[];
  militaryConstraintsEndpointRows: readonly TermsPageEndpointRow[];
  militaryConstraintsFieldRows: readonly TermsPageFieldRow[];
  militaryConstraintsBoundaryRows: readonly TermsPageBoundaryRow[];
  militaryConstraintsTrustRoute: string;
  zeeApiTitle: string;
  zeeApiIntro: string;
  zeeApiEndpointRows: readonly TermsPageEndpointRow[];
  zeroglareEndpointRows: readonly TermsPageEndpointRow[];
  zeroglareFieldRows: readonly TermsPageFieldRow[];
  zeroglareBoundaryRows: readonly TermsPageBoundaryRow[];
  zeeApiTrustRoute: string;
  inspectRoute: string;
}

export function buildTermsPageViewModel(surface: PolicySurfaceDefinition): TermsPageViewModel {
  if (surface.key !== 'terms') {
    throw new Error(`Terms page view model requires the terms surface, received ${surface.key}.`);
  }

  if (!surface.termsTruth) {
    throw new Error('Terms page requires typed terms truth rows before UI rendering can proceed.');
  }

  const sectionGroups = TERMS_PAGE_SECTION_GROUPS;
  const sectionOrder = flattenTermsPageSections(sectionGroups);
  const overviewSection = requireSection(sectionOrder, 'overview');
  const riskMappingSection = requireSection(sectionOrder, 'risk-mapping-governance');
  const militaryConstraintsSection = requireSection(sectionOrder, 'military-constraints');
  const zeeSection = requireSection(sectionOrder, 'zee-api');
  const { endpointContracts, fieldContracts, platformRules, runtimeBoundaries, refusalBoundaries } =
    surface.termsTruth;
  const riskMappingEndpointRows = [
    {
      claimId: 'rmg-api-0',
      operation: 'surface summary',
      method: 'GET',
      path: '/api/v1/risk-mapping/',
      input: 'none',
      evidence: 'backend/src/routes/api/v1/risk-mapping.route.js:147-153',
    },
    {
      claimId: 'rmg-api-8',
      operation: 'governance report',
      method: 'GET',
      path: '/api/v1/risk-mapping/governance',
      input: 'none',
      evidence: 'backend/src/routes/api/v1/risk-mapping.route.js:115-122',
    },
    {
      claimId: 'rmg-api-9',
      operation: 'artifact diff',
      method: 'GET',
      path: '/api/v1/risk-mapping/diff',
      input: 'none',
      evidence: 'backend/src/routes/api/v1/risk-mapping.route.js:124-136',
    },
    {
      claimId: 'rmg-api-1',
      operation: 'resolve surface',
      method: 'GET',
      path: '/api/v1/risk-mapping/resolve',
      input: 'query: entity, timeHorizon, scenarioType, domain, scope, evidenceSetVersion',
      evidence: 'backend/src/routes/api/v1/risk-mapping.route.js:97-100',
    },
    {
      claimId: 'rmg-api-2',
      operation: 'explain surface',
      method: 'GET',
      path: '/api/v1/risk-mapping/explain',
      input: 'query: entity, timeHorizon, scenarioType, domain, scope, evidenceSetVersion',
      evidence: 'backend/src/routes/api/v1/risk-mapping.route.js:67-70',
    },
    {
      claimId: 'rmg-api-3',
      operation: 'audit surface',
      method: 'GET',
      path: '/api/v1/risk-mapping/audit',
      input: 'query: entity, timeHorizon, scenarioType, domain, scope, evidenceSetVersion',
      evidence: 'backend/src/routes/api/v1/risk-mapping.route.js:82-85',
    },
    {
      claimId: 'rmg-api-4',
      operation: 'node registry',
      method: 'GET',
      path: '/api/v1/risk-mapping/registries/nodes',
      input: 'query: domain',
      evidence: 'backend/src/routes/api/v1/risk-mapping.route.js:158-160',
    },
    {
      claimId: 'rmg-api-5',
      operation: 'threat registry',
      method: 'GET',
      path: '/api/v1/risk-mapping/registries/threats',
      input: 'query: domain',
      evidence: 'backend/src/routes/api/v1/risk-mapping.route.js:162-164',
    },
    {
      claimId: 'rmg-api-6',
      operation: 'compatibility registry',
      method: 'GET',
      path: '/api/v1/risk-mapping/registries/compatibility',
      input: 'query: domain',
      evidence: 'backend/src/routes/api/v1/risk-mapping.route.js:166-168',
    },
    {
      claimId: 'rmg-api-7',
      operation: 'falsifier registry',
      method: 'GET',
      path: '/api/v1/risk-mapping/registries/falsifiers',
      input: 'query: domain',
      evidence: 'backend/src/routes/api/v1/risk-mapping.route.js:170-172',
    },
  ] satisfies readonly TermsPageEndpointRow[];

  const riskMappingFieldRows = [
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
  ] satisfies readonly TermsPageFieldRow[];

  const riskMappingBoundaryRows = [
    {
      claimId: 'rmg-boundary-1',
      boundary: 'invalid query contract',
      condition: 'missing or malformed entity, timeHorizon, scenarioType, domain, scope, evidenceSetVersion, or optional queryText',
      effect: 'rejected with invalid_risk_map_query',
      evidence: 'backend/src/routes/api/v1/risk-mapping.route.js:70-113 | backend/src/modules/risk-mapping/contracts/riskMapQueryContract.js:38-74',
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
  ] satisfies readonly TermsPageBoundaryRow[];

  const militaryConstraintsEndpointRows = [
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
  ] satisfies readonly TermsPageEndpointRow[];

  const militaryConstraintsFieldRows = [
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
  ] satisfies readonly TermsPageFieldRow[];

  const militaryConstraintsBoundaryRows = [
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
  ] satisfies readonly TermsPageBoundaryRow[];

  const zeeApiEndpointRows = [
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
  ] satisfies readonly TermsPageEndpointRow[];

  const zeroglareEndpointRows = [
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
  ] satisfies readonly TermsPageEndpointRow[];

  const zeroglareFieldRows = [
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
  ] satisfies readonly TermsPageFieldRow[];

  const zeroglareBoundaryRows = [
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
  ] satisfies readonly TermsPageBoundaryRow[];

  return {
    eyebrow: 'API Reference',
    title: overviewSection.title,
    intro: overviewSection.summary ?? '',
    summaryLine: `Runtime section shows ${formatCount(endpointContracts.length, 'public endpoint')}, ${formatCount(fieldContracts.length, 'field rule')}, ${formatCount(platformRules.length, 'platform rule')}, ${formatCount(runtimeBoundaries.length, 'runtime boundary')}, and ${formatCount(refusalBoundaries.length, 'refusal boundary')}.`,
    badges: [
      {
        label: 'Endpoints',
        value: `${endpointContracts.length} public`,
      },
      {
        label: 'Field rules',
        value: `${fieldContracts.length} typed`,
      },
      {
        label: 'Platform rules',
        value: `${platformRules.length} active`,
      },
      {
        label: 'Boundaries',
        value: `${runtimeBoundaries.length + refusalBoundaries.length} mapped`,
      },
    ],
    sectionGroups,
    sectionOrder,
    endpointRows: endpointContracts.map(buildEndpointRow),
    requestFieldRows: fieldContracts
      .filter((fact) => fact.fieldContractType === 'request_field')
      .map(buildFieldRow),
    acceptedValueRows: fieldContracts
      .filter((fact) => fact.fieldContractType !== 'request_field')
      .map(buildFieldRow),
    platformRuleRows: platformRules.map(buildPlatformRuleRow),
    runtimeBoundaryRows: runtimeBoundaries.map(buildRuntimeBoundaryRow),
    refusalBoundaryRows: refusalBoundaries.map(buildRefusalBoundaryRow),
    riskMappingTitle: riskMappingSection.title,
    riskMappingIntro:
      riskMappingSection.summary ??
      'Risk Mapping Governance is exposed separately as a bounded API surface. The current route set includes discovery, governance, diff, explain, resolve, and registry endpoints. The query contract accepts entity, timeHorizon, scenarioType, domain, scope, evidenceSetVersion, and optional queryText; queryText is normalized by the contract but not forwarded by the route handler.',
    riskMappingEndpointRows,
    riskMappingFieldRows,
    riskMappingBoundaryRows,
    riskMappingTrustRoute: '/risk-mapping-governance',
    militaryConstraintsTitle: militaryConstraintsSection.title,
    militaryConstraintsIntro: militaryConstraintsSection.summary ?? '',
    militaryConstraintsHighlights: [
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
    ],
    militaryConstraintsEndpointRows,
    militaryConstraintsFieldRows,
    militaryConstraintsBoundaryRows,
    militaryConstraintsTrustRoute: MCPP_ROUTE_PATH,
    zeeApiTitle: zeeSection.title,
    zeeApiIntro:
      zeeSection.summary ??
      'ZeroGlare Evidence Engine is exposed through a read-only ZEE scaffold and a separate zeroglare analysis route. The ZEE scaffold exposes discovery, contract, explain, and audit metadata only; the zeroglare analysis route accepts structured text input through q or input and returns bounded diagnostics.',
    zeeApiEndpointRows,
    zeroglareEndpointRows,
    zeroglareFieldRows,
    zeroglareBoundaryRows,
    zeeApiTrustRoute: ZEE_ROUTE_PATH,
    inspectRoute: surface.route,
  };
}

function buildEndpointRow(contract: PolicyTermsEndpointContract): TermsPageEndpointRow {
  return {
    claimId: contract.claimId,
    operation: formatEndpointOperation(contract),
    method: contract.method,
    path: contract.path,
    input: formatEndpointInput(contract),
    evidence: formatEvidence(contract.evidence),
  };
}

function buildFieldRow(contract: PolicyTermsFieldContract): TermsPageFieldRow {
  return {
    claimId: contract.claimId,
    field: contract.fieldName,
    rule: formatFieldRule(contract),
    condition: formatFieldCondition(contract),
    evidence: formatEvidence(contract.evidence),
  };
}

function buildPlatformRuleRow(rule: PolicyTermsPlatformRule): TermsPageRuleRow {
  return {
    claimId: rule.claimId,
    rule: 'CORS origin allowlist',
    effect: 'requests outside the normalized allowed origin set are rejected',
    evidence: formatEvidence(rule.evidence),
  };
}

function buildRuntimeBoundaryRow(boundary: PolicyTermsRuntimeBoundary): TermsPageBoundaryRow {
  return {
    claimId: boundary.claimId,
    boundary: 'comparison output allowlist',
    condition: 'non-allowlisted concept pairs',
    effect: 'comparison output is blocked',
    evidence: formatEvidence(boundary.evidence),
  };
}

function buildRefusalBoundaryRow(boundary: PolicyTermsRefusalBoundary): TermsPageBoundaryRow {
  return {
    claimId: boundary.claimId,
    boundary: formatRefusalBoundary(boundary),
    condition: formatRefusalCondition(boundary),
    effect: formatRefusalEffect(boundary),
    evidence: formatEvidence(boundary.evidence),
  };
}

function requireSection(sectionOrder: readonly TermsPageSection[], sectionId: string): TermsPageSection {
  const section = sectionOrder.find((candidate) => candidate.id === sectionId);

  if (!section) {
    throw new Error(`Terms page canonical section ${sectionId} is missing.`);
  }

  return section;
}

function formatEndpointOperation(contract: PolicyTermsEndpointContract): string {
  switch (contract.operation) {
    case 'concept_discovery':
      return 'concept discovery';
    case 'concept_resolution':
      return 'concept resolution';
    case 'concept_detail':
      return 'concept detail';
    case 'feedback_index':
      return 'feedback index';
    case 'feedback_submission':
      return 'feedback submission';
    case 'feedback_export':
      return 'feedback export';
    case 'feedback_delete':
      return 'feedback delete';
  }
}

function formatEndpointInput(contract: PolicyTermsEndpointContract): string {
  if (contract.requiredQueryParam) {
    return `query: ${contract.requiredQueryParam}`;
  }

  if (contract.requiredRouteParam) {
    return `route: ${contract.requiredRouteParam}`;
  }

  if (contract.method === 'GET') {
    return 'none';
  }

  return 'request body';
}

function formatFieldRule(contract: PolicyTermsFieldContract): string {
  switch (contract.fieldContractType) {
    case 'request_field':
      return 'accepted field';
    case 'enum_value':
      return `accepted value: ${contract.allowedValue}`;
    case 'conditional_option':
      return `accepted value: ${contract.allowedValue}`;
  }
}

function formatFieldCondition(contract: PolicyTermsFieldContract): string {
  if (!contract.conditionField || !contract.conditionValue) {
    return 'no additional condition';
  }

  return `${contract.conditionField} = ${contract.conditionValue}`;
}

function formatRefusalBoundary(boundary: PolicyTermsRefusalBoundary): string {
  switch (boundary.boundaryType) {
    case 'payload_keys_outside_approved_field_set':
      return 'payload shape';
    case 'unsupported_response_type':
      return 'responseType';
    case 'invalid_feedback_type_response_type_combination':
      return 'feedbackType/responseType combination';
    case 'disallowed_candidate_ids':
      return 'candidateConceptIds';
    case 'disallowed_suggestion_ids':
      return 'suggestionConceptIds';
    case 'minimum_candidate_ids':
      return 'candidateConceptIds minimum';
  }
}

function formatRefusalCondition(boundary: PolicyTermsRefusalBoundary): string {
  if (boundary.minimumCount && boundary.conditionField && boundary.conditionValue) {
    return `${boundary.conditionField} = ${boundary.conditionValue}; minimum ${boundary.minimumCount}`;
  }

  if (boundary.relatedFields?.length) {
    return boundary.relatedFields.join(' + ');
  }

  if (boundary.conditionField && boundary.conditionValue) {
    return `${boundary.conditionField} = ${boundary.conditionValue}`;
  }

  return 'no additional condition';
}

function formatRefusalEffect(boundary: PolicyTermsRefusalBoundary): string {
  switch (boundary.boundaryType) {
    case 'payload_keys_outside_approved_field_set':
      return 'extra keys are rejected';
    case 'unsupported_response_type':
      return 'unsupported values are rejected';
    case 'invalid_feedback_type_response_type_combination':
      return 'invalid pairings are rejected';
    case 'disallowed_candidate_ids':
      return 'candidate IDs are rejected';
    case 'disallowed_suggestion_ids':
      return 'suggestion IDs are rejected';
    case 'minimum_candidate_ids':
      return 'insufficient candidate IDs are rejected';
  }
}

function formatEvidence(
  evidence: readonly { path: string; lines: string }[],
): string {
  return evidence.map((trace) => `${trace.path}:${trace.lines}`).join(' | ');
}

function formatCount(count: number, singular: string): string {
  if (count === 1) {
    return `${count} ${singular}`;
  }

  if (singular.endsWith('y') && !/[aeiou]y$/i.test(singular)) {
    return `${count} ${singular.slice(0, -1)}ies`;
  }

  return `${count} ${singular}s`;
}
