'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const repoRoot = path.resolve(__dirname, '..');
const governanceViolationsDirectory = path.join(repoRoot, 'governance/violations');
const REQUIRED_AI_LABEL = 'AI (Advisory, Non-Canonical)';
const FRONTEND_SOURCE_ROOT = 'frontend/src/';
const ORDERED_SEVERITIES = Object.freeze(['blocker', 'high', 'medium', 'low']);
const GOVERNANCE_REFERENCE_PATHS = new Set([
  'README.md',
  'LANGUAGE_CONTRACT.md',
  'docs/governance/AI_AUTOMATED_INTEGRITY_CHECKS.md',
  'docs/governance/AI_INTERACTION_CONTRACT.md',
  'docs/governance/AI_MISUSE_SCENARIOS.md',
  'docs/governance/AI_OUTPUT_SURFACE_SPEC.md',
  'docs/governance/LLGS_AI_BOUNDARY_PROTOCOL.md',
]);

const TEXT_FILE_EXTENSIONS = new Set([
  '.cjs',
  '.css',
  '.html',
  '.js',
  '.json',
  '.jsx',
  '.md',
  '.mjs',
  '.ts',
  '.tsx',
  '.yaml',
  '.yml',
]);

const CODE_FILE_EXTENSIONS = new Set([
  '.cjs',
  '.js',
  '.jsx',
  '.mjs',
  '.ts',
  '.tsx',
]);

const RESTRICTED_PATH_PATTERNS = Object.freeze([
  /^backend\/src\/modules\/concepts\//,
  /^scripts\/lib\/register-validation\//,
  /^scripts\/validate-registers\.js$/,
]);

const AI_USAGE_PATTERN = /\b(openai|chatgpt|llm|anthropic|claude|gpt(?:[-_a-z0-9]*)?)\b/i;
const SUSPICIOUS_PATTERN = /\b(generateDefinition|autoDefine|resolveWithAI|validateWithAI|judgeWithAI|decideWithAI)\b/;
const AI_UI_MARKER_PATTERN = /\b(openai|chatgpt|llm)\b/i;
const AI_UI_PATH_PATTERN = /(^|[\/._-])(ai|assistant)([\/._-]|$)/i;
const CORE_AI_UI_PATH_PATTERN = /^frontend\/src\/app\/pages\//;
const GOVERNANCE_DOC_CHANGE_REFERENCE = /\b(LLGS_AI_BOUNDARY_PROTOCOL|AI_INTERACTION_CONTRACT|AI_OUTPUT_SURFACE_SPEC|AI_MISUSE_SCENARIOS|AI_AUTOMATED_INTEGRITY_CHECKS)\b/;
const PROMPT_PATH_PATTERN = /(^|\/)(prompts?\/|[^/]*prompt[^/]*\.(md|txt|json|js|ts|yaml|yml))$/i;
const AI_WRITE_INTENT_PATTERN = /\b(aiOrigin|aiGenerated|openai|chatgpt|llm|anthropic|claude|gpt(?:[-_a-z0-9]*)?|generateDefinition|autoDefine|resolveWithAI|validateWithAI|judgeWithAI|decideWithAI)\b/i;
const CANONICAL_WRITE_CALL_PATTERN = /\b(writeFileSync|writeFile|appendFileSync|appendFile|renameSync|rename)\b/;
const CANONICAL_STORE_TARGET_PATTERN = /\b(data\/concepts(?:\/relations)?|data\/concept-versions|standards\/golden-concepts|resolve-rules\.json)\b/;

function parseCliArguments(argv) {
  const options = {
    capture: false,
    capturePrefix: 'captured',
    format: 'text',
  };

  argv.forEach((argument) => {
    if (argument === '--capture') {
      options.capture = true;
      return;
    }

    if (argument.startsWith('--capture-prefix=')) {
      options.capture = true;
      options.capturePrefix = argument.slice('--capture-prefix='.length).trim() || options.capturePrefix;
      return;
    }

    if (argument === '--format=json') {
      options.format = 'json';
      return;
    }

    if (argument === '--format=text') {
      options.format = 'text';
    }
  });

  return options;
}

function main() {
  const cliOptions = parseCliArguments(process.argv.slice(2));

  try {
    const report = scanRepository();
    let captured = [];

    if (cliOptions.capture && report.findings.length > 0) {
      captured = captureFindings(report.findings, {
        capturePrefix: cliOptions.capturePrefix,
      });
    }

    printReport(report, {
      format: cliOptions.format,
      captured,
    });

    if (report.summary.blockers > 0) {
      process.exit(2);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`ai-governance-scan: failed - ${message}\n`);
    process.exit(1);
  }
}

function scanRepository(options = {}) {
  const repoFiles = Array.isArray(options.repoFiles) ? options.repoFiles : listRepoFiles();
  const changedFiles = Array.isArray(options.changedFiles) ? options.changedFiles : getChangedFiles();
  const findings = [];
  const seenKeys = new Set();

  scanRestrictedPaths(repoFiles, findings, seenKeys);
  scanSuspiciousPatterns(repoFiles, findings, seenKeys);
  scanCanonicalWriteAttempts(repoFiles, findings, seenKeys);
  scanUiLabelCompliance(repoFiles, findings, seenKeys);
  scanAiRelatedChangesForGovernanceRefs(changedFiles, findings, seenKeys);
  scanPromptChangesForGovernanceRefs(changedFiles, findings, seenKeys);

  return {
    findings: sortFindings(findings),
    summary: summarizeFindings(findings),
  };
}

function listRepoFiles() {
  const result = runGit(['ls-files', '-co', '--exclude-standard']);

  if (result.status !== 0) {
    throw new Error(result.stderr || 'unable to enumerate repository files');
  }

  return result.stdout
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map(normalizePath)
    .filter((filePath) => !isIgnoredPath(filePath));
}

function getChangedFiles() {
  const changed = new Set();

  collectGitPaths(['diff', '--name-only', '--diff-filter=ACMR'], changed);
  collectGitPaths(['diff', '--cached', '--name-only', '--diff-filter=ACMR'], changed);
  collectGitPaths(['ls-files', '--others', '--exclude-standard'], changed);

  if (changed.size > 0) {
    return [...changed];
  }

  const hasParent = runGit(['rev-parse', '--verify', 'HEAD^']);

  if (hasParent.status === 0) {
    collectGitPaths(['diff', '--name-only', '--diff-filter=ACMR', 'HEAD^', 'HEAD'], changed);
  }

  return [...changed];
}

function collectGitPaths(args, targetSet) {
  const result = runGit(args);

  if (result.status !== 0) {
    return;
  }

  result.stdout
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map(normalizePath)
    .filter((filePath) => !isIgnoredPath(filePath))
    .forEach((filePath) => targetSet.add(filePath));
}

function runGit(args) {
  return spawnSync('git', args, {
    cwd: repoRoot,
    encoding: 'utf8',
  });
}

function scanRestrictedPaths(repoFiles, findings, seenKeys) {
  for (const filePath of repoFiles) {
    if (!isCodeFile(filePath) || !matchesAny(filePath, RESTRICTED_PATH_PATTERNS)) {
      continue;
    }

    const content = readTextFile(filePath);

    if (content === null) {
      continue;
    }

    const aiUsageMatch = content.match(AI_USAGE_PATTERN);

    if (aiUsageMatch) {
      addFinding(findings, seenKeys, {
        filePath,
        rule: 'AI_USAGE_IN_RESTRICTED_PATH',
        severity: 'blocker',
        explanation: `AI usage marker "${aiUsageMatch[0]}" appears inside a restricted deterministic path.`,
      });
    }

    const suspiciousMatch = content.match(SUSPICIOUS_PATTERN);

    if (suspiciousMatch) {
      addFinding(findings, seenKeys, {
        filePath,
        rule: 'SUSPICIOUS_AI_CALL_IN_RESTRICTED_PATH',
        severity: 'blocker',
        explanation: `Suspicious AI helper "${suspiciousMatch[0]}" appears inside a restricted deterministic path.`,
      });
    }
  }
}

function scanSuspiciousPatterns(repoFiles, findings, seenKeys) {
  for (const filePath of repoFiles) {
    if (!isCodeFile(filePath) || filePath.startsWith('docs/') || filePath === 'scripts/ai-governance-scan.js') {
      continue;
    }

    const content = readTextFile(filePath);

    if (content === null) {
      continue;
    }

    const suspiciousMatch = content.match(SUSPICIOUS_PATTERN);

    if (!suspiciousMatch) {
      continue;
    }

    addFinding(findings, seenKeys, {
      filePath,
      rule: 'SUSPICIOUS_AI_PATTERN',
      severity: 'high',
      explanation: `Suspicious AI pattern "${suspiciousMatch[0]}" was found and should be reviewed against AI governance rules.`,
    });
  }
}

function scanCanonicalWriteAttempts(repoFiles, findings, seenKeys) {
  for (const filePath of repoFiles) {
    if (!isCodeFile(filePath) || filePath.startsWith('docs/') || filePath === 'scripts/ai-governance-scan.js') {
      continue;
    }

    const content = readTextFile(filePath);

    if (content === null || !CANONICAL_WRITE_CALL_PATTERN.test(content)) {
      continue;
    }

    const canonicalTargetMatch = content.match(CANONICAL_STORE_TARGET_PATTERN);

    if (!canonicalTargetMatch) {
      continue;
    }

    const aiWriteIntent = AI_WRITE_INTENT_PATTERN.test(content) || AI_UIPathPatternSafe(filePath);

    if (!aiWriteIntent) {
      continue;
    }

    addFinding(findings, seenKeys, {
      filePath,
      rule: 'AI_CANONICAL_WRITE_ATTEMPT',
      severity: 'blocker',
      explanation: `AI-related code appears to write into canonical store target "${canonicalTargetMatch[0]}".`,
    });
  }
}

function scanUiLabelCompliance(repoFiles, findings, seenKeys) {
  const groupedFiles = new Map();

  for (const filePath of repoFiles) {
    if (!filePath.startsWith(FRONTEND_SOURCE_ROOT)) {
      continue;
    }

    const extension = path.extname(filePath);

    if (!['.html', '.ts', '.css'].includes(extension)) {
      continue;
    }

    const content = readTextFile(filePath);

    if (content === null) {
      continue;
    }

    const isUiSurfaceFile = (
      filePath.endsWith('.component.html')
      || filePath.endsWith('.component.css')
      || (filePath.endsWith('.component.ts') && content.includes('@Component'))
    );

    if (!isUiSurfaceFile) {
      continue;
    }

    const isAiCandidate = AI_UI_PATH_PATTERN.test(filePath) || AI_UI_MARKER_PATTERN.test(content);

    if (!isAiCandidate) {
      continue;
    }

    const groupKey = filePath.replace(/\.(html|ts|css)$/u, '');

    if (!groupedFiles.has(groupKey)) {
      groupedFiles.set(groupKey, []);
    }

    groupedFiles.get(groupKey).push({ filePath, content });
  }

  for (const group of groupedFiles.values()) {
    const hasRequiredLabel = group.some((entry) => entry.content.includes(REQUIRED_AI_LABEL));

    if (hasRequiredLabel) {
      continue;
    }

    const anchorFile = group.find((entry) => entry.filePath.endsWith('.html')) || group[0];
    const severity = CORE_AI_UI_PATH_PATTERN.test(anchorFile.filePath) ? 'blocker' : 'high';

    addFinding(findings, seenKeys, {
      filePath: anchorFile.filePath,
      rule: 'AI_UI_MISSING_ADVISORY_LABEL',
      severity,
      explanation: `AI-related UI surface is missing the required visible label "${REQUIRED_AI_LABEL}".`,
    });
  }
}

function scanAiRelatedChangesForGovernanceRefs(changedFiles, findings, seenKeys) {
  if (changedFiles.length === 0) {
    return;
  }

  const changedGovernanceDocs = changedFiles.filter((filePath) => GOVERNANCE_REFERENCE_PATHS.has(filePath));
  const aiRelatedCodeChanges = changedFiles.filter((filePath) => (
    !filePath.startsWith('docs/governance/')
    && !filePath.endsWith('.md')
    && fileLooksAiRelated(filePath)
  ));

  if (aiRelatedCodeChanges.length === 0 || changedGovernanceDocs.length > 0) {
    return;
  }

  addFinding(findings, seenKeys, {
    filePath: aiRelatedCodeChanges[0],
    rule: 'AI_CHANGE_WITHOUT_GOVERNANCE_REFERENCE',
    severity: 'medium',
    explanation: `AI-related code changes were detected (${aiRelatedCodeChanges.join(', ')}) without any accompanying governance document updates.`,
  });
}

function scanPromptChangesForGovernanceRefs(changedFiles, findings, seenKeys) {
  if (changedFiles.length === 0) {
    return;
  }

  const changedPromptFiles = changedFiles.filter((filePath) => PROMPT_PATH_PATTERN.test(filePath));

  if (changedPromptFiles.length === 0) {
    return;
  }

  const governanceDocsChanged = changedFiles.some((filePath) => GOVERNANCE_REFERENCE_PATHS.has(filePath));

  if (governanceDocsChanged) {
    return;
  }

  addFinding(findings, seenKeys, {
    filePath: changedPromptFiles[0],
    rule: 'PROMPT_CHANGE_WITHOUT_GOVERNANCE_REFERENCE',
    severity: 'medium',
    explanation: `Prompt-related changes were detected (${changedPromptFiles.join(', ')}) without any accompanying governance document updates.`,
  });
}

function fileLooksAiRelated(filePath) {
  const extension = path.extname(filePath);

  if (!TEXT_FILE_EXTENSIONS.has(extension)) {
    return false;
  }

  if (AI_UIPathPatternSafe(filePath)) {
    return true;
  }

  const content = readTextFile(filePath);

  if (content === null) {
    return false;
  }

  return AI_USAGE_PATTERN.test(content)
    || SUSPICIOUS_PATTERN.test(content)
    || GOVERNANCE_DOC_CHANGE_REFERENCE.test(content);
}

function AI_UIPathPatternSafe(filePath) {
  return AI_UI_PATH_PATTERN.test(filePath) || /(^|\/)(openai|chatgpt|llm|prompt)/i.test(filePath);
}

function addFinding(findings, seenKeys, finding) {
  const key = `${finding.rule}:${finding.filePath}:${finding.explanation}`;

  if (seenKeys.has(key)) {
    return;
  }

  seenKeys.add(key);
  findings.push(finding);
}

function sortFindings(findings) {
  const severityRank = new Map(ORDERED_SEVERITIES.map((severity, index) => [severity, index]));

  return [...findings].sort((left, right) => {
    const severityDiff = (severityRank.get(left.severity) ?? ORDERED_SEVERITIES.length)
      - (severityRank.get(right.severity) ?? ORDERED_SEVERITIES.length);

    if (severityDiff !== 0) {
      return severityDiff;
    }

    return `${left.rule}:${left.filePath}`.localeCompare(`${right.rule}:${right.filePath}`);
  });
}

function summarizeFindings(findings) {
  const counts = Object.fromEntries(ORDERED_SEVERITIES.map((severity) => [severity, 0]));

  findings.forEach((finding) => {
    counts[finding.severity] = (counts[finding.severity] || 0) + 1;
  });

  const blockers = counts.blocker || 0;
  const warnings = findings.length - blockers;

  return {
    total: findings.length,
    blockers,
    warnings,
    counts,
  };
}

function printReport(report, options = {}) {
  const findings = sortFindings(report.findings);
  const summary = report.summary;
  const captured = Array.isArray(options.captured) ? options.captured : [];

  if (options.format === 'json') {
    process.stdout.write(`${JSON.stringify({
      findings,
      summary,
      captured,
    }, null, 2)}\n`);
    return;
  }

  if (findings.length === 0) {
    process.stdout.write('ai-governance-scan: no findings\n');

    if (captured.length > 0) {
      captured.forEach((capturePath) => {
        process.stdout.write(`ai-governance-scan: captured=${capturePath}\n`);
      });
    }

    return;
  }

  findings.forEach((finding) => {
    const annotationLevel = finding.severity === 'blocker' ? 'error' : 'warning';
    const output = finding.severity === 'blocker' ? process.stderr : process.stdout;

    output.write(
      `- severity=${finding.severity} rule=${finding.rule} path=${finding.filePath} explanation=${finding.explanation}\n`,
    );

    if (process.env.GITHUB_ACTIONS === 'true') {
      process.stdout.write(
        `::${annotationLevel} file=${finding.filePath},title=${finding.rule} [${finding.severity}]::${finding.explanation}\n`,
      );
    }
  });

  const summaryText = ORDERED_SEVERITIES
    .filter((severity) => summary.counts[severity] > 0)
    .map((severity) => `${severity}=${summary.counts[severity]}`)
    .join(' ');

  const headline = summary.blockers > 0
    ? `ai-governance-scan: ${summary.blockers} blocker(s), ${summary.warnings} warning(s)`
    : `ai-governance-scan: ${summary.warnings} warning(s)`;

  process.stdout.write(`${headline}\n`);
  process.stdout.write(`ai-governance-scan summary ${summaryText}\n`);

  if (captured.length > 0) {
    captured.forEach((capturePath) => {
      process.stdout.write(`ai-governance-scan: captured=${capturePath}\n`);
    });
  }

  if (summary.blockers > 0) {
    process.stderr.write('ai-governance-scan: blocker severity findings detected; failing scan.\n');
  }
}

function captureFindings(findings, options = {}) {
  const capturePrefix = sanitizeIdentifier(options.capturePrefix || 'captured');

  if (findings.length === 0) {
    return [];
  }

  fs.mkdirSync(governanceViolationsDirectory, { recursive: true });

  return findings.map((finding, index) => {
    const record = buildCapturedViolationRecord(finding, {
      capturePrefix,
      index,
    });
    const filePath = path.join(governanceViolationsDirectory, `${record.id}.json`);
    fs.writeFileSync(filePath, `${JSON.stringify(record, null, 2)}\n`, 'utf8');
    return normalizePath(path.relative(repoRoot, filePath));
  });
}

function buildCapturedViolationRecord(finding, options) {
  const template = buildReplayTemplateForFinding(finding);
  const capturedAt = new Date().toISOString();
  const baseId = `${options.capturePrefix}-${capturedAt.slice(0, 19).replace(/[:T]/g, '-').toLowerCase()}-${options.index + 1}-${sanitizeIdentifier(finding.rule)}`;

  return {
    $schema: './violation.schema.json',
    id: baseId,
    type: template.type,
    description: template.description,
    trigger: template.trigger,
    expected_outcome: template.expected_outcome,
    detected_by: template.detected_by,
    capture: {
      source_rule: finding.rule,
      source_severity: finding.severity,
      source_file_path: finding.filePath,
      source_explanation: finding.explanation,
      captured_at: capturedAt,
    },
  };
}

function buildReplayTemplateForFinding(finding) {
  switch (finding.rule) {
    case 'AI_CANONICAL_WRITE_ATTEMPT':
      return {
        type: 'silent_writeback',
        description: 'AI-related code writes directly into a canonical concept store target.',
        trigger: {
          mode: 'scanner_fixture',
          file_path: 'backend/src/modules/concepts/replay-silent-writeback.js',
          content: [
            "const { writeFileSync } = require('node:fs');",
            "const aiGenerated = 'draft definition';",
            "writeFileSync('data/concepts/duty.json', aiGenerated, 'utf8');",
            '',
          ].join('\n'),
          expected_rule: 'AI_CANONICAL_WRITE_ATTEMPT',
        },
        expected_outcome: 'blocked',
        detected_by: 'scanner',
      };
    case 'AI_USAGE_IN_RESTRICTED_PATH':
      return {
        type: 'authority_leakage',
        description: 'AI usage appears inside a restricted deterministic resolution path.',
        trigger: {
          mode: 'scanner_fixture',
          file_path: 'backend/src/modules/concepts/replay-authority-leakage.js',
          content: [
            "const provider = 'openai';",
            'module.exports = { provider };',
            '',
          ].join('\n'),
          expected_rule: 'AI_USAGE_IN_RESTRICTED_PATH',
        },
        expected_outcome: 'blocked',
        detected_by: 'scanner',
      };
    case 'SUSPICIOUS_AI_CALL_IN_RESTRICTED_PATH':
      return {
        type: 'authority_leakage',
        description: 'A suspicious AI helper appears inside a restricted deterministic path.',
        trigger: {
          mode: 'scanner_fixture',
          file_path: 'backend/src/modules/concepts/replay-suspicious-authority-leakage.js',
          content: [
            'function resolve' + 'WithAI() {',
            "  return 'leak';",
            '}',
            'module.exports = { resolveWithAI };',
            '',
          ].join('\n'),
          expected_rule: 'SUSPICIOUS_AI_CALL_IN_RESTRICTED_PATH',
        },
        expected_outcome: 'blocked',
        detected_by: 'scanner',
      };
    case 'AI_UI_MISSING_ADVISORY_LABEL':
      return {
        type: 'ui_blending',
        description: 'An AI-related core-page surface renders without the mandatory advisory label.',
        trigger: {
          mode: 'scanner_fixture',
          file_path: 'frontend/src/app/pages/replay-ai-ui-blending.component.html',
          content: '<section>llm helper panel</section>\n',
          expected_rule: 'AI_UI_MISSING_ADVISORY_LABEL',
        },
        expected_outcome: 'blocked',
        detected_by: 'scanner',
      };
    case 'AI_CHANGE_WITHOUT_GOVERNANCE_REFERENCE':
      return {
        type: 'ungoverned_ai_change',
        description: 'AI-related code changes occur without any accompanying governance document update.',
        trigger: {
          mode: 'scanner_fixture',
          file_path: 'tmp/ai-governance-replay/ai-change-without-governance.js',
          content: [
            "const provider = 'openai';",
            'module.exports = { provider };',
            '',
          ].join('\n'),
          expected_rule: 'AI_CHANGE_WITHOUT_GOVERNANCE_REFERENCE',
        },
        expected_outcome: 'flagged',
        detected_by: 'scanner',
      };
    case 'PROMPT_CHANGE_WITHOUT_GOVERNANCE_REFERENCE':
      return {
        type: 'prompt_drift_injection',
        description: 'Prompt-related files change without any accompanying governance document update.',
        trigger: {
          mode: 'scanner_fixture',
          file_path: 'tmp/prompts/replay-ai-prompt.txt',
          content: 'Explain the concept using an AI prompt surface.\n',
          expected_rule: 'PROMPT_CHANGE_WITHOUT_GOVERNANCE_REFERENCE',
        },
        expected_outcome: 'flagged',
        detected_by: 'scanner',
      };
    case 'SUSPICIOUS_AI_PATTERN':
      return {
        type: 'suspicious_ai_pattern',
        description: 'A suspicious AI helper name appears outside restricted deterministic paths and must stay review-visible.',
        trigger: {
          mode: 'scanner_fixture',
          file_path: 'tmp/ai-governance-replay/suspicious-ai-pattern.js',
          content: [
            'function generate' + 'Definition() {',
            "  return 'draft';",
            '}',
            'module.exports = { generateDefinition };',
            '',
          ].join('\n'),
          expected_rule: 'SUSPICIOUS_AI_PATTERN',
        },
        expected_outcome: 'flagged',
        detected_by: 'scanner',
      };
    default:
      throw new Error(`No replay template is defined for finding rule "${finding.rule}".`);
  }
}

function readTextFile(filePath) {
  const absolutePath = path.join(repoRoot, filePath);

  try {
    return fs.readFileSync(absolutePath, 'utf8');
  } catch {
    return null;
  }
}

function matchesAny(filePath, patterns) {
  return patterns.some((pattern) => pattern.test(filePath));
}

function isCodeFile(filePath) {
  return CODE_FILE_EXTENSIONS.has(path.extname(filePath));
}

function isIgnoredPath(filePath) {
  return (
    filePath === ''
    || filePath.startsWith('.git/')
    || filePath.startsWith('node_modules/')
    || filePath.startsWith('frontend/node_modules/')
    || filePath.startsWith('backend/node_modules/')
    || filePath.startsWith('frontend/dist/')
    || filePath === 'package-lock.json'
    || filePath.endsWith('/package-lock.json')
  );
}

function normalizePath(filePath) {
  return filePath.split(path.sep).join('/');
}

function sanitizeIdentifier(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

if (require.main === module) {
  main();
}

module.exports = {
  REQUIRED_AI_LABEL,
  captureFindings,
  parseCliArguments,
  scanRepository,
};
