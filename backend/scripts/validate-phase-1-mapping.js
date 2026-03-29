'use strict';

const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '../..');
const allowedOntologyTypes = new Set(['rule', 'failure_mode', 'concept', 'refusal_condition']);
const allowedEvidenceTypes = new Set(['explicit', 'inferred']);
const allowedConflictStatuses = new Set(['none', 'detected', 'unresolved', 'resolved']);
const allowedAdmissionDecisions = new Set(['accepted', 'rejected', 'deferred']);
const requiredKeys = [
  'source',
  'source_type',
  'full_text_status',
  'reliability_tier',
  'chunk_id',
  'page',
  'normalized_claim',
  'maps_to_primary',
  'maps_to_secondary',
  'evidence_type',
  'confidence',
  'conflict_status',
  'conflict_note',
  'admission_decision',
  'admission_reason',
];
const defaultTargets = [
  path.join(repoRoot, 'chatpdm-sources_json', 'phase-1-mapping-entries.json'),
  path.join(repoRoot, 'chatpdm-sources_json', 'phase-1-mapping-entries'),
];

main();

function main() {
  try {
    const targetPath = resolveTargetPath(process.argv[2]);
    const { entries, origins } = loadEntries(targetPath);

    if (entries.length === 0) {
      throw new Error(`No Phase 1 mapping entries found at ${relativeToRepo(targetPath)}.`);
    }

    const errors = [];

    entries.forEach((entry, index) => {
      validateEntry(entry, origins[index], errors);
    });

    validateDuplicateNormalizedClaims(entries, origins, errors);

    if (errors.length > 0) {
      throw new Error(`Phase 1 mapping validation failed:\n${errors.map((line) => `- ${line}`).join('\n')}`);
    }

    console.log(
      `Phase 1 mapping validation passed for ${entries.length} entr${entries.length === 1 ? 'y' : 'ies'} from ${relativeToRepo(targetPath)}.`,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    process.exit(1);
  }
}

function resolveTargetPath(argument) {
  if (argument) {
    return path.resolve(process.cwd(), argument);
  }

  for (const candidate of defaultTargets) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error(
    'Missing Phase 1 mapping target. Pass a JSON file or directory path to backend/scripts/validate-phase-1-mapping.js.',
  );
}

function loadEntries(targetPath) {
  if (!fs.existsSync(targetPath)) {
    throw new Error(`Target path does not exist: ${relativeToRepo(targetPath)}`);
  }

  const stats = fs.statSync(targetPath);

  if (stats.isDirectory()) {
    const files = fs.readdirSync(targetPath)
      .filter((fileName) => fileName.endsWith('.json'))
      .sort();

    if (files.length === 0) {
      throw new Error(`No JSON files found in ${relativeToRepo(targetPath)}.`);
    }

    const entries = [];
    const origins = [];

    for (const fileName of files) {
      const filePath = path.join(targetPath, fileName);
      const loaded = loadEntriesFromDocument(readJsonFile(filePath), filePath);
      entries.push(...loaded.entries);
      origins.push(...loaded.origins);
    }

    return { entries, origins };
  }

  return loadEntriesFromDocument(readJsonFile(targetPath), targetPath);
}

function loadEntriesFromDocument(document, sourcePath) {
  if (Array.isArray(document)) {
    return {
      entries: document,
      origins: document.map((_, index) => `${relativeToRepo(sourcePath)}[${index}]`),
    };
  }

  if (!isPlainObject(document)) {
    throw new Error(`Expected a JSON object or array at ${relativeToRepo(sourcePath)}.`);
  }

  if (Array.isArray(document.entries)) {
    return {
      entries: document.entries,
      origins: document.entries.map((_, index) => `${relativeToRepo(sourcePath)}.entries[${index}]`),
    };
  }

  return {
    entries: [document],
    origins: [relativeToRepo(sourcePath)],
  };
}

function validateEntry(entry, origin, errors) {
  if (!isPlainObject(entry)) {
    errors.push(`${origin}: entry must be a JSON object.`);
    return;
  }

  const keys = Object.keys(entry);
  const missingKeys = requiredKeys.filter((key) => !keys.includes(key));
  const extraKeys = keys.filter((key) => !requiredKeys.includes(key));

  if (missingKeys.length > 0) {
    errors.push(`${origin}: missing required keys: ${missingKeys.join(', ')}.`);
  }

  if (extraKeys.length > 0) {
    errors.push(`${origin}: unknown keys are not allowed: ${extraKeys.join(', ')}.`);
  }

  validateRequiredTrimmedString(entry, 'source', origin, errors);
  validateRequiredTrimmedString(entry, 'source_type', origin, errors);
  validateRequiredTrimmedString(entry, 'full_text_status', origin, errors);
  validateRequiredTrimmedString(entry, 'reliability_tier', origin, errors);
  validateRequiredTrimmedString(entry, 'chunk_id', origin, errors);
  validatePage(entry.page, origin, errors);
  validateNormalizedClaim(entry.normalized_claim, origin, errors);
  validateOntologyMapping(entry.maps_to_primary, entry.maps_to_secondary, origin, errors);
  validateEnum(entry.evidence_type, allowedEvidenceTypes, 'evidence_type', origin, errors);
  validateConfidence(entry.confidence, origin, errors);
  validateEnum(entry.conflict_status, allowedConflictStatuses, 'conflict_status', origin, errors);
  validateConflictNote(entry.conflict_status, entry.conflict_note, origin, errors);
  validateEnum(entry.admission_decision, allowedAdmissionDecisions, 'admission_decision', origin, errors);
  validateRequiredTrimmedString(entry, 'admission_reason', origin, errors);
  validateAdmissionConstraints(entry, origin, errors);
}

function validateRequiredTrimmedString(entry, key, origin, errors) {
  const value = entry[key];

  if (typeof value !== 'string' || value.trim().length === 0) {
    errors.push(`${origin}: ${key} must be a non-empty trimmed string.`);
    return;
  }

  if (value !== value.trim()) {
    errors.push(`${origin}: ${key} must not include leading or trailing whitespace.`);
  }
}

function validatePage(value, origin, errors) {
  if (value === null) {
    return;
  }

  if (!Number.isInteger(value) || value < 1) {
    errors.push(`${origin}: page must be a positive integer or null.`);
  }
}

function validateNormalizedClaim(value, origin, errors) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    errors.push(`${origin}: normalized_claim must be a non-empty string.`);
    return;
  }

  if (value !== value.trim()) {
    errors.push(`${origin}: normalized_claim must not include leading or trailing whitespace.`);
  }

  if (value.length < 12) {
    errors.push(`${origin}: normalized_claim is too short to be doctrine-safe.`);
  }

  if (/["'`]/.test(value)) {
    errors.push(`${origin}: normalized_claim must not contain quote characters.`);
  }

  if (/\r|\n/.test(value)) {
    errors.push(`${origin}: normalized_claim must stay on a single line.`);
  }

  const sentenceCount = (value.match(/[.!?](?=\s|$)/g) || []).length;
  if (sentenceCount > 1) {
    errors.push(`${origin}: normalized_claim must carry one idea only.`);
  }
}

function validateOntologyMapping(primary, secondary, origin, errors) {
  if (!allowedOntologyTypes.has(primary)) {
    errors.push(`${origin}: maps_to_primary must be one of ${Array.from(allowedOntologyTypes).join(', ')}.`);
  }

  if (secondary !== null && !allowedOntologyTypes.has(secondary)) {
    errors.push(`${origin}: maps_to_secondary must be null or one of ${Array.from(allowedOntologyTypes).join(', ')}.`);
  }

  if (secondary !== null && secondary === primary) {
    errors.push(`${origin}: maps_to_secondary must not be identical to maps_to_primary.`);
  }
}

function validateEnum(value, allowedValues, key, origin, errors) {
  if (typeof value !== 'string' || !allowedValues.has(value)) {
    errors.push(`${origin}: ${key} must be one of ${Array.from(allowedValues).join(', ')}.`);
  }
}

function validateConfidence(value, origin, errors) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    errors.push(`${origin}: confidence must be a finite number.`);
    return;
  }

  if (value < 0 || value > 1) {
    errors.push(`${origin}: confidence must stay within 0.0 and 1.0.`);
  }
}

function validateConflictNote(conflictStatus, conflictNote, origin, errors) {
  if (typeof conflictNote !== 'string') {
    errors.push(`${origin}: conflict_note must be a string.`);
    return;
  }

  if (!allowedConflictStatuses.has(conflictStatus)) {
    return;
  }

  if (conflictStatus === 'none' && conflictNote.trim().length > 0) {
    errors.push(`${origin}: conflict_note must be empty when conflict_status is none.`);
  }

  if (conflictStatus !== 'none' && conflictNote.trim().length === 0) {
    errors.push(`${origin}: conflict_note is required when conflict_status is ${conflictStatus}.`);
  }
}

function validateAdmissionConstraints(entry, origin, errors) {
  if (entry.evidence_type === 'inferred' && entry.confidence > 0.7) {
    errors.push(`${origin}: inferred claims cannot carry confidence above 0.7.`);
  }

  if (entry.confidence < 0.5 && entry.admission_decision === 'accepted') {
    errors.push(`${origin}: claims below 0.5 confidence cannot be accepted.`);
  }

  if (entry.conflict_status === 'unresolved' && entry.admission_decision === 'accepted') {
    errors.push(`${origin}: unresolved conflicts must block admission.`);
  }

  if (entry.conflict_status === 'detected' && entry.admission_decision === 'accepted') {
    errors.push(`${origin}: detected conflicts must be resolved before admission.`);
  }
}

function validateDuplicateNormalizedClaims(entries, origins, errors) {
  const acceptedClaims = new Map();

  entries.forEach((entry, index) => {
    if (!entry || typeof entry.normalized_claim !== 'string' || entry.normalized_claim.trim().length === 0) {
      return;
    }

    if (entry.admission_decision !== 'accepted') {
      return;
    }

    const key = canonicalizeClaim(entry.normalized_claim);
    const existing = acceptedClaims.get(key);

    if (!existing) {
      acceptedClaims.set(key, [origins[index]]);
      return;
    }

    existing.push(origins[index]);
  });

  for (const [claim, claimOrigins] of acceptedClaims.entries()) {
    if (claimOrigins.length > 1) {
      errors.push(
        `duplicate accepted normalized_claim detected for "${claim}" across ${claimOrigins.join(', ')}.`,
      );
    }
  }
}

function canonicalizeClaim(value) {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

function readJsonFile(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    throw new Error(`Failed to read JSON at ${relativeToRepo(filePath)}: ${error.message}`);
  }
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function relativeToRepo(filePath) {
  return path.relative(repoRoot, filePath) || '.';
}
