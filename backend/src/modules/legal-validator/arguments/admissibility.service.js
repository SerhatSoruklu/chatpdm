'use strict';

const ArgumentUnit = require('./argument-unit.model');

const SERVICE_NAME = 'admissibility.service';
const OWNED_FAILURE_CODES = new Set([
  'EVALUATIVE_FACT_NOT_ADMISSIBLE',
  'PENDING_REVIEW_BLOCK',
]);

function buildTerminalResult(failureCode, reason, blockedArgumentUnits = []) {
  if (!OWNED_FAILURE_CODES.has(failureCode)) {
    throw new Error(`${SERVICE_NAME} cannot emit unowned failure code ${failureCode}.`);
  }

  return {
    ok: false,
    terminal: true,
    result: 'unresolved',
    failureCode,
    reason,
    service: SERVICE_NAME,
    blockedArgumentUnits,
  };
}

function buildContinueResult(argumentUnits) {
  return {
    ok: true,
    terminal: false,
    service: SERVICE_NAME,
    eligibleArgumentUnits: argumentUnits,
    blockedArgumentUnits: [],
    admissibilitySummary: {
      eligibleCount: argumentUnits.length,
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

async function evaluateArgumentUnits(input = {}) {
  const argumentUnits = await resolveArgumentUnits(input);

  if (!Array.isArray(argumentUnits) || argumentUnits.length === 0) {
    throw new Error(`${SERVICE_NAME} requires at least one ArgumentUnit.`);
  }

  for (const argumentUnit of argumentUnits) {
    if (argumentUnit.reviewState === 'pending_review') {
      return buildTerminalResult(
        'PENDING_REVIEW_BLOCK',
        `ArgumentUnit ${argumentUnit.argumentUnitId} is pending review and cannot enter deterministic mapping.`,
        [argumentUnit],
      );
    }

    if (argumentUnit.admissibility !== 'admissible') {
      return buildTerminalResult(
        'EVALUATIVE_FACT_NOT_ADMISSIBLE',
        `ArgumentUnit ${argumentUnit.argumentUnitId} is not admissible for deterministic mapping.`,
        [argumentUnit],
      );
    }

    const blocker = ArgumentUnit.getDeterministicSuccessPathBlocker(argumentUnit);

    if (blocker) {
      return buildTerminalResult(
        'EVALUATIVE_FACT_NOT_ADMISSIBLE',
        blocker,
        [argumentUnit],
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
};
