const fs = require('node:fs');
const path = require('node:path');

const Ajv2020 = require('ajv/dist/2020');
const addFormats = require('ajv-formats');
const { loadLiveClaimIds } = require('./policy-surface-data');

const repoRoot = path.resolve(__dirname, '..');
const hypothesesPath = path.join(repoRoot, 'policies', 'policy-hypotheses.json');
const schemaPath = path.join(repoRoot, 'policies', 'policy-hypotheses.schema.json');

main();

function main() {
  try {
    const schema = readJsonFile(schemaPath);
    const hypothesesDocument = readJsonFile(hypothesesPath);
    const claimIds = loadLiveClaimIds();

    validateSchema(hypothesesDocument, schema);
    validateClaimReferences(hypothesesDocument.hypotheses, claimIds);
    validateExpiry(hypothesesDocument.hypotheses);
    validateClosureProvenance(hypothesesDocument.hypotheses);

    // TODO(PR2+): add lifecycle-ready governance path enforcement when stores-claim
    // metadata exists in the authoritative claim dataset. Do not guess at missing
    // lifecycle fields in PR1.

    console.log(
      `Policy governance validation passed for ${hypothesesDocument.hypotheses.length} hypotheses against ${claimIds.size} live claims.`,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    process.exit(1);
  }
}

function readJsonFile(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    throw new Error(`Failed to read JSON file at ${relativeToRepo(filePath)}: ${error.message}`);
  }
}

function validateSchema(document, schema) {
  const ajv = new Ajv2020({
    allErrors: true,
    strict: true,
  });
  addFormats(ajv);

  const validate = ajv.compile(schema);
  const isValid = validate(document);

  if (isValid) {
    return;
  }

  const errors = (validate.errors || []).map(formatAjvError).join('\n');
  throw new Error(`policy-hypotheses.json failed schema validation:\n${errors}`);
}

function validateClaimReferences(hypotheses, liveClaimIds) {
  const errors = [];

  for (const hypothesis of hypotheses) {
    if (!liveClaimIds.has(hypothesis.claim_id)) {
      errors.push(
        `Missing claim reference for hypothesis ${hypothesis.id}: claim_id ${hypothesis.claim_id} not found in generated policy dataset`,
      );
    }
  }

  if (errors.length > 0) {
    throw new Error(errors.join('\n'));
  }
}

function validateExpiry(hypotheses) {
  const today = getTodayUtc();
  const errors = [];

  for (const hypothesis of hypotheses) {
    if (hypothesis.status !== 'unverified') {
      continue;
    }

    const openedAt = parseDateUtc(hypothesis.opened_at);
    const expiryDate = addDaysUtc(openedAt, hypothesis.expires_after_days);

    if (today.getTime() > expiryDate.getTime()) {
      errors.push(`Unverified hypothesis expired: ${hypothesis.id}`);
    }
  }

  if (errors.length > 0) {
    throw new Error(errors.join('\n'));
  }
}

function validateClosureProvenance(hypotheses) {
  const errors = [];

  for (const hypothesis of hypotheses) {
    if (hypothesis.status !== 'closed') {
      continue;
    }

    if (typeof hypothesis.linked_pr !== 'string' || hypothesis.linked_pr.trim().length === 0) {
      errors.push(`Closed hypothesis missing linked_pr: ${hypothesis.id}`);
    }
  }

  if (errors.length > 0) {
    throw new Error(errors.join('\n'));
  }
}

function formatAjvError(error) {
  const location = error.instancePath || '/';
  return `- ${location} ${error.message}`;
}

function getTodayUtc() {
  const override = process.env.POLICY_GOVERNANCE_TODAY;

  if (override) {
    return parseDateUtc(override);
  }

  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function parseDateUtc(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!match) {
    throw new Error(`Invalid governance date value: ${value}`);
  }

  const [, year, month, day] = match;
  return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
}

function addDaysUtc(date, days) {
  const result = new Date(date.getTime());
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function relativeToRepo(filePath) {
  return path.relative(repoRoot, filePath) || '.';
}
