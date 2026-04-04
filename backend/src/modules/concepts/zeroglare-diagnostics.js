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
  evaluateZeroglareRefusal,
} = require('./zeroglare-refusal-contracts');
const {
  evaluateZeroglareConversationalGuidance,
} = require('./zeroglare-conversational-guidance');

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

const ZEROGLARE_MARKER_CODES = Object.freeze([
  'rhetorical_noise',
  'ambiguity_surface',
  'unsupported_semantic_bridge',
  'scope_pressure',
  'scope_instability_pressure',
  'circular_dependency_pressure',
  'recursive_frame_pressure',
  'conditional_frame_fragility',
  'contradiction_pressure',
  'universal_scope_pressure',
  'exception_leak_pressure',
  'role_forcing_pressure',
  'self_negation_pressure',
  'causal_bridge_pressure',
  'reference_collapse_pressure',
  'context_drift_pressure',
]);

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

function detectScopeInstabilityPressure(signalText) {
  const positiveEvidence = collectMarkerEvidence(signalText, SCOPE_INSTABILITY_POSITIVE_MARKERS);
  const negativeEvidence = collectMarkerEvidence(signalText, SCOPE_INSTABILITY_NEGATIVE_MARKERS);

  return buildObservation({
    code: 'scope_instability_pressure',
    label: 'Scope instability pressure',
    severity: 'moderate',
    evidence: negativeEvidence.length > 0 ? [] : positiveEvidence,
    message: 'Zeroglare detected scope instability pressure.',
  });
}

function detectCircularDependencyPressure(signalText) {
  const positiveEvidence = collectMarkerEvidence(signalText, CIRCULAR_DEPENDENCY_POSITIVE_MARKERS);
  const negativeEvidence = collectMarkerEvidence(signalText, CIRCULAR_DEPENDENCY_NEGATIVE_MARKERS);

  return buildObservation({
    code: 'circular_dependency_pressure',
    label: 'Circular dependency pressure',
    severity: 'moderate',
    evidence: negativeEvidence.length > 0 ? [] : positiveEvidence,
    message: 'Zeroglare detected circular dependency pressure.',
  });
}

function detectRecursiveFramePressure(signalText) {
  const positiveEvidence = collectMarkerEvidence(signalText, RECURSIVE_FRAME_POSITIVE_MARKERS);
  const negativeEvidence = collectMarkerEvidence(signalText, RECURSIVE_FRAME_NEGATIVE_MARKERS);

  return buildObservation({
    code: 'recursive_frame_pressure',
    label: 'Recursive frame pressure',
    severity: 'moderate',
    evidence: negativeEvidence.length > 0 ? [] : positiveEvidence,
    message: 'Zeroglare detected recursive frame pressure.',
  });
}

function detectConditionalFrameFragility(signalText) {
  const positiveEvidence = collectMarkerEvidence(signalText, CONDITIONAL_FRAME_POSITIVE_MARKERS);
  const negativeEvidence = collectMarkerEvidence(signalText, CONDITIONAL_FRAME_NEGATIVE_MARKERS);

  return buildObservation({
    code: 'conditional_frame_fragility',
    label: 'Conditional frame fragility',
    severity: 'moderate',
    evidence: negativeEvidence.length > 0 ? [] : positiveEvidence,
    message: 'Zeroglare detected conditional frame fragility.',
  });
}

function detectContradictionPressure(signalText) {
  const positiveEvidence = collectMarkerEvidence(signalText, CONTRADICTION_POSITIVE_MARKERS);
  const negativeEvidence = collectMarkerEvidence(signalText, CONTRADICTION_NEGATIVE_MARKERS);

  return buildObservation({
    code: 'contradiction_pressure',
    label: 'Contradiction pressure',
    severity: 'moderate',
    evidence: negativeEvidence.length > 0 ? [] : positiveEvidence,
    message: 'Zeroglare detected contradiction pressure.',
  });
}

function detectUniversalScopePressure(signalText) {
  const positiveEvidence = collectMarkerEvidence(signalText, UNIVERSAL_SCOPE_POSITIVE_MARKERS);
  const negativeEvidence = collectMarkerEvidence(signalText, UNIVERSAL_SCOPE_NEGATIVE_MARKERS);

  return buildObservation({
    code: 'universal_scope_pressure',
    label: 'Universal scope pressure',
    severity: 'moderate',
    evidence: negativeEvidence.length > 0 ? [] : positiveEvidence,
    message: 'Zeroglare detected universal scope pressure.',
  });
}

function detectExceptionLeakPressure(signalText) {
  const positiveEvidence = collectMarkerEvidence(signalText, EXCEPTION_LEAK_POSITIVE_MARKERS);
  const negativeEvidence = collectMarkerEvidence(signalText, EXCEPTION_LEAK_NEGATIVE_MARKERS);

  return buildObservation({
    code: 'exception_leak_pressure',
    label: 'Exception leak pressure',
    severity: 'moderate',
    evidence: negativeEvidence.length > 0 ? [] : positiveEvidence,
    message: 'Zeroglare detected exception leak pressure.',
  });
}

function detectRoleForcingPressure(signalText) {
  const positiveEvidence = collectMarkerEvidence(signalText, ROLE_FORCING_POSITIVE_MARKERS);
  const negativeEvidence = collectMarkerEvidence(signalText, ROLE_FORCING_NEGATIVE_MARKERS);

  return buildObservation({
    code: 'role_forcing_pressure',
    label: 'Role forcing pressure',
    severity: 'moderate',
    evidence: negativeEvidence.length > 0 ? [] : positiveEvidence,
    message: 'Zeroglare detected role forcing pressure.',
  });
}

function detectSelfNegationPressure(signalText) {
  const positiveEvidence = collectMarkerEvidence(signalText, SELF_NEGATION_POSITIVE_MARKERS);
  const negativeEvidence = collectMarkerEvidence(signalText, SELF_NEGATION_NEGATIVE_MARKERS);

  return buildObservation({
    code: 'self_negation_pressure',
    label: 'Self negation pressure',
    severity: 'moderate',
    evidence: negativeEvidence.length > 0 ? [] : positiveEvidence,
    message: 'Zeroglare detected self negation pressure.',
  });
}

function detectCausalBridgePressure(signalText) {
  const positiveEvidence = collectMarkerEvidence(signalText, CAUSAL_BRIDGE_POSITIVE_MARKERS);
  const negativeEvidence = collectMarkerEvidence(signalText, CAUSAL_BRIDGE_NEGATIVE_MARKERS);

  return buildObservation({
    code: 'causal_bridge_pressure',
    label: 'Causal bridge pressure',
    severity: 'moderate',
    evidence: negativeEvidence.length > 0 ? [] : positiveEvidence,
    message: 'Zeroglare detected causal bridge pressure.',
  });
}

function detectReferenceCollapsePressure(signalText) {
  const positiveEvidence = collectMarkerEvidence(signalText, REFERENCE_COLLAPSE_POSITIVE_MARKERS);
  const negativeEvidence = collectMarkerEvidence(signalText, REFERENCE_COLLAPSE_NEGATIVE_MARKERS);

  return buildObservation({
    code: 'reference_collapse_pressure',
    label: 'Reference collapse pressure',
    severity: 'moderate',
    evidence: negativeEvidence.length > 0 ? [] : positiveEvidence,
    message: 'Zeroglare detected reference collapse pressure.',
  });
}

function detectContextDriftPressure(signalText) {
  const positiveEvidence = collectMarkerEvidence(signalText, CONTEXT_DRIFT_POSITIVE_MARKERS);
  const negativeEvidence = collectMarkerEvidence(signalText, CONTEXT_DRIFT_NEGATIVE_MARKERS);

  return buildObservation({
    code: 'context_drift_pressure',
    label: 'Context drift pressure',
    severity: 'moderate',
    evidence: negativeEvidence.length > 0 ? [] : positiveEvidence,
    message: 'Zeroglare detected context drift pressure.',
  });
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
  const activeObservations = observations.filter((observation) => observation.detected);
  const primaryObservation = activeObservations[0] ?? null;

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
  const refusal = evaluateZeroglareRefusal(rawQuery);
  const conversationalGuidance = refusal.refused
    ? null
    : evaluateZeroglareConversationalGuidance(rawQuery);
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
  const activeObservations = observations.filter((observation) => observation.detected);
  const markerCount = activeObservations.length;
  const status = refusal.refused
    ? 'refused'
    : markerCount === 0
      ? 'clear'
      : markerCount >= 3
        ? 'fail'
        : 'pressure';
  const normalizedInput = normalizedQuery === EMPTY_NORMALIZED_QUERY ? '' : normalizedQuery;
  const normalizedInputLength = normalizedInput.length;
  const summary = {
    state: status,
    clear_count: status === 'clear' ? 1 : 0,
    pressure_count: status === 'pressure' || status === 'refused' ? markerCount : 0,
    fail_count: status === 'fail' ? markerCount : 0,
    refusal_count: status === 'refused' ? 1 : 0,
    marker_count: markerCount,
  };
  const refusalPayload = refusal.refused
    ? {
      contract_name: refusal.contract_name,
      reason_code: refusal.reason_code,
      reason: refusal.reason,
      matched_features: [...refusal.matched_features],
      matched_disqualifiers: [...refusal.matched_disqualifiers],
    }
    : null;
  const conversationalPayload = conversationalGuidance?.matched
    ? {
      pattern: conversationalGuidance.pattern,
      response: conversationalGuidance.response,
      strategy: conversationalGuidance.strategy,
      intent: conversationalGuidance.intent,
      matched_features: [...conversationalGuidance.matched_features],
      matched_disqualifiers: [...conversationalGuidance.matched_disqualifiers],
    }
    : null;

  return {
    resource: 'zeroglare',
    taxonomy_version: ZEROGLOARE_MARKER_TAXONOMY_VERSION,
    status,
    summary,
    ...(refusalPayload ? { refusal: refusalPayload } : {}),
    ...(conversationalPayload ? { conversational: conversationalPayload } : {}),
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
  ZEROGLOARE_MARKER_TAXONOMY_VERSION,
  ZEROGLOARE_PIPELINE_STAGES,
  ZEROGLOARE_SUPPORTING_LINE,
  buildZeroglareAnalysis,
  buildZeroglareDiagnostics,
};
