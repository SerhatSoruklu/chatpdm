'use strict';

const http = require('node:http');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const app = require('../../../../app');
const { buildReferenceBundle } = require('../../../../modules/military-constraints/build-reference-pack');

const MODULE_DIR = path.resolve(__dirname, '../../../../modules/military-constraints');
const PACK_MANIFEST_PATH = path.join(MODULE_DIR, 'reference-pack-manifest.medical-protection.json');
const AIRSPACE_PACK_MANIFEST_PATH = path.join(MODULE_DIR, 'reference-pack-manifest.airspace-control.json');
const CA_AIRSPACE_PACK_MANIFEST_PATH = path.join(MODULE_DIR, 'reference-pack-manifest.ca-airspace-control.json');
const AU_AIRSPACE_PACK_MANIFEST_PATH = path.join(MODULE_DIR, 'reference-pack-manifest.au-airspace-control.json');
const CA_NATIONAL_PACK_MANIFEST_PATH = path.join(MODULE_DIR, 'reference-pack-manifest.ca-national-base.json');
const AU_NATIONAL_PACK_MANIFEST_PATH = path.join(MODULE_DIR, 'reference-pack-manifest.au-national-base.json');
const NL_AIRSPACE_PACK_MANIFEST_PATH = path.join(MODULE_DIR, 'reference-pack-manifest.nl-airspace-control.json');
const NL_NATIONAL_PACK_MANIFEST_PATH = path.join(MODULE_DIR, 'reference-pack-manifest.nl-national-base.json');
const TR_AIRSPACE_PACK_MANIFEST_PATH = path.join(MODULE_DIR, 'reference-pack-manifest.tr-airspace-control.json');
const TR_NATIONAL_PACK_MANIFEST_PATH = path.join(MODULE_DIR, 'reference-pack-manifest.tr-national-base.json');

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

function buildAllowedAirspaceFacts(bundle) {
  return {
    bundleId: bundle.bundleId,
    bundleVersion: bundle.bundleVersion,
    bundleHash: bundle.bundleHash,
    actor: {
      id: 'AIRSPACE-TEAM-01',
      role: 'BRIGADE_COMMANDER',
      authorityLevelId: 'BRIGADE',
    },
    action: {
      kind: 'SURVEILLANCE',
      forceLevel: 'NON_LETHAL',
      method: 'AIRBORNE_SURVEILLANCE',
      domain: 'AIR',
    },
    target: {
      id: 'AIRSPACE-TARGET-01',
      protectedClass: 'MILITARY',
      militaryObjectiveStatus: 'CONFIRMED_TRUE',
      lossOfProtectionStatus: 'NOT_LOST',
      objectType: 'OTHER',
      horsDeCombatStatus: false,
    },
    context: {
      zone: 'AIRSPACE-CTRL-ZONE',
      missionType: 'ARMED_CONFLICT',
      operationPhase: 'PLANNING',
      operationalSlice: 'PROTECTED_PERSON_STATE',
      coalitionMode: 'NATIONAL',
      timeWindowStart: '2026-04-13T18:00:00.000Z',
      timeWindowEnd: '2026-04-13T19:00:00.000Z',
    },
    threat: {
      hostileAct: false,
      hostileIntent: false,
      imminence: 'NONE',
      necessity: 'LOW',
    },
    civilianRisk: {
      civilianPresence: false,
      civilianObjectPresence: false,
      estimatedIncidentalHarm: 'LOW',
      feasiblePrecautionsTaken: true,
      expectedMilitaryAdvantage: 'MEDIUM',
      estimatedIncidentalHarmScore: 5,
      expectedMilitaryAdvantageScore: 50,
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
    const ukPack = await fetchJson(`${baseUrl}/api/v1/military-constraints/packs/UK_NATIONAL_BASE_V1`);
    const natoInteropPack = await fetchJson(`${baseUrl}/api/v1/military-constraints/packs/NATO_INTEROP_BASE_V1`);
    const alliedAuthorityPack = await fetchJson(`${baseUrl}/api/v1/military-constraints/packs/ALLIED_AUTHORITY_MERGE_V1`);
    const natoRoePack = await fetchJson(`${baseUrl}/api/v1/military-constraints/packs/NATO_ROE_COMPAT_V1`);
    const usCoalitionPack = await fetchJson(`${baseUrl}/api/v1/military-constraints/packs/US_COALITION_INTEROP_V1`);
    const admittedPack = await fetchJson(`${baseUrl}/api/v1/military-constraints/packs/US_AIRSPACE_CONTROL_V1`);
    const noFlyPack = await fetchJson(`${baseUrl}/api/v1/military-constraints/packs/US_NO_FLY_ZONE_V1`);
    const isrRetentionPack = await fetchJson(`${baseUrl}/api/v1/military-constraints/packs/US_ISR_RETENTION_V1`);
    const nightOperationPack = await fetchJson(`${baseUrl}/api/v1/military-constraints/packs/US_NIGHT_OPERATION_V1`);
    const ukAirspacePack = await fetchJson(`${baseUrl}/api/v1/military-constraints/packs/UK_AIRSPACE_CONTROL_V1`);
    const ukGroundPack = await fetchJson(`${baseUrl}/api/v1/military-constraints/packs/UK_GROUND_MANEUVER_V1`);
    const caNationalPack = await fetchJson(`${baseUrl}/api/v1/military-constraints/packs/CA_NATIONAL_BASE_V1`);
    const caAirspacePack = await fetchJson(`${baseUrl}/api/v1/military-constraints/packs/CA_AIRSPACE_CONTROL_V1`);
    const auNationalPack = await fetchJson(`${baseUrl}/api/v1/military-constraints/packs/AU_NATIONAL_BASE_V1`);
    const auAirspacePack = await fetchJson(`${baseUrl}/api/v1/military-constraints/packs/AU_AIRSPACE_CONTROL_V1`);
    const nlNationalPack = await fetchJson(`${baseUrl}/api/v1/military-constraints/packs/NL_NATIONAL_BASE_V1`);
    const nlAirspacePack = await fetchJson(`${baseUrl}/api/v1/military-constraints/packs/NL_AIRSPACE_CONTROL_V1`);
    const trNationalPack = await fetchJson(`${baseUrl}/api/v1/military-constraints/packs/TR_NATIONAL_BASE_V1`);
    const trAirspacePack = await fetchJson(`${baseUrl}/api/v1/military-constraints/packs/TR_AIRSPACE_CONTROL_V1`);

    assert.equal(root.status, 200);
    assert.deepEqual(Object.keys(root.body), [
      'resource',
      'status',
      'availableOperations',
      'packCount',
      'registryPackCount',
      'baselinePackCount',
      'admittedPackCount',
      'plannedPackCount',
      'umbrellaLabelCount',
    ]);
    assert.equal(root.body.resource, 'military-constraints');
    assert.equal(root.body.status, 'active');
    assert.deepEqual(root.body.availableOperations, ['packs', 'evaluate']);
    assert.equal(root.body.packCount, 63);
    assert.equal(root.body.registryPackCount, 73);
    assert.equal(root.body.baselinePackCount, 5);
    assert.equal(root.body.admittedPackCount, 58);
    assert.equal(root.body.plannedPackCount, 10);
    assert.equal(root.body.umbrellaLabelCount, 1);

    assert.equal(packs.status, 200);
    assert.deepEqual(Object.keys(packs.body), ['resource', 'status', 'packs']);
    assert.equal(packs.body.resource, 'military-constraints');
    assert.equal(packs.body.status, 'active');
    assert.equal(packs.body.packs.length, 63);
    assert.deepEqual(
      packs.body.packs.map((entry) => entry.packId),
      [
        'INTL_LOAC_BASE_V1',
        'INTL_PROTECTED_PERSON_BASE_V1',
        'INTL_PROTECTED_SITE_BASE_V1',
        'UK_NATIONAL_BASE_V1',
        'UK_ROE_BASE_V1',
        'UK_COMMAND_AUTHORITY_V1',
        'UK_DELEGATION_CHAIN_V1',
        'mil-us-core-reference',
        'mil-us-protected-person-state-core-v0.1.0',
        'mil-us-maritime-vbss-core-v0.1.0',
        'mil-us-medical-protection-core-v0.1.0',
        'mil-us-civilian-school-protection-core-v0.1.0',
        'US_RULES_OF_ENGAGEMENT_BASE_V1',
        'US_LOAC_COMPLIANCE_V1',
        'US_COMMAND_AUTHORITY_V1',
        'US_DELEGATION_CHAIN_V1',
        'US_PROTECTED_SITE_V1',
        'NATO_INTEROP_BASE_V1',
        'ALLIED_AUTHORITY_MERGE_V1',
        'NATO_ROE_COMPAT_V1',
        'US_COALITION_INTEROP_V1',
        'US_AIRSPACE_CONTROL_V1',
        'US_GROUND_MANEUVER_V1',
        'US_CHECKPOINT_ADMISSIBILITY_V1',
        'US_SEARCH_AND_SEIZURE_V1',
        'US_DETENTION_HANDLING_V1',
        'US_NO_FLY_ZONE_V1',
        'US_TARGET_APPROVAL_V1',
        'US_COLLATERAL_DAMAGE_ASSESSMENT_V1',
        'US_HOSPITAL_PROTECTION_V1',
        'US_SCHOOL_ZONE_RESTRICTION_V1',
        'US_RELIGIOUS_SITE_PROTECTION_V1',
        'US_CULTURAL_PROPERTY_PROTECTION_V1',
        'US_AID_DELIVERY_SECURITY_V1',
        'US_EVACUATION_ROUTE_V1',
        'US_NIGHT_OPERATION_V1',
        'US_WEATHER_LIMITATION_V1',
        'US_SIGNAL_INTERFERENCE_V1',
        'US_ISR_RETENTION_V1',
        'US_WEAPON_STATUS_V1',
        'US_ALLIED_ROE_MERGE_V1',
        'UK_AIRSPACE_CONTROL_V1',
        'UK_GROUND_MANEUVER_V1',
        'CA_NATIONAL_BASE_V1',
        'CA_ROE_BASE_V1',
        'CA_COMMAND_AUTHORITY_V1',
        'CA_DELEGATION_CHAIN_V1',
        'CA_AIRSPACE_CONTROL_V1',
        'AU_NATIONAL_BASE_V1',
        'AU_ROE_BASE_V1',
        'AU_COMMAND_AUTHORITY_V1',
        'AU_DELEGATION_CHAIN_V1',
        'AU_AIRSPACE_CONTROL_V1',
        'NL_NATIONAL_BASE_V1',
        'NL_ROE_BASE_V1',
        'NL_COMMAND_AUTHORITY_V1',
        'NL_DELEGATION_CHAIN_V1',
        'NL_AIRSPACE_CONTROL_V1',
        'TR_NATIONAL_BASE_V1',
        'TR_ROE_BASE_V1',
        'TR_COMMAND_AUTHORITY_V1',
        'TR_DELEGATION_CHAIN_V1',
        'TR_AIRSPACE_CONTROL_V1',
      ],
    );
    const packsById = new Map(packs.body.packs.map((entry) => [entry.packId, entry]));
    assert.equal(packsById.get('mil-us-medical-protection-core-v0.1.0').overlayFamily, 'protection');
    assert.equal(packsById.get('mil-us-medical-protection-core-v0.1.0').overlayBoundary, 'person_site_bridge');
    assert.equal(packsById.get('mil-us-medical-protection-core-v0.1.0').overlayScope, 'jurisdictional');
    assert.equal(packsById.get('US_NO_FLY_ZONE_V1').overlayFamily, 'targeting_refinement');
    assert.equal(packsById.get('US_NO_FLY_ZONE_V1').overlayBoundary, 'airspace');
    assert.equal(packsById.get('ALLIED_AUTHORITY_MERGE_V1').overlayFamily, 'coalition_merge');
    assert.equal(packsById.get('ALLIED_AUTHORITY_MERGE_V1').overlayScope, 'coalition');
    assert.equal(packsById.get('US_ALLIED_ROE_MERGE_V1').overlayFamily, 'coalition_merge');
    assert.equal(packsById.get('US_ALLIED_ROE_MERGE_V1').overlayScope, 'jurisdictional');

    assert.equal(pack.status, 200);
    assert.deepEqual(Object.keys(pack.body), ['resource', 'status', 'pack']);
    assert.equal(pack.body.resource, 'military-constraints');
    assert.equal(pack.body.status, 'active');
    assert.equal(pack.body.pack.kind, 'overlay');
    assert.equal(pack.body.pack.status, 'baseline');
    assert.deepEqual(pack.body.pack.dependsOn, ['INTL_PROTECTED_SITE_BASE_V1', 'US_PROTECTED_PERSON_STATE_V1']);
    assert.equal(pack.body.pack.overlayFamily, 'protection');
    assert.equal(pack.body.pack.overlayBoundary, 'person_site_bridge');
    assert.equal(pack.body.pack.overlayScope, 'jurisdictional');
    assert.equal(pack.body.pack.registryOrder, 10);
    assert.equal(pack.body.pack.registryPresent, true);
    assert.equal(pack.body.pack.sourceRegistryVersion, '1.0.0');
    assert.equal(pack.body.pack.regressionSuiteVersion, '0.1.0');
    assert.equal(pack.body.pack.packId, 'mil-us-medical-protection-core-v0.1.0');
    assert.equal(pack.body.pack.bundleId, 'mil-us-medical-protection-core-bundle');

    assert.equal(ukPack.status, 200);
    assert.equal(ukPack.body.pack.packId, 'UK_NATIONAL_BASE_V1');
    assert.equal(ukPack.body.pack.kind, 'foundation');
    assert.equal(ukPack.body.pack.status, 'admitted');
    assert.deepEqual(ukPack.body.pack.dependsOn, ['INTL_LOAC_BASE_V1']);
    assert.equal(ukPack.body.pack.registryPresent, true);

    assert.equal(natoInteropPack.status, 200);
    assert.equal(natoInteropPack.body.pack.packId, 'NATO_INTEROP_BASE_V1');
    assert.equal(natoInteropPack.body.pack.kind, 'foundation');
    assert.equal(natoInteropPack.body.pack.status, 'admitted');
    assert.deepEqual(natoInteropPack.body.pack.dependsOn, ['INTL_LOAC_BASE_V1']);
    assert.equal(natoInteropPack.body.pack.registryPresent, true);

    assert.equal(alliedAuthorityPack.status, 200);
    assert.equal(alliedAuthorityPack.body.pack.packId, 'ALLIED_AUTHORITY_MERGE_V1');
    assert.equal(alliedAuthorityPack.body.pack.kind, 'overlay');
    assert.equal(alliedAuthorityPack.body.pack.status, 'admitted');
    assert.deepEqual(alliedAuthorityPack.body.pack.dependsOn, ['NATO_INTEROP_BASE_V1']);
    assert.equal(alliedAuthorityPack.body.pack.overlayFamily, 'coalition_merge');
    assert.equal(alliedAuthorityPack.body.pack.overlayBoundary, 'coalition');
    assert.equal(alliedAuthorityPack.body.pack.overlayScope, 'coalition');
    assert.equal(alliedAuthorityPack.body.pack.registryPresent, true);

    assert.equal(natoRoePack.status, 200);
    assert.equal(natoRoePack.body.pack.packId, 'NATO_ROE_COMPAT_V1');
    assert.equal(natoRoePack.body.pack.kind, 'overlay');
    assert.equal(natoRoePack.body.pack.status, 'admitted');
    assert.deepEqual(natoRoePack.body.pack.dependsOn, ['NATO_INTEROP_BASE_V1']);
    assert.equal(natoRoePack.body.pack.overlayFamily, 'coalition_merge');
    assert.equal(natoRoePack.body.pack.overlayBoundary, 'coalition');
    assert.equal(natoRoePack.body.pack.overlayScope, 'coalition');
    assert.equal(natoRoePack.body.pack.registryPresent, true);

    assert.equal(usCoalitionPack.status, 200);
    assert.equal(usCoalitionPack.body.pack.packId, 'US_COALITION_INTEROP_V1');
    assert.equal(usCoalitionPack.body.pack.kind, 'foundation');
    assert.equal(usCoalitionPack.body.pack.status, 'admitted');
    assert.deepEqual(usCoalitionPack.body.pack.dependsOn, ['NATO_INTEROP_BASE_V1']);
    assert.equal(usCoalitionPack.body.pack.registryPresent, true);

    assert.equal(ukAirspacePack.status, 200);
    assert.equal(ukAirspacePack.body.pack.packId, 'UK_AIRSPACE_CONTROL_V1');
    assert.equal(ukAirspacePack.body.pack.kind, 'domain');
    assert.equal(ukAirspacePack.body.pack.status, 'admitted');
    assert.deepEqual(ukAirspacePack.body.pack.dependsOn, [
      'UK_ROE_BASE_V1',
      'UK_COMMAND_AUTHORITY_V1',
      'UK_DELEGATION_CHAIN_V1',
    ]);
    assert.equal(ukAirspacePack.body.pack.registryPresent, true);

    assert.equal(ukGroundPack.status, 200);
    assert.equal(ukGroundPack.body.pack.packId, 'UK_GROUND_MANEUVER_V1');
    assert.equal(ukGroundPack.body.pack.kind, 'domain');
    assert.equal(ukGroundPack.body.pack.status, 'admitted');
    assert.deepEqual(ukGroundPack.body.pack.dependsOn, [
      'UK_ROE_BASE_V1',
      'UK_COMMAND_AUTHORITY_V1',
      'UK_DELEGATION_CHAIN_V1',
    ]);
    assert.equal(ukGroundPack.body.pack.registryPresent, true);

    assert.equal(caNationalPack.status, 200);
    assert.equal(caNationalPack.body.pack.packId, 'CA_NATIONAL_BASE_V1');
    assert.equal(caNationalPack.body.pack.kind, 'foundation');
    assert.equal(caNationalPack.body.pack.status, 'admitted');
    assert.deepEqual(caNationalPack.body.pack.dependsOn, ['INTL_LOAC_BASE_V1']);
    assert.equal(caNationalPack.body.pack.registryPresent, true);

    assert.equal(caAirspacePack.status, 200);
    assert.equal(caAirspacePack.body.pack.packId, 'CA_AIRSPACE_CONTROL_V1');
    assert.equal(caAirspacePack.body.pack.kind, 'domain');
    assert.equal(caAirspacePack.body.pack.status, 'admitted');
    assert.deepEqual(caAirspacePack.body.pack.dependsOn, [
      'CA_ROE_BASE_V1',
      'CA_COMMAND_AUTHORITY_V1',
      'CA_DELEGATION_CHAIN_V1',
    ]);
    assert.equal(caAirspacePack.body.pack.registryPresent, true);

    assert.equal(auNationalPack.status, 200);
    assert.equal(auNationalPack.body.pack.packId, 'AU_NATIONAL_BASE_V1');
    assert.equal(auNationalPack.body.pack.kind, 'foundation');
    assert.equal(auNationalPack.body.pack.status, 'admitted');
    assert.deepEqual(auNationalPack.body.pack.dependsOn, ['INTL_LOAC_BASE_V1']);
    assert.equal(auNationalPack.body.pack.registryPresent, true);

    assert.equal(auAirspacePack.status, 200);
    assert.equal(auAirspacePack.body.pack.packId, 'AU_AIRSPACE_CONTROL_V1');
    assert.equal(auAirspacePack.body.pack.kind, 'domain');
    assert.equal(auAirspacePack.body.pack.status, 'admitted');
    assert.deepEqual(auAirspacePack.body.pack.dependsOn, [
      'AU_ROE_BASE_V1',
      'AU_COMMAND_AUTHORITY_V1',
      'AU_DELEGATION_CHAIN_V1',
    ]);
    assert.equal(auAirspacePack.body.pack.registryPresent, true);

    assert.equal(nlNationalPack.status, 200);
    assert.equal(nlNationalPack.body.pack.packId, 'NL_NATIONAL_BASE_V1');
    assert.equal(nlNationalPack.body.pack.kind, 'foundation');
    assert.equal(nlNationalPack.body.pack.status, 'admitted');
    assert.deepEqual(nlNationalPack.body.pack.dependsOn, ['INTL_LOAC_BASE_V1']);
    assert.equal(nlNationalPack.body.pack.registryPresent, true);

    assert.equal(nlAirspacePack.status, 200);
    assert.equal(nlAirspacePack.body.pack.packId, 'NL_AIRSPACE_CONTROL_V1');
    assert.equal(nlAirspacePack.body.pack.kind, 'domain');
    assert.equal(nlAirspacePack.body.pack.status, 'admitted');
    assert.deepEqual(nlAirspacePack.body.pack.dependsOn, [
      'NL_ROE_BASE_V1',
      'NL_COMMAND_AUTHORITY_V1',
      'NL_DELEGATION_CHAIN_V1',
    ]);
    assert.equal(nlAirspacePack.body.pack.registryPresent, true);

    assert.equal(trNationalPack.status, 200);
    assert.equal(trNationalPack.body.pack.packId, 'TR_NATIONAL_BASE_V1');
    assert.equal(trNationalPack.body.pack.kind, 'foundation');
    assert.equal(trNationalPack.body.pack.status, 'admitted');
    assert.deepEqual(trNationalPack.body.pack.dependsOn, ['INTL_LOAC_BASE_V1']);
    assert.equal(trNationalPack.body.pack.registryPresent, true);

    assert.equal(trAirspacePack.status, 200);
    assert.equal(trAirspacePack.body.pack.packId, 'TR_AIRSPACE_CONTROL_V1');
    assert.equal(trAirspacePack.body.pack.kind, 'domain');
    assert.equal(trAirspacePack.body.pack.status, 'admitted');
    assert.deepEqual(trAirspacePack.body.pack.dependsOn, [
      'TR_ROE_BASE_V1',
      'TR_COMMAND_AUTHORITY_V1',
      'TR_DELEGATION_CHAIN_V1',
    ]);
    assert.equal(trAirspacePack.body.pack.registryPresent, true);

    assert.equal(admittedPack.status, 200);
    assert.equal(admittedPack.body.pack.packId, 'US_AIRSPACE_CONTROL_V1');
    assert.equal(admittedPack.body.pack.kind, 'domain');
    assert.equal(admittedPack.body.pack.status, 'admitted');
    assert.deepEqual(admittedPack.body.pack.dependsOn, [
      'US_RULES_OF_ENGAGEMENT_BASE_V1',
      'US_LOAC_COMPLIANCE_V1',
      'US_COMMAND_AUTHORITY_V1',
      'US_DELEGATION_CHAIN_V1',
      'US_PROTECTED_SITE_V1',
    ]);

    assert.equal(noFlyPack.status, 200);
    assert.equal(noFlyPack.body.pack.packId, 'US_NO_FLY_ZONE_V1');
    assert.equal(noFlyPack.body.pack.overlayFamily, 'targeting_refinement');
    assert.equal(noFlyPack.body.pack.overlayBoundary, 'airspace');
    assert.equal(noFlyPack.body.pack.overlayScope, 'jurisdictional');

    assert.equal(isrRetentionPack.status, 200);
    assert.equal(isrRetentionPack.body.pack.packId, 'US_ISR_RETENTION_V1');
    assert.equal(isrRetentionPack.body.pack.overlayFamily, 'retention');
    assert.equal(isrRetentionPack.body.pack.overlayBoundary, 'surveillance_retention');
    assert.equal(isrRetentionPack.body.pack.overlayScope, 'jurisdictional');

    assert.equal(nightOperationPack.status, 200);
    assert.equal(nightOperationPack.body.pack.packId, 'US_NIGHT_OPERATION_V1');
    assert.equal(nightOperationPack.body.pack.overlayFamily, 'operational_condition');
    assert.equal(nightOperationPack.body.pack.overlayBoundary, 'environment');
    assert.equal(nightOperationPack.body.pack.overlayScope, 'jurisdictional');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('military constraints public surface evaluates admitted uppercase pack ids', async () => {
  const { server, baseUrl } = await startServer();

  try {
    const built = buildReferenceBundle({
      rootDir: MODULE_DIR,
      manifestPath: AIRSPACE_PACK_MANIFEST_PATH,
    });
    const caNationalBuilt = buildReferenceBundle({
      rootDir: MODULE_DIR,
      manifestPath: CA_NATIONAL_PACK_MANIFEST_PATH,
    });
    const caBuilt = buildReferenceBundle({
      rootDir: MODULE_DIR,
      manifestPath: CA_AIRSPACE_PACK_MANIFEST_PATH,
    });
    const auNationalBuilt = buildReferenceBundle({
      rootDir: MODULE_DIR,
      manifestPath: AU_NATIONAL_PACK_MANIFEST_PATH,
    });
    const auBuilt = buildReferenceBundle({
      rootDir: MODULE_DIR,
      manifestPath: AU_AIRSPACE_PACK_MANIFEST_PATH,
    });
    const nlNationalBuilt = buildReferenceBundle({
      rootDir: MODULE_DIR,
      manifestPath: NL_NATIONAL_PACK_MANIFEST_PATH,
    });
    const nlBuilt = buildReferenceBundle({
      rootDir: MODULE_DIR,
      manifestPath: NL_AIRSPACE_PACK_MANIFEST_PATH,
    });
    const trNationalBuilt = buildReferenceBundle({
      rootDir: MODULE_DIR,
      manifestPath: TR_NATIONAL_PACK_MANIFEST_PATH,
    });
    const trBuilt = buildReferenceBundle({
      rootDir: MODULE_DIR,
      manifestPath: TR_AIRSPACE_PACK_MANIFEST_PATH,
    });

    assert.equal(built.valid, true, built.errors.join('\n'));
    assert.equal(caNationalBuilt.valid, true, caNationalBuilt.errors.join('\n'));
    assert.equal(caBuilt.valid, true, caBuilt.errors.join('\n'));
    assert.equal(auNationalBuilt.valid, true, auNationalBuilt.errors.join('\n'));
    assert.equal(auBuilt.valid, true, auBuilt.errors.join('\n'));
    assert.equal(nlNationalBuilt.valid, true, nlNationalBuilt.errors.join('\n'));
    assert.equal(nlBuilt.valid, true, nlBuilt.errors.join('\n'));
    assert.equal(trNationalBuilt.valid, true, trNationalBuilt.errors.join('\n'));
    assert.equal(trBuilt.valid, true, trBuilt.errors.join('\n'));

    const evaluation = await fetchJson(`${baseUrl}/api/v1/military-constraints/evaluate`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        packId: 'US_AIRSPACE_CONTROL_V1',
        facts: buildAllowedAirspaceFacts(built.bundle),
      }),
    });

    assert.equal(evaluation.status, 200);
    assert.equal(evaluation.body.decision, 'ALLOWED');
    assert.equal(evaluation.body.reasonCode, null);
    assert.equal(evaluation.body.failedStage, null);
    assert.deepEqual(evaluation.body.failingRuleIds, []);

    const caEvaluation = await fetchJson(`${baseUrl}/api/v1/military-constraints/evaluate`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        packId: 'CA_AIRSPACE_CONTROL_V1',
        facts: buildAllowedAirspaceFacts(caBuilt.bundle),
      }),
    });

    assert.equal(caEvaluation.status, 200);
    assert.equal(caEvaluation.body.decision, 'ALLOWED');
    assert.equal(caEvaluation.body.reasonCode, null);
    assert.equal(caEvaluation.body.failedStage, null);
    assert.deepEqual(caEvaluation.body.failingRuleIds, []);

    const auEvaluation = await fetchJson(`${baseUrl}/api/v1/military-constraints/evaluate`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        packId: 'AU_AIRSPACE_CONTROL_V1',
        facts: buildAllowedAirspaceFacts(auBuilt.bundle),
      }),
    });

    assert.equal(auEvaluation.status, 200);
    assert.equal(auEvaluation.body.decision, 'ALLOWED');
    assert.equal(auEvaluation.body.reasonCode, null);
    assert.equal(auEvaluation.body.failedStage, null);
    assert.deepEqual(auEvaluation.body.failingRuleIds, []);

    const nlEvaluation = await fetchJson(`${baseUrl}/api/v1/military-constraints/evaluate`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        packId: 'NL_AIRSPACE_CONTROL_V1',
        facts: buildAllowedAirspaceFacts(nlBuilt.bundle),
      }),
    });

    assert.equal(nlEvaluation.status, 200);
    assert.equal(nlEvaluation.body.decision, 'ALLOWED');
    assert.equal(nlEvaluation.body.reasonCode, null);
    assert.equal(nlEvaluation.body.failedStage, null);
    assert.deepEqual(nlEvaluation.body.failingRuleIds, []);

    const trEvaluation = await fetchJson(`${baseUrl}/api/v1/military-constraints/evaluate`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        packId: 'TR_AIRSPACE_CONTROL_V1',
        facts: buildAllowedAirspaceFacts(trBuilt.bundle),
      }),
    });

    assert.equal(trEvaluation.status, 200);
    assert.equal(trEvaluation.body.decision, 'ALLOWED');
    assert.equal(trEvaluation.body.reasonCode, null);
    assert.equal(trEvaluation.body.failedStage, null);
    assert.deepEqual(trEvaluation.body.failingRuleIds, []);
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
    assert.match(invalidPack.body.error.message, /non-empty pack identifier/i);

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
