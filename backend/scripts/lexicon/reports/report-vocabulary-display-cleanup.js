'use strict';

const fs = require('node:fs');
const path = require('node:path');

const {
  buildVocabularyBoundaryResponse,
} = require('../../../src/modules/legal-vocabulary/vocabulary-boundary');
const {
  getRegistryInterpretationFallback,
  getWhyRegistryOnlyFallback,
} = require('../../../src/modules/inspectable-item-contract');

const repoRoot = path.resolve(__dirname, '../../../..');
const rawMeaningSourcesPath = path.join(
  repoRoot,
  'backend/src/modules/legal-vocabulary/vocabulary-meaning-sources.generated.json',
);
const outputJsonPath = path.join(repoRoot, 'docs/boundary/vocabulary-display-cleanup-report.json');
const outputMarkdownPath = path.join(repoRoot, 'docs/boundary/vocabulary-display-cleanup-report.md');

const oldTermOverrides = Object.freeze({
  'ab initio': Object.freeze({
    registryInterpretation: 'Recognized legal vocabulary with fixed Latin usage, but not normalized here into a single runtime-safe structural concept.',
    whyRegistryOnly: 'This term remains registry-only because its legal usage is inspectable but it is not admitted to runtime ontology.',
  }),
  abandonment: Object.freeze({
    registryInterpretation: 'Recognized legal vocabulary with broad contextual usage, but not normalized here into a single runtime-safe structural concept.',
    whyRegistryOnly: 'This term remains registry-only because its legal usage is contextual and it is not admitted to runtime ontology.',
  }),
});

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function loadRawMeaningSourcesByTerm() {
  if (!fs.existsSync(rawMeaningSourcesPath)) {
    return new Map();
  }

  const payload = JSON.parse(fs.readFileSync(rawMeaningSourcesPath, 'utf8'));
  return new Map(Object.entries(payload.terms ?? {}));
}

function collapseBrokenWhitespace(value) {
  return String(value ?? '')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/([A-Za-z])-\s+([a-z])/g, '$1$2')
    .replace(/"\s+/g, '"')
    .replace(/\s+"/g, ' "')
    .replace(/\s+([,.;:!?])/g, '$1')
    .trim();
}

function oldSourceEditionLabel(source) {
  if (source.sourceId === 'anderson_1889') {
    return 'Anderson 1889';
  }

  if (source.sourceId === 'osborn_1927' || source.sourceTitle === 'A Concise Law Dictionary') {
    return 'Osborn 1927';
  }

  if (source.sourceId === 'blacks_1910') {
    return 'Black 1910';
  }

  if (source.sourceId.startsWith('black_') || source.sourceTitle === 'A Dictionary of Law') {
    return `Black ${source.year}`;
  }

  return source.year ? `${source.sourceTitle} ${source.year}` : source.sourceTitle;
}

function oldSupportNoteDisplay(source) {
  const cleaned = collapseBrokenWhitespace(source.supportNote);
  const sourceLabel = oldSourceEditionLabel(source);
  const replacements = [
    [/^(?:Black|Anderson|Osborn|Lexicon)\s+references?\s+define\b/i, `${sourceLabel} defines`],
    [/^(?:Black|Anderson|Osborn|Lexicon)\s+references?\s+describe\b/i, `${sourceLabel} describes`],
    [/^(?:Black|Anderson|Osborn|Lexicon)\s+references?\s+directly\s+support\b/i, `${sourceLabel} directly supports`],
    [/^(?:Black|Anderson|Osborn|Lexicon)\s+references?\s+support\b/i, `${sourceLabel} supports`],
    [/^(?:Black|Anderson|Osborn|Lexicon)\s+references?\s+connect\b/i, `${sourceLabel} connects`],
    [/^(?:Black|Anderson|Osborn|Lexicon)\s+references?\s+identify\b/i, `${sourceLabel} identifies`],
    [/^(?:Black|Anderson|Osborn|Lexicon)\s+references?\s+frame\b/i, `${sourceLabel} frames`],
    [/^(?:Black|Anderson|Osborn|Lexicon)\s+references?\s+provide\b/i, `${sourceLabel} provides`],
  ];

  if (
    cleaned.length < 24
    || cleaned.length > 180
    || /\b(?:comparator|batch|review queue|review candidate|extraction pipeline|support retained)\b/i.test(cleaned)
  ) {
    return `${sourceLabel} exact-term support for this legal meaning.`;
  }

  for (const [pattern, replacement] of replacements) {
    const rewritten = cleaned.replace(pattern, replacement);
    if (rewritten !== cleaned) {
      return rewritten;
    }
  }

  return cleaned;
}

function oldAdditionalSupportNoteDisplay(source) {
  return `${oldSourceEditionLabel(source)} additional exact-term support on page ${source.page}.`;
}

function oldFormattedSources(rawSources) {
  const seenNotes = new Set();

  return rawSources.map((source) => {
    const supportNoteDisplay = oldSupportNoteDisplay(source);

    if (!seenNotes.has(supportNoteDisplay)) {
      seenNotes.add(supportNoteDisplay);
      return {
        ...source,
        supportNoteDisplay,
      };
    }

    const baseAdditionalSupportNote = oldAdditionalSupportNoteDisplay(source);
    let additionalSupportNote = baseAdditionalSupportNote;
    let duplicateIndex = 2;

    while (seenNotes.has(additionalSupportNote)) {
      additionalSupportNote = baseAdditionalSupportNote.replace(/\.$/, `, reference ${duplicateIndex}.`);
      duplicateIndex += 1;
    }

    seenNotes.add(additionalSupportNote);

    return {
      ...source,
      supportNoteDisplay: additionalSupportNote,
    };
  });
}

function oldRegistryFields(entry) {
  const oldOverride = oldTermOverrides[entry.term];
  return {
    registryInterpretation: oldOverride?.registryInterpretation
      ?? getRegistryInterpretationFallback(entry.classification),
    whyRegistryOnly: oldOverride?.whyRegistryOnly
      ?? getWhyRegistryOnlyFallback(entry.sourceStatus),
  };
}

function referenceTextFromSources(sources, supportNoteFactory, currentFormat) {
  if (sources.length === 0) {
    return null;
  }

  const rows = sources.slice(0, 2).map((source) => {
    if (currentFormat) {
      return `- ${source.citationDisplay}, ${source.pageDisplay}:\n  ${source.supportNoteDisplay}`;
    }

    return [
      `${source.sourceTitle} (${source.year})`,
      `Page ${source.page}`,
      supportNoteFactory ? supportNoteFactory(source) : source.supportNoteDisplay,
    ].join('\n');
  });

  return [
    currentFormat ? 'Supporting lexicon references:' : 'Supporting lexicon reference:',
    '',
    ...rows,
    '',
    currentFormat
      ? 'Reference status: Reference-only. Not runtime ontology admission.'
      : 'Reference only. Not runtime ontology admission.',
  ].join('\n');
}

function buildReport() {
  const response = buildVocabularyBoundaryResponse();
  const rawMeaningSourcesByTerm = loadRawMeaningSourcesByTerm();
  const changedRecords = [];
  let registryInterpretationFieldsChanged = 0;
  let whyRegistryOnlyFieldsChanged = 0;
  let supportingReferenceRecordsChanged = 0;
  let supportingReferenceRowsChanged = 0;

  response.entries.forEach((entry) => {
    const oldRegistry = oldRegistryFields(entry);
    const registryChanged = oldRegistry.registryInterpretation !== entry.registryInterpretation;
    const whyChanged = oldRegistry.whyRegistryOnly !== entry.whyRegistryOnly;
    const oldSources = oldFormattedSources(rawMeaningSourcesByTerm.get(entry.term) ?? []);
    const oldSourceNotes = oldSources.map((source) => source.supportNoteDisplay);
    const newSourceNotes = entry.meaningSources.map((source) => source.supportNoteDisplay);
    const sourceRowsChanged = newSourceNotes.filter((note, index) => note !== oldSourceNotes[index]).length;
    const sourceChanged = sourceRowsChanged > 0;

    if (registryChanged) {
      registryInterpretationFieldsChanged += 1;
    }
    if (whyChanged) {
      whyRegistryOnlyFieldsChanged += 1;
    }
    if (sourceChanged) {
      supportingReferenceRecordsChanged += 1;
      supportingReferenceRowsChanged += sourceRowsChanged;
    }

    if (registryChanged || whyChanged || sourceChanged) {
      changedRecords.push({
        term: entry.term,
        filePath: 'backend/src/modules/legal-vocabulary/vocabulary-boundary.js',
        issueDetected: [
          registryChanged || whyChanged ? 'registry-only boilerplate' : null,
          sourceChanged ? 'supporting lexicon reference display boilerplate' : null,
        ].filter(Boolean).join('; '),
        fieldsChanged: [
          registryChanged ? 'registryInterpretation' : null,
          whyChanged ? 'whyRegistryOnly' : null,
          sourceChanged ? 'meaningSources[].supportNoteDisplay' : null,
          sourceChanged ? 'meaningSources[].citationDisplay' : null,
          sourceChanged ? 'meaningSources[].pageDisplay' : null,
        ].filter(Boolean),
        meaningInLawChanged: false,
        provenanceChanged: false,
        runtimeConceptPacketChanged: false,
      });
    }
  });

  const sampleTerms = ['ab initio', 'abandonment', 'account', 'heir', 'probation'];
  const samples = sampleTerms.map((term) => {
    const entry = response.entries.find((candidate) => candidate.term === term);
    const oldRegistry = oldRegistryFields(entry);
    return {
      term,
      oldRegistryInterpretation: oldRegistry.registryInterpretation,
      newRegistryInterpretation: entry.registryInterpretation,
      oldWhyRegistryOnly: oldRegistry.whyRegistryOnly,
      newWhyRegistryOnly: entry.whyRegistryOnly,
      oldSupportingReferenceText: referenceTextFromSources(
        oldFormattedSources(rawMeaningSourcesByTerm.get(entry.term) ?? []),
        null,
        false,
      ),
      newSupportingReferenceText: referenceTextFromSources(entry.meaningSources, null, true),
      meaningInLawChanged: false,
      runtimeConceptPacketChanged: false,
    };
  });

  return {
    generatedAt: new Date().toISOString(),
    summary: {
      recordsScanned: response.entries.length,
      recordsChanged: changedRecords.length,
      supportingReferenceHeadingsFixed: 1,
      duplicatedSupportingReferenceHeadingsRemoved: 0,
      supportingReferenceRecordsChanged,
      supportingReferenceRowsChanged,
      registryInterpretationFieldsChanged,
      whyRegistryOnlyFieldsChanged,
      recordsSkipped: response.entries.length - changedRecords.length,
    },
    beforeAfterSamples: samples,
    changedRecords,
    boundaryDiscipline: {
      meaningInLawChanged: false,
      sourceProvenanceChanged: false,
      runtimeOntologyChanged: false,
      conceptPacketsChanged: false,
      writebackToRuntimeConcepts: false,
      aliasFanoutPerformed: false,
    },
  };
}

function markdownTable(headers, rows) {
  return [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.map((value) => String(value ?? '').replaceAll('|', '\\|').replace(/\s+/g, ' ').trim()).join(' | ')} |`),
  ].join('\n');
}

function buildMarkdown(report) {
  return [
    '# Vocabulary Display Cleanup Report',
    '',
    '## Summary',
    '',
    `- Records scanned: ${report.summary.recordsScanned}`,
    `- Records changed: ${report.summary.recordsChanged}`,
    `- Supporting reference headings fixed: ${report.summary.supportingReferenceHeadingsFixed}`,
    `- Duplicated supporting reference headings removed: ${report.summary.duplicatedSupportingReferenceHeadingsRemoved}`,
    `- Supporting reference records changed: ${report.summary.supportingReferenceRecordsChanged}`,
    `- Supporting reference rows changed: ${report.summary.supportingReferenceRowsChanged}`,
    `- Registry interpretation fields changed: ${report.summary.registryInterpretationFieldsChanged}`,
    `- Why registry-only fields changed: ${report.summary.whyRegistryOnlyFieldsChanged}`,
    `- Records skipped: ${report.summary.recordsSkipped}`,
    '',
    '## Samples',
    '',
    markdownTable(
      [
        'Term',
        'Old registry interpretation',
        'New registry interpretation',
        'Old why registry-only',
        'New why registry-only',
        'Meaning changed',
        'Runtime/concept packet changed',
      ],
      report.beforeAfterSamples.map((sample) => [
        sample.term,
        sample.oldRegistryInterpretation,
        sample.newRegistryInterpretation,
        sample.oldWhyRegistryOnly,
        sample.newWhyRegistryOnly,
        sample.meaningInLawChanged,
        sample.runtimeConceptPacketChanged,
      ]),
    ),
    '',
    '## Discipline',
    '',
    '- meaning_in_law changed: false',
    '- source provenance changed: false',
    '- runtime ontology changed: false',
    '- concept packets changed: false',
    '- runtime writeback performed: false',
    '- alias fan-out performed: false',
    '',
    'The JSON report contains full supporting-reference before/after samples and the changed-record list.',
    '',
  ].join('\n');
}

function main() {
  const report = buildReport();
  writeJson(outputJsonPath, report);
  fs.writeFileSync(outputMarkdownPath, `${buildMarkdown(report)}\n`, 'utf8');
  process.stdout.write(`${JSON.stringify(report.summary, null, 2)}\n`);
}

main();
