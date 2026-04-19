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
const {
  ZEROGLARE_MARKER_CODES,
  ZEROGLARE_PUBLIC_MARKER_CODES,
  getZeroGlareMarkerContractEntry,
} = require('./zeroglare-marker-contract');
const {
  orderZeroGlareActiveObservations,
  resolveZeroGlareStatus,
  selectZeroGlarePrimaryObservation,
} = require('./zeroglare-policy');

const ZEROGLOARE_PIPELINE_STAGES = Object.freeze([
  'input',
  'zeroglare',
  'tokenize',
  'parse',
  'classify',
  'validate',
  'resolve_or_refuse',
]);

const ZEROGLOARE_MARKER_TAXONOMY_VERSION = 'v1';

const ZEROGLOARE_DEFINITION = 'Zeroglare is ChatPDM\'s internal signal-discipline layer. It primarily catches instability in frame and scope, invalid semantic leaps, and forced assignment of authority or decision roles.';

const ZEROGLOARE_SUPPORTING_LINE = 'Zeroglare ensures the system responds to meaning, not presentation.';
const ZEROGLOARE_ANALYSIS_PREVIEW_LIMIT = 2_000;

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

const SCOPE_INSTABILITY_POSITIVE_MARKERS = Object.freeze([
  'without stable scope',
  'under a widened scope',
  'once reclassified',
  'after reclassification',
]);

const SCOPE_INSTABILITY_NEGATIVE_MARKERS = Object.freeze([
  'within a defined scope',
  'under a fixed scope',
  'bounded conditions',
]);

const CIRCULAR_DEPENDENCY_POSITIVE_MARKERS = Object.freeze([
  'decide each other simultaneously',
  'mutually define',
  'mutually decide',
  'circular dependency',
  'self referential',
]);

const CIRCULAR_DEPENDENCY_NEGATIVE_MARKERS = Object.freeze([
  'not circular',
  'linear relation',
  'one way only',
  'fixed direction',
]);

const RECURSIVE_FRAME_POSITIVE_MARKERS = Object.freeze([
  'recursive frame',
  'frame repeats itself',
  'frame within frame',
  'frame calls itself',
  'frame reenters itself',
]);

const RECURSIVE_FRAME_NEGATIVE_MARKERS = Object.freeze([
  'non recursive',
  'linear frame',
  'no recursion',
  'fixed frame',
  'one way only',
]);

const CONDITIONAL_FRAME_POSITIVE_MARKERS = Object.freeze([
  'holds only if',
  'remains valid only while',
  'remains defined only while',
  'survives only under fixed conditions',
  'breaks when the context shifts',
]);

const CONDITIONAL_FRAME_NEGATIVE_MARKERS = Object.freeze([
  'independent of context',
  'regardless of context',
  'unconditional',
  'fixed regardless',
  'stable regardless',
]);

const CONTRADICTION_POSITIVE_MARKERS = Object.freeze([
  'both valid and invalid',
  'valid only if it is not valid',
  'cannot be both true and false',
  'true and false at once',
  'the same conditions and not the same conditions',
  'always valid but it is also never valid',
  'always valid, but it is also never valid',
  'always valid but also never valid',
  'never valid but also always valid',
]);

const CONTRADICTION_NEGATIVE_MARKERS = Object.freeze([
  'not contradictory',
  'consistent',
  'non contradictory',
  'plainly consistent',
]);

const UNIVERSAL_SCOPE_POSITIVE_MARKERS = Object.freeze([
  'all systems',
  'all times',
  'all domains',
  'everywhere',
  'everywhere at once',
]);

const UNIVERSAL_SCOPE_NEGATIVE_MARKERS = Object.freeze([
  'specific case',
  'limited domain',
  'local context',
  'bounded domain',
  'single case',
]);

const EXCEPTION_LEAK_POSITIVE_MARKERS = Object.freeze([
  'except when',
  'except for',
  'unless',
  'with one exception',
  'all cases except',
  'every case except',
]);

const EXCEPTION_LEAK_NEGATIVE_MARKERS = Object.freeze([
  'no exception clause',
  'closed rule',
  'fully bounded',
]);

const ROLE_FORCING_POSITIVE_MARKERS = Object.freeze([
  'who decides',
  'who governs',
  'who controls',
  'who assigns',
  'who is responsible for',
]);

const ROLE_FORCING_NEGATIVE_MARKERS = Object.freeze([
  'no role assigned',
  'no role is assigned',
  'role neutral',
  'without assigning',
]);

const SELF_NEGATION_POSITIVE_MARKERS = Object.freeze([
  'denies itself',
  'refuses its own claim',
  'self negating',
  'not not',
  'cannot not',
]);

const SELF_NEGATION_NEGATIVE_MARKERS = Object.freeze([
  'self consistent',
  'stable claim',
  'non negating',
]);

const CAUSAL_BRIDGE_POSITIVE_MARKERS = Object.freeze([
  'because authority exists',
  'because the frame exists',
  'therefore obligation exists',
  'therefore truth exists',
  'leads directly to',
  'automatically creates obligation',
  'directly creates obligation',
]);

const CAUSAL_BRIDGE_NEGATIVE_MARKERS = Object.freeze([
  'no causal bridge',
  'causal link absent',
  'without causal leap',
]);

const REFERENCE_COLLAPSE_POSITIVE_MARKERS = Object.freeze([
  'defines itself',
  'explains itself',
  'refers to itself',
  'self reference',
  'reference collapse',
]);

const REFERENCE_COLLAPSE_NEGATIVE_MARKERS = Object.freeze([
  'external reference',
  'one way reference',
  'outward reference',
]);

const CONTEXT_DRIFT_POSITIVE_MARKERS = Object.freeze([
  'meaning changes with context',
  'context changes the meaning',
  'shifts with context',
  'same term means something else',
  'different context changes meaning',
]);

const CONTEXT_DRIFT_NEGATIVE_MARKERS = Object.freeze([
  'fixed meaning',
  'stable meaning',
  'same meaning throughout',
  'the meaning stays fixed',
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

function buildObservation(code, evidence, message) {
  const marker = getZeroGlareMarkerContractEntry(code);

  if (!marker) {
    throw new Error(`Unknown Zeroglare marker code: ${code}`);
  }

  const detected = Array.isArray(evidence) && evidence.length > 0;

  return {
    code: marker.code,
    label: marker.label,
    severity: marker.severity,
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

  return buildObservation(
    'rhetorical_noise',
    evidence,
    'Zeroglare suppressed rhetorical certainty without defined support.',
  );
}

function detectAmbiguitySurface(signalText) {
  return buildObservation(
    'ambiguity_surface',
    collectMarkerEvidence(signalText, AMBIGUITY_MARKERS),
    'Zeroglare detected unresolved ambiguity.',
  );
}

function detectUnsupportedSemanticBridge(signalText) {
  return buildObservation(
    'unsupported_semantic_bridge',
    collectMarkerEvidence(signalText, UNSUPPORTED_BRIDGE_MARKERS),
    'Zeroglare detected unsupported semantic bridge.',
  );
}

function detectScopePressure(signalText) {
  return buildObservation(
    'scope_pressure',
    collectMarkerEvidence(signalText, SCOPE_PRESSURE_MARKERS),
    'Zeroglare detected scope pressure beyond the current signal boundary.',
  );
}

function detectScopeInstabilityPressure(signalText) {
  const positiveEvidence = collectMarkerEvidence(signalText, SCOPE_INSTABILITY_POSITIVE_MARKERS);
  const negativeEvidence = collectMarkerEvidence(signalText, SCOPE_INSTABILITY_NEGATIVE_MARKERS);

  return buildObservation(
    'scope_instability_pressure',
    negativeEvidence.length > 0 ? [] : positiveEvidence,
    'Zeroglare detected scope instability pressure.',
  );
}

function detectCircularDependencyPressure(signalText) {
  const positiveEvidence = collectMarkerEvidence(signalText, CIRCULAR_DEPENDENCY_POSITIVE_MARKERS);
  const negativeEvidence = collectMarkerEvidence(signalText, CIRCULAR_DEPENDENCY_NEGATIVE_MARKERS);

  return buildObservation(
    'circular_dependency_pressure',
    negativeEvidence.length > 0 ? [] : positiveEvidence,
    'Zeroglare detected circular dependency pressure.',
  );
}

function detectRecursiveFramePressure(signalText) {
  const positiveEvidence = collectMarkerEvidence(signalText, RECURSIVE_FRAME_POSITIVE_MARKERS);
  const negativeEvidence = collectMarkerEvidence(signalText, RECURSIVE_FRAME_NEGATIVE_MARKERS);

  return buildObservation(
    'recursive_frame_pressure',
    negativeEvidence.length > 0 ? [] : positiveEvidence,
    'Zeroglare detected recursive frame pressure.',
  );
}

function detectConditionalFrameFragility(signalText) {
  const positiveEvidence = collectMarkerEvidence(signalText, CONDITIONAL_FRAME_POSITIVE_MARKERS);
  const negativeEvidence = collectMarkerEvidence(signalText, CONDITIONAL_FRAME_NEGATIVE_MARKERS);

  return buildObservation(
    'conditional_frame_fragility',
    negativeEvidence.length > 0 ? [] : positiveEvidence,
    'Zeroglare detected conditional frame fragility.',
  );
}

function detectContradictionPressure(signalText) {
  const positiveEvidence = collectMarkerEvidence(signalText, CONTRADICTION_POSITIVE_MARKERS);
  const negativeEvidence = collectMarkerEvidence(signalText, CONTRADICTION_NEGATIVE_MARKERS);

  return buildObservation(
    'contradiction_pressure',
    negativeEvidence.length > 0 ? [] : positiveEvidence,
    'Zeroglare detected contradiction pressure.',
  );
}

function detectUniversalScopePressure(signalText) {
  const positiveEvidence = collectMarkerEvidence(signalText, UNIVERSAL_SCOPE_POSITIVE_MARKERS);
  const negativeEvidence = collectMarkerEvidence(signalText, UNIVERSAL_SCOPE_NEGATIVE_MARKERS);

  return buildObservation(
    'universal_scope_pressure',
    negativeEvidence.length > 0 ? [] : positiveEvidence,
    'Zeroglare detected universal scope pressure.',
  );
}

function detectExceptionLeakPressure(signalText) {
  const positiveEvidence = collectMarkerEvidence(signalText, EXCEPTION_LEAK_POSITIVE_MARKERS);
  const negativeEvidence = collectMarkerEvidence(signalText, EXCEPTION_LEAK_NEGATIVE_MARKERS);

  return buildObservation(
    'exception_leak_pressure',
    negativeEvidence.length > 0 ? [] : positiveEvidence,
    'Zeroglare detected exception leak pressure.',
  );
}

function detectRoleForcingPressure(signalText) {
  const positiveEvidence = collectMarkerEvidence(signalText, ROLE_FORCING_POSITIVE_MARKERS);
  const negativeEvidence = collectMarkerEvidence(signalText, ROLE_FORCING_NEGATIVE_MARKERS);

  return buildObservation(
    'role_forcing_pressure',
    negativeEvidence.length > 0 ? [] : positiveEvidence,
    'Zeroglare detected role forcing pressure.',
  );
}

function detectSelfNegationPressure(signalText) {
  const positiveEvidence = collectMarkerEvidence(signalText, SELF_NEGATION_POSITIVE_MARKERS);
  const negativeEvidence = collectMarkerEvidence(signalText, SELF_NEGATION_NEGATIVE_MARKERS);

  return buildObservation(
    'self_negation_pressure',
    negativeEvidence.length > 0 ? [] : positiveEvidence,
    'Zeroglare detected self negation pressure.',
  );
}

function detectCausalBridgePressure(signalText) {
  const positiveEvidence = collectMarkerEvidence(signalText, CAUSAL_BRIDGE_POSITIVE_MARKERS);
  const negativeEvidence = collectMarkerEvidence(signalText, CAUSAL_BRIDGE_NEGATIVE_MARKERS);

  return buildObservation(
    'causal_bridge_pressure',
    negativeEvidence.length > 0 ? [] : positiveEvidence,
    'Zeroglare detected causal bridge pressure.',
  );
}

function detectReferenceCollapsePressure(signalText) {
  const positiveEvidence = collectMarkerEvidence(signalText, REFERENCE_COLLAPSE_POSITIVE_MARKERS);
  const negativeEvidence = collectMarkerEvidence(signalText, REFERENCE_COLLAPSE_NEGATIVE_MARKERS);

  return buildObservation(
    'reference_collapse_pressure',
    negativeEvidence.length > 0 ? [] : positiveEvidence,
    'Zeroglare detected reference collapse pressure.',
  );
}

function detectContextDriftPressure(signalText) {
  const positiveEvidence = collectMarkerEvidence(signalText, CONTEXT_DRIFT_POSITIVE_MARKERS);
  const negativeEvidence = collectMarkerEvidence(signalText, CONTEXT_DRIFT_NEGATIVE_MARKERS);

  return buildObservation(
    'context_drift_pressure',
    negativeEvidence.length > 0 ? [] : positiveEvidence,
    'Zeroglare detected context drift pressure.',
  );
}

function buildZeroglareDiagnostics(rawQuery) {
  if (typeof rawQuery !== 'string') {
    throw new TypeError('Expected rawQuery to be a string.');
  }

  const normalizedQuery = normalizeQuery(rawQuery);
  const routingText = deriveRoutingText(normalizedQuery);
  const signalText = canonicalizeSignalText(rawQuery);
  const observations = [
    detectRhetoricalNoise(rawQuery, signalText),
    detectAmbiguitySurface(signalText),
    detectUnsupportedSemanticBridge(signalText),
    detectScopePressure(signalText),
    detectScopeInstabilityPressure(signalText),
    detectCircularDependencyPressure(signalText),
    detectRecursiveFramePressure(signalText),
    detectConditionalFrameFragility(signalText),
    detectContradictionPressure(signalText),
    detectUniversalScopePressure(signalText),
    detectExceptionLeakPressure(signalText),
    detectRoleForcingPressure(signalText),
    detectSelfNegationPressure(signalText),
    detectCausalBridgePressure(signalText),
    detectReferenceCollapsePressure(signalText),
    detectContextDriftPressure(signalText),
  ];
  const activeObservations = orderZeroGlareActiveObservations(observations);
  const primaryObservation = selectZeroGlarePrimaryObservation(activeObservations);

  return {
    layer: 'zeroglare',
    taxonomy_version: ZEROGLOARE_MARKER_TAXONOMY_VERSION,
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

function buildZeroglareAnalysis(rawQuery) {
  if (typeof rawQuery !== 'string') {
    throw new TypeError('Expected rawQuery to be a string.');
  }

  const normalizedQuery = normalizeQuery(rawQuery);
  const signalText = canonicalizeSignalText(rawQuery);
  const observations = [
    detectRhetoricalNoise(rawQuery, signalText),
    detectAmbiguitySurface(signalText),
    detectUnsupportedSemanticBridge(signalText),
    detectScopePressure(signalText),
    detectScopeInstabilityPressure(signalText),
    detectCircularDependencyPressure(signalText),
    detectRecursiveFramePressure(signalText),
    detectConditionalFrameFragility(signalText),
    detectContradictionPressure(signalText),
    detectUniversalScopePressure(signalText),
    detectExceptionLeakPressure(signalText),
    detectRoleForcingPressure(signalText),
    detectSelfNegationPressure(signalText),
    detectCausalBridgePressure(signalText),
    detectReferenceCollapsePressure(signalText),
    detectContextDriftPressure(signalText),
  ];
  const activeObservations = orderZeroGlareActiveObservations(observations);
  const markerCount = activeObservations.length;
  const status = resolveZeroGlareStatus(markerCount);
  const normalizedInput = normalizedQuery === EMPTY_NORMALIZED_QUERY ? '' : normalizedQuery;
  const normalizedInputLength = normalizedInput.length;

  return {
    resource: 'zeroglare',
    taxonomy_version: ZEROGLOARE_MARKER_TAXONOMY_VERSION,
    status,
    summary: {
      state: status,
      clear_count: status === 'clear' ? 1 : 0,
      pressure_count: status === 'pressure' ? markerCount : 0,
      fail_count: status === 'fail' ? markerCount : 0,
      marker_count: markerCount,
    },
    normalized_input_preview: normalizedInputLength > 0
      ? normalizedInput.slice(0, ZEROGLOARE_ANALYSIS_PREVIEW_LIMIT)
      : null,
    normalized_input_length: normalizedInputLength,
    normalized_input_truncated: normalizedInputLength > ZEROGLOARE_ANALYSIS_PREVIEW_LIMIT,
    markers: activeObservations.map((observation) => observation.code),
    signals: observations.map((observation) => ({
      code: observation.code,
      label: observation.label,
      severity: observation.severity,
      detected: observation.detected,
    })),
    pipeline_position: [...ZEROGLOARE_PIPELINE_STAGES],
  };
}

module.exports = {
  ZEROGLOARE_ANALYSIS_PREVIEW_LIMIT,
  ZEROGLOARE_DEFINITION,
  ZEROGLARE_MARKER_CODES,
  ZEROGLARE_PUBLIC_MARKER_CODES,
  ZEROGLOARE_MARKER_TAXONOMY_VERSION,
  ZEROGLOARE_PIPELINE_STAGES,
  ZEROGLOARE_SUPPORTING_LINE,
  buildZeroglareAnalysis,
  buildZeroglareDiagnostics,
};
