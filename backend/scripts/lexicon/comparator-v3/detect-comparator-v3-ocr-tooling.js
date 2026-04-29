'use strict';

const path = require('node:path');
const { execFileSync } = require('node:child_process');

const { repoRoot, outputDirs } = require('./comparator-v3-config');
const { ensureDir, writeJson, writeText, markdownTable } = require('./comparator-v3-utils');

const outputPaths = Object.freeze({
  json: path.join(repoRoot, 'docs/boundary/comparator-v3-ocr-tooling-report.json'),
  markdown: path.join(repoRoot, 'docs/boundary/comparator-v3-ocr-tooling-report.md'),
  workspaceJson: path.join(outputDirs.ocrReports, 'comparator_v3_ocr_tooling_report.json'),
});

function commandAvailable(command) {
  try {
    const resolved = execFileSync('bash', ['-lc', `command -v ${command}`], {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    return {
      available: resolved.length > 0,
      path: resolved || null,
    };
  } catch {
    return {
      available: false,
      path: null,
    };
  }
}

function pythonModuleAvailable(moduleName) {
  try {
    execFileSync('python3', ['-c', `import ${moduleName}`], {
      cwd: repoRoot,
      stdio: ['ignore', 'ignore', 'ignore'],
    });
    return true;
  } catch {
    return false;
  }
}

function buildMarkdown(report) {
  return `${[
    '# Comparator v3 OCR Tooling Report',
    '',
    'Scope: OCR availability detection only. No OCR output is trusted as meaning text, and Comparator v3 remains assistive-only.',
    '',
    '## CLI Tools',
    '',
    markdownTable(
      ['Tool', 'Available', 'Path'],
      Object.entries(report.cliTools).map(([tool, result]) => [tool, result.available, result.path]),
    ),
    '',
    '## Python Libraries',
    '',
    markdownTable(
      ['Library', 'Available'],
      Object.entries(report.pythonLibraries).map(([library, available]) => [library, available]),
    ),
    '',
    '## Recommendation',
    '',
    `- Recommended OCR path: ${report.recommendedOcrPath}`,
    `- Full OCR can run locally now: ${report.fullOcrCanRunLocallyNow}`,
    report.fullOcrCanRunLocallyNow
      ? '- OCR repair lane may run a bounded sample before any full source run.'
      : '- OCR repair lane is blocked pending OCR tooling; no fake OCR pages or alignments should be produced.',
    '',
  ].join('\n')}\n`;
}

function main() {
  ensureDir(outputDirs.ocrReports);
  const cliTools = {
    tesseract: commandAvailable('tesseract'),
    pdftoppm: commandAvailable('pdftoppm'),
    convert: commandAvailable('convert'),
    magick: commandAvailable('magick'),
  };
  const pythonLibraries = {
    fitz: pythonModuleAvailable('fitz'),
    PIL: pythonModuleAvailable('PIL'),
    pytesseract: pythonModuleAvailable('pytesseract'),
    pdf2image: pythonModuleAvailable('pdf2image'),
  };
  const fullOcrCanRunLocallyNow = Boolean(
    cliTools.tesseract.available
    && (pythonLibraries.fitz || cliTools.pdftoppm.available || pythonLibraries.pdf2image)
    && (pythonLibraries.PIL || cliTools.pdftoppm.available),
  );
  const recommendedOcrPath = fullOcrCanRunLocallyNow
    ? 'render_pdf_pages_with_pymupdf_or_pdftoppm_then_ocr_with_tesseract'
    : 'install_or_enable_tesseract_plus_pdf_rendering_before_ocr_repair_lane';
  const report = {
    generatedAt: new Date().toISOString(),
    mode: 'comparator_v3_ocr_tooling_detection',
    cliTools,
    pythonLibraries,
    missingTools: [
      ...Object.entries(cliTools).filter(([, value]) => !value.available).map(([tool]) => tool),
      ...Object.entries(pythonLibraries).filter(([, available]) => !available).map(([library]) => library),
    ],
    recommendedOcrPath,
    fullOcrCanRunLocallyNow,
  };
  writeJson(outputPaths.json, report);
  writeJson(outputPaths.workspaceJson, report);
  writeText(outputPaths.markdown, buildMarkdown(report));
  console.log(JSON.stringify({ outputPaths, fullOcrCanRunLocallyNow }, null, 2));
}

main();
