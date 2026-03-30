import type {
  PolicyTermsEndpointContract,
  PolicyTermsFieldContract,
  PolicyTermsPlatformRule,
  PolicyTermsRefusalBoundary,
  PolicyTermsRuntimeBoundary,
  PolicySurfaceDefinition,
} from '../../policies/policy-surface.types';

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
  title: string;
  intro: string;
  summaryLine: string;
  badges: readonly TermsPageBadge[];
  endpointRows: readonly TermsPageEndpointRow[];
  requestFieldRows: readonly TermsPageFieldRow[];
  acceptedValueRows: readonly TermsPageFieldRow[];
  platformRuleRows: readonly TermsPageRuleRow[];
  runtimeBoundaryRows: readonly TermsPageBoundaryRow[];
  refusalBoundaryRows: readonly TermsPageBoundaryRow[];
  inspectRoute: string;
}

export function buildTermsPageViewModel(surface: PolicySurfaceDefinition): TermsPageViewModel {
  if (surface.key !== 'terms') {
    throw new Error(`Terms page view model requires the terms surface, received ${surface.key}.`);
  }

  if (!surface.termsTruth) {
    throw new Error('Terms page requires typed terms truth rows before UI rendering can proceed.');
  }

  const { endpointContracts, fieldContracts, platformRules, runtimeBoundaries, refusalBoundaries } =
    surface.termsTruth;

  return {
    title: 'Terms of Service',
    intro:
      'Current terms behavior is rendered here as a modeled runtime surface: public endpoints, accepted feedback fields and values, platform rules, and mapped runtime and refusal boundaries.',
    summaryLine: `Current modeled scope shows ${endpointContracts.length} public endpoints, ${fieldContracts.length} field rules, ${platformRules.length} platform rule, ${runtimeBoundaries.length} runtime boundary, and ${refusalBoundaries.length} refusal boundaries.`,
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
    inspectRoute: surface.route,
  };
}

function buildEndpointRow(contract: PolicyTermsEndpointContract): TermsPageEndpointRow {
  return {
    claimId: contract.claimId,
    operation: formatEndpointOperation(contract),
    method: contract.method,
    path: contract.path,
    input: contract.requiredQueryParam ? `query: ${contract.requiredQueryParam}` : 'request body',
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

function formatEndpointOperation(contract: PolicyTermsEndpointContract): string {
  switch (contract.operation) {
    case 'concept_resolution':
      return 'concept resolution';
    case 'feedback_submission':
      return 'feedback submission';
  }
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
