'use strict';

const { Router } = require('express');

const ZEE_RESOURCE = 'zee';
const ZEE_CANONICAL_ROUTE = '/zeroglare-evidence-engine';
const ZEE_API_ROUTE = '/api/v1/zee';
const ZEE_NON_OPERATIONAL_MESSAGE =
  'This endpoint is a non-operational scaffold and not a live analysis output.';
const ZEE_NON_AUTHORITATIVE_INVARIANT =
  'ZEE outputs are non-authoritative and cannot be consumed as inputs by any other system surface.';

const router = Router();

function buildScaffoldResponse(operation, details) {
  return {
    resource: ZEE_RESOURCE,
    operation,
    status: 'non_operational_scaffold',
    liveAnalysis: false,
    message: ZEE_NON_OPERATIONAL_MESSAGE,
    ...details,
  };
}

function buildSurfaceContract(operation) {
  return {
    name: 'ZeroGlare Evidence Engine',
    canonicalRoute: ZEE_CANONICAL_ROUTE,
    apiRoute: `${ZEE_API_ROUTE}/${operation}`,
    boundary: ZEE_NON_AUTHORITATIVE_INVARIANT,
    runtimeRelation: 'isolated',
  };
}

router.get('/', (_req, res) => {
  res.json({
    resource: ZEE_RESOURCE,
    status: 'non_operational_scaffold',
    availableOperations: ['contract', 'explain', 'audit'],
    message: ZEE_NON_OPERATIONAL_MESSAGE,
  });
});

router.get('/contract', (_req, res) => {
  res.json(
    buildScaffoldResponse('contract', {
      contract: buildSurfaceContract('contract'),
      description:
        'Static contract surface for the isolated ZEE system boundary. No live analysis is performed here.',
    }),
  );
});

router.get('/explain', (_req, res) => {
  res.json(
    buildScaffoldResponse('explain', {
      explanation: {
        name: 'ZeroGlare Evidence Engine',
        canonicalRoute: ZEE_CANONICAL_ROUTE,
        apiRoute: `${ZEE_API_ROUTE}/explain`,
        purpose: 'Static explanation scaffold for deterministic evidence analysis.',
        pipeline: [
          'Frame Isolation',
          'Signal Extraction',
          'Signal Stability',
          'Measurement Layer',
          'Inference Gate',
          'Bounded Output',
        ],
      },
    }),
  );
});

router.get('/audit', (_req, res) => {
  res.json(
    buildScaffoldResponse('audit', {
      audit: {
        name: 'ZeroGlare Evidence Engine',
        canonicalRoute: ZEE_CANONICAL_ROUTE,
        apiRoute: `${ZEE_API_ROUTE}/audit`,
        reviewScope: ['boundary', 'routing', 'metadata', 'footer', 'frontend render'],
        note: 'Static audit scaffold only. No live analysis or runtime inspection is performed here.',
      },
    }),
  );
});

module.exports = router;
