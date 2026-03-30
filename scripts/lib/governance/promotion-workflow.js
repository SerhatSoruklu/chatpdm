'use strict';

const { appendAuditRecord, buildAuditRecord } = require('./audit-trail');
const { semanticProfileExists } = require('../register-validation/load-semantic-profile');
const { validateConcept } = require('../register-validation/validate-concept');

const CONCEPT_STATES = Object.freeze([
  'draft',
  'proposed',
  'under_review',
  'approved',
  'rejected',
  'published',
  'superseded',
]);

const ALLOWED_STATE_TRANSITIONS = Object.freeze({
  draft: ['proposed'],
  proposed: ['under_review'],
  under_review: ['approved', 'rejected'],
  approved: ['published'],
  rejected: [],
  published: ['superseded'],
  superseded: [],
});

const WORKFLOW_ERROR_CODES = Object.freeze({
  INVALID_CONCEPT_PACKET: 'INVALID_CONCEPT_PACKET',
  INVALID_STATE: 'INVALID_STATE',
  INVALID_TRANSITION: 'INVALID_TRANSITION',
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  SEMANTIC_PROFILE_REQUIRED: 'SEMANTIC_PROFILE_REQUIRED',
  PUBLISHED_PREDECESSOR_REQUIRED: 'PUBLISHED_PREDECESSOR_REQUIRED',
  CONCEPT_MISMATCH: 'CONCEPT_MISMATCH',
  VERSION_SEQUENCE_INVALID: 'VERSION_SEQUENCE_INVALID',
  PREVIOUS_VERSION_POINTER_INVALID: 'PREVIOUS_VERSION_POINTER_INVALID',
});

class ConceptWorkflowError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = 'ConceptWorkflowError';
    this.code = code;
    this.details = details;
  }
}

function assertPlainObject(value, context) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new ConceptWorkflowError(
      WORKFLOW_ERROR_CODES.INVALID_CONCEPT_PACKET,
      `${context} must be a concept object.`,
    );
  }
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function assertValidState(state, context) {
  if (!CONCEPT_STATES.includes(state)) {
    throw new ConceptWorkflowError(
      WORKFLOW_ERROR_CODES.INVALID_STATE,
      `${context} must be one of: ${CONCEPT_STATES.join(', ')}.`,
      { state },
    );
  }
}

function resolveTimestamp(timestamp) {
  if (typeof timestamp !== 'string' || timestamp.trim() === '') {
    return new Date().toISOString();
  }

  const parsed = Date.parse(timestamp);

  if (Number.isNaN(parsed)) {
    throw new ConceptWorkflowError(
      WORKFLOW_ERROR_CODES.INVALID_CONCEPT_PACKET,
      'timestamp must be a valid ISO 8601 string.',
      { timestamp },
    );
  }

  return new Date(parsed).toISOString();
}

function assertTransitionAllowed(currentState, nextState) {
  assertValidState(currentState, 'current state');
  assertValidState(nextState, 'next state');

  const allowedNextStates = ALLOWED_STATE_TRANSITIONS[currentState] || [];

  if (!allowedNextStates.includes(nextState)) {
    throw new ConceptWorkflowError(
      WORKFLOW_ERROR_CODES.INVALID_TRANSITION,
      `cannot transition concept state from "${currentState}" to "${nextState}".`,
      {
        currentState,
        nextState,
        allowedNextStates,
      },
    );
  }
}

function transitionConceptState(concept, nextState, options = {}) {
  assertPlainObject(concept, 'concept');
  assertTransitionAllowed(concept.state, nextState);

  const nextConcept = clone(concept);
  nextConcept.state = nextState;
  nextConcept.updatedAt = resolveTimestamp(options.timestamp);

  return nextConcept;
}

function ensureSemanticApprovalCoverage(concept) {
  const conceptName = concept?.conceptId ?? concept?.concept;

  if (!semanticProfileExists(conceptName)) {
    throw new ConceptWorkflowError(
      WORKFLOW_ERROR_CODES.SEMANTIC_PROFILE_REQUIRED,
      `semantic profile is required before approval for concept "${conceptName}".`,
      { concept: conceptName },
    );
  }
}

function ensureValidatorPasses(concept, validationReport) {
  const report = validationReport ?? validateConcept(concept);

  if (!report.passed) {
    throw new ConceptWorkflowError(
      WORKFLOW_ERROR_CODES.VALIDATION_FAILED,
      `validator must pass before approval or publication for concept "${concept?.conceptId ?? concept?.concept ?? 'unknown'}".`,
      {
        concept: concept?.conceptId ?? concept?.concept ?? null,
        validationReport: report,
      },
    );
  }

  if (!report.semantic?.profileFound || !report.semantic?.passed) {
    throw new ConceptWorkflowError(
      WORKFLOW_ERROR_CODES.SEMANTIC_PROFILE_REQUIRED,
      `semantic invariance must pass before approval or publication for concept "${concept?.conceptId ?? concept?.concept ?? 'unknown'}".`,
      {
        concept: concept?.conceptId ?? concept?.concept ?? null,
        semantic: report.semantic,
      },
    );
  }

  return report;
}

function assertPublishedPredecessor(previousPublishedConcept, nextConcept) {
  if (!previousPublishedConcept) {
    if (nextConcept.version !== 1) {
      throw new ConceptWorkflowError(
        WORKFLOW_ERROR_CODES.VERSION_SEQUENCE_INVALID,
        'first published concept version must be 1.',
        {
          version: nextConcept.version,
        },
      );
    }

    if (nextConcept.previousVersion !== null) {
      throw new ConceptWorkflowError(
        WORKFLOW_ERROR_CODES.PREVIOUS_VERSION_POINTER_INVALID,
        'first published concept must set previousVersion to null.',
        {
          previousVersion: nextConcept.previousVersion,
        },
      );
    }

    return;
  }

  assertPlainObject(previousPublishedConcept, 'previousPublishedConcept');

  if (previousPublishedConcept.state !== 'published') {
    throw new ConceptWorkflowError(
      WORKFLOW_ERROR_CODES.PUBLISHED_PREDECESSOR_REQUIRED,
      'previous concept version must be in published state before it can be superseded.',
      {
        state: previousPublishedConcept.state,
      },
    );
  }

  const previousConceptName = previousPublishedConcept.conceptId ?? previousPublishedConcept.concept;
  const nextConceptName = nextConcept.conceptId ?? nextConcept.concept;

  if (previousConceptName !== nextConceptName) {
    throw new ConceptWorkflowError(
      WORKFLOW_ERROR_CODES.CONCEPT_MISMATCH,
      'previous published concept must match the concept being published.',
      {
        previousConcept: previousConceptName,
        nextConcept: nextConceptName,
      },
    );
  }

  if (nextConcept.version !== previousPublishedConcept.version + 1) {
    throw new ConceptWorkflowError(
      WORKFLOW_ERROR_CODES.VERSION_SEQUENCE_INVALID,
      'published concept version must increment by exactly one.',
      {
        previousVersion: previousPublishedConcept.version,
        nextVersion: nextConcept.version,
      },
    );
  }

  if (nextConcept.previousVersion !== previousPublishedConcept.version) {
    throw new ConceptWorkflowError(
      WORKFLOW_ERROR_CODES.PREVIOUS_VERSION_POINTER_INVALID,
      'published concept must point previousVersion at the immediately preceding published version.',
      {
        previousVersion: previousPublishedConcept.version,
        nextPreviousVersion: nextConcept.previousVersion,
      },
    );
  }
}

function proposeChange(concept, options = {}) {
  return transitionConceptState(concept, 'proposed', options);
}

function markUnderReview(concept, options = {}) {
  return transitionConceptState(concept, 'under_review', options);
}

function approveChange(concept, options = {}) {
  assertPlainObject(concept, 'concept');
  assertTransitionAllowed(concept.state, 'approved');
  ensureSemanticApprovalCoverage(concept);
  const validationReport = ensureValidatorPasses(concept, options.validationReport);
  const approvedConcept = transitionConceptState(concept, 'approved', options);
  const auditRecord = buildAuditRecord({
    concept: approvedConcept.conceptId ?? approvedConcept.concept,
    version: approvedConcept.version,
    changeType: options.changeType,
    summary: options.summary,
    validationReport,
    approvedBy: options.approvedBy,
    approvedAt: approvedConcept.updatedAt,
    stateTransitions: ['under_review->approved'],
  });

  if (options.persistAudit !== false) {
    appendAuditRecord(auditRecord);
  }

  return {
    concept: approvedConcept,
    validationReport,
    auditRecord,
  };
}

function rejectChange(concept, options = {}) {
  const rejectedConcept = transitionConceptState(concept, 'rejected', options);
  const auditRecord = buildAuditRecord({
    concept: rejectedConcept.conceptId ?? rejectedConcept.concept,
    version: rejectedConcept.version,
    changeType: options.changeType,
    summary: options.summary,
    validationReport: options.validationReport,
    approvedBy: options.approvedBy,
    approvedAt: rejectedConcept.updatedAt,
    stateTransitions: ['under_review->rejected'],
  });

  if (options.persistAudit !== false) {
    appendAuditRecord(auditRecord);
  }

  return {
    concept: rejectedConcept,
    auditRecord,
  };
}

function publishConcept(concept, options = {}) {
  assertPlainObject(concept, 'concept');
  assertTransitionAllowed(concept.state, 'published');
  ensureSemanticApprovalCoverage(concept);
  const validationReport = ensureValidatorPasses(concept, options.validationReport);
  assertPublishedPredecessor(options.previousPublishedConcept ?? null, concept);

  const timestamp = resolveTimestamp(options.timestamp);
  const publishedConcept = transitionConceptState(concept, 'published', { timestamp });
  const previousPublishedConcept = options.previousPublishedConcept
    ? transitionConceptState(options.previousPublishedConcept, 'superseded', { timestamp })
    : null;
  const stateTransitions = ['approved->published'];

  if (previousPublishedConcept) {
    stateTransitions.push(`published(v${previousPublishedConcept.version})->superseded`);
  }

  const auditRecord = buildAuditRecord({
    concept: publishedConcept.conceptId ?? publishedConcept.concept,
    version: publishedConcept.version,
    changeType: options.changeType,
    summary: options.summary,
    validationReport,
    approvedBy: options.approvedBy,
    approvedAt: publishedConcept.updatedAt,
    stateTransitions,
  });

  if (options.persistAudit !== false) {
    appendAuditRecord(auditRecord);
  }

  return {
    publishedConcept,
    supersededConcept: previousPublishedConcept,
    validationReport,
    auditRecord,
  };
}

module.exports = {
  ALLOWED_STATE_TRANSITIONS,
  CONCEPT_STATES,
  ConceptWorkflowError,
  WORKFLOW_ERROR_CODES,
  approveChange,
  markUnderReview,
  proposeChange,
  publishConcept,
  rejectChange,
};
