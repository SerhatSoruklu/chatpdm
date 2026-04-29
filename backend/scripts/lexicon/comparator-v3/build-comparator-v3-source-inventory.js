'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const { repoRoot, workspaceRoot, sourceRecords } = require('./comparator-v3-config');
const { writeJson, writeText, markdownTable } = require('./comparator-v3-utils');

const outputPaths = Object.freeze({
  json: path.join(repoRoot, 'docs/boundary/comparator-v3-source-inventory.json'),
  markdown: path.join(repoRoot, 'docs/boundary/comparator-v3-source-inventory.md'),
});

function walkFiles(folderPath) {
  if (!fs.existsSync(folderPath)) {
    return [];
  }
  const entries = fs.readdirSync(folderPath, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const entryPath = path.join(folderPath, entry.name);
    if (entry.isDirectory()) {
      return walkFiles(entryPath);
    }
    return [entryPath];
  });
}

function pythonPageCount(pdfPath) {
  try {
    const output = execFileSync('python3', [
      '-c',
      'import fitz, sys; doc=fitz.open(sys.argv[1]); print(doc.page_count)',
      pdfPath,
    ], { encoding: 'utf8' }).trim();
    return Number.parseInt(output, 10);
  } catch {
    return null;
  }
}

function inventorySource(source) {
  const folderPath = path.join(workspaceRoot, source.folderName);
  const files = walkFiles(folderPath);
  const fileTypes = [...new Set(files.map((filePath) => path.extname(filePath).toLowerCase() || '[none]'))].sort();
  const pdfFiles = files.filter((filePath) => path.extname(filePath).toLowerCase() === '.pdf');
  const textFiles = files.filter((filePath) => ['.txt', '.text', '.md', '.json', '.ndjson'].includes(path.extname(filePath).toLowerCase()));
  const expectedPdfPath = path.join(folderPath, source.expectedPdf);
  const pageCount = fs.existsSync(expectedPdfPath) ? pythonPageCount(expectedPdfPath) : null;

  return {
    sourceId: source.sourceId,
    title: source.sourceTitle,
    year: source.year,
    volume: source.volume,
    folderPath,
    expectedPdfPath,
    folderExists: fs.existsSync(folderPath),
    fileCount: files.length,
    detectedFileTypes: fileTypes,
    pdfFileCount: pdfFiles.length,
    textExtractionInputExists: pdfFiles.length > 0,
    ocrOrTextFilesExist: textFiles.length > 0,
    estimatedPageAvailability: pageCount === null ? 'unknown' : `${pageCount} PDF pages via PyMuPDF`,
    estimatedLineAvailability: pageCount === null
      ? 'unknown until extraction'
      : 'available after PyMuPDF text line extraction',
    extractionReadiness: pdfFiles.length > 0 && pageCount !== null
      ? 'ready_for_direct_pdf_text_extraction_attempt'
      : 'blocked_missing_pdf_or_pdf_reader',
    risks: source.risks,
  };
}

function buildMarkdown(records) {
  return `${[
    '# Comparator v3 Source Inventory',
    '',
    'Scope: read-only inventory for Comparator v3 assistive sources. Black remains primary; these sources do not create meanings, aliases, runtime ontology admissions, concept packet changes, resolver behavior changes, or writeback.',
    '',
    markdownTable(
      ['Source id', 'Title', 'Year', 'Folder exists', 'Files', 'Types', 'Text/OCR exists', 'Page/line availability', 'Readiness'],
      records.map((record) => [
        record.sourceId,
        record.title,
        record.year,
        record.folderExists,
        record.fileCount,
        record.detectedFileTypes.join(', '),
        record.ocrOrTextFilesExist,
        `${record.estimatedPageAvailability}; ${record.estimatedLineAvailability}`,
        record.extractionReadiness,
      ]),
    ),
    '',
    '## Risks',
    '',
    ...records.flatMap((record) => [
      `### ${record.sourceId}`,
      '',
      ...record.risks.map((risk) => `- ${risk}`),
      '',
    ]),
  ].join('\n')}\n`;
}

function main() {
  const records = sourceRecords.map(inventorySource);
  const report = {
    generatedAt: new Date().toISOString(),
    mode: 'comparator_v3_source_inventory_only',
    authorityRules: {
      blackPrimary: true,
      comparatorV3AssistiveOnly: true,
      mayCreateMeaning: false,
      mayOverrideBlack: false,
      mayAdmitRuntimeOntology: false,
      exactTermOnly: true,
    },
    records,
  };

  writeJson(outputPaths.json, report);
  writeText(outputPaths.markdown, buildMarkdown(records));
  console.log(JSON.stringify({ outputPaths, sourceCount: records.length }, null, 2));
}

main();
