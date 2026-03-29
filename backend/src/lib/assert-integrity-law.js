'use strict';

// INTEGRITY LAW:
// This module is governed by docs/INTERGRITY_RUNTIME_LAWS.md
// Violations of canonical truth, refusal boundary, or hashing determinism are forbidden.

function assertIntegrityLaw(condition, message) {
  if (!condition) {
    throw new Error(`INTEGRITY_LAW_VIOLATION: ${message}`);
  }
}

module.exports = {
  assertIntegrityLaw,
};
