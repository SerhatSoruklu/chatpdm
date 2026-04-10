import type {
  PolicyClaim,
  PolicyTermsEndpointContract,
  PolicyTermsFieldContract,
  PolicyTermsPlatformRule,
  PolicyTermsRefusalBoundary,
  PolicyTermsRuntimeBoundary,
  PolicyTermsTruth,
} from '../src/app/policies/policy-surface.types.ts';

const endpointPattern =
  /^The platform allows (?<operation>.+) through `(?<method>GET|POST|DELETE) (?<path>\/[^`]+)`\.$/;
const feedbackFieldPattern = /^The platform allows feedback field `(?<fieldName>[^`]+)`\.$/;
const responseTypePattern = /^The platform allows feedback response type `(?<value>[^`]+)`\.$/;
const feedbackOptionPattern =
  /^The platform allows feedback option `(?<value>[^`]+)` for `(?<responseType>[^`]+)`\.$/;

const ENDPOINT_CONTRACT_ORDER: ReadonlyMap<string, number> = new Map([
  ['GET /api/v1/concepts/resolve', 0],
  ['POST /api/v1/concepts/resolve', 1],
  ['GET /api/v1/concepts/:conceptId', 2],
  ['GET /api/v1/feedback', 3],
  ['POST /api/v1/feedback', 4],
  ['GET /api/v1/feedback/session/:sessionId/export', 5],
  ['DELETE /api/v1/feedback/session/:sessionId', 6],
]);

export function buildPolicyTermsTruth(claims: readonly PolicyClaim[]): PolicyTermsTruth | undefined {
  const termsClaims = claims.filter((claim) => claim.policyFile === 'terms.md');

  if (termsClaims.length === 0) {
    return undefined;
  }

  const endpointContracts: PolicyTermsEndpointContract[] = [];
  const fieldContracts: PolicyTermsFieldContract[] = [];
  const platformRules: PolicyTermsPlatformRule[] = [];
  const runtimeBoundaries: PolicyTermsRuntimeBoundary[] = [];
  const refusalBoundaries: PolicyTermsRefusalBoundary[] = [];

  for (const claim of termsClaims) {
    const endpointContract = resolveEndpointContract(claim);

    if (endpointContract) {
      endpointContracts.push(endpointContract);
      continue;
    }

    const fieldContract = resolveFieldContract(claim);

    if (fieldContract) {
      fieldContracts.push(fieldContract);
      continue;
    }

    const platformRule = resolvePlatformRule(claim);

    if (platformRule) {
      platformRules.push(platformRule);
      continue;
    }

    const runtimeBoundary = resolveRuntimeBoundary(claim);

    if (runtimeBoundary) {
      runtimeBoundaries.push(runtimeBoundary);
      continue;
    }

    const refusalBoundary = resolveRefusalBoundary(claim);

    if (refusalBoundary) {
      refusalBoundaries.push(refusalBoundary);
      continue;
    }

    throw new Error(`Terms truth extraction could not classify claim ${claim.id}.`);
  }

  endpointContracts.sort((left, right) => {
    const leftOrder = getEndpointContractOrder(left);
    const rightOrder = getEndpointContractOrder(right);

    if (leftOrder !== rightOrder) {
      return leftOrder - rightOrder;
    }

    const methodComparison = left.method.localeCompare(right.method);
    if (methodComparison !== 0) {
      return methodComparison;
    }

    return left.claimId.localeCompare(right.claimId);
  });

  const classifiedCount =
    endpointContracts.length +
    fieldContracts.length +
    platformRules.length +
    runtimeBoundaries.length +
    refusalBoundaries.length;

  if (classifiedCount !== termsClaims.length) {
    throw new Error(
      `Terms truth extraction must remain one-to-one with current terms claims. Classified ${classifiedCount} of ${termsClaims.length}.`,
    );
  }

  return {
    endpointContracts,
    fieldContracts,
    platformRules,
    runtimeBoundaries,
    refusalBoundaries,
  };
}

function resolveEndpointContract(claim: PolicyClaim): PolicyTermsEndpointContract | null {
  if (claim.claimClass !== 'allows') {
    return null;
  }

  const match = claim.policySentence.match(endpointPattern);

  if (!match?.groups) {
    return null;
  }

  const operation =
    match.groups.operation === 'concept resolution'
      ? 'concept_resolution'
      : match.groups.operation === 'concept detail'
        ? 'concept_detail'
        : match.groups.operation === 'feedback index'
          ? 'feedback_index'
          : match.groups.operation === 'feedback submission'
            ? 'feedback_submission'
            : match.groups.operation === 'feedback export'
              ? 'feedback_export'
              : match.groups.operation === 'feedback delete'
                ? 'feedback_delete'
                : null;

  if (!operation) {
    throw new Error(`Unable to derive endpoint operation for claim ${claim.id}.`);
  }

  const [path, query] = match.groups.path.split('?');
  const queryParam = query?.split('=')[0];
  const routeParam = path.match(/:(?<routeParam>[A-Za-z0-9_]+)/)?.groups?.routeParam;

  return {
    claimId: claim.id,
    operation,
    method: match.groups.method as PolicyTermsEndpointContract['method'],
    path,
    requiredQueryParam: queryParam,
    requiredRouteParam: routeParam,
    evidence: claim.traces,
  };
}

function getEndpointContractOrder(contract: PolicyTermsEndpointContract): number {
  const key = `${contract.method} ${contract.path}`;
  return ENDPOINT_CONTRACT_ORDER.get(key) ?? 1000;
}

function resolveFieldContract(claim: PolicyClaim): PolicyTermsFieldContract | null {
  if (claim.claimClass !== 'allows') {
    return null;
  }

  const fieldMatch = claim.policySentence.match(feedbackFieldPattern);

  if (fieldMatch?.groups) {
    return {
      claimId: claim.id,
      fieldContractType: 'request_field',
      scope: 'feedback_submission',
      fieldName: fieldMatch.groups.fieldName,
      evidence: claim.traces,
    };
  }

  const responseTypeMatch = claim.policySentence.match(responseTypePattern);

  if (responseTypeMatch?.groups) {
    return {
      claimId: claim.id,
      fieldContractType: 'enum_value',
      scope: 'feedback_submission',
      fieldName: 'responseType',
      allowedValue: responseTypeMatch.groups.value,
      evidence: claim.traces,
    };
  }

  const feedbackOptionMatch = claim.policySentence.match(feedbackOptionPattern);

  if (feedbackOptionMatch?.groups) {
    return {
      claimId: claim.id,
      fieldContractType: 'conditional_option',
      scope: 'feedback_submission',
      fieldName: 'feedbackType',
      allowedValue: feedbackOptionMatch.groups.value,
      conditionField: 'responseType',
      conditionValue: feedbackOptionMatch.groups.responseType,
      evidence: claim.traces,
    };
  }

  return null;
}

function resolvePlatformRule(claim: PolicyClaim): PolicyTermsPlatformRule | null {
  if (
    claim.policySentence !==
    'The platform does not allow CORS requests from origins outside the normalized allowed origin set.'
  ) {
    return null;
  }

  return {
    claimId: claim.id,
    ruleType: 'cors_origin_allowlist',
    subject: 'cross_origin_request',
    effect: 'reject_outside_normalized_allowed_origin_set',
    evidence: claim.traces,
  };
}

function resolveRuntimeBoundary(claim: PolicyClaim): PolicyTermsRuntimeBoundary | null {
  if (
    claim.policySentence !==
    'The platform does not allow comparison output for non-allowlisted concept pairs.'
  ) {
    return null;
  }

  return {
    claimId: claim.id,
    boundaryType: 'comparison_output_allowlist',
    subject: 'comparison_output',
    effect: 'blocked',
    condition: 'non_allowlisted_concept_pairs',
    evidence: claim.traces,
  };
}

function resolveRefusalBoundary(claim: PolicyClaim): PolicyTermsRefusalBoundary | null {
  switch (claim.policySentence) {
    case 'The platform does not allow feedback payload keys outside the approved field set.':
      return {
        claimId: claim.id,
        boundaryType: 'payload_keys_outside_approved_field_set',
        scope: 'feedback_submission',
        fieldName: 'payload',
        evidence: claim.traces,
      };
    case 'The platform does not allow unsupported `responseType` values.':
      return {
        claimId: claim.id,
        boundaryType: 'unsupported_response_type',
        scope: 'feedback_submission',
        fieldName: 'responseType',
        evidence: claim.traces,
      };
    case 'The platform does not allow invalid `feedbackType` and `responseType` combinations.':
      return {
        claimId: claim.id,
        boundaryType: 'invalid_feedback_type_response_type_combination',
        scope: 'feedback_submission',
        relatedFields: ['feedbackType', 'responseType'],
        evidence: claim.traces,
      };
    case 'The platform does not allow candidate concept IDs on `concept_match` feedback.':
      return {
        claimId: claim.id,
        boundaryType: 'disallowed_candidate_ids',
        scope: 'feedback_submission',
        fieldName: 'candidateConceptIds',
        conditionField: 'responseType',
        conditionValue: 'concept_match',
        evidence: claim.traces,
      };
    case 'The platform does not allow suggestion concept IDs on `concept_match` feedback.':
      return {
        claimId: claim.id,
        boundaryType: 'disallowed_suggestion_ids',
        scope: 'feedback_submission',
        fieldName: 'suggestionConceptIds',
        conditionField: 'responseType',
        conditionValue: 'concept_match',
        evidence: claim.traces,
      };
    case 'The platform does not allow `ambiguous_match` feedback with fewer than two candidate concept IDs.':
      return {
        claimId: claim.id,
        boundaryType: 'minimum_candidate_ids',
        scope: 'feedback_submission',
        fieldName: 'candidateConceptIds',
        conditionField: 'responseType',
        conditionValue: 'ambiguous_match',
        minimumCount: 2,
        evidence: claim.traces,
      };
    case 'The platform does not allow suggestion concept IDs on `ambiguous_match` feedback.':
      return {
        claimId: claim.id,
        boundaryType: 'disallowed_suggestion_ids',
        scope: 'feedback_submission',
        fieldName: 'suggestionConceptIds',
        conditionField: 'responseType',
        conditionValue: 'ambiguous_match',
        evidence: claim.traces,
      };
    case 'The platform does not allow candidate concept IDs on `no_exact_match` feedback.':
      return {
        claimId: claim.id,
        boundaryType: 'disallowed_candidate_ids',
        scope: 'feedback_submission',
        fieldName: 'candidateConceptIds',
        conditionField: 'responseType',
        conditionValue: 'no_exact_match',
        evidence: claim.traces,
      };
    default:
      return null;
  }
}
