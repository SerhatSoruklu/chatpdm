'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const {
  artifactPath,
} = require('../src/modules/concepts/concept-validation-state-loader');
const {
  loadAuthoredRelationPackets,
  relationPacketsDirectory,
} = require('../src/modules/concepts/concept-relation-loader');
const {
  resolveConceptQuery,
} = require('../src/modules/concepts/resolver');
const {
  deriveRuntimeResolutionStateFromResponse,
} = require('../src/modules/concepts/runtime-resolution-state');
const {
  validateRegisterDivergenceForConcept,
} = require('../src/modules/concepts/register-divergence-validator');

const MODULES_TO_CLEAR = [
  '../src/modules/concepts/concept-validation-state-loader',
  '../src/modules/concepts/resolver',
  '../src/modules/concepts/resolution-engine',
  '../src/modules/concepts/pipeline-runner',
];

const RESOLVER_MODULES_TO_CLEAR = [
  '../src/modules/concepts/resolver',
  '../src/modules/concepts/resolution-engine',
  '../src/modules/concepts/pipeline-runner',
];

function clearConceptResolutionCaches() {
  MODULES_TO_CLEAR.forEach((modulePath) => {
    try {
      delete require.cache[require.resolve(modulePath)];
    } catch {
      // Ignore modules that have not been loaded yet.
    }
  });
}

function clearResolverCaches() {
  RESOLVER_MODULES_TO_CLEAR.forEach((modulePath) => {
    try {
      delete require.cache[require.resolve(modulePath)];
    } catch {
      // Ignore modules that have not been loaded yet.
    }
  });
}

function loadRunFullPipelineFresh() {
  clearConceptResolutionCaches();
  return require('../src/modules/concepts/pipeline-runner').runFullPipeline;
}

function loadResolveConceptQueryFresh() {
  clearResolverCaches();
  return require('../src/modules/concepts/resolver').resolveConceptQuery;
}

function buildBlockedGovernanceState(conceptId) {
  return {
    source: 'validator_artifact',
    available: true,
    validationState: 'fully_validated',
    v3Status: 'passing',
    relationStatus: 'passing',
    lawStatus: 'passing',
    enforcementStatus: 'blocked',
    systemValidationState: 'law_blocked',
    isBlocked: true,
    isStructurallyIncomplete: false,
    isFullyValidated: false,
    isActionable: false,
    trace: {
      conceptId,
      validatorSource: 'validator_artifact',
      unavailableReason: null,
      relationSource: 'authored',
      lawSource: 'authored',
      relationDataPresent: true,
      dataSource: 'authored_relation_packets',
    },
  };
}

function deriveRefusalReason(response) {
  if (!response || typeof response !== 'object') {
    return null;
  }

  if (response.type === 'VOCABULARY_DETECTED') {
    return 'vocabulary_detected';
  }

  if (response.type === 'unsupported_query_type') {
    const interpretationType = response.interpretation?.interpretationType;
    if (interpretationType === 'unsupported_complex') {
      return 'ambiguous_query_shape';
    }

    if (interpretationType === 'relation_not_supported' || interpretationType === 'role_or_actor_not_supported') {
      return 'ambiguous_query_shape';
    }

    return 'unsupported_query_type';
  }

  if (response.type === 'no_exact_match') {
    switch (response.interpretation?.interpretationType) {
      case 'visible_only_public_concept':
        return 'visible_only';
      case 'validation_blocked': {
        const concepts = Array.isArray(response.interpretation.concepts)
          ? response.interpretation.concepts
          : [];
        return concepts.length > 1 ? 'ambiguous_blocked' : 'governance_unavailable';
      }
      case 'out_of_scope':
        return 'out_of_scope';
      case 'relation_not_supported':
        return 'relation_not_supported';
      case 'role_or_actor_not_supported':
        return 'role_or_actor_not_supported';
      case 'unsupported_complex':
        return 'ambiguous_query_shape';
      case 'canonical_lookup_not_found':
        return 'canonical_lookup_not_found';
      case 'exact_concept_not_found':
        return 'exact_concept_not_found';
      default:
        return 'no_exact_match';
    }
  }

  return response.type;
}

test('missing governance snapshot fails closed with a governance_unavailable refusal', () => {
  assert.equal(fs.existsSync(artifactPath), true, `Expected validation artifact at ${artifactPath}.`);

  const backupPath = `${artifactPath}.test-backup-${process.pid}-${Date.now()}`;
  fs.renameSync(artifactPath, backupPath);

  try {
    const runFullPipeline = loadRunFullPipelineFresh();
    const result = runFullPipeline('authority');

    assert.equal(result.final_output.state, 'refused');
    assert.equal(result.resolution_output.type, 'NO_MATCH');
    assert.equal(result.resolution_output.payload.normalized_query, 'authority');
    assert.equal(result.resolution_output.payload.reason, 'governance_unavailable');
  } finally {
    fs.renameSync(backupPath, artifactPath);
    clearConceptResolutionCaches();
  }

  const runFullPipelineRestored = loadRunFullPipelineFresh();
  const restoredResult = runFullPipelineRestored('authority');

  assert.equal(restoredResult.resolution_output.type, 'LIVE_RESOLUTION');
  assert.equal(restoredResult.final_output.state, 'valid');
  assert.equal(restoredResult.final_output.type, 'LIVE_RESOLUTION');
  assert.equal(restoredResult.resolution_output.payload.answer?.governanceState?.available, true);
});

test('ambiguous query shapes refuse instead of routing heuristically', () => {
  const authoredAliasQuery = resolveConceptQuery('what is authority');
  assert.equal(authoredAliasQuery.type, 'concept_match');
  assert.equal(authoredAliasQuery.resolution.method, 'exact_alias');
  assert.equal(authoredAliasQuery.answer.itemType, 'core_concept');

  const comparisonQuery = resolveConceptQuery('authority or power');
  assert.equal(comparisonQuery.type, 'unsupported_query_type');
  assert.equal(deriveRuntimeResolutionStateFromResponse(comparisonQuery), 'refused');
  assert.equal(deriveRefusalReason(comparisonQuery), 'ambiguous_query_shape');
  assert.match(comparisonQuery.interpretation.message, /ambiguous query shape/i);

  const fillerQuery = resolveConceptQuery('what is authority and power');
  assert.equal(fillerQuery.type, 'unsupported_query_type');
  assert.equal(deriveRuntimeResolutionStateFromResponse(fillerQuery), 'refused');
  assert.equal(fillerQuery.interpretation.interpretationType, 'unsupported_complex');
  assert.equal(deriveRefusalReason(fillerQuery), 'ambiguous_query_shape');
  assert.match(fillerQuery.interpretation.message, /ambiguous query shape/i);

  const comparisonQueryTwo = resolveConceptQuery('authority or legitimacy');
  assert.equal(comparisonQueryTwo.type, 'unsupported_query_type');
  assert.equal(deriveRuntimeResolutionStateFromResponse(comparisonQueryTwo), 'refused');

  const roleQuery = resolveConceptQuery('who decides authority');
  assert.equal(roleQuery.type, 'unsupported_query_type');
  assert.equal(deriveRuntimeResolutionStateFromResponse(roleQuery), 'refused');
  assert.equal(deriveRefusalReason(roleQuery), 'ambiguous_query_shape');
  assert.match(roleQuery.interpretation.message, /ambiguous query shape/i);
});

test('blocked ambiguity refuses instead of silently resolving to a generic no-match', () => {
  const vocabularyService = require('../src/vocabulary/vocabulary-service.ts');
  const validationStateLoader = require('../src/modules/concepts/concept-validation-state-loader');

  const originalClassifyVocabularySurface = vocabularyService.classifyVocabularySurface;
  const originalGetConceptRuntimeGovernanceState = validationStateLoader.getConceptRuntimeGovernanceState;

  vocabularyService.classifyVocabularySurface = (input) => ({
    input,
    normalizedInput: input,
    matched: false,
    term: null,
    classification: null,
    relations: null,
    systemFlags: {
      isCoreConcept: false,
      usableInResolver: false,
      reasoningAllowed: false,
    },
  });

  validationStateLoader.getConceptRuntimeGovernanceState = (conceptId) => {
    if (conceptId === 'duty' || conceptId === 'responsibility') {
      return buildBlockedGovernanceState(conceptId);
    }

    return originalGetConceptRuntimeGovernanceState(conceptId);
  };

  try {
    const resolveConceptQueryFresh = loadResolveConceptQueryFresh();
    const blockedAmbiguity = resolveConceptQueryFresh('obligation');

    assert.equal(blockedAmbiguity.type, 'no_exact_match');
    assert.equal(deriveRuntimeResolutionStateFromResponse(blockedAmbiguity), 'refused');
    assert.equal(blockedAmbiguity.interpretation.interpretationType, 'validation_blocked');
    assert.deepEqual([...blockedAmbiguity.interpretation.concepts].sort(), ['duty', 'responsibility']);
    assert.equal(deriveRefusalReason(blockedAmbiguity), 'ambiguous_blocked');
    assert.match(blockedAmbiguity.interpretation.message, /blocked by validator law enforcement/i);
  } finally {
    vocabularyService.classifyVocabularySurface = originalClassifyVocabularySurface;
    validationStateLoader.getConceptRuntimeGovernanceState = originalGetConceptRuntimeGovernanceState;
    clearConceptResolutionCaches();
  }
});

test('visible-only concepts preserve explicit refusal reasons end-to-end', () => {
  const visibleOnlyQuery = resolveConceptQuery('agreement');

  assert.equal(visibleOnlyQuery.type, 'no_exact_match');
  assert.equal(visibleOnlyQuery.queryType, 'exact_concept_query');
  assert.equal(deriveRuntimeResolutionStateFromResponse(visibleOnlyQuery), 'refused');
  assert.equal(visibleOnlyQuery.interpretation.interpretationType, 'visible_only_public_concept');
  assert.equal(visibleOnlyQuery.resolution.method, 'out_of_scope');
  assert.equal(deriveRefusalReason(visibleOnlyQuery), 'visible_only');
  assert.match(visibleOnlyQuery.interpretation.message, /not admitted to the live public runtime/i);
});

test('register divergence validation no longer rejects by similarity thresholds', () => {
  const concept = {
    conceptId: 'synthetic-register-boundary',
    version: 1,
    registers: {
      standard: {
        shortDefinition: 'Authority means recognized power to direct conduct within a governed legal order for compliance and legitimacy.',
        coreMeaning: 'Authority means recognized power to direct conduct within a governed legal order for compliance and legitimacy.',
        fullDefinition: 'Authority means recognized power to direct conduct within a governed legal order for compliance and legitimacy.',
      },
      simplified: {
        shortDefinition: 'Within a governed legal order authority means recognized power to direct conduct for compliance and legitimacy.',
        coreMeaning: 'Within a governed legal order authority means recognized power to direct conduct for compliance and legitimacy.',
        fullDefinition: 'Within a governed legal order authority means recognized power to direct conduct for compliance and legitimacy.',
      },
      formal: {
        shortDefinition: 'Authority means recognized power to direct conduct within a governed legal order for compliance and legitimacy authority means.',
        coreMeaning: 'Authority means recognized power to direct conduct within a governed legal order for compliance and legitimacy authority means.',
        fullDefinition: 'Authority means recognized power to direct conduct within a governed legal order for compliance and legitimacy authority means.',
      },
    },
  };

  const validation = validateRegisterDivergenceForConcept(concept);

  assert.equal(validation.modes.simplified.status, 'available');
  assert.equal(validation.modes.formal.status, 'available');
  assert.equal(validation.availableModes.includes('simplified'), true);
  assert.equal(validation.availableModes.includes('formal'), true);
  assert.equal(
    validation.modes.simplified.reasons.some((reason) => reason.code === 'SIMPLIFIED_TOO_CLOSE_TO_STANDARD'),
    false,
  );
  assert.equal(
    validation.modes.formal.reasons.some((reason) => reason.code === 'FORMAL_TOO_CLOSE_TO_STANDARD'),
    false,
  );
});

test('missing relation packets surface as unavailable instead of fallback seeded meaning', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'chatpdm-relations-'));

  try {
    fs.cpSync(relationPacketsDirectory, directory, { recursive: true });
    fs.rmSync(path.join(directory, 'power.json'));

    const report = loadAuthoredRelationPackets({
      directory,
      requireAuthoredRelations: false,
    });

    assert.equal(report.source, 'unavailable');
    assert.equal(report.dataSource, 'none');
    assert.equal(report.relationDataPresent, false);
    assert.equal(report.fallbackUsed, false);
    assert.equal(report.passed, false);
    assert(report.missingConceptIds.includes('power'));

    const powerPacket = report.packetResults.find((entry) => entry.conceptId === 'power');
    assert.ok(powerPacket, 'Expected power packet result to be present.');
    assert.equal(powerPacket.source, 'unavailable');
    assert.equal(powerPacket.present, false);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
