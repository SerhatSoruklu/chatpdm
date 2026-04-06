'use strict';

const {
  AMBIGUOUS_MATCH_MESSAGE,
  CONCEPT_SET_VERSION,
  CONTRACT_VERSION,
  INVALID_QUERY_MESSAGE,
  MATCHER_VERSION,
  NORMALIZER_VERSION,
  NO_EXACT_MATCH_MESSAGE,
  REJECTED_CONCEPT_MESSAGE,
  UNSUPPORTED_QUERY_TYPE_MESSAGE,
  VOCABULARY_DETECTED_MESSAGE,
} = require('../modules/concepts/constants');
const {
  CORE_CONCEPT_ITEM_TYPE,
} = require('../modules/inspectable-item-contract');

const CANONICAL_HASH_PATTERN = /^[a-f0-9]{64}$/;

const GENERAL_INTERPRETATION_TYPES = new Set([
  'comparison_not_supported',
  'relation_not_supported',
  'role_or_actor_not_supported',
  'ambiguous_selection',
  'validation_blocked',
  'unsupported_complex',
  'canonical_lookup_not_found',
  'exact_concept_not_found',
  'visible_only_public_concept',
  'explicitly_rejected_concept',
  'invalid_query',
  'out_of_scope',
  'scoped_clarification',
  'unresolved_domain',
  'unsupported_semantic_bridge',
  'domain_boundary_violation',
  'causal_overreach',
]);

const CONCEPT_MATCH_QUERY_TYPES = new Set([
  'exact_concept_query',
  'canonical_id_query',
]);

const NO_EXACT_MATCH_QUERY_TYPES = new Set([
  'exact_concept_query',
  'canonical_id_query',
  'ambiguity_query',
  'comparison_query',
  'relation_query',
  'role_or_actor_query',
  'unsupported_complex_query',
]);

const UNSUPPORTED_QUERY_TYPE_QUERY_TYPES = new Set([
  'relation_query',
  'role_or_actor_query',
  'unsupported_complex_query',
]);

const CONCEPT_MATCH_METHODS = new Set([
  'exact_alias',
  'normalized_alias',
  'canonical_id',
]);

const NO_EXACT_MATCH_METHODS = new Set([
  'no_exact_match',
  'out_of_scope',
]);

const AMBIGUOUS_MATCH_METHODS = new Set([
  'ambiguous_alias',
  'ambiguous_normalized_alias',
  'author_defined_disambiguation',
]);

const VOCABULARY_CLASSIFICATIONS = new Set([
  'legal_term',
  'informal_term',
  'ambiguous_term',
]);

const SOURCE_TYPES = new Set([
  'dictionary',
  'book',
  'paper',
  'law',
  'article',
  'internal',
]);

const RELATION_TYPES = new Set([
  'see_also',
  'prerequisite',
  'extension',
  'contrast',
]);

const READING_REGISTER_STATUSES = new Set([
  'available',
  'rejected',
]);

const GOVERNANCE_STATE_SOURCE_VALUES = new Set([
  'validator_artifact',
  'unavailable',
]);

const GOVERNANCE_STATE_UNAVAILABLE_REASONS = new Set([
  'artifact_missing',
  'artifact_invalid',
  'concept_state_missing',
  null,
]);

const GOVERNANCE_STATE_RELATION_SOURCES = new Set([
  'authored',
  'fallback',
  'none',
  null,
]);

const GOVERNANCE_STATE_LAW_SOURCES = new Set([
  'authored',
  'fallback',
  'none',
  null,
]);

const GOVERNANCE_STATE_DATA_SOURCES = new Set([
  'authored_relation_packets',
  'default_seed_relations',
  'none',
  null,
]);

const GOVERNANCE_STATE_V3_VALUES = new Set([
  'not_applicable',
  'incomplete',
  'passing',
  null,
]);

const GOVERNANCE_STATE_LAW_VALUES = new Set([
  'not_applicable',
  'failing',
  'warning_only',
  'passing',
  null,
]);

const GOVERNANCE_STATE_ENFORCEMENT_VALUES = new Set([
  'passing',
  'warning_only',
  'blocked',
  null,
]);

const GOVERNANCE_STATE_VALIDATION_VALUES = new Set([
  'language_invalid',
  'language_valid',
  'structurally_incomplete',
  'fully_validated',
  null,
]);

const GOVERNANCE_STATE_SYSTEM_VALUES = new Set([
  'language_invalid',
  'structurally_incomplete',
  'law_blocked',
  'law_warning_only',
  'law_validated',
  'language_valid',
  null,
]);

const RESPONSE_TYPES = new Set([
  'concept_match',
  'comparison',
  'rejected_concept',
  'VOCABULARY_DETECTED',
  'no_exact_match',
  'invalid_query',
  'unsupported_query_type',
  'ambiguous_match',
]);

const REJECTED_RESPONSE_TYPES = new Set([
  'rejected_concept',
]);

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function hasOwn(value, key) {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function formatAllowedValues(allowedValues) {
  return allowedValues
    .map((value) => (value === null ? 'null' : JSON.stringify(value)))
    .join(', ');
}

function assertPlainObject(value, label) {
  if (!isPlainObject(value)) {
    throw new Error(`${label} must be an object.`);
  }
}

function assertStringValue(value, label) {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`${label} must be a non-empty string.`);
  }
}

function assertBooleanValue(value, label) {
  if (typeof value !== 'boolean') {
    throw new Error(`${label} must be a boolean.`);
  }
}

function assertIntegerValue(value, label) {
  if (!Number.isInteger(value)) {
    throw new Error(`${label} must be an integer.`);
  }
}

function assertPatternValue(value, label, pattern) {
  assertStringValue(value, label);

  if (!pattern.test(value)) {
    throw new Error(`${label} does not match the expected format.`);
  }
}

function assertExactStringValue(value, label, expectedValue) {
  assertStringValue(value, label);

  if (value !== expectedValue) {
    throw new Error(`${label} must be "${expectedValue}".`);
  }
}

function assertOneOf(value, label, allowedValues) {
  if (!allowedValues.has(value)) {
    throw new Error(`${label} must be one of: ${formatAllowedValues([...allowedValues])}.`);
  }
}

function assertStringArray(value, label, minimumLength = 0) {
  if (!Array.isArray(value)) {
    throw new Error(`${label} must be an array.`);
  }

  if (value.length < minimumLength) {
    throw new Error(`${label} must contain at least ${minimumLength} item(s).`);
  }

  value.forEach((entry, index) => {
    assertStringValue(entry, `${label}[${index}]`);
  });
}

function assertObjectArray(value, label, itemValidator, minimumLength = 0) {
  if (!Array.isArray(value)) {
    throw new Error(`${label} must be an array.`);
  }

  if (value.length < minimumLength) {
    throw new Error(`${label} must contain at least ${minimumLength} item(s).`);
  }

  value.forEach((entry, index) => {
    itemValidator(entry, `${label}[${index}]`);
  });
}

function assertAllowedKeys(value, label, requiredKeys, optionalKeys = []) {
  assertPlainObject(value, label);

  const allowedKeys = new Set([...requiredKeys, ...optionalKeys]);
  const unexpectedKeys = Object.keys(value).filter((key) => !allowedKeys.has(key));
  const missingKeys = requiredKeys.filter((key) => !hasOwn(value, key));

  if (unexpectedKeys.length > 0) {
    throw new Error(`${label} has unsupported field(s): ${unexpectedKeys.join(', ')}.`);
  }

  if (missingKeys.length > 0) {
    throw new Error(`${label} is missing required field(s): ${missingKeys.join(', ')}.`);
  }
}

function validateInterpretationObject(value, label = 'interpretation') {
  assertAllowedKeys(
    value,
    label,
    ['interpretationType', 'message'],
    ['baseConcept', 'concepts', 'relationTerm', 'actorTerm', 'targetConceptId', 'concept', 'domain'],
  );

  assertOneOf(value.interpretationType, `${label}.interpretationType`, GENERAL_INTERPRETATION_TYPES);
  assertStringValue(value.message, `${label}.message`);

  if (hasOwn(value, 'baseConcept')) {
    assertStringValue(value.baseConcept, `${label}.baseConcept`);
  }

  if (hasOwn(value, 'concepts')) {
    assertStringArray(value.concepts, `${label}.concepts`);
  }

  if (hasOwn(value, 'relationTerm')) {
    assertStringValue(value.relationTerm, `${label}.relationTerm`);
  }

  if (hasOwn(value, 'actorTerm')) {
    assertStringValue(value.actorTerm, `${label}.actorTerm`);
  }

  if (hasOwn(value, 'targetConceptId')) {
    assertStringValue(value.targetConceptId, `${label}.targetConceptId`);
  }

  if (hasOwn(value, 'concept')) {
    assertStringValue(value.concept, `${label}.concept`);
  }

  if (hasOwn(value, 'domain')) {
    assertStringValue(value.domain, `${label}.domain`);
  }
}

function validateRejectedInterpretationObject(value, label = 'interpretation') {
  assertAllowedKeys(value, label, ['interpretationType', 'message', 'targetConceptId', 'concepts']);
  assertOneOf(value.interpretationType, `${label}.interpretationType`, new Set(['explicitly_rejected_concept']));
  assertStringValue(value.message, `${label}.message`);
  assertStringValue(value.targetConceptId, `${label}.targetConceptId`);
  assertStringArray(value.concepts, `${label}.concepts`, 1);
}

function validateConceptMatchResolution(value, label = 'resolution') {
  assertAllowedKeys(value, label, ['method', 'conceptId', 'conceptVersion']);
  assertOneOf(value.method, `${label}.method`, CONCEPT_MATCH_METHODS);
  assertStringValue(value.conceptId, `${label}.conceptId`);
  assertIntegerValue(value.conceptVersion, `${label}.conceptVersion`);
}

function validateNoExactMatchResolution(value, label = 'resolution') {
  assertAllowedKeys(value, label, ['method']);
  assertOneOf(value.method, `${label}.method`, NO_EXACT_MATCH_METHODS);
}

function validateAmbiguousMatchResolution(value, label = 'resolution') {
  assertAllowedKeys(value, label, ['method']);
  assertOneOf(value.method, `${label}.method`, AMBIGUOUS_MATCH_METHODS);
}

function validateInvalidQueryResolution(value, label = 'resolution') {
  assertAllowedKeys(value, label, ['method']);

  if (value.method !== 'invalid_query') {
    throw new Error(`${label}.method must be "invalid_query".`);
  }
}

function validateUnsupportedQueryTypeResolution(value, label = 'resolution') {
  assertAllowedKeys(value, label, ['method']);

  if (value.method !== 'unsupported_query_type') {
    throw new Error(`${label}.method must be "unsupported_query_type".`);
  }
}

function validateRejectedConceptResolution(value, label = 'resolution') {
  assertAllowedKeys(value, label, ['method', 'conceptId']);

  if (value.method !== 'rejection_registry') {
    throw new Error(`${label}.method must be "rejection_registry".`);
  }

  assertStringValue(value.conceptId, `${label}.conceptId`);
}

function validateVocabularyDetectedResolution(value, label = 'resolution') {
  assertAllowedKeys(value, label, ['method']);

  if (value.method !== 'vocabulary_guard') {
    throw new Error(`${label}.method must be "vocabulary_guard".`);
  }
}

function validateContextObject(value, label = 'contexts[]') {
  assertAllowedKeys(value, label, ['label', 'appliesTo']);
  assertStringValue(value.label, `${label}.label`);
  assertStringArray(value.appliesTo, `${label}.appliesTo`, 1);
}

function validateSourceObject(value, label = 'sources[]') {
  assertAllowedKeys(value, label, ['id', 'label', 'type', 'usedFor']);
  assertStringValue(value.id, `${label}.id`);
  assertStringValue(value.label, `${label}.label`);
  assertOneOf(value.type, `${label}.type`, SOURCE_TYPES);
  assertStringValue(value.usedFor, `${label}.usedFor`);
}

function validateRelatedConceptObject(value, label = 'relatedConcepts[]') {
  assertAllowedKeys(value, label, ['conceptId', 'title', 'relationType']);
  assertStringValue(value.conceptId, `${label}.conceptId`);
  assertStringValue(value.title, `${label}.title`);
  assertOneOf(value.relationType, `${label}.relationType`, RELATION_TYPES);
}

function validateSuggestionObject(value, label = 'suggestions[]') {
  assertAllowedKeys(value, label, ['conceptId', 'title', 'reason']);
  assertStringValue(value.conceptId, `${label}.conceptId`);
  assertStringValue(value.title, `${label}.title`);
  assertOneOf(value.reason, `${label}.reason`, new Set([
    'similar_term',
    'broader_topic',
    'related_concept',
  ]));
}

function validateCandidateObject(value, label = 'candidates[]') {
  assertAllowedKeys(value, label, ['conceptId', 'title', 'shortDefinition', 'basis']);
  assertStringValue(value.conceptId, `${label}.conceptId`);
  assertStringValue(value.title, `${label}.title`);
  assertStringValue(value.shortDefinition, `${label}.shortDefinition`);
  assertOneOf(value.basis, `${label}.basis`, new Set([
    'shared_alias',
    'normalized_overlap',
    'author_defined_disambiguation',
  ]));
}

function validateComparisonAxisObject(value, label = 'comparison.axes[]') {
  assertAllowedKeys(value, label, ['axis'], ['A', 'B', 'statement']);
  assertStringValue(value.axis, `${label}.axis`);

  const hasA = hasOwn(value, 'A');
  const hasB = hasOwn(value, 'B');
  const hasStatement = hasOwn(value, 'statement');

  if (hasStatement) {
    if (hasA || hasB) {
      throw new Error(`${label} must not mix statement and pairwise comparison fields.`);
    }

    assertStringValue(value.statement, `${label}.statement`);
    return;
  }

  if (!hasA || !hasB) {
    throw new Error(`${label} must provide either A and B or statement.`);
  }

  assertStringValue(value.A, `${label}.A`);
  assertStringValue(value.B, `${label}.B`);
}

function validateComparisonObject(value, label = 'comparison') {
  assertAllowedKeys(value, label, ['conceptA', 'conceptB', 'axes']);
  assertStringValue(value.conceptA, `${label}.conceptA`);
  assertStringValue(value.conceptB, `${label}.conceptB`);
  assertObjectArray(value.axes, `${label}.axes`, validateComparisonAxisObject, 1);
}

function validateReadingRegisterFields(value, label) {
  assertAllowedKeys(value, label, ['shortDefinition', 'coreMeaning', 'fullDefinition']);
  assertStringValue(value.shortDefinition, `${label}.shortDefinition`);
  assertStringValue(value.coreMeaning, `${label}.coreMeaning`);
  assertStringValue(value.fullDefinition, `${label}.fullDefinition`);
}

function validateReadingRegisterCanonicalBinding(value, label = 'canonicalBinding') {
  assertAllowedKeys(value, label, ['conceptId', 'conceptVersion', 'canonicalHash']);
  assertStringValue(value.conceptId, `${label}.conceptId`);
  assertIntegerValue(value.conceptVersion, `${label}.conceptVersion`);
  assertPatternValue(value.canonicalHash, `${label}.canonicalHash`, CANONICAL_HASH_PATTERN);
}

function validateReadingRegisterValidationReason(value, label) {
  assertAllowedKeys(value, label, ['code'], ['field', 'detail']);
  assertStringValue(value.code, `${label}.code`);

  if (hasOwn(value, 'field')) {
    assertStringValue(value.field, `${label}.field`);
  }

  if (hasOwn(value, 'detail')) {
    assertStringValue(value.detail, `${label}.detail`);
  }
}

function validateReadingRegisterModeValidation(value, label) {
  assertAllowedKeys(value, label, ['status', 'reasons']);
  assertOneOf(value.status, `${label}.status`, READING_REGISTER_STATUSES);
  assertObjectArray(value.reasons, `${label}.reasons`, validateReadingRegisterValidationReason);
}

function validateReadingRegisterValidation(value, label = 'validation') {
  assertAllowedKeys(value, label, ['availableModes', 'modes']);
  assertStringArray(value.availableModes, `${label}.availableModes`);
  value.availableModes.forEach((modeName, index) => {
    assertOneOf(modeName, `${label}.availableModes[${index}]`, new Set(['standard', 'simplified', 'formal']));
  });

  assertAllowedKeys(value.modes, `${label}.modes`, ['standard', 'simplified', 'formal']);
  validateReadingRegisterModeValidation(value.modes.standard, `${label}.modes.standard`);
  validateReadingRegisterModeValidation(value.modes.simplified, `${label}.modes.simplified`);
  validateReadingRegisterModeValidation(value.modes.formal, `${label}.modes.formal`);
}

function validateReadingRegistersObject(value, label = 'registers') {
  assertAllowedKeys(value, label, ['readOnly', 'canonicalBinding', 'validation', 'standard', 'simplified', 'formal']);
  if (value.readOnly !== true) {
    throw new Error(`${label}.readOnly must be true.`);
  }

  validateReadingRegisterCanonicalBinding(value.canonicalBinding, `${label}.canonicalBinding`);
  validateReadingRegisterValidation(value.validation, `${label}.validation`);
  validateReadingRegisterFields(value.standard, `${label}.standard`);
  validateReadingRegisterFields(value.simplified, `${label}.simplified`);
  validateReadingRegisterFields(value.formal, `${label}.formal`);
}

function validateGovernanceStateTraceObject(value, label = 'trace') {
  assertAllowedKeys(value, label, [
    'conceptId',
    'validatorSource',
    'unavailableReason',
    'relationSource',
    'lawSource',
    'relationDataPresent',
    'dataSource',
  ]);

  assertStringValue(value.conceptId, `${label}.conceptId`);
  assertOneOf(value.validatorSource, `${label}.validatorSource`, GOVERNANCE_STATE_SOURCE_VALUES);
  assertOneOf(value.unavailableReason, `${label}.unavailableReason`, GOVERNANCE_STATE_UNAVAILABLE_REASONS);
  assertOneOf(value.relationSource, `${label}.relationSource`, GOVERNANCE_STATE_RELATION_SOURCES);
  assertOneOf(value.lawSource, `${label}.lawSource`, GOVERNANCE_STATE_LAW_SOURCES);
  assertBooleanValue(value.relationDataPresent, `${label}.relationDataPresent`);
  assertOneOf(value.dataSource, `${label}.dataSource`, GOVERNANCE_STATE_DATA_SOURCES);
}

function validateGovernanceStateObject(value, label = 'governanceState') {
  assertAllowedKeys(value, label, [
    'source',
    'available',
    'validationState',
    'v3Status',
    'relationStatus',
    'lawStatus',
    'enforcementStatus',
    'systemValidationState',
    'isBlocked',
    'isStructurallyIncomplete',
    'isFullyValidated',
    'isActionable',
    'trace',
  ]);

  assertOneOf(value.source, `${label}.source`, GOVERNANCE_STATE_SOURCE_VALUES);
  assertBooleanValue(value.available, `${label}.available`);
  assertOneOf(value.validationState, `${label}.validationState`, GOVERNANCE_STATE_VALIDATION_VALUES);
  assertOneOf(value.v3Status, `${label}.v3Status`, GOVERNANCE_STATE_V3_VALUES);
  assertOneOf(value.relationStatus, `${label}.relationStatus`, GOVERNANCE_STATE_V3_VALUES);
  assertOneOf(value.lawStatus, `${label}.lawStatus`, GOVERNANCE_STATE_LAW_VALUES);
  assertOneOf(value.enforcementStatus, `${label}.enforcementStatus`, GOVERNANCE_STATE_ENFORCEMENT_VALUES);
  assertOneOf(value.systemValidationState, `${label}.systemValidationState`, GOVERNANCE_STATE_SYSTEM_VALUES);
  assertBooleanValue(value.isBlocked, `${label}.isBlocked`);
  assertBooleanValue(value.isStructurallyIncomplete, `${label}.isStructurallyIncomplete`);
  assertBooleanValue(value.isFullyValidated, `${label}.isFullyValidated`);
  assertBooleanValue(value.isActionable, `${label}.isActionable`);
  validateGovernanceStateTraceObject(value.trace, `${label}.trace`);
}

function validateAnswerObject(value, label = 'answer') {
  assertAllowedKeys(value, label, [
    'itemType',
    'title',
    'shortDefinition',
    'coreMeaning',
    'fullDefinition',
    'governanceState',
    'registers',
    'contexts',
    'sources',
    'relatedConcepts',
  ]);

  if (value.itemType !== CORE_CONCEPT_ITEM_TYPE) {
    throw new Error(`${label}.itemType must be "${CORE_CONCEPT_ITEM_TYPE}".`);
  }

  assertStringValue(value.title, `${label}.title`);
  assertStringValue(value.shortDefinition, `${label}.shortDefinition`);
  assertStringValue(value.coreMeaning, `${label}.coreMeaning`);
  assertStringValue(value.fullDefinition, `${label}.fullDefinition`);
  validateGovernanceStateObject(value.governanceState, `${label}.governanceState`);
  validateReadingRegistersObject(value.registers, `${label}.registers`);
  assertObjectArray(value.contexts, `${label}.contexts`, validateContextObject);
  assertObjectArray(value.sources, `${label}.sources`, validateSourceObject);
  assertObjectArray(value.relatedConcepts, `${label}.relatedConcepts`, validateRelatedConceptObject);
}

function validateVocabularyRelationsObject(value, label = 'relations') {
  assertAllowedKeys(value, label, [], ['closestConcept', 'contrastWith', 'relatedConcepts']);

  if (hasOwn(value, 'closestConcept')) {
    assertStringValue(value.closestConcept, `${label}.closestConcept`);
  }

  if (hasOwn(value, 'contrastWith')) {
    assertStringArray(value.contrastWith, `${label}.contrastWith`);
  }

  if (hasOwn(value, 'relatedConcepts')) {
    assertStringArray(value.relatedConcepts, `${label}.relatedConcepts`);
  }
}

function validateVocabularySystemFlagsObject(value, label = 'systemFlags') {
  assertAllowedKeys(value, label, ['isCoreConcept', 'usableInResolver', 'reasoningAllowed']);

  if (value.isCoreConcept !== false) {
    throw new Error(`${label}.isCoreConcept must be false.`);
  }

  if (value.usableInResolver !== false) {
    throw new Error(`${label}.usableInResolver must be false.`);
  }

  if (value.reasoningAllowed !== false) {
    throw new Error(`${label}.reasoningAllowed must be false.`);
  }
}

function validateVocabularyClassificationResult(value, label = 'vocabulary') {
  assertAllowedKeys(value, label, [
    'input',
    'normalizedInput',
    'matched',
    'term',
    'classification',
    'relations',
    'systemFlags',
  ]);

  assertStringValue(value.input, `${label}.input`);
  assertStringValue(value.normalizedInput, `${label}.normalizedInput`);
  assertBooleanValue(value.matched, `${label}.matched`);

  if (hasOwn(value, 'term') && value.term !== null) {
    assertStringValue(value.term, `${label}.term`);
  }

  if (hasOwn(value, 'classification') && value.classification !== null) {
    assertOneOf(value.classification, `${label}.classification`, VOCABULARY_CLASSIFICATIONS);
  }

  if (hasOwn(value, 'relations') && value.relations !== null) {
    validateVocabularyRelationsObject(value.relations, `${label}.relations`);
  }

  validateVocabularySystemFlagsObject(value.systemFlags, `${label}.systemFlags`);
}

function validateConceptMatchResponse(response) {
  assertAllowedKeys(response, 'product response', [
    'type',
    'query',
    'normalizedQuery',
    'contractVersion',
    'normalizerVersion',
    'matcherVersion',
    'conceptSetVersion',
    'queryType',
    'interpretation',
    'resolution',
    'answer',
  ]);

  if (response.type !== 'concept_match') {
    throw new Error('Product response type must be "concept_match".');
  }

  assertStringValue(response.query, 'product response.query');
  assertStringValue(response.normalizedQuery, 'product response.normalizedQuery');
  assertExactStringValue(response.contractVersion, 'product response.contractVersion', CONTRACT_VERSION);
  assertExactStringValue(response.normalizerVersion, 'product response.normalizerVersion', NORMALIZER_VERSION);
  assertExactStringValue(response.matcherVersion, 'product response.matcherVersion', MATCHER_VERSION);
  assertExactStringValue(response.conceptSetVersion, 'product response.conceptSetVersion', CONCEPT_SET_VERSION);
  assertOneOf(response.queryType, 'product response.queryType', CONCEPT_MATCH_QUERY_TYPES);

  if (response.interpretation !== null) {
    throw new Error('product response.interpretation must be null.');
  }

  validateConceptMatchResolution(response.resolution, 'product response.resolution');
  validateAnswerObject(response.answer, 'product response.answer');
}

function validateComparisonResponse(response) {
  assertAllowedKeys(response, 'product response', [
    'type',
    'mode',
    'query',
    'normalizedQuery',
    'contractVersion',
    'normalizerVersion',
    'matcherVersion',
    'conceptSetVersion',
    'queryType',
    'interpretation',
    'comparison',
  ]);

  if (response.type !== 'comparison') {
    throw new Error('Product response type must be "comparison".');
  }

  if (response.mode !== 'comparison') {
    throw new Error('Product response mode must be "comparison".');
  }

  assertStringValue(response.query, 'product response.query');
  assertStringValue(response.normalizedQuery, 'product response.normalizedQuery');
  assertExactStringValue(response.contractVersion, 'product response.contractVersion', CONTRACT_VERSION);
  assertExactStringValue(response.normalizerVersion, 'product response.normalizerVersion', NORMALIZER_VERSION);
  assertExactStringValue(response.matcherVersion, 'product response.matcherVersion', MATCHER_VERSION);
  assertExactStringValue(response.conceptSetVersion, 'product response.conceptSetVersion', CONCEPT_SET_VERSION);

  if (response.queryType !== 'comparison_query') {
    throw new Error('product response.queryType must be "comparison_query".');
  }

  if (response.interpretation !== null) {
    throw new Error('product response.interpretation must be null.');
  }

  validateComparisonObject(response.comparison, 'product response.comparison');
}

function validateRejectedConceptResponse(response) {
  assertAllowedKeys(response, 'product response', [
    'type',
    'query',
    'normalizedQuery',
    'contractVersion',
    'normalizerVersion',
    'matcherVersion',
    'conceptSetVersion',
    'queryType',
    'interpretation',
    'resolution',
    'message',
    'rejection',
  ]);

  if (response.type !== 'rejected_concept') {
    throw new Error('Product response type must be "rejected_concept".');
  }

  assertStringValue(response.query, 'product response.query');
  assertStringValue(response.normalizedQuery, 'product response.normalizedQuery');
  assertExactStringValue(response.contractVersion, 'product response.contractVersion', CONTRACT_VERSION);
  assertExactStringValue(response.normalizerVersion, 'product response.normalizerVersion', NORMALIZER_VERSION);
  assertExactStringValue(response.matcherVersion, 'product response.matcherVersion', MATCHER_VERSION);
  assertExactStringValue(response.conceptSetVersion, 'product response.conceptSetVersion', CONCEPT_SET_VERSION);
  assertOneOf(response.queryType, 'product response.queryType', CONCEPT_MATCH_QUERY_TYPES);
  validateRejectedInterpretationObject(response.interpretation, 'product response.interpretation');
  validateRejectedConceptResolution(response.resolution, 'product response.resolution');

  if (response.message !== REJECTED_CONCEPT_MESSAGE) {
    throw new Error('product response.message must match the rejected concept message.');
  }

  assertAllowedKeys(response.rejection, 'product response.rejection', ['status', 'decisionType', 'finality']);

  if (response.rejection.status !== 'REJECTED') {
    throw new Error('product response.rejection.status must be "REJECTED".');
  }

  if (response.rejection.decisionType !== 'STRUCTURAL_REJECTION') {
    throw new Error('product response.rejection.decisionType must be "STRUCTURAL_REJECTION".');
  }

  assertBooleanValue(response.rejection.finality, 'product response.rejection.finality');
}

function validateVocabularyDetectedResponse(response) {
  assertAllowedKeys(response, 'product response', [
    'type',
    'finalState',
    'query',
    'normalizedQuery',
    'contractVersion',
    'normalizerVersion',
    'matcherVersion',
    'conceptSetVersion',
    'queryType',
    'interpretation',
    'resolution',
    'message',
    'vocabulary',
  ]);

  if (response.type !== 'VOCABULARY_DETECTED') {
    throw new Error('Product response type must be "VOCABULARY_DETECTED".');
  }

  if (response.finalState !== 'refused') {
    throw new Error('product response.finalState must be "refused".');
  }

  assertStringValue(response.query, 'product response.query');
  assertStringValue(response.normalizedQuery, 'product response.normalizedQuery');
  assertExactStringValue(response.contractVersion, 'product response.contractVersion', CONTRACT_VERSION);
  assertExactStringValue(response.normalizerVersion, 'product response.normalizerVersion', NORMALIZER_VERSION);
  assertExactStringValue(response.matcherVersion, 'product response.matcherVersion', MATCHER_VERSION);
  assertExactStringValue(response.conceptSetVersion, 'product response.conceptSetVersion', CONCEPT_SET_VERSION);
  assertOneOf(response.queryType, 'product response.queryType', CONCEPT_MATCH_QUERY_TYPES);

  if (response.interpretation !== null) {
    throw new Error('product response.interpretation must be null.');
  }

  validateVocabularyDetectedResolution(response.resolution, 'product response.resolution');

  if (response.message !== VOCABULARY_DETECTED_MESSAGE) {
    throw new Error('product response.message must match the vocabulary-detected message.');
  }

  validateVocabularyClassificationResult(response.vocabulary, 'product response.vocabulary');
}

function validateNoExactMatchResponse(response) {
  assertAllowedKeys(response, 'product response', [
    'type',
    'query',
    'normalizedQuery',
    'contractVersion',
    'normalizerVersion',
    'matcherVersion',
    'conceptSetVersion',
    'queryType',
    'interpretation',
    'resolution',
    'message',
    'suggestions',
  ]);

  if (response.type !== 'no_exact_match') {
    throw new Error('Product response type must be "no_exact_match".');
  }

  assertStringValue(response.query, 'product response.query');
  assertStringValue(response.normalizedQuery, 'product response.normalizedQuery');
  assertExactStringValue(response.contractVersion, 'product response.contractVersion', CONTRACT_VERSION);
  assertExactStringValue(response.normalizerVersion, 'product response.normalizerVersion', NORMALIZER_VERSION);
  assertExactStringValue(response.matcherVersion, 'product response.matcherVersion', MATCHER_VERSION);
  assertExactStringValue(response.conceptSetVersion, 'product response.conceptSetVersion', CONCEPT_SET_VERSION);
  assertOneOf(response.queryType, 'product response.queryType', NO_EXACT_MATCH_QUERY_TYPES);
  validateInterpretationObject(response.interpretation, 'product response.interpretation');
  validateNoExactMatchResolution(response.resolution, 'product response.resolution');

  if (response.message !== NO_EXACT_MATCH_MESSAGE) {
    throw new Error('product response.message must match the no-exact-match message.');
  }

  assertObjectArray(response.suggestions, 'product response.suggestions', validateSuggestionObject);
}

function validateInvalidQueryResponse(response) {
  assertAllowedKeys(response, 'product response', [
    'type',
    'query',
    'normalizedQuery',
    'contractVersion',
    'normalizerVersion',
    'matcherVersion',
    'conceptSetVersion',
    'queryType',
    'interpretation',
    'resolution',
    'message',
  ]);

  if (response.type !== 'invalid_query') {
    throw new Error('Product response type must be "invalid_query".');
  }

  assertStringValue(response.query, 'product response.query');
  assertStringValue(response.normalizedQuery, 'product response.normalizedQuery');
  assertExactStringValue(response.contractVersion, 'product response.contractVersion', CONTRACT_VERSION);
  assertExactStringValue(response.normalizerVersion, 'product response.normalizerVersion', NORMALIZER_VERSION);
  assertExactStringValue(response.matcherVersion, 'product response.matcherVersion', MATCHER_VERSION);
  assertExactStringValue(response.conceptSetVersion, 'product response.conceptSetVersion', CONCEPT_SET_VERSION);

  if (response.queryType !== 'invalid_query') {
    throw new Error('product response.queryType must be "invalid_query".');
  }

  validateInterpretationObject(response.interpretation, 'product response.interpretation');
  validateInvalidQueryResolution(response.resolution, 'product response.resolution');

  if (response.message !== INVALID_QUERY_MESSAGE) {
    throw new Error('product response.message must match the invalid-query message.');
  }
}

function validateUnsupportedQueryTypeResponse(response) {
  assertAllowedKeys(response, 'product response', [
    'type',
    'query',
    'normalizedQuery',
    'contractVersion',
    'normalizerVersion',
    'matcherVersion',
    'conceptSetVersion',
    'queryType',
    'interpretation',
    'resolution',
    'message',
  ]);

  if (response.type !== 'unsupported_query_type') {
    throw new Error('Product response type must be "unsupported_query_type".');
  }

  assertStringValue(response.query, 'product response.query');
  assertStringValue(response.normalizedQuery, 'product response.normalizedQuery');
  assertExactStringValue(response.contractVersion, 'product response.contractVersion', CONTRACT_VERSION);
  assertExactStringValue(response.normalizerVersion, 'product response.normalizerVersion', NORMALIZER_VERSION);
  assertExactStringValue(response.matcherVersion, 'product response.matcherVersion', MATCHER_VERSION);
  assertExactStringValue(response.conceptSetVersion, 'product response.conceptSetVersion', CONCEPT_SET_VERSION);
  assertOneOf(response.queryType, 'product response.queryType', UNSUPPORTED_QUERY_TYPE_QUERY_TYPES);
  validateInterpretationObject(response.interpretation, 'product response.interpretation');
  validateUnsupportedQueryTypeResolution(response.resolution, 'product response.resolution');

  if (response.message !== UNSUPPORTED_QUERY_TYPE_MESSAGE) {
    throw new Error('product response.message must match the unsupported-query-type message.');
  }
}

function validateAmbiguousMatchResponse(response) {
  assertAllowedKeys(response, 'product response', [
    'type',
    'query',
    'normalizedQuery',
    'contractVersion',
    'normalizerVersion',
    'matcherVersion',
    'conceptSetVersion',
    'queryType',
    'interpretation',
    'resolution',
    'message',
    'candidates',
  ]);

  if (response.type !== 'ambiguous_match') {
    throw new Error('Product response type must be "ambiguous_match".');
  }

  assertStringValue(response.query, 'product response.query');
  assertStringValue(response.normalizedQuery, 'product response.normalizedQuery');
  assertExactStringValue(response.contractVersion, 'product response.contractVersion', CONTRACT_VERSION);
  assertExactStringValue(response.normalizerVersion, 'product response.normalizerVersion', NORMALIZER_VERSION);
  assertExactStringValue(response.matcherVersion, 'product response.matcherVersion', MATCHER_VERSION);
  assertExactStringValue(response.conceptSetVersion, 'product response.conceptSetVersion', CONCEPT_SET_VERSION);

  if (response.queryType !== 'ambiguity_query') {
    throw new Error('product response.queryType must be "ambiguity_query".');
  }

  validateInterpretationObject(response.interpretation, 'product response.interpretation');
  validateAmbiguousMatchResolution(response.resolution, 'product response.resolution');

  if (response.message !== AMBIGUOUS_MATCH_MESSAGE) {
    throw new Error('product response.message must match the ambiguous-match message.');
  }

  assertObjectArray(response.candidates, 'product response.candidates', validateCandidateObject, 2);
}

function assertValidProductResponse(response) {
  assertPlainObject(response, 'Product response');

  if (typeof response.type !== 'string' || response.type.length === 0) {
    throw new Error('Product response must declare a non-empty type.');
  }

  if (!RESPONSE_TYPES.has(response.type)) {
    throw new Error(`Unsupported product response type "${response.type}".`);
  }

  if (response.type === 'concept_match') {
    validateConceptMatchResponse(response);
    return response;
  }

  if (response.type === 'comparison') {
    validateComparisonResponse(response);
    return response;
  }

  if (REJECTED_RESPONSE_TYPES.has(response.type)) {
    validateRejectedConceptResponse(response);
    return response;
  }

  if (response.type === 'VOCABULARY_DETECTED') {
    validateVocabularyDetectedResponse(response);
    return response;
  }

  if (response.type === 'no_exact_match') {
    validateNoExactMatchResponse(response);
    return response;
  }

  if (response.type === 'invalid_query') {
    validateInvalidQueryResponse(response);
    return response;
  }

  if (response.type === 'unsupported_query_type') {
    validateUnsupportedQueryTypeResponse(response);
    return response;
  }

  if (response.type === 'ambiguous_match') {
    validateAmbiguousMatchResponse(response);
    return response;
  }

  throw new Error(`Unsupported product response type "${response.type}".`);
}

module.exports = {
  assertValidProductResponse,
};
