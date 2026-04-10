import type {
  PolicyTermsEndpointContract,
  PolicyTermsFieldContract,
  PolicyTermsPlatformRule,
  PolicyTermsRefusalBoundary,
  PolicyTermsRuntimeBoundary,
  PolicySurfaceDefinition,
} from '../../policies/policy-surface.types';

export type TermsPageSectionGroupId =
  | 'overview'
  | 'concepts'
  | 'feedback'
  | 'risk-mapping-governance'
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
          'This page models the public API as a scoped runtime section plus separate Risk Mapping Governance and ZEE surfaces. The hero counts are scoped to the runtime section only.',
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
          'Risk Mapping Governance is exposed separately as a bounded API surface. The current public route resolves only entity, timeHorizon, scenarioType, domain, scope, and evidenceSetVersion. queryText is not forwarded by the route handler.',
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
      {
        id: 'zee-api',
        groupId: 'support-notes',
        groupLabel: 'Support / Notes',
        sectionLabel: 'ZeroGlare Evidence Engine API',
        title: 'ZeroGlare Evidence Engine API',
        summary:
          'ZEE is exposed separately as a bounded read-only contract surface. These endpoints exist for inspectability and contract framing only. They do not perform live evidence analysis and are not part of ChatPDM runtime resolution.',
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
  riskMappingTrustRoute: string;
  zeeApiTitle: string;
  zeeApiIntro: string;
  zeeApiEndpointRows: readonly TermsPageEndpointRow[];
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
  const zeeSection = requireSection(sectionOrder, 'zee-api');
  const { endpointContracts, fieldContracts, platformRules, runtimeBoundaries, refusalBoundaries } =
    surface.termsTruth;
  const riskMappingEndpointRows = [
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
      rule: 'accepted field',
      condition: 'authoritative evidence-pack lookup key',
      evidence: 'backend/src/modules/risk-mapping/contracts/riskMapQueryContract.js',
    },
  ] satisfies readonly TermsPageFieldRow[];

  const zeeApiEndpointRows = [
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
    riskMappingIntro: riskMappingSection.summary ?? '',
    riskMappingEndpointRows,
    riskMappingFieldRows,
    riskMappingTrustRoute: '/risk-mapping-governance',
    zeeApiTitle: zeeSection.title,
    zeeApiIntro: zeeSection.summary ?? '',
    zeeApiEndpointRows,
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
