'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const {
  workspaceRoot,
  sourceRecords,
  ocrRepairSourceIds,
  outputDirs,
} = require('./comparator-v3-config');
const { ensureDir, readJson, writeJson, writeNdjson } = require('./comparator-v3-utils');

const targetSources = sourceRecords.filter((source) => ocrRepairSourceIds.includes(source.sourceId));
const toolingPath = path.join(outputDirs.ocrReports, 'comparator_v3_ocr_tooling_report.json');

const pythonOcr = String.raw`
import json
import re
import sys
import tempfile
from pathlib import Path

import fitz
from PIL import Image
import pytesseract

pdf_path = sys.argv[1]
source_id = sys.argv[2]
source_title = sys.argv[3]
year = int(sys.argv[4])
volume = None if sys.argv[5] == "" else sys.argv[5]
pages = [int(value) for value in sys.argv[6].split(",") if value]

doc = fitz.open(pdf_path)
for page_number in pages:
    page = doc.load_page(page_number - 1)
    pix = page.get_pixmap(matrix=fitz.Matrix(2, 2), alpha=False)
    image = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
    data = pytesseract.image_to_data(image, output_type=pytesseract.Output.DICT, config="--psm 6")
    words = []
    confidences = []
    for text, conf in zip(data.get("text", []), data.get("conf", [])):
        if text and text.strip():
            words.append(text)
            try:
                value = float(conf)
                if value >= 0:
                    confidences.append(value)
            except Exception:
                pass
    ocr_text = " ".join(words)
    readable_letters = len(re.findall(r"[A-Za-z]", ocr_text))
    confidence = sum(confidences) / len(confidences) if confidences else None
    print(json.dumps({
        "sourceId": source_id,
        "sourceTitle": source_title,
        "year": year,
        "volume": volume,
        "page": page_number,
        "ocrText": ocr_text,
        "ocrEngine": "tesseract",
        "ocrConfig": "--psm 6; render=pymupdf_matrix_2",
        "textLength": len(ocr_text),
        "readableLetterCount": readable_letters,
        "confidence": confidence,
        "extractionMode": "ocr_repair_lane",
        "comparatorRole": "assistive_v3_only",
        "authorityLevel": "comparator_only_not_primary",
        "mayCreateMeaning": False,
        "mayOverrideBlack": False,
        "mayAdmitRuntimeOntology": False,
    }, ensure_ascii=True))
`;

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    sourceIds: [],
    sample: false,
    all: false,
    pageRange: null,
  };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--sample') {
      options.sample = true;
    } else if (arg === '--all') {
      options.all = true;
    } else if (arg === '--source') {
      options.sourceIds.push(args[index + 1]);
      index += 1;
    } else if (arg === '--page-range') {
      options.pageRange = args[index + 1];
      index += 1;
    }
  }
  if (!options.sample && !options.all && !options.pageRange) {
    options.sample = true;
  }
  return options;
}

function pagesForSource(source, options) {
  if (options.pageRange) {
    const [start, end] = options.pageRange.split('-').map((value) => Number.parseInt(value, 10));
    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
  }
  if (options.sample) {
    // Skip front matter enough to hit body pages while keeping the initial repair bounded.
    return Array.from({ length: 25 }, (_, index) => 21 + index);
  }
  const pdfPath = path.join(workspaceRoot, source.folderName, source.expectedPdf);
  const result = spawnSync('python3', ['-c', 'import fitz, sys; print(fitz.open(sys.argv[1]).page_count)', pdfPath], {
    encoding: 'utf8',
  });
  const pageCount = Number.parseInt(result.stdout.trim(), 10);
  return Array.from({ length: pageCount }, (_, index) => index + 1);
}

function toolingAvailable() {
  if (!fs.existsSync(toolingPath)) {
    return false;
  }
  const tooling = readJson(toolingPath);
  return Boolean(tooling.fullOcrCanRunLocallyNow);
}

function main() {
  ensureDir(outputDirs.ocrPages);
  ensureDir(outputDirs.ocrReports);
  const options = parseArgs();
  const selectedSources = targetSources.filter((source) => (
    options.sourceIds.length === 0 || options.sourceIds.includes(source.sourceId)
  ));

  if (!toolingAvailable()) {
    const report = {
      generatedAt: new Date().toISOString(),
      mode: 'comparator_v3_ocr_page_extraction',
      status: 'blocked_pending_ocr_tooling',
      attemptedSources: selectedSources.map((source) => source.sourceId),
      reason: 'OCR engine/tooling is not available locally; no OCR pages were produced.',
      comparatorRole: 'assistive_v3_only',
      mayCreateMeaning: false,
      mayOverrideBlack: false,
      mayAdmitRuntimeOntology: false,
    };
    writeJson(path.join(outputDirs.ocrReports, 'comparator_v3_ocr_page_extraction_blocked.json'), report);
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  const summaries = selectedSources.map((source) => {
    const pdfPath = path.join(workspaceRoot, source.folderName, source.expectedPdf);
    const pages = pagesForSource(source, options);
    const result = spawnSync('python3', [
      '-c',
      pythonOcr,
      pdfPath,
      source.sourceId,
      source.sourceTitle,
      String(source.year),
      source.volume ?? '',
      pages.join(','),
    ], { encoding: 'utf8', maxBuffer: 1024 * 1024 * 100 });
    if (result.status !== 0) {
      throw new Error(result.stderr || `OCR failed for ${source.sourceId}`);
    }
    const records = result.stdout.split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
    const outputPath = path.join(outputDirs.ocrPages, `${source.sourceId}.ocr_pages.ndjson`);
    writeNdjson(outputPath, records);
    return {
      sourceId: source.sourceId,
      pagesAttempted: pages.length,
      outputPath,
      recordsWritten: records.length,
    };
  });

  const report = {
    generatedAt: new Date().toISOString(),
    mode: 'comparator_v3_ocr_page_extraction',
    status: 'ocr_pages_written',
    sampleMode: options.sample,
    allMode: options.all,
    summaries,
  };
  writeJson(path.join(outputDirs.ocrReports, 'comparator_v3_ocr_page_extraction_summary.json'), report);
  console.log(JSON.stringify(report, null, 2));
}

main();
