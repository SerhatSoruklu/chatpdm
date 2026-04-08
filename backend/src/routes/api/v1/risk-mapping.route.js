'use strict';

const { Router } = require('express');
const { ORGANIZATION_RISK } = require('../../../modules/risk-mapping/constants/rmgDomains');
const { inspectNodeRegistry } = require('../../../modules/risk-mapping/inspect/inspectNodeRegistry');
const { inspectThreatRegistry } = require('../../../modules/risk-mapping/inspect/inspectThreatRegistry');
const { inspectCompatibilityRegistry } = require('../../../modules/risk-mapping/inspect/inspectCompatibilityRegistry');
const { inspectFalsifierRegistry } = require('../../../modules/risk-mapping/inspect/inspectFalsifierRegistry');
const { inspectRiskMapExplanation } = require('../../../modules/risk-mapping/inspect/inspectRiskMapExplanation');
const { inspectRiskMapAuditReport } = require('../../../modules/risk-mapping/inspect/inspectRiskMapAuditReport');
const { inspectRiskMapGovernanceReport } = require('../../../modules/risk-mapping/inspect/inspectRiskMapGovernanceReport');
const { inspectRiskMapArtifactDiff } = require('../../../modules/risk-mapping/inspect/inspectRiskMapArtifactDiff');
const { resolveRiskMapQuery } = require('../../../modules/risk-mapping/resolve/resolveRiskMapQuery');

const router = Router();

function toStringArray(value) {
  if (Array.isArray(value)) {
    return value.filter((entry) => typeof entry === 'string' && entry.trim().length > 0);
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    return value
      .split(',')
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);
  }

  return [];
}

function toSingleString(value, fallback) {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value.trim();
  }

  if (Array.isArray(value)) {
    const first = value.find((entry) => typeof entry === 'string' && entry.trim().length > 0);
    if (typeof first === 'string') {
      return first.trim();
    }
  }

  return fallback;
}

function buildRiskMapInput(query) {
  return {
    entity: toSingleString(query.entity, query.entity),
    timeHorizon: toSingleString(query.timeHorizon, query.timeHorizon),
    scenarioType: toSingleString(query.scenarioType, query.scenarioType),
    domain: toSingleString(query.domain, ORGANIZATION_RISK),
    scope: toStringArray(query.scope),
    evidenceSetVersion: toSingleString(query.evidenceSetVersion, query.evidenceSetVersion),
  };
}

function writeError(res, statusCode, code, message) {
  res.status(statusCode).json({
    error: {
      code,
      message,
    },
  });
}

function handleExplanationRequest(req, res) {
  try {
    const payload = inspectRiskMapExplanation(buildRiskMapInput(req.query));
    res.json(payload);
  } catch (error) {
    if (error instanceof TypeError) {
      writeError(res, 400, 'invalid_risk_map_query', error.message);
      return;
    }

    process.stderr.write(`[chatpdm-backend] risk-map explanation failed: ${error.stack || error.message}\n`);
    writeError(res, 500, 'risk_map_explain_failed', 'The risk map explanation surface could not produce a valid response.');
  }
}

function handleAuditRequest(req, res) {
  try {
    const payload = inspectRiskMapAuditReport(buildRiskMapInput(req.query));
    res.json(payload);
  } catch (error) {
    if (error instanceof TypeError) {
      writeError(res, 400, 'invalid_risk_map_query', error.message);
      return;
    }

    process.stderr.write(`[chatpdm-backend] risk-map audit failed: ${error.stack || error.message}\n`);
    writeError(res, 500, 'risk_map_audit_failed', 'The risk map audit surface could not produce a valid response.');
  }
}

function handleResolveRequest(req, res) {
  try {
    const payload = resolveRiskMapQuery(buildRiskMapInput(req.query));
    res.json(payload);
  } catch (error) {
    if (error instanceof TypeError) {
      writeError(res, 400, 'invalid_risk_map_query', error.message);
      return;
    }

    process.stderr.write(`[chatpdm-backend] risk-map resolve failed: ${error.stack || error.message}\n`);
    writeError(res, 500, 'risk_map_resolve_failed', 'The risk map resolve surface could not produce a valid response.');
  }
}

function handleGovernanceRequest(req, res) {
  try {
    res.json(inspectRiskMapGovernanceReport());
  } catch (error) {
    process.stderr.write(`[chatpdm-backend] risk-map governance inspect failed: ${error.stack || error.message}\n`);
    writeError(res, 500, 'risk_map_governance_failed', 'The risk map governance surface could not produce a valid response.');
  }
}

function handleDiffRequest(req, res) {
  try {
    res.json(inspectRiskMapArtifactDiff());
  } catch (error) {
    if (error instanceof Error && /Missing JSON artifact/i.test(error.message)) {
      writeError(res, 404, 'risk_map_diff_unavailable', 'No generated risk map diff report is currently available.');
      return;
    }

    process.stderr.write(`[chatpdm-backend] risk-map diff inspect failed: ${error.stack || error.message}\n`);
    writeError(res, 500, 'risk_map_diff_failed', 'The risk map diff surface could not produce a valid response.');
  }
}

function handleRegistryRequest(res, inspectRegistry, domainId) {
  try {
    res.json(inspectRegistry(domainId));
  } catch (error) {
    process.stderr.write(`[chatpdm-backend] risk-map registry inspect failed: ${error.stack || error.message}\n`);
    writeError(res, 500, 'risk_map_registry_failed', 'The risk map registry surface could not produce a valid response.');
  }
}

router.get('/', (req, res) => {
  res.json({
    resource: 'risk-mapping',
    status: 'active',
    availableOperations: ['audit', 'diff', 'explain', 'governance', 'registries', 'resolve'],
  });
});

router.get('/explain', handleExplanationRequest);
router.get('/resolve', handleResolveRequest);
router.get('/audit', handleAuditRequest);
router.get('/governance', handleGovernanceRequest);
router.get('/diff', handleDiffRequest);

router.get('/registries/nodes', (req, res) => {
  handleRegistryRequest(res, inspectNodeRegistry, toSingleString(req.query.domain, ORGANIZATION_RISK));
});

router.get('/registries/threats', (req, res) => {
  handleRegistryRequest(res, inspectThreatRegistry, toSingleString(req.query.domain, ORGANIZATION_RISK));
});

router.get('/registries/compatibility', (req, res) => {
  handleRegistryRequest(res, inspectCompatibilityRegistry, toSingleString(req.query.domain, ORGANIZATION_RISK));
});

router.get('/registries/falsifiers', (req, res) => {
  handleRegistryRequest(res, inspectFalsifierRegistry, toSingleString(req.query.domain, ORGANIZATION_RISK));
});

module.exports = router;
