'use strict';

const { Router } = require('express');
const {
  LEGAL_VALIDATOR_RESOURCE,
  LEGAL_VALIDATOR_PRODUCT,
  LEGAL_VALIDATOR_SCOPE,
  LEGAL_VALIDATOR_SCOPE_LOCK_CONTRACT_VERSION,
  LEGAL_VALIDATOR_REQUIRED_SCOPE_KEYS,
  readWrappedInput,
  validateScopeLockInput,
} = require('../../../modules/legal-validator/shared/legal-validator-runtime.contract');
const intakeRoute = require('./legal-validator-intake.route');
const governanceRoute = require('./legal-validator-governance.route');
const runsRoute = require('./legal-validator-runs.route');
const orchestrateRoute = require('./legal-validator-orchestrate.route');
const replayRoute = require('./legal-validator-replay.route');

const router = Router();
const TENANT_SCOPING_HEADERS = ['x-tenant-id', 'x-chatpdm-tenant-id', 'tenant-id'];

function writeError(res, statusCode, code, message) {
  res.status(statusCode).json({
    error: {
      code,
      message,
    },
  });
}

function setNoStoreHeaders(res) {
  res.setHeader('Cache-Control', 'no-store, private, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
}

function enforceSingleTenantSurface(req, res, next) {
  const tenantHeader = TENANT_SCOPING_HEADERS.find((header) => {
    const value = req.headers[header];

    if (Array.isArray(value)) {
      return value.some((item) => typeof item === 'string' && item.trim().length > 0);
    }

    return typeof value === 'string' && value.trim().length > 0;
  });

  if (tenantHeader) {
    writeError(
      res,
      400,
      'tenant_scope_not_supported',
      'Legal Argument Validator is single-tenant and does not accept tenant-scoping headers.',
    );
    return;
  }

  next();
}

function handleBoundaryRequest(req, res) {
  const wrappedInput = readWrappedInput(req.body);

  if (wrappedInput.kind !== 'ok') {
    writeError(res, 400, 'invalid_legal_validator_input', wrappedInput.message);
    return;
  }

  const validation = validateScopeLockInput(wrappedInput.input);

  if (validation.kind === 'invalid') {
    writeError(res, 400, 'invalid_legal_validator_input', validation.message);
    return;
  }

  if (validation.kind === 'scope_violation') {
    writeError(res, 422, 'legal_validator_scope_lock_violation', validation.message);
    return;
  }

  res.json({
    resource: LEGAL_VALIDATOR_RESOURCE,
    status: 'active',
    contractVersion: LEGAL_VALIDATOR_SCOPE_LOCK_CONTRACT_VERSION,
    selectedSurface: 'scope-lock',
    inputType: 'validator_boundary_envelope',
    boundary: validation.boundary,
    allowedOutcomes: ['valid', 'invalid', 'unresolved'],
    runtimeOperations: ['scope-lock', 'intake', 'orchestrate'],
  });
}

router.use((req, res, next) => {
  setNoStoreHeaders(res);
  next();
});
router.use(enforceSingleTenantSurface);

router.get('/', (_req, res) => {
  res.json({
    resource: LEGAL_VALIDATOR_RESOURCE,
    status: 'active',
    contractVersion: LEGAL_VALIDATOR_SCOPE_LOCK_CONTRACT_VERSION,
    boundary: {
      product: LEGAL_VALIDATOR_PRODUCT,
      scope: LEGAL_VALIDATOR_SCOPE,
    },
    allowedOperations: ['scope-lock', 'intake', 'orchestrate', 'replay', 'inspect-run', 'governance'],
    allowedOutcomes: ['valid', 'invalid', 'unresolved'],
    operationalControls: {
      singleTenant: true,
      authzRequired: false,
      cachePolicy: 'no-store',
      auditableSurfaces: ['governance', 'runs', 'report', 'export', 'replay'],
    },
    requiredInputShape: {
      topLevel: ['input'],
      inputFields: LEGAL_VALIDATOR_REQUIRED_SCOPE_KEYS,
    },
  });
});

router.post('/', handleBoundaryRequest);
router.use('/intake', intakeRoute);
router.use('/governance', governanceRoute);
router.use('/runs', runsRoute);
router.use('/orchestrate', orchestrateRoute);
router.use('/replay', replayRoute);

module.exports = router;
