'use strict';

const {
  EMPTY_NORMALIZED_QUERY,
  LEADING_FILLER_PHRASES,
} = require('./constants');
const {
  deriveRoutingText,
  findLeadingFillerPhrase,
  normalizeQuery,
} = require('./normalizer');

const ZEROGLOARE_PIPELINE_STAGES = Object.freeze([
  'input',
  'zeroglare',
  'tokenize',
  'parse',
  'classify',
  'validate',
  'resolve_or_refuse',
]);

const ZEROGLOARE_DEFINITION = 'Zeroglare is ChatPDM\'s internal signal-discipline layer. It reduces rhetorical noise, isolates semantic signal, and prevents ambiguity from spreading into deterministic resolution.';

const ZEROGLOARE_SUPPORTING_LINE = 'Zeroglare ensures the system responds to meaning, not presentation.';

const RHETORICAL_NOISE_MARKERS = Object.freeze([
  ...LEADING_FILLER_PHRASES,
  'basically',
  'clearly',
  'frankly',
  'honestly',
  'in fact',
  'just',
  'literally',
  'obviously',
  'really',
  'simply',
  'actually',
  'to be fair',
]);

const AMBIGUITY_MARKERS = Object.freeze([
  'or',
  'either',
  'maybe',
  'perhaps',
  'unclear',
  'ambiguous',
  'vs',
  'versus',
]);

const UNSUPPORTED_BRIDGE_MARKERS = Object.freeze([
  'as if',
  'counts as',
  'equivalent to',
  'in effect',
  'in practice',
  'means',
  'same as',
  'same thing',
  'stands for',
]);

const SCOPE_PRESSURE_MARKERS = Object.freeze([
  'all cases',
  'all contexts',
  'anything',
  'complete',
  'every case',
  'every context',
  'everything',
  'for all',
  'general purpose',
  'in general',
  'whole',
]);

function canonicalizeSignalText(rawQuery) {
  return rawQuery
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function collectMarkerEvidence(signalText, markers) {
  const paddedSignalText = ` ${signalText} `;
  const evidence = [];

  for (const marker of markers) {
    const paddedMarker = ` ${marker} `;

    if (paddedSignalText.includes(paddedMarker)) {
      evidence.push(marker);
    }
  }

  return [...new Set(evidence)];
}

function buildObservation({
  code,
  label,
  message,
  severity,
  evidence,
}) {
  const detected = Array.isArray(evidence) && evidence.length > 0;

  return {
    code,
    label,
    severity,
    detected,
    evidence: detected ? evidence : [],
    message: detected ? message : null,
  };
}

function detectRhetoricalNoise(rawQuery, signalText) {
  const evidence = collectMarkerEvidence(signalText, RHETORICAL_NOISE_MARKERS);
  const fillerPhrase = findLeadingFillerPhrase(signalText);

  if (fillerPhrase && !evidence.includes(fillerPhrase)) {
    evidence.unshift(fillerPhrase);
  }

  const punctuationRun = rawQuery.match(/[!?]{2,}|\.{3,}/);
  if (punctuationRun && !evidence.includes(punctuationRun[0])) {
    evidence.push(punctuationRun[0]);
  }

  return buildObservation({
    code: 'rhetorical_noise',
    label: 'Rhetorical noise',
    severity: 'low',
    evidence,
    message: 'Zeroglare suppressed rhetorical certainty without defined support.',
  });
}

function detectAmbiguitySurface(signalText) {
  return buildObservation({
    code: 'ambiguity_surface',
    label: 'Ambiguity surface',
    severity: 'moderate',
    evidence: collectMarkerEvidence(signalText, AMBIGUITY_MARKERS),
    message: 'Zeroglare detected unresolved ambiguity.',
  });
}

function detectUnsupportedSemanticBridge(signalText) {
  return buildObservation({
    code: 'unsupported_semantic_bridge',
    label: 'Unsupported semantic bridge',
    severity: 'moderate',
    evidence: collectMarkerEvidence(signalText, UNSUPPORTED_BRIDGE_MARKERS),
    message: 'Zeroglare detected unsupported semantic bridge.',
  });
}

function detectScopePressure(signalText) {
  return buildObservation({
    code: 'scope_pressure',
    label: 'Scope pressure',
    severity: 'moderate',
    evidence: collectMarkerEvidence(signalText, SCOPE_PRESSURE_MARKERS),
    message: 'Zeroglare detected scope pressure beyond the current signal boundary.',
  });
}

function buildZeroglareDiagnostics(rawQuery) {
  if (typeof rawQuery !== 'string') {
    throw new TypeError('Expected rawQuery to be a string.');
  }

  if (rawQuery.trim() === '') {
    throw new TypeError('Expected rawQuery to be a non-empty string.');
  }

  const normalizedQuery = normalizeQuery(rawQuery);
  const routingText = deriveRoutingText(normalizedQuery);
  const signalText = canonicalizeSignalText(rawQuery);
  const observations = [
    detectRhetoricalNoise(rawQuery, signalText),
    detectAmbiguitySurface(signalText),
    detectUnsupportedSemanticBridge(signalText),
    detectScopePressure(signalText),
  ];
  const activeObservations = observations.filter((observation) => observation.detected);
  const primaryObservation = activeObservations[0] ?? null;

  return {
    layer: 'zeroglare',
    definition: ZEROGLOARE_DEFINITION,
    supporting_line: ZEROGLOARE_SUPPORTING_LINE,
    status: activeObservations.length > 0 ? 'pressure' : 'clear',
    summary: {
      state: activeObservations.length > 0 ? 'pressure' : 'clear',
      message: primaryObservation
        ? primaryObservation.message
        : 'Zeroglare found no signal-discipline pressure.',
      primary_signal: primaryObservation?.code ?? null,
      active_signals: activeObservations.map((observation) => observation.code),
    },
    pipeline_position: [...ZEROGLOARE_PIPELINE_STAGES],
    input: {
      raw_query: rawQuery,
      normalized_query: normalizedQuery,
      routing_text: routingText,
      token_count: routingText === EMPTY_NORMALIZED_QUERY ? 0 : routingText.split(' ').length,
    },
    signals: observations,
  };
}

module.exports = {
  ZEROGLOARE_DEFINITION,
  ZEROGLOARE_PIPELINE_STAGES,
  ZEROGLOARE_SUPPORTING_LINE,
  buildZeroglareDiagnostics,
};
