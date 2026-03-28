import type {
  PolicyClaim,
  PolicyCookiesTruthFact,
  PolicyCookiesTruthFlowType,
  PolicyCookiesTruthMechanism,
} from '../src/app/policies/policy-surface.types.ts';

export function buildPolicyCookiesTruth(claims: readonly PolicyClaim[]): readonly PolicyCookiesTruthFact[] {
  const cookieClaims = claims.filter((claim) => claim.policyFile === 'cookies.md');

  if (cookieClaims.length === 0) {
    return [];
  }

  const facts = cookieClaims.map((claim) => {
    const mechanism = resolveCookiesTruthMechanism(claim);
    const flowType = resolveCookiesTruthFlowType(claim, mechanism);

    const fact: PolicyCookiesTruthFact = {
      claimId: claim.id,
      flowType,
      mechanism,
      essentiality: 'essential',
      ssrRelevance: 'direct',
      browserRelevance:
        mechanism === 'cookie_header' ? 'request_origin' : 'response_target',
      transportPlacement:
        mechanism === 'cookie_header'
          ? 'browser_to_upstream_via_ssr'
          : 'upstream_to_browser_via_ssr',
      transportRole:
        mechanism === 'cookie_header' ? 'request_transport' : 'response_transport',
      browserNoteRelevance: 'direct',
      evidence: claim.traces,
    };

    validatePolicyCookiesTruthFact(claim, fact);

    return fact;
  });

  if (facts.length !== cookieClaims.length) {
    throw new Error('Cookies truth extraction must remain one-to-one with current cookies claims.');
  }

  return facts;
}

function validatePolicyCookiesTruthFact(claim: PolicyClaim, fact: PolicyCookiesTruthFact): void {
  const errors: string[] = [];

  if (claim.policyFile !== 'cookies.md') {
    errors.push(`Cookies truth fact ${fact.claimId} must come from cookies.md.`);
  }

  if (!fact.claimId) {
    errors.push('Cookies truth fact is missing claimId.');
  }

  if (fact.essentiality !== 'essential' && fact.essentiality !== 'optional') {
    errors.push(`Cookies truth fact ${fact.claimId} has invalid essentiality.`);
  }

  if (fact.ssrRelevance !== 'direct') {
    errors.push(`Cookies truth fact ${fact.claimId} must remain SSR-direct in the current scope.`);
  }

  if (fact.browserNoteRelevance !== 'direct' && fact.browserNoteRelevance !== 'not_applicable') {
    errors.push(`Cookies truth fact ${fact.claimId} has invalid browser note relevance.`);
  }

  if (fact.evidence.length === 0) {
    errors.push(`Cookies truth fact ${fact.claimId} must include evidence traces.`);
  }

  if (claim.claimClass === 'shares') {
    if (fact.flowType !== 'request_forward' && fact.flowType !== 'response_forward') {
      errors.push(
        `Cookies truth fact ${fact.claimId} must use a forward flowType for shares claims.`,
      );
    }
  }

  if (claim.claimClass === 'does_not_share') {
    if (fact.flowType !== 'request_omit' && fact.flowType !== 'response_omit') {
      errors.push(
        `Cookies truth fact ${fact.claimId} must use an omit flowType for does_not_share claims.`,
      );
    }
  }

  if (errors.length > 0) {
    throw new Error(errors.join('\n'));
  }
}

function resolveCookiesTruthMechanism(claim: PolicyClaim): PolicyCookiesTruthMechanism {
  if (/\b`?set-cookie`? headers\b/.test(claim.policySentence)) {
    return 'set_cookie_header';
  }

  if (/\b`?cookie`? headers\b/.test(claim.policySentence)) {
    return 'cookie_header';
  }

  throw new Error(`Unable to derive cookies mechanism for claim ${claim.id}.`);
}

function resolveCookiesTruthFlowType(
  claim: PolicyClaim,
  mechanism: PolicyCookiesTruthMechanism,
): PolicyCookiesTruthFlowType {
  if (claim.claimClass === 'shares') {
    return mechanism === 'cookie_header' ? 'request_forward' : 'response_forward';
  }

  if (claim.claimClass === 'does_not_share') {
    return mechanism === 'cookie_header' ? 'request_omit' : 'response_omit';
  }

  throw new Error(`Unable to derive cookies flowType for claim ${claim.id}.`);
}
