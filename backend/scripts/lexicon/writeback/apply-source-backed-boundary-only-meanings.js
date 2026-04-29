'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const {
  buildVocabularyBoundaryResponse,
} = require('../../../src/modules/legal-vocabulary/vocabulary-boundary');

const repoRoot = path.resolve(__dirname, '../../../..');
const workspaceRoot = '/mnt/c/Users/coupy/Desktop/vocabulary-reference-lexicons';
const outputRoot = path.join(
  workspaceRoot,
  'vocabulary_reference_lexicons/draft_meanings/source_back_boundary_only',
);

const targetPaths = Object.freeze({
  meaningSources: path.join(
    repoRoot,
    'backend/src/modules/legal-vocabulary/vocabulary-meaning-sources.generated.json',
  ),
  vocabularyBoundary: path.join(repoRoot, 'backend/src/modules/legal-vocabulary/vocabulary-boundary.js'),
});

const outputPaths = Object.freeze({
  reportJson: path.join(outputRoot, 'source_back_boundary_only_report.json'),
  reportMarkdown: path.join(outputRoot, 'source_back_boundary_only_report.md'),
  appliedDiffJson: path.join(outputRoot, 'source_back_boundary_only_applied_diff.json'),
});

const additions = Object.freeze({
  breach: Object.freeze({
    previousMeaningInLaw: 'Breach is the state in which a commitment is not carried forward within the interaction frame.',
    meaningInLaw: 'The breaking or violating of a law, right, or duty, either by commission or omission.',
    sources: Object.freeze([
      Object.freeze({
        sourceId: 'blacks_1910',
        sourceTitle: "Black's Law Dictionary, 2nd Edition",
        year: 1910,
        page: 155,
        lineNumber: 148,
        headword: 'BREACH',
        supportNote: 'Primary origin for breach: The breaking or violating of a law, right, or duty, either by commission or omission.',
        snippetDisplay: 'The breaking or violating of @ law, right, or duty, either by commission or omission. In contracts. The violation or non-ful-',
        referenceRole: 'supporting_lexicon_reference',
      }),
      Object.freeze({
        sourceId: 'black_1891_b',
        sourceTitle: 'A Dictionary of Law',
        year: 1891,
        page: 40,
        lineNumber: 134,
        headword: 'BREACH',
        supportNote: 'Supporting exact Black 1891 reference for breach.',
        snippetDisplay: 'The breaking or violating of a law, right, or duty, either by commission or omission. In contracts. The violation',
        referenceRole: 'supporting_lexicon_reference',
      }),
    ]),
  }),
  commitment: Object.freeze({
    previousMeaningInLaw: 'Commitment is the state in which settled terms or conditions are taken up for continuation within an interaction frame.',
    meaningInLaw: 'In practice, the warrant or mittimus by which a court or magistrate directs an officer to take a person to prison.',
    sources: Object.freeze([
      Object.freeze({
        sourceId: 'blacks_1910',
        sourceTitle: "Black's Law Dictionary, 2nd Edition",
        year: 1910,
        page: 230,
        lineNumber: 132,
        headword: 'COMMITMENT',
        supportNote: 'Primary origin for commitment: In practice, the warrant or mittimus by which a court or magistrate directs an officer to take a person to prison.',
        snippetDisplay: 'In practica The war- rant or mittimus by which a court or magis- trate directs an officer to take a person to prison.',
        referenceRole: 'supporting_lexicon_reference',
      }),
      Object.freeze({
        sourceId: 'black_1891_c',
        sourceTitle: 'A Dictionary of Law',
        year: 1891,
        page: 68,
        lineNumber: 194,
        headword: 'COMMITMENT',
        supportNote: 'Supporting exact Black 1891 reference for commitment.',
        snippetDisplay: 'In practice. The \\\\ arrant or mittimus by \\\\ hiclt',
        referenceRole: 'supporting_lexicon_reference',
      }),
    ]),
  }),
});

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function writeText(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, value, 'utf8');
}

function sha256File(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function countSnapshot() {
  delete require.cache[require.resolve('../../../src/modules/legal-vocabulary/vocabulary-boundary')];
  const {
    buildVocabularyBoundaryResponse: freshBuildVocabularyBoundaryResponse,
  } = require('../../../src/modules/legal-vocabulary/vocabulary-boundary');
  const response = freshBuildVocabularyBoundaryResponse();
  return {
    totalRegistryEntries: response.entries.length,
    sourceBackedMeanings: response.entries.filter((entry) => (
      Array.isArray(entry.meaningSources) && entry.meaningSources.length > 0
    )).length,
    boundaryMeanings: response.entries.filter((entry) => (
      typeof entry.meaningInLaw === 'string' && entry.meaningInLaw.trim()
    )).length,
    boundaryMeaningsWithoutSources: response.entries
      .filter((entry) => (
        entry.meaningInLaw && (!Array.isArray(entry.meaningSources) || entry.meaningSources.length === 0)
      ))
      .map((entry) => entry.term),
  };
}

function applyMeaningSources() {
  const current = readJson(targetPaths.meaningSources);
  const next = {
    ...current,
    generatedAt: new Date().toISOString(),
    source: `${current.source}_plus_boundary_only_source_backing`,
    terms: {
      ...current.terms,
    },
  };
  Object.entries(additions).forEach(([term, config]) => {
    if (Object.hasOwn(next.terms ?? {}, term)) {
      return;
    }
    next.terms[term] = config.sources;
  });
  next.terms = Object.fromEntries(
    Object.entries(next.terms).sort(([left], [right]) => left.localeCompare(right)),
  );
  writeJson(targetPaths.meaningSources, next);
}

function applyBoundaryMeanings() {
  let source = fs.readFileSync(targetPaths.vocabularyBoundary, 'utf8');
  Object.values(additions).forEach((config) => {
    const previousDoubleQuoted = JSON.stringify(config.previousMeaningInLaw);
    const nextDoubleQuoted = JSON.stringify(config.meaningInLaw);
    const nextSingleQuoted = `'${config.meaningInLaw.replaceAll('\\', '\\\\').replaceAll("'", "\\'")}'`;
    if (source.includes(nextDoubleQuoted) || source.includes(nextSingleQuoted)) {
      return;
    }
    if (!source.includes(previousDoubleQuoted)) {
      throw new Error(`Could not locate previous meaning: ${config.previousMeaningInLaw}`);
    }
    source = source.replace(previousDoubleQuoted, nextDoubleQuoted);
  });
  fs.writeFileSync(targetPaths.vocabularyBoundary, source, 'utf8');
}

function buildMarkdown(report) {
  return [
    '# Source-Back Boundary-Only Vocabulary Meanings',
    '',
    'Converted the two boundary meanings without source provenance into source-backed legal dictionary meanings.',
    '',
    `- Source-backed meanings before: ${report.before.sourceBackedMeanings}`,
    `- Source-backed meanings after: ${report.after.sourceBackedMeanings}`,
    `- Boundary meanings before: ${report.before.boundaryMeanings}`,
    `- Boundary meanings after: ${report.after.boundaryMeanings}`,
    `- Boundary meanings without sources after: ${report.after.boundaryMeaningsWithoutSources.length}`,
    '',
    '## Terms',
    '',
    '| Term | Previous meaning | Source-backed meaning | Origin |',
    '| --- | --- | --- | --- |',
    ...Object.entries(additions).map(([term, config]) => (
      `| ${term} | ${config.previousMeaningInLaw} | ${config.meaningInLaw} | ${config.sources[0].sourceTitle} (${config.sources[0].year}) |`
    )),
    '',
  ].join('\n');
}

function main() {
  const before = countSnapshot();
  const sourceHashBefore = sha256File(targetPaths.meaningSources);
  const boundaryHashBefore = sha256File(targetPaths.vocabularyBoundary);

  applyMeaningSources();
  applyBoundaryMeanings();

  const after = countSnapshot();
  const report = {
    generatedAt: new Date().toISOString(),
    terms: Object.keys(additions),
    before,
    after,
    sourceHashBefore,
    sourceHashAfter: sha256File(targetPaths.meaningSources),
    boundaryHashBefore,
    boundaryHashAfter: sha256File(targetPaths.vocabularyBoundary),
    noBoundaryMeaningsWithoutSources: after.boundaryMeaningsWithoutSources.length === 0,
    noAliasesAdded: true,
    batch010NotStarted: true,
  };
  const diff = {
    addedSourceBackedTerms: Object.keys(additions),
    changedBoundaryMeanings: Object.fromEntries(
      Object.entries(additions).map(([term, config]) => [term, {
        before: config.previousMeaningInLaw,
        after: config.meaningInLaw,
      }]),
    ),
  };

  writeJson(outputPaths.reportJson, report);
  writeText(outputPaths.reportMarkdown, buildMarkdown(report));
  writeJson(outputPaths.appliedDiffJson, diff);

  console.log(JSON.stringify(report, null, 2));
}

main();
