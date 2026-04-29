'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const { workspaceRoot, sourceRecords, outputDirs } = require('./comparator-v3-config');
const { ensureDir, normalizeForComparison, writeJson, writeNdjson } = require('./comparator-v3-utils');

const pythonExtractor = String.raw`
import json
import re
import sys
import fitz

pdf_path = sys.argv[1]
source_id = sys.argv[2]
source_title = sys.argv[3]
year = int(sys.argv[4])
volume = None if sys.argv[5] == "" else sys.argv[5]

word_pattern = re.compile(r"[A-Za-z][A-Za-z'-]*")
control_pattern = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f]")

def quality(text):
    char_count = len(text)
    word_count = len(word_pattern.findall(text))
    control_count = len(control_pattern.findall(text))
    control_ratio = control_count / char_count if char_count else 1
    if char_count >= 1600 and word_count >= 160 and control_ratio < 0.01:
        return "good", "high"
    if char_count >= 600 and word_count >= 60 and control_ratio < 0.04:
        return "mixed", "medium"
    return "poor", "low"

doc = fitz.open(pdf_path)
for page_index in range(doc.page_count):
    page = doc.load_page(page_index)
    text = page.get_text("text") or ""
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    tier, confidence = quality(text)
    print(json.dumps({
        "sourceId": source_id,
        "sourceTitle": source_title,
        "year": year,
        "volume": volume,
        "sourceFile": pdf_path,
        "page": page_index + 1,
        "lineCount": len(lines),
        "textCharCount": len(text),
        "sourceQualityTier": tier,
        "parseConfidence": confidence,
        "lines": lines,
    }, ensure_ascii=True))
`;

const headwordPatterns = [
  /^(?<headword>[A-Z][A-Z0-9 '&,/.-]{1,90})(?:[.:;]|\s{2,}|$)/,
  /^(?<headword>[A-Z][A-Za-z][A-Za-z '&/-]{1,70})\.\s+/,
];

const badHeadwords = new Set([
  'A',
  'AN',
  'AND',
  'AS',
  'BY',
  'FOR',
  'IN',
  'NO',
  'OF',
  'OR',
  'SEE',
  'THE',
  'TO',
]);

function sourceFilter() {
  const requested = process.argv.slice(2);
  if (requested.length === 0 || requested.includes('--all')) {
    return sourceRecords;
  }
  const wanted = new Set(requested);
  return sourceRecords.filter((source) => wanted.has(source.sourceId));
}

function collapseSpace(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function detectHeadword(line) {
  const compact = collapseSpace(line);
  if (compact.length < 2 || compact.length > 160) {
    return null;
  }
  for (const pattern of headwordPatterns) {
    const match = pattern.exec(compact);
    if (!match?.groups?.headword) {
      continue;
    }
    const headword = collapseSpace(match.groups.headword)
      .replace(/[.;:,]+$/g, '')
      .trim();
    if (headword.length < 2 || badHeadwords.has(headword.toUpperCase())) {
      continue;
    }
    if (!/[A-Za-z]/.test(headword)) {
      continue;
    }
    return headword;
  }
  return null;
}

function pageContext(lines, index) {
  return collapseSpace(lines.slice(index, Math.min(lines.length, index + 4)).join(' ')).slice(0, 360);
}

function extractPages(source) {
  const pdfPath = path.join(workspaceRoot, source.folderName, source.expectedPdf);
  const result = spawnSync('python3', [
    '-c',
    pythonExtractor,
    pdfPath,
    source.sourceId,
    source.sourceTitle,
    String(source.year),
    source.volume ?? '',
  ], { encoding: 'utf8', maxBuffer: 1024 * 1024 * 100 });

  if (result.status !== 0) {
    throw new Error(result.stderr || `Extraction failed for ${source.sourceId}`);
  }

  return result.stdout
    .split(/\r?\n/)
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line));
}

function buildCandidates(source, pages) {
  const candidates = [];
  pages.forEach((page) => {
    page.lines.forEach((line, index) => {
      const headword = detectHeadword(line);
      if (!headword) {
        return;
      }
      const parseConfidence = page.parseConfidence === 'high'
        ? 'high'
        : page.parseConfidence === 'medium' ? 'medium' : 'low';
      candidates.push({
        id: `${source.sourceId}:${page.page}:${index + 1}:${normalizeForComparison(headword)}`,
        sourceId: source.sourceId,
        sourceTitle: source.sourceTitle,
        year: source.year,
        volume: source.volume,
        sourceFile: path.join(workspaceRoot, source.folderName, source.expectedPdf),
        page: page.page,
        lineNumber: index + 1,
        headword,
        normalizedHeadword: normalizeForComparison(headword),
        rawLine: line,
        contextPreview: pageContext(page.lines, index),
        parseConfidence,
        sourceQualityTier: page.sourceQualityTier,
        extractionMode: 'pymupdf_direct_text_candidate',
      });
    });
  });
  return candidates;
}

function main() {
  ensureDir(outputDirs.rawPages);
  ensureDir(outputDirs.entryCandidates);
  ensureDir(outputDirs.reports);

  const summaries = sourceFilter().map((source) => {
    const pages = extractPages(source);
    const candidates = buildCandidates(source, pages);
    const rawPagesPath = path.join(outputDirs.rawPages, `${source.sourceId}.pages.ndjson`);
    const candidatesPath = path.join(outputDirs.entryCandidates, `${source.sourceId}.entry_candidates.ndjson`);
    writeNdjson(rawPagesPath, pages);
    writeNdjson(candidatesPath, candidates);
    return {
      sourceId: source.sourceId,
      pageCount: pages.length,
      candidateCount: candidates.length,
      highConfidenceCandidates: candidates.filter((candidate) => candidate.parseConfidence === 'high').length,
      mediumConfidenceCandidates: candidates.filter((candidate) => candidate.parseConfidence === 'medium').length,
      lowConfidenceCandidates: candidates.filter((candidate) => candidate.parseConfidence === 'low').length,
      rawPagesPath,
      candidatesPath,
    };
  });

  const report = {
    generatedAt: new Date().toISOString(),
    mode: 'comparator_v3_pdf_direct_text_extraction',
    comparatorRole: 'assistive_v3_only',
    mayCreateMeaning: false,
    mayOverrideBlack: false,
    mayAdmitRuntimeOntology: false,
    summaries,
  };
  writeJson(path.join(outputDirs.reports, 'comparator_v3_extraction_summary.json'), report);
  console.log(JSON.stringify(report, null, 2));
}

main();
