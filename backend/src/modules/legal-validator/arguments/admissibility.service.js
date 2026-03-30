'use strict';

const ArgumentUnit = require('./argument-unit.model');

const SERVICE_NAME = 'admissibility.service';
const OWNED_FAILURE_CODES = new Set([
  'FACT_INPUT_NOT_ADMISSIBLE',
  'PENDING_REVIEW_BLOCK',
]);

function buildArgumentUnitSnapshot(argumentUnit) {
  return {
    argumentUnitId: argumentUnit?.argumentUnitId ?? null,
    matterId: argumentUnit?.matterId ?? null,
    documentId: argumentUnit?.documentId ?? null,
    reviewState: argumentUnit?.reviewState ?? null,
    admissibility: argumentUnit?.admissibility ?? null,
  };
}

function buildTerminalResult(failureCode, reason, blockedArgumentUnit = null) {
  if (!OWNED_FAILURE_CODES.has(failureCode)) {
    throw new Error(`${SERVICE_NAME} cannot emit unowned failure code ${failureCode}.`);
  }

  const snapshot = buildArgumentUnitSnapshot(blockedArgumentUnit);

  return {
    ok: false,
    terminal: true,
    result: 'unresolved',
    failureCode,
    reason,
    service: SERVICE_NAME,
    ...snapshot,
    blockedArgumentUnits: blockedArgumentUnit ? [snapshot] : [],
  };
}

function buildContinueResult(argumentUnits) {
  const snapshots = argumentUnits.map(buildArgumentUnitSnapshot);
  const primarySnapshot = snapshots[0] || buildArgumentUnitSnapshot(null);

  return {
    ok: true,
    terminal: false,
    service: SERVICE_NAME,
    ...primarySnapshot,
    eligibleArgumentUnits: snapshots,
    blockedArgumentUnits: [],
    admissibilitySummary: {
      eligibleCount: snapshots.length,
      blockedCount: 0,
    },
  };
}

async function resolveArgumentUnits({ matterId = null, argumentUnitIds = [], argumentUnits = null } = {}) {
  if (Array.isArray(argumentUnits)) {
    return argumentUnits;
  }

  if (!matterId || !Array.isArray(argumentUnitIds) || argumentUnitIds.length === 0) {
    throw new Error(`${SERVICE_NAME} requires argumentUnits or matterId + argumentUnitIds.`);
  }

  return ArgumentUnit.find({
    matterId,
    argumentUnitId: { $in: argumentUnitIds },
  })
    .sort({ sequence: 1 })
    .exec();
}

function getEligibilityFailure(argumentUnit) {
  if (!argumentUnit || typeof argumentUnit !== 'object') {
    return {
      failureCode: 'FACT_INPUT_NOT_ADMISSIBLE',
      reason: 'ArgumentUnit input is missing or malformed and cannot enter deterministic mapping.',
    };
  }

  if (!argumentUnit.argumentUnitId || !argumentUnit.matterId || !argumentUnit.documentId) {
    return {
      failureCode: 'FACT_INPUT_NOT_ADMISSIBLE',
      reason: 'ArgumentUnit identity is incomplete and cannot enter deterministic mapping.',
    };
  }

  if (typeof argumentUnit.reviewState !== 'string' || argumentUnit.reviewState.trim() === '') {
    return {
      failureCode: 'FACT_INPUT_NOT_ADMISSIBLE',
      reason: `ArgumentUnit ${argumentUnit.argumentUnitId} is missing a valid reviewState and cannot enter deterministic mapping.`,
    };
  }

  if (typeof argumentUnit.admissibility !== 'string' || argumentUnit.admissibility.trim() === '') {
    return {
      failureCode: 'FACT_INPUT_NOT_ADMISSIBLE',
      reason: `ArgumentUnit ${argumentUnit.argumentUnitId} is missing a valid admissibility state and cannot enter deterministic mapping.`,
    };
  }

  if (argumentUnit.reviewState === 'pending_review') {
    return {
      failureCode: 'PENDING_REVIEW_BLOCK',
      reason: `ArgumentUnit ${argumentUnit.argumentUnitId} is pending review and cannot enter deterministic mapping.`,
    };
  }

  if (argumentUnit.reviewState === 'rejected') {
    return {
      failureCode: 'FACT_INPUT_NOT_ADMISSIBLE',
      reason: `ArgumentUnit ${argumentUnit.argumentUnitId} was rejected and cannot enter deterministic mapping.`,
    };
  }

  if (argumentUnit.admissibility === 'blocked') {
    return {
      failureCode: 'FACT_INPUT_NOT_ADMISSIBLE',
      reason: `ArgumentUnit ${argumentUnit.argumentUnitId} is blocked and cannot enter deterministic mapping.`,
    };
  }

  const blocker = ArgumentUnit.getDeterministicSuccessPathBlocker(argumentUnit);

  if (blocker) {
    return {
      failureCode: 'FACT_INPUT_NOT_ADMISSIBLE',
      reason: blocker,
    };
  }

  return null;
}

async function evaluateArgumentUnits(input = {}) {
  const argumentUnits = await resolveArgumentUnits(input);

  if (!Array.isArray(argumentUnits) || argumentUnits.length === 0) {
    throw new Error(`${SERVICE_NAME} requires at least one ArgumentUnit.`);
  }

  for (const argumentUnit of argumentUnits) {
    const blocker = getEligibilityFailure(argumentUnit);

    if (blocker) {
      return buildTerminalResult(
        blocker.failureCode,
        blocker.reason,
        argumentUnit,
      );
    }
  }

  return buildContinueResult(argumentUnits);
}

module.exports = {
  SERVICE_NAME,
  OWNED_FAILURE_CODES,
  evaluateArgumentUnits,
  buildTerminalResult,
  buildContinueResult,
  getEligibilityFailure,
};
