#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const {
  CONCEPT_SET_VERSION,
  CONTRACT_VERSION,
  MATCHER_VERSION,
  NORMALIZER_VERSION,
} = require('../backend/src/modules/concepts/constants');
const sourceRegistry = require('../backend/src/modules/concepts/source-registry.json');

const repoRoot = path.resolve(__dirname, '..');

function readJson(relativePath) {
  const filePath = path.join(repoRoot, relativePath);

  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    throw new Error(`Failed to read ${relativePath}: ${error.message}`);
  }
}

function readText(relativePath) {
  const filePath = path.join(repoRoot, relativePath);

  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    throw new Error(`Failed to read ${relativePath}: ${error.message}`);
  }
}

function packageHasScript(pkg, scriptName) {
  return Boolean(pkg?.scripts && Object.prototype.hasOwnProperty.call(pkg.scripts, scriptName));
}

function buildAuthorityAuditReport() {
  const rootPackage = readJson('package.json');
  const backendPackage = readJson('backend/package.json');
  const frontendPackage = readJson('frontend/package.json');
  const lifecycleDoc = readText('docs/public/concept-lifecycle.md');
  const policyRegistryDoc = readText('docs/public/policy-claim-registry.md');

  return {
    generatedAt: new Date().toISOString(),
    repoRoot: '.',
    legend: Object.freeze({
      authoritative: 'current truth source for a live contract surface',
      documented_only: 'documented, but not currently enforced by runtime or tooling',
      partially_enforced:
        'some runtime/tooling enforcement exists, but authority is split or not centrally wired',
      enforced: 'directly enforced in runtime or tooling check flow',
    }),
    summary: {
      authoritative: 1,
      documented_only: 1,
      partially_enforced: 2,
      enforced: 1,
    },
    surfaces: {
      runtimeResponseContract: {
        status: 'authoritative',
        authoritySources: ['backend/src/modules/concepts/constants.js'],
        documentedSources: [
          'docs/product/response-contract.md',
          'docs/product/response-schema.json',
          'docs/product/examples/concept_match.json',
          'docs/product/examples/no_exact_match.json',
          'docs/product/examples/ambiguous_match.json',
          'docs/product/examples/rejected_concept.json',
        ],
        enforcementSources: [
          'backend/src/modules/concepts/runtime-resolution-state.js',
          'backend/scripts/verify-runtime-resolution-state.js',
          'backend/scripts/verify-refusal-taxonomy-consistency.js',
        ],
        runtimeTruth: {
          contractVersion: CONTRACT_VERSION,
          normalizerVersion: NORMALIZER_VERSION,
          matcherVersion: MATCHER_VERSION,
          conceptSetVersion: CONCEPT_SET_VERSION,
        },
        notes: 'Runtime constants are the contract authority source; docs and schema mirror the live output shape.',
      },
      sourcePriority: {
        status: 'partially_enforced',
        authoritySources: [
          'backend/src/modules/concepts/concept-loader.js',
          'backend/src/modules/concepts/source-registry.json',
        ],
        documentedSources: ['docs/conceptual-reference-stack.md'],
        enforcementSources: ['backend/src/modules/concepts/concept-loader.js'],
        sourceRegistryTierCounts: Object.values(sourceRegistry).reduce((counts, entry) => {
          const tier = entry && entry.tier ? entry.tier : 'unknown';
          counts[tier] = (counts[tier] || 0) + 1;
          return counts;
        }, {}),
        splitAcross: ['docs', 'registry', 'loader'],
        notes:
          'Runtime loader enforces source priority, but the authority surface is split across docs, registry data, and loader logic.',
      },
      lifecyclePolicy: {
        status: 'documented_only',
        authoritySources: ['docs/public/concept-lifecycle.md'],
        documentedSources: ['docs/public/concept-lifecycle.md'],
        enforcementSources: [],
        notes:
          'The lifecycle document explicitly states that approvals, review gates, and automatic transitions are not yet enforced in tooling.',
      },
      policyLayer: {
        status: 'partially_enforced',
        authoritySources: [
          'data/policy-claim-registry/*.json',
          'scripts/lib/policy-governance/policy-claim-registry.js',
        ],
        documentedSources: ['docs/public/policy-claim-registry.md'],
        enforcementSources: [
          'scripts/validate-policy-governance.js',
          packageHasScript(rootPackage, 'validate:policy-governance')
            ? 'package.json:validate:policy-governance'
            : null,
          packageHasScript(frontendPackage, 'generate:policy-surface')
            ? 'frontend/package.json:generate:policy-surface'
            : null,
          packageHasScript(frontendPackage, 'validate:policy-surface-split')
            ? 'frontend/package.json:validate:policy-surface-split'
            : null,
        ].filter(Boolean),
        splitAcross: ['docs', 'registry', 'generator', 'validator'],
        notes:
          'Policy truth is registry-backed and validated, but enforcement is distributed rather than centralized in one repo-wide gate.',
      },
      refusalConsistencyVerifier: {
        status: 'enforced',
        authoritySources: ['backend/scripts/verify-refusal-taxonomy-consistency.js'],
        documentedSources: ['docs/product/response-schema.json'],
        enforcementSources: [
          packageHasScript(backendPackage, 'verify:refusal-taxonomy-consistency')
            ? 'backend/package.json:verify:refusal-taxonomy-consistency'
            : null,
          packageHasScript(backendPackage, 'check') ? 'backend/package.json:check' : null,
          packageHasScript(backendPackage, 'test') ? 'backend/package.json:test' : null,
        ].filter(Boolean),
        notes: 'Refusal taxonomy consistency is wired into backend validation flow.',
      },
    },
    evidence: {
      lifecycleDocMentionsNoEnforcement:
        lifecycleDoc.includes('does not yet enforce approvals, review gates, or automatic transitions.'),
      policyRegistryStatesPrimarySource:
        policyRegistryDoc.includes('The registry is the primary claim source for:'),
      backendCheckIncludesRefusalVerifier:
        typeof backendPackage?.scripts?.check === 'string' &&
        backendPackage.scripts.check.includes('verify-refusal-taxonomy-consistency.js'),
    },
  };
}

function main() {
  const report = buildAuthorityAuditReport();
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

main();
