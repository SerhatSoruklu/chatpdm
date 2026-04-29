'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const {
  repoRoot,
  workspaceRoot,
  sourceRecords,
  ocrRepairSourceIds,
  outputDirs,
} = require('./comparator-v3-config');
const { ensureDir, writeJson, writeText, markdownTable } = require('./comparator-v3-utils');

const targetSources = sourceRecords.filter((source) => ocrRepairSourceIds.includes(source.sourceId));
const outputPaths = Object.freeze({
  json: path.join(repoRoot, 'docs/boundary/comparator-v3-ocr-text-quality-report.json'),
  markdown: path.join(repoRoot, 'docs/boundary/comparator-v3-ocr-text-quality-report.md'),
  workspaceJson: path.join(outputDirs.ocrReports, 'comparator_v3_ocr_text_quality_report.json'),
});

const pythonInspector = String.raw`
import json
import re
import sys
import fitz

pdf_path = sys.argv[1]
sample_pages = [0, 10, 20, 50, 100, 200]
doc = fitz.open(pdf_path)
page_count = doc.page_count
total_chars = 0
readable_letters = 0
control_chars = 0
blank_pages = 0
samples = []
control_re = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f]")

for page_index in range(page_count):
    text = doc.load_page(page_index).get_text("text") or ""
    total_chars += len(text)
    readable_letters += len(re.findall(r"[A-Za-z]", text))
    control_chars += len(control_re.findall(text))
    if not text.strip():
        blank_pages += 1
    if page_index in sample_pages:
        samples.append({
            "page": page_index + 1,
            "textLength": len(text),
            "readableLetterCount": len(re.findall(r"[A-Za-z]", text)),
            "controlCharacterCount": len(control_re.findall(text)),
            "sampleText": text[:500],
        })

print(json.dumps({
    "pageCount": page_count,
    "embeddedTextCharacterCount": total_chars,
    "readableLetterCount": readable_letters,
    "controlCharacterCount": control_chars,
    "blankPageCount": blank_pages,
    "samples": samples,
}, ensure_ascii=True))
`;

function classify(record) {
  const blankPageRatio = record.pageCount ? record.blankPageCount / record.pageCount : 1;
  const controlCharacterRatio = record.embeddedTextCharacterCount
    ? record.controlCharacterCount / record.embeddedTextCharacterCount
    : 0;
  const readableRatio = record.embeddedTextCharacterCount
    ? record.readableLetterCount / record.embeddedTextCharacterCount
    : 0;

  if (record.embeddedTextCharacterCount === 0 || blankPageRatio > 0.95) {
    return {
      directTextUsable: false,
      ocrRequired: true,
      extractionBlockerReason: 'no_embedded_text_or_blank_text_layer',
    };
  }
  if (record.readableLetterCount === 0 || controlCharacterRatio > 0.20 || readableRatio < 0.05) {
    return {
      directTextUsable: false,
      ocrRequired: true,
      extractionBlockerReason: 'embedded_text_unusable_control_characters',
    };
  }
  return {
    directTextUsable: true,
    ocrRequired: false,
    extractionBlockerReason: 'direct_text_usable',
  };
}

function inspectSource(source) {
  const pdfPath = path.join(workspaceRoot, source.folderName, source.expectedPdf);
  const raw = execFileSync('python3', ['-c', pythonInspector, pdfPath], {
    cwd: repoRoot,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 10,
  });
  const stats = JSON.parse(raw);
  const classification = classify(stats);
  return {
    sourceId: source.sourceId,
    sourceTitle: source.sourceTitle,
    year: source.year,
    volume: source.volume,
    pdfPath,
    pageCount: stats.pageCount,
    embeddedTextCharacterCount: stats.embeddedTextCharacterCount,
    readableLetterCount: stats.readableLetterCount,
    controlCharacterCount: stats.controlCharacterCount,
    controlCharacterRatio: stats.embeddedTextCharacterCount
      ? stats.controlCharacterCount / stats.embeddedTextCharacterCount
      : 0,
    blankPageCount: stats.blankPageCount,
    blankPageRatio: stats.pageCount ? stats.blankPageCount / stats.pageCount : 1,
    directTextUsable: classification.directTextUsable,
    ocrRequired: classification.ocrRequired,
    extractionBlockerReason: classification.extractionBlockerReason,
    sampleExtractedText: stats.samples,
  };
}

function buildMarkdown(records) {
  return `${[
    '# Comparator v3 OCR Text Quality Report',
    '',
    'Scope: text-quality inspection only. Comparator v3 remains assistive-only and cannot create meanings, aliases, writeback, runtime ontology changes, concept packet changes, or resolver behavior changes.',
    '',
    markdownTable(
      ['Source id', 'Pages', 'Text chars', 'Readable letters', 'Control ratio', 'Blank ratio', 'Direct text usable', 'OCR required', 'Blocker'],
      records.map((record) => [
        record.sourceId,
        record.pageCount,
        record.embeddedTextCharacterCount,
        record.readableLetterCount,
        record.controlCharacterRatio.toFixed(4),
        record.blankPageRatio.toFixed(4),
        record.directTextUsable,
        record.ocrRequired,
        record.extractionBlockerReason,
      ]),
    ),
    '',
    '## Sample Extracted Text',
    '',
    ...records.flatMap((record) => [
      `### ${record.sourceId}`,
      '',
      ...record.sampleExtractedText.map((sample) => [
        `- Page ${sample.page}: length ${sample.textLength}, letters ${sample.readableLetterCount}, controls ${sample.controlCharacterCount}`,
        '```text',
        sample.sampleText,
        '```',
      ].join('\n')),
      '',
    ]),
  ].join('\n')}\n`;
}

function main() {
  ensureDir(outputDirs.ocrPages);
  ensureDir(outputDirs.ocrEntryCandidates);
  ensureDir(outputDirs.ocrAlignment);
  ensureDir(outputDirs.ocrReports);

  const records = targetSources.map(inspectSource);
  const report = {
    generatedAt: new Date().toISOString(),
    mode: 'comparator_v3_ocr_text_quality_inspection',
    comparatorRole: 'assistive_v3_only',
    mayCreateMeaning: false,
    mayOverrideBlack: false,
    mayAdmitRuntimeOntology: false,
    records,
  };
  writeJson(outputPaths.json, report);
  writeJson(outputPaths.workspaceJson, report);
  writeText(outputPaths.markdown, buildMarkdown(records));
  console.log(JSON.stringify({ outputPaths, records: records.length }, null, 2));
}

main();
