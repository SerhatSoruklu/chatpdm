import type {
  PolicyCookiesTruthFact,
  PolicySurfaceDefinition,
} from '../../policies/policy-surface.types';

export interface CookiesPageBadge {
  label: string;
  value: string;
}

export interface CookiesPageTransportRow {
  claimId: string;
  mechanism: string;
  behavior: string;
  essentiality: string;
  ssr: string;
  browser: string;
  evidence: string;
}

export interface CookiesPageViewModel {
  title: string;
  intro: string;
  badges: readonly CookiesPageBadge[];
  requestRows: readonly CookiesPageTransportRow[];
  responseRows: readonly CookiesPageTransportRow[];
  browserNotes: readonly string[];
  inspectRoute: string;
}

export function buildCookiesPageViewModel(surface: PolicySurfaceDefinition): CookiesPageViewModel {
  if (surface.key !== 'cookies') {
    throw new Error(`Cookies page view model requires the cookies surface, received ${surface.key}.`);
  }

  if (!surface.cookiesTruth || surface.cookiesTruth.length === 0) {
    throw new Error('Cookies page requires typed cookies truth rows before UI rendering can proceed.');
  }

  const badges: CookiesPageBadge[] = [
    {
      label: 'Coverage',
      value: formatEssentialitySummary(surface.cookiesTruth),
    },
    {
      label: 'SSR relevance',
      value: formatSsrSummary(surface.cookiesTruth),
    },
    {
      label: 'Mechanisms',
      value: formatMechanismSummary(surface.cookiesTruth),
    },
    {
      label: 'Browser context',
      value: formatBrowserSummary(surface.cookiesTruth),
    },
  ];

  return {
    title: 'Cookie Policy',
    intro:
      'Current cookie behavior is limited to essential internal SSR transport for cookie headers and set-cookie headers. This page summarizes the typed request and response flows and points to the raw inspect surface.',
    badges,
    requestRows: surface.cookiesTruth
      .filter((fact) => fact.transportRole === 'request_transport')
      .map((fact) => buildTransportRow(fact)),
    responseRows: surface.cookiesTruth
      .filter((fact) => fact.transportRole === 'response_transport')
      .map((fact) => buildTransportRow(fact)),
    browserNotes: buildBrowserNotes(surface.cookiesTruth),
    inspectRoute: surface.route,
  };
}

function buildTransportRow(fact: PolicyCookiesTruthFact): CookiesPageTransportRow {
  return {
    claimId: fact.claimId,
    mechanism: formatMechanism(fact),
    behavior: formatBehavior(fact),
    essentiality: formatEssentiality(fact),
    ssr: formatSsrRelevance(fact),
    browser: formatBrowserRelevance(fact),
    evidence: fact.evidence.map((trace) => `${trace.path}:${trace.lines}`).join(' | '),
  };
}

function buildBrowserNotes(facts: readonly PolicyCookiesTruthFact[]): readonly string[] {
  const notes = new Set<string>();

  facts.forEach((fact) => {
    if (fact.browserNoteRelevance !== 'direct') {
      return;
    }

    if (fact.browserRelevance === 'request_origin') {
      notes.add('Incoming cookie header handling is modeled at the browser request origin.');
    }

    if (fact.browserRelevance === 'response_target') {
      notes.add('Upstream set-cookie handling is modeled at the browser response target.');
    }
  });

  return Array.from(notes);
}

function formatBehavior(fact: PolicyCookiesTruthFact): string {
  switch (fact.flowType) {
    case 'request_forward':
      return 'forwarded when present';
    case 'request_omit':
      return 'not forwarded when omitted';
    case 'response_forward':
      return 'returned when present';
    case 'response_omit':
      return 'not returned when omitted';
  }
}

function formatMechanism(fact: PolicyCookiesTruthFact): string {
  switch (fact.mechanism) {
    case 'cookie_header':
      return 'cookie header';
    case 'set_cookie_header':
      return 'set-cookie header';
  }
}

function formatEssentiality(fact: PolicyCookiesTruthFact): string {
  switch (fact.essentiality) {
    case 'essential':
      return 'essential';
    case 'optional':
      return 'optional';
  }
}

function formatSsrRelevance(fact: PolicyCookiesTruthFact): string {
  switch (fact.ssrRelevance) {
    case 'direct':
      return 'direct SSR';
    case 'not_applicable':
      return 'not applicable';
  }
}

function formatBrowserRelevance(fact: PolicyCookiesTruthFact): string {
  switch (fact.browserRelevance) {
    case 'request_origin':
      return 'request origin';
    case 'response_target':
      return 'response target';
    case 'not_applicable':
      return 'not applicable';
  }
}

function formatEssentialitySummary(facts: readonly PolicyCookiesTruthFact[]): string {
  const values = Array.from(new Set(facts.map((fact) => fact.essentiality)));

  if (values.length === 1) {
    return values[0] === 'essential'
      ? 'essential within the current configured scope'
      : 'optional within the current configured scope';
  }

  return values.join(' + ');
}

function formatSsrSummary(facts: readonly PolicyCookiesTruthFact[]): string {
  const values = Array.from(new Set(facts.map((fact) => fact.ssrRelevance)));
  return values.join(' + ');
}

function formatMechanismSummary(facts: readonly PolicyCookiesTruthFact[]): string {
  const values = Array.from(new Set(facts.map((fact) => formatMechanism(fact))));
  return values.join(' | ');
}

function formatBrowserSummary(facts: readonly PolicyCookiesTruthFact[]): string {
  const values = Array.from(new Set(facts.map((fact) => formatBrowserRelevance(fact))));
  return values.join(' | ');
}
