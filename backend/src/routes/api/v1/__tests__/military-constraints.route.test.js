'use strict';

const http = require('node:http');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const app = require('../../../../app');
const { buildReferenceBundle } = require('../../../../modules/military-constraints/build-reference-pack');

const MODULE_DIR = path.resolve(__dirname, '../../../../modules/military-constraints');
const PACK_MANIFEST_PATH = path.join(MODULE_DIR, 'reference-pack-manifest.medical-protection.json');

function startServer() {
  return new Promise((resolve) => {
    const server = http.createServer(app);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      resolve({
        server,
        baseUrl: `http://127.0.0.1:${address.port}`,
      });
    });
  });
}

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  return {
    status: response.status,
    body: await response.json(),
  };
}

function buildAllowedFacts(bundle) {
  return {
    bundleId: bundle.bundleId,
    bundleVersion: bundle.bundleVersion,
    bundleHash: bundle.bundleHash,
    actor: {
      id: 'MED-TEAM-01',
      role: 'SECURITY_LEAD',
      authorityLevelId: 'BATTALION',
    },
    action: {
      kind: 'ENGAGE',
      forceLevel: 'NON_LETHAL',
      method: 'ACCESS_CONTROL',
      domain: 'LAND',
    },
    target: {
      id: 'HOSPITAL-01',
      objectType: 'HOSPITAL',
      protectedClass: 'MEDICAL',
      lossOfProtectionStatus: 'CONFIRMED_TRUE',
      militaryObjectiveStatus: 'CONFIRMED_FALSE',
      horsDeCombatStatus: false,
    },
    context: {
      zone: 'HOSPITAL-SECURITY-ZONE',
      missionType: 'ARMED_CONFLICT',
      operationPhase: 'ACCESS_CONTROL',
      operationalSlice: 'MEDICAL_PROTECTION',
      coalitionMode: 'NATIONAL',
      timeWindowStart: '2026-04-13T18:00:00.000Z',
      timeWindowEnd: '2026-04-13T19:00:00.000Z',
    },
    threat: {
      hostileAct: false,
      hostileIntent: false,
      imminence: 'NONE',
      necessity: 'UNRESOLVED',
    },
    civilianRisk: {
      civilianPresence: true,
      civilianObjectPresence: true,
      estimatedIncidentalHarm: 'HIGH',
      feasiblePrecautionsTaken: false,
      expectedMilitaryAdvantage: 'LOW',
      estimatedIncidentalHarmScore: 85,
      expectedMilitaryAdvantageScore: 15,
    },
    authority: {
      reservedToHigherCommand: false,
      nationalCaveat: false,
      delegatedToUnit: true,
      designatedRoeActive: true,
      designatedActionAuthorized: true,
    },
  };
}

test('military constraints public surface exposes bounded discovery and pack metadata', async () => {
  const { server, baseUrl } = await startServer();

  try {
    const root = await fetchJson(`${baseUrl}/api/v1/military-constraints`);
    const packs = await fetchJson(`${baseUrl}/api/v1/military-constraints/packs`);
    const pack = await fetchJson(`${baseUrl}/api/v1/military-constraints/packs/mil-us-medical-protection-core-v0.1.0`);

    assert.equal(root.status, 200);
    assert.deepEqual(Object.keys(root.body), ['resource', 'status', 'availableOperations', 'packCount']);
    assert.equal(root.body.resource, 'military-constraints');
    assert.equal(root.body.status, 'active');
    assert.deepEqual(root.body.availableOperations, ['packs', 'evaluate']);
    assert.equal(root.body.packCount, 5);

    assert.equal(packs.status, 200);
    assert.deepEqual(Object.keys(packs.body), ['resource', 'status', 'packs']);
    assert.equal(packs.body.resource, 'military-constraints');
    assert.equal(packs.body.status, 'active');
    assert.equal(packs.body.packs.length, 5);
    assert.deepEqual(
      packs.body.packs.map((entry) => entry.packId),
      [
        'mil-us-civilian-school-protection-core-v0.1.0',
        'mil-us-core-reference',
        'mil-us-maritime-vbss-core-v0.1.0',
        'mil-us-medical-protection-core-v0.1.0',
        'mil-us-protected-person-state-core-v0.1.0',
      ],
    );

    assert.equal(pack.status, 200);
    assert.deepEqual(Object.keys(pack.body), ['resource', 'status', 'pack']);
    assert.equal(pack.body.resource, 'military-constraints');
    assert.equal(pack.body.status, 'active');
    assert.deepEqual(Object.keys(pack.body.pack), [
      'packId',
      'bundleId',
      'bundleVersion',
      'jurisdiction',
      'authorityGraphId',
      'reviewedClauseSetIds',
      'sourceRegistryVersion',
      'regressionSuiteVersion',
    ]);
    assert.equal(pack.body.pack.packId, 'mil-us-medical-protection-core-v0.1.0');
    assert.equal(pack.body.pack.bundleId, 'mil-us-medical-protection-core-bundle');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('military constraints public surface refuses malformed pack ids and incomplete fact packets', async () => {
  const { server, baseUrl } = await startServer();

  try {
    const missingPackId = await fetchJson(`${baseUrl}/api/v1/military-constraints/evaluate`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        facts: {},
      }),
    });

    const missingFacts = await fetchJson(`${baseUrl}/api/v1/military-constraints/evaluate`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        packId: 'mil-us-medical-protection-core-v0.1.0',
      }),
    });

    const invalidPack = await fetchJson(`${baseUrl}/api/v1/military-constraints/packs/INVALID!`);
    const unknownPack = await fetchJson(`${baseUrl}/api/v1/military-constraints/packs/mil-us-ghost-core-v0.1.0`);
    const incompleteFacts = await fetchJson(`${baseUrl}/api/v1/military-constraints/evaluate`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        packId: 'mil-us-medical-protection-core-v0.1.0',
        facts: {
          bundleId: 'mil-us-medical-protection-core-bundle',
          bundleVersion: '0.1.0',
        },
      }),
    });

    assert.equal(missingPackId.status, 400);
    assert.equal(missingPackId.body.error.code, 'invalid_military_constraints_request');
    assert.match(missingPackId.body.error.message, /packId and facts/i);

    assert.equal(missingFacts.status, 400);
    assert.equal(missingFacts.body.error.code, 'invalid_military_constraints_request');
    assert.match(missingFacts.body.error.message, /packId and facts/i);

    assert.equal(invalidPack.status, 400);
    assert.equal(invalidPack.body.error.code, 'invalid_military_constraints_pack_id');
    assert.match(invalidPack.body.error.message, /lowercase pack identifier/i);

    assert.equal(unknownPack.status, 404);
    assert.equal(unknownPack.body.error.code, 'military_constraints_pack_not_found');
    assert.match(unknownPack.body.error.message, /No military constraints pack was found/i);

    assert.equal(incompleteFacts.status, 400);
    assert.equal(incompleteFacts.body.error.code, 'invalid_military_constraints_facts');
    assert.match(incompleteFacts.body.error.message, /must have required property/i);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('military constraints public surface rejects unknown fields and invalid fact enums', async () => {
  const { server, baseUrl } = await startServer();

  try {
    const unknownTopLevelField = await fetchJson(`${baseUrl}/api/v1/military-constraints/evaluate`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        packId: 'mil-us-medical-protection-core-v0.1.0',
        facts: {},
        extra: true,
      }),
    });

    const bundleResult = buildReferenceBundle({
      rootDir: MODULE_DIR,
      manifestPath: PACK_MANIFEST_PATH,
    });
    assert.equal(bundleResult.valid, true, bundleResult.errors.join('\n'));
    assert.ok(bundleResult.bundle, 'Expected Pack 3 bundle for invalid enum test.');

    const invalidEnumFacts = buildAllowedFacts(bundleResult.bundle);
    invalidEnumFacts.target.protectedClass = 'NOT_A_REAL_CLASS';

    const invalidEnum = await fetchJson(`${baseUrl}/api/v1/military-constraints/evaluate`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        packId: 'mil-us-medical-protection-core-v0.1.0',
        facts: invalidEnumFacts,
      }),
    });

    assert.equal(unknownTopLevelField.status, 400);
    assert.equal(unknownTopLevelField.body.error.code, 'invalid_military_constraints_request');
    assert.match(unknownTopLevelField.body.error.message, /only packId and facts/i);

    assert.equal(invalidEnum.status, 400);
    assert.equal(invalidEnum.body.error.code, 'invalid_military_constraints_facts');
    assert.match(invalidEnum.body.error.message, /must be equal to one of the allowed values|must match/i);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('military constraints public surface keeps packs isolated', async () => {
  const { server, baseUrl } = await startServer();

  try {
    const medical = await fetchJson(`${baseUrl}/api/v1/military-constraints/packs/mil-us-medical-protection-core-v0.1.0`);
    const civilian = await fetchJson(`${baseUrl}/api/v1/military-constraints/packs/mil-us-civilian-school-protection-core-v0.1.0`);

    assert.equal(medical.status, 200);
    assert.equal(civilian.status, 200);
    assert.notEqual(medical.body.pack.bundleId, civilian.body.pack.bundleId);
    assert.notDeepEqual(medical.body.pack.reviewedClauseSetIds, civilian.body.pack.reviewedClauseSetIds);
    assert.equal(medical.body.pack.packId, 'mil-us-medical-protection-core-v0.1.0');
    assert.equal(civilian.body.pack.packId, 'mil-us-civilian-school-protection-core-v0.1.0');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('military constraints evaluate endpoint returns the bounded runtime projection without prose or hidden traces', async () => {
  const { server, baseUrl } = await startServer();

  try {
    const bundleResult = buildReferenceBundle({
      rootDir: MODULE_DIR,
      manifestPath: PACK_MANIFEST_PATH,
    });

    assert.equal(bundleResult.valid, true, bundleResult.errors.join('\n'));
    assert.ok(bundleResult.bundle, 'Expected Pack 3 bundle for public API test.');

    const response = await fetchJson(`${baseUrl}/api/v1/military-constraints/evaluate`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        packId: 'mil-us-medical-protection-core-v0.1.0',
        facts: buildAllowedFacts(bundleResult.bundle),
      }),
    });

    assert.equal(response.status, 200);
    assert.deepEqual(Object.keys(response.body), [
      'decision',
      'reasonCode',
      'failedStage',
      'failingRuleIds',
      'missingFactIds',
      'bundleVersion',
      'bundleHash',
    ]);
    assert.equal(response.body.decision, 'ALLOWED');
    assert.equal(response.body.reasonCode, null);
    assert.equal(response.body.failedStage, null);
    assert.deepEqual(response.body.failingRuleIds, []);
    assert.deepEqual(response.body.missingFactIds, []);
    assert.equal(response.body.bundleVersion, '0.1.0');
    assert.match(response.body.bundleHash, /^sha256:/);
    assert.equal(Object.prototype.hasOwnProperty.call(response.body, 'authorityTrace'), false);
    assert.equal(Object.prototype.hasOwnProperty.call(response.body, 'ruleTrace'), false);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
