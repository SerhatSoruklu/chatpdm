'use strict';

const childProcess = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '../../../..');
const workspaceRoot = '/mnt/c/Users/coupy/Desktop/vocabulary-reference-lexicons';
const windowsWorkspaceRoot = 'C:\\Users\\coupy\\Desktop\\vocabulary-reference-lexicons';

const outputPaths = Object.freeze({
  auditReport: path.join(workspaceRoot, 'audit_report.md'),
  sourceInventory: path.join(workspaceRoot, 'source_inventory.json'),
  parserRecommendations: path.join(workspaceRoot, 'parser_recommendations.json'),
  environmentReport: path.join(workspaceRoot, 'environment_report.json'),
  existingScriptsReport: path.join(workspaceRoot, 'existing_scripts_report.json'),
});
const generatedOutputPaths = new Set(Object.values(outputPaths));

const extensionTypeMap = Object.freeze({
  '.pdf': 'pdf',
  '.txt': 'txt',
  '.djvu': 'djvu',
  '.xml': 'xml',
  '.json': 'json',
  '.csv': 'csv',
  '.jpg': 'image',
  '.jpeg': 'image',
  '.png': 'image',
  '.tif': 'image',
  '.tiff': 'image',
  '.gif': 'image',
  '.webp': 'image',
  '.yaml': 'metadata',
  '.yml': 'metadata',
  '.md': 'metadata',
});

const scriptKeywordPattern = /(pdf|ocr|tesseract|chunk|headword|dictionary|lexicon|ndjson|extract|parse|page)/i;
const scriptExtensions = new Set(['.py', '.js', '.ts', '.mjs', '.cjs', '.sh']);
const ignoredDirectoryNames = new Set([
  '.git',
  'node_modules',
  'dist',
  'build',
  '.angular',
  '.cache',
  'coverage',
  'out-tsc',
]);

function toWindowsPath(filePath) {
  if (filePath.startsWith('/mnt/c/')) {
    return `C:\\${filePath.slice('/mnt/c/'.length).replaceAll('/', '\\')}`;
  }

  return filePath;
}

function readJsonIfPresent(relativePath) {
  const filePath = path.join(repoRoot, relativePath);
  if (!fs.existsSync(filePath)) {
    return null;
  }

  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function classifyFileType(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  if (extensionTypeMap[extension]) {
    return extensionTypeMap[extension];
  }

  if (/(meta|metadata|manifest|readme)/i.test(path.basename(filePath))) {
    return 'metadata';
  }

  return 'other';
}

function walkFiles(rootPath, options = {}) {
  const maxDepth = options.maxDepth ?? Infinity;
  const files = [];

  function visit(currentPath, depth) {
    if (depth > maxDepth) {
      return;
    }

    const entries = fs.readdirSync(currentPath, { withFileTypes: true });
    entries.forEach((entry) => {
      const entryPath = path.join(currentPath, entry.name);
      if (entry.isDirectory()) {
        if (!ignoredDirectoryNames.has(entry.name)) {
          visit(entryPath, depth + 1);
        }
        return;
      }

      if (entry.isFile()) {
        files.push(entryPath);
      }
    });
  }

  if (fs.existsSync(rootPath)) {
    visit(rootPath, 0);
  }

  return files;
}

function groupSourceFolders(files) {
  const foldersByName = new Map();

  files.forEach((filePath) => {
    const relativePath = path.relative(workspaceRoot, filePath);
    const [folderName] = relativePath.split(path.sep);
    const sourceFolder = folderName === path.basename(filePath) ? '.' : folderName;

    if (!foldersByName.has(sourceFolder)) {
      foldersByName.set(sourceFolder, []);
    }
    foldersByName.get(sourceFolder).push(filePath);
  });

  return [...foldersByName.entries()]
    .map(([folderName, folderFiles]) => {
      const fileRecords = folderFiles
        .sort((left, right) => left.localeCompare(right))
        .map((filePath) => {
          const stat = fs.statSync(filePath);
          return {
            path: toWindowsPath(filePath),
            wslPath: filePath,
            relativePath: path.relative(workspaceRoot, filePath),
            name: path.basename(filePath),
            extension: path.extname(filePath).toLowerCase(),
            type: classifyFileType(filePath),
            sizeBytes: stat.size,
          };
        });

      const countsByType = {};
      fileRecords.forEach((record) => {
        countsByType[record.type] = (countsByType[record.type] ?? 0) + 1;
      });

      const likelyMainSourceFiles = fileRecords
        .filter((record) => record.type === 'pdf' || record.type === 'txt' || record.type === 'djvu')
        .sort((left, right) => (
          right.sizeBytes - left.sizeBytes
          || left.relativePath.localeCompare(right.relativePath)
        ));

      return {
        folderName,
        path: toWindowsPath(path.join(workspaceRoot, folderName)),
        wslPath: path.join(workspaceRoot, folderName),
        fileCount: fileRecords.length,
        countsByType,
        likelyMainSourceFiles,
        files: fileRecords,
      };
    })
    .sort((left, right) => left.folderName.localeCompare(right.folderName));
}

function runCommand(command, args, options = {}) {
  const result = childProcess.spawnSync(command, args, {
    cwd: options.cwd ?? repoRoot,
    encoding: 'utf8',
    maxBuffer: options.maxBuffer ?? 1024 * 1024 * 10,
  });

  return {
    command,
    args,
    available: result.error?.code !== 'ENOENT',
    status: result.status,
    stdout: result.stdout?.trim() ?? '',
    stderr: result.stderr?.trim() ?? '',
    error: result.error ? result.error.message : null,
  };
}

function detectPythonPackage(moduleName) {
  const result = runCommand('python3', [
    '-c',
    `import importlib.util; print("present" if importlib.util.find_spec(${JSON.stringify(moduleName)}) else "missing")`,
  ]);

  return result.stdout === 'present' ? 'present' : 'missing';
}

function buildEnvironmentReport() {
  const commands = {
    python3Version: runCommand('python3', ['--version']),
    pythonVersion: runCommand('python', ['--version']),
    pip3Version: runCommand('pip3', ['--version']),
    pipVersion: runCommand('pip', ['--version']),
    pdfinfoPath: runCommand('which', ['pdfinfo']),
    pdftotextPath: runCommand('which', ['pdftotext']),
    tesseractPath: runCommand('which', ['tesseract']),
  };

  const pythonPackages = {
    pymupdf: detectPythonPackage('fitz'),
    pdfplumber: detectPythonPackage('pdfplumber'),
    pypdf: detectPythonPackage('pypdf'),
    pdfminer: detectPythonPackage('pdfminer'),
    pytesseract: detectPythonPackage('pytesseract'),
    pillow: detectPythonPackage('PIL'),
    pandas: detectPythonPackage('pandas'),
    rapidfuzz: detectPythonPackage('rapidfuzz'),
    tqdm: detectPythonPackage('tqdm'),
  };

  return {
    generatedAt: new Date().toISOString(),
    machine: {
      platform: os.platform(),
      release: os.release(),
      cpuCount: os.cpus().length,
      totalMemoryBytes: os.totalmem(),
      freeMemoryBytes: os.freemem(),
    },
    commands,
    pythonPackages,
    installationPerformed: false,
    notes: [
      'Audit only: missing packages are reported but not installed.',
      'PyMuPDF is available and is sufficient for sampling PDF page counts/text feasibility.',
    ],
  };
}

function analyzePdf(pdfPath) {
  const pythonScript = String.raw`
import json
import re
import sys

import fitz

pdf_path = sys.argv[1]
doc = fitz.open(pdf_path)
page_count = doc.page_count
sample_indexes = []
if page_count:
    candidates = [0, 1, page_count // 2, max(0, page_count - 2), page_count - 1]
    for candidate in candidates:
        if 0 <= candidate < page_count and candidate not in sample_indexes:
            sample_indexes.append(candidate)

samples = []
for index in sample_indexes:
    page = doc.load_page(index)
    text = page.get_text("text") or ""
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    alpha_num = sum(1 for char in text if char.isalnum())
    replacement = text.count("\ufffd")
    uppercase_candidates = [
        line for line in lines
        if 2 <= len(line) <= 80
        and re.search(r"[A-Z]", line)
        and sum(1 for char in line if char.isupper()) >= max(2, int(len(line.replace(" ", "")) * 0.45))
    ][:10]
    dictionary_markers = [
        line for line in lines
        if re.match(r"^[A-Z][A-Z '.\\-]{2,80}[.,;:]?$", line)
    ][:10]
    samples.append({
        "page": index + 1,
        "charCount": len(text),
        "lineCount": len(lines),
        "wordCount": len(re.findall(r"[A-Za-z][A-Za-z'-]*", text)),
        "imageCount": len(page.get_images(full=True)),
        "alnumRatio": round(alpha_num / len(text), 4) if text else 0,
        "replacementCharCount": replacement,
        "uppercaseHeadwordCandidateCount": len(uppercase_candidates),
        "dictionaryMarkerCount": len(dictionary_markers),
        "textPreview": re.sub(r"\s+", " ", text[:500]).strip(),
        "candidateLines": uppercase_candidates[:5],
    })

doc.close()

char_counts = [sample["charCount"] for sample in samples]
word_counts = [sample["wordCount"] for sample in samples]
marker_counts = [sample["dictionaryMarkerCount"] + sample["uppercaseHeadwordCandidateCount"] for sample in samples]
image_counts = [sample["imageCount"] for sample in samples]
average_chars = sum(char_counts) / len(char_counts) if char_counts else 0
average_words = sum(word_counts) / len(word_counts) if word_counts else 0
average_markers = sum(marker_counts) / len(marker_counts) if marker_counts else 0
average_images = sum(image_counts) / len(image_counts) if image_counts else 0

if average_chars >= 1200 and average_words >= 120:
    text_layer = "text_based_or_ocr_text_layer"
elif average_chars >= 150:
    text_layer = "mixed_or_sparse_text_layer"
else:
    text_layer = "image_scanned_no_reliable_text_layer"

if text_layer == "text_based_or_ocr_text_layer" and average_markers >= 2:
    extraction = "direct_text_extraction"
    segmentation = "likely_feasible"
elif text_layer == "text_based_or_ocr_text_layer":
    extraction = "direct_text_extraction_with_segmentation_tuning"
    segmentation = "partial"
elif text_layer == "mixed_or_sparse_text_layer":
    extraction = "mixed_fallback_needed"
    segmentation = "uncertain"
else:
    extraction = "ocr_assisted"
    segmentation = "not_feasible_from_current_text_layer"

if average_chars >= 1200 and all(sample["replacementCharCount"] < 25 for sample in samples):
    ocr_quality = "good"
elif average_chars >= 150:
    ocr_quality = "mixed"
else:
    ocr_quality = "poor"

print(json.dumps({
    "pageCount": page_count,
    "sampledPages": [sample["page"] for sample in samples],
    "sampleCount": len(samples),
    "averageSampleChars": round(average_chars, 2),
    "averageSampleWords": round(average_words, 2),
    "averageSampleHeadwordMarkerCount": round(average_markers, 2),
    "averageSampleImageCount": round(average_images, 2),
    "textLayerAssessment": text_layer,
    "ocrQualityEstimate": ocr_quality,
    "recommendedExtractionPath": extraction,
    "headwordSegmentationFeasibility": segmentation,
    "samples": samples,
}))
`;

  const result = runCommand('python3', ['-c', pythonScript, pdfPath], {
    maxBuffer: 1024 * 1024 * 50,
  });

  if (result.status !== 0) {
    return {
      path: toWindowsPath(pdfPath),
      wslPath: pdfPath,
      error: result.stderr || result.error || 'Unknown PDF analysis failure.',
      recommendedExtractionPath: 'unknown',
      headwordSegmentationFeasibility: 'unknown',
    };
  }

  return {
    path: toWindowsPath(pdfPath),
    wslPath: pdfPath,
    relativePath: path.relative(workspaceRoot, pdfPath),
    ...JSON.parse(result.stdout),
  };
}

function buildPdfFeasibility(sourceFolders) {
  return sourceFolders.flatMap((folder) => (
    folder.likelyMainSourceFiles
      .filter((record) => record.type === 'pdf')
      .map((record) => ({
        sourceFolder: folder.folderName,
        fileName: record.name,
        sizeBytes: record.sizeBytes,
        ...analyzePdf(record.wslPath),
      }))
  ));
}

function inferSourceMetadata(folderName, fileName) {
  const lower = `${folderName} ${fileName}`.toLowerCase();

  if (lower.includes('black') && lower.includes('1910')) {
    return {
      sourceId: 'blacks_1910',
      sourceTitle: "Black's Law Dictionary, 2nd Edition",
      year: 1910,
      volume: null,
    };
  }

  if (lower.includes('bouvier') && lower.includes('01')) {
    return {
      sourceId: 'bouvier_1839_v1',
      sourceTitle: "Bouvier's Law Dictionary",
      year: 1839,
      volume: 1,
    };
  }

  if (lower.includes('bouvier') && lower.includes('02')) {
    return {
      sourceId: 'bouvier_1839_v2',
      sourceTitle: "Bouvier's Law Dictionary",
      year: 1839,
      volume: 2,
    };
  }

  if (lower.includes('burrill')) {
    return {
      sourceId: 'burrill_1860',
      sourceTitle: 'A Law Dictionary and Glossary',
      year: 1860,
      volume: null,
    };
  }

  if (lower.includes('ball')) {
    return {
      sourceId: 'ballentine_1916',
      sourceTitle: "Ballentine's Law Dictionary",
      year: 1916,
      volume: null,
    };
  }

  if (lower.includes('black_1891') || lower.includes('dictionary_of_black_1891')) {
    const partMatch = /00_([^./]+)\.pdf$/i.exec(fileName);
    return {
      sourceId: `black_1891_${partMatch ? partMatch[1].replaceAll('_', '-') : 'part'}`,
      sourceTitle: 'A Dictionary of Law',
      year: 1891,
      volume: partMatch ? partMatch[1].replaceAll('_', '-').toUpperCase() : null,
    };
  }

  return {
    sourceId: folderName,
    sourceTitle: folderName.replaceAll('_', ' '),
    year: null,
    volume: null,
  };
}

function buildParserRecommendations(pdfFeasibility) {
  const sourceRecommendations = pdfFeasibility.map((pdf) => {
    const metadata = inferSourceMetadata(pdf.sourceFolder, pdf.fileName);
    const needsOcr = pdf.recommendedExtractionPath === 'ocr_assisted';
    const parser = needsOcr ? 'OCR-assisted extraction after tool setup' : 'PyMuPDF direct page text sampling/extraction';
    const priority = pdf.recommendedExtractionPath === 'direct_text_extraction'
      ? 'first'
      : pdf.recommendedExtractionPath === 'direct_text_extraction_with_segmentation_tuning'
        ? 'early'
        : 'later';

    return {
      ...metadata,
      sourceFolder: pdf.sourceFolder,
      fileName: pdf.fileName,
      pageCount: pdf.pageCount ?? null,
      textLayerAssessment: pdf.textLayerAssessment ?? 'unknown',
      ocrQualityEstimate: pdf.ocrQualityEstimate ?? 'unknown',
      recommendedParser: parser,
      recommendedExtractionPath: pdf.recommendedExtractionPath,
      headwordSegmentationFeasibility: pdf.headwordSegmentationFeasibility,
      processingPriority: priority,
      pageByPageExtractionAdvisable: true,
      notes: needsOcr
        ? ['Do not run full extraction until OCR tooling is installed and a small OCR proof is completed.']
        : ['Use page-by-page extraction with page provenance preserved.', 'Headword segmentation should be validated on a small page window before full run.'],
    };
  });

  return {
    generatedAt: new Date().toISOString(),
    scope: 'lexicon source audit only; no corpus built and no meanings authored',
    sourceRecommendations,
    globalRecommendation: {
      preferredIngestionFormat: 'NDJSON for page and entry streams, with JSON snapshots for indexes/reports',
      pageByPageExtraction: 'feasible and advisable, because provenance must include source file and page',
      unifiedSchema: {
        id: '',
        sourceId: '',
        sourceTitle: '',
        year: 0,
        volume: null,
        page: null,
        headword: '',
        normalizedHeadword: '',
        entryType: 'dictionary_term',
        rawText: '',
        cleanText: '',
        crossReferences: [],
        isLatin: false,
        parseConfidence: 'high|medium|low',
        ocrQuality: 'good|mixed|poor',
        sourceFile: '',
      },
      aliasCanonicalization: {
        usePriorBoundaryAudit: true,
        note: 'The prior audit found 1,278 likely alias groups and 2,556 terms inside alias groups. Reference alignment should map lexicon headwords to canonical normalized forms before any meaning authoring.',
      },
      coreRuntimeBoundary: {
        editable: false,
        note: 'Reference alignment may report collisions with live/runtime concepts, but must not queue them for rewrite in this project.',
      },
    },
  };
}

function summarizeScript(filePath) {
  const content = fs.readFileSync(filePath, 'utf8').slice(0, 6000);
  const lower = content.toLowerCase();
  const capabilities = [];

  [
    ['pdf extraction', /pdf|fitz|pymupdf|pdfplumber|pypdf|pdfminer/],
    ['ocr', /ocr|tesseract|pytesseract/],
    ['page scanning', /page[_ -]?(start|end|count|number)|load_page|get_text/],
    ['chunking', /chunk|overlap|chars_per_chunk/],
    ['dictionary parsing', /dictionary|lexicon|headword/],
    ['ndjson/json corpus', /ndjson|json|jsonl/],
  ].forEach(([label, pattern]) => {
    if (pattern.test(lower)) {
      capabilities.push(label);
    }
  });

  return {
    path: filePath,
    relativePath: path.relative(repoRoot, filePath),
    capabilities,
    description: capabilities.length > 0
      ? `Appears related to ${capabilities.join(', ')}.`
      : 'Filename matched audit keywords, but no specific extraction capability was confirmed from the sampled content.',
  };
}

function buildExistingScriptsReport() {
  const searchRoots = [
    workspaceRoot,
    path.join(repoRoot, 'scripts'),
    path.join(repoRoot, 'backend/scripts'),
  ];
  const candidates = [];

  searchRoots.forEach((searchRoot) => {
    walkFiles(searchRoot, { maxDepth: 6 }).forEach((filePath) => {
      const extension = path.extname(filePath).toLowerCase();
      if (!scriptExtensions.has(extension)) {
        return;
      }

      const relative = path.relative(searchRoot, filePath);
      const content = fs.readFileSync(filePath, 'utf8').slice(0, 6000);
      if (!scriptKeywordPattern.test(relative) && !scriptKeywordPattern.test(content)) {
        return;
      }

      const candidate = summarizeScript(filePath);
      const isExtractionRelevant = (
        candidate.capabilities.includes('pdf extraction')
        || candidate.capabilities.includes('ocr')
        || candidate.capabilities.includes('dictionary parsing')
        || (
          candidate.capabilities.includes('page scanning')
          && candidate.capabilities.includes('chunking')
        )
      );

      if (isExtractionRelevant) {
        candidates.push(candidate);
      }
    });
  });

  const uniqueCandidates = [...new Map(candidates.map((candidate) => [candidate.path, candidate])).values()];

  return {
    generatedAt: new Date().toISOString(),
    searchedRoots: searchRoots.map((searchRoot) => ({
      path: toWindowsPath(searchRoot),
      wslPath: searchRoot,
    })),
    scriptsFound: uniqueCandidates
      .sort((left, right) => left.path.localeCompare(right.path))
      .map((candidate) => ({
        ...candidate,
        path: toWindowsPath(candidate.path),
        wslPath: candidate.path,
      })),
  };
}

function buildSourceInventory(files, sourceFolders, pdfFeasibility) {
  const allCountsByType = {};
  files.forEach((filePath) => {
    const type = classifyFileType(filePath);
    allCountsByType[type] = (allCountsByType[type] ?? 0) + 1;
  });

  const baselineCoverage = readJsonIfPresent('docs/boundary/meaning-coverage-audit.json');
  const duplicateGroups = readJsonIfPresent('docs/boundary/duplicate-term-groups.json');

  return {
    generatedAt: new Date().toISOString(),
    workspaceRoot: windowsWorkspaceRoot,
    wslWorkspaceRoot: workspaceRoot,
    priorBoundaryBaseline: {
      available: Boolean(baselineCoverage),
      totalRecognizedLegalVocabularyTerms: baselineCoverage?.counts?.totalRecognizedLegalVocabularyTerms ?? null,
      authoredMeaningCount: baselineCoverage?.counts?.authoredMeaningCount ?? null,
      missingMeaningCount: baselineCoverage?.counts?.missingMeaningCount ?? null,
      likelyAliasGroupCount: duplicateGroups?.summary?.likelyAliasGroupCount ?? null,
      termsInLikelyAliasGroups: duplicateGroups?.summary?.termsInLikelyAliasGroups ?? null,
    },
    fileCount: files.length,
    countsByType: allCountsByType,
    sourceFolderCount: sourceFolders.length,
    sourceFolders,
    pdfFeasibility,
  };
}

function markdownTable(headers, rows) {
  return [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.join(' | ')} |`),
  ].join('\n');
}

function buildAuditReport({
  sourceInventory,
  environmentReport,
  parserRecommendations,
  existingScriptsReport,
}) {
  const folderRows = sourceInventory.sourceFolders.map((folder) => [
    folder.folderName,
    folder.fileCount,
    folder.countsByType.pdf ?? 0,
    folder.likelyMainSourceFiles.map((file) => file.name).join(', '),
  ]);

  const pdfRows = sourceInventory.pdfFeasibility.map((pdf) => [
    pdf.sourceFolder,
    pdf.fileName,
    pdf.pageCount ?? 'unknown',
    pdf.textLayerAssessment ?? 'unknown',
    pdf.recommendedExtractionPath,
    pdf.headwordSegmentationFeasibility,
  ]);

  const packageRows = Object.entries(environmentReport.pythonPackages).map(([name, status]) => [
    name,
    status,
  ]);

  const recommendationRows = parserRecommendations.sourceRecommendations.map((recommendation) => [
    recommendation.sourceId,
    recommendation.fileName,
    recommendation.recommendedParser,
    recommendation.processingPriority,
  ]);

  return [
    '# Legal Lexicon Workspace Audit',
    '',
    `Workspace root: \`${windowsWorkspaceRoot}\``,
    '',
    'Scope: source inventory, tooling discovery, and PDF feasibility sampling only. This audit does not parse all pages, build a corpus, author meanings, or modify runtime ontology/boundary content.',
    '',
    '## Implemented / Partial / Missing / Not Evidenced',
    '',
    '- Implemented: workspace inventory, sampled PDF feasibility, local tooling audit, existing script search, parser recommendations, and report generation.',
    '- Partial: headword segmentation feasibility is based on sampled pages only; it is not a full extraction proof.',
    '- Missing: full page extraction, OCR proof, headword segmentation, merged reference corpus, registry alignment, and frontend reference index.',
    '- Not evidenced: legal-definition accuracy, source coverage for all 3,585 vocabulary terms, and replacement quality for the 4 existing authored meanings.',
    '',
    '## Prior Boundary Baseline',
    '',
    `- Baseline available: ${sourceInventory.priorBoundaryBaseline.available}`,
    `- Total recognized legal vocabulary terms: ${sourceInventory.priorBoundaryBaseline.totalRecognizedLegalVocabularyTerms}`,
    `- Authored meanings: ${sourceInventory.priorBoundaryBaseline.authoredMeaningCount}`,
    `- Missing meanings: ${sourceInventory.priorBoundaryBaseline.missingMeaningCount}`,
    `- Likely alias groups: ${sourceInventory.priorBoundaryBaseline.likelyAliasGroupCount}`,
    `- Terms inside likely alias groups: ${sourceInventory.priorBoundaryBaseline.termsInLikelyAliasGroups}`,
    '',
    '## Workspace Inventory',
    '',
    `- Files found: ${sourceInventory.fileCount}`,
    `- Source folders found: ${sourceInventory.sourceFolderCount}`,
    `- Type counts: ${JSON.stringify(sourceInventory.countsByType)}`,
    '',
    markdownTable(['Folder', 'Files', 'PDFs', 'Likely main source files'], folderRows),
    '',
    '## PDF Feasibility Sampling',
    '',
    'Only a few pages were sampled from each PDF. No full-book extraction was performed.',
    '',
    markdownTable(
      ['Folder', 'PDF', 'Pages', 'Text layer', 'Recommended extraction', 'Headword feasibility'],
      pdfRows,
    ),
    '',
    '## Tooling',
    '',
    `- Python 3: ${environmentReport.commands.python3Version.stdout || environmentReport.commands.python3Version.error}`,
    `- pip: ${environmentReport.commands.pipVersion.stdout || environmentReport.commands.pipVersion.error}`,
    `- CPU count: ${environmentReport.machine.cpuCount}`,
    `- Total memory bytes: ${environmentReport.machine.totalMemoryBytes}`,
    '',
    markdownTable(['Python package', 'Status'], packageRows),
    '',
    '## Existing Scripts',
    '',
    `- Candidate scripts found: ${existingScriptsReport.scriptsFound.length}`,
    '',
    ...existingScriptsReport.scriptsFound.map((script) => (
      `- \`${script.wslPath}\`: ${script.description}`
    )),
    '',
    '## Parser Recommendations',
    '',
    markdownTable(['Source ID', 'File', 'Recommended parser', 'Priority'], recommendationRows),
    '',
    '## Readiness',
    '',
    '- Ready to run full extraction: yes for a controlled direct-text proof on the text-layer PDFs; not yet for final corpus generation.',
    '- Required before full corpus build: lock output folder/schema, run a small per-source page-window extraction, validate headword segmentation rules, then process page-by-page into NDJSON.',
    '- OCR is not currently evidenced as required for these PDFs, but OCR tooling is also not installed; keep OCR as fallback only after direct extraction proof.',
    '- Alias/canonicalization from the prior boundary audit must shape registry alignment before meaning authoring.',
    '',
    '## Exact Next Prompt',
    '',
    'Task: Run a controlled source-extraction proof for the legal lexicon PDFs. Use the lexicon workspace audit reports as input, lock the NDJSON page schema, extract a small representative page window from each source with PyMuPDF, preserve source/page provenance, and test headword segmentation on those windows only. Do not author meanings, do not build the final corpus, and do not modify runtime ontology or boundary content.',
    '',
    '## Generated Reports',
    '',
    ...Object.values(outputPaths).map((filePath) => `- \`${toWindowsPath(filePath)}\``),
    '',
  ].join('\n');
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function main() {
  if (!fs.existsSync(workspaceRoot)) {
    throw new Error(`Lexicon workspace not found: ${workspaceRoot}`);
  }

  const files = walkFiles(workspaceRoot, { maxDepth: 8 })
    .filter((filePath) => !generatedOutputPaths.has(filePath))
    .sort((left, right) => left.localeCompare(right));
  const sourceFolders = groupSourceFolders(files);
  const pdfFeasibility = buildPdfFeasibility(sourceFolders);
  const environmentReport = buildEnvironmentReport();
  const parserRecommendations = buildParserRecommendations(pdfFeasibility);
  const existingScriptsReport = buildExistingScriptsReport();
  const sourceInventory = buildSourceInventory(files, sourceFolders, pdfFeasibility);
  const auditReport = buildAuditReport({
    sourceInventory,
    environmentReport,
    parserRecommendations,
    existingScriptsReport,
  });

  writeJson(outputPaths.sourceInventory, sourceInventory);
  writeJson(outputPaths.parserRecommendations, parserRecommendations);
  writeJson(outputPaths.environmentReport, environmentReport);
  writeJson(outputPaths.existingScriptsReport, existingScriptsReport);
  fs.writeFileSync(outputPaths.auditReport, auditReport, 'utf8');

  Object.values(outputPaths).forEach((filePath) => {
    process.stdout.write(`Wrote ${toWindowsPath(filePath)}\n`);
  });
}

main();
