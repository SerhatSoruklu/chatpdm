'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { builtinModules } = require('node:module');

const repoRoot = path.resolve(__dirname, '..');

const manifestPolicies = [
  {
    name: 'root',
    filePath: path.join(repoRoot, 'package.json'),
    dependencies: [],
    devDependencies: [
      'ajv',
      'ajv-formats',
      'concurrently',
      'markdownlint-cli2',
    ],
  },
  {
    name: 'backend',
    filePath: path.join(repoRoot, 'backend', 'package.json'),
    dependencies: [
      'dotenv',
      'express',
      'helmet',
      'mongoose',
    ],
    devDependencies: [
      '@eslint/js',
      'eslint',
      'globals',
      'mongodb-memory-server',
      'nodemon',
      'typescript-eslint',
    ],
  },
  {
    name: 'frontend',
    filePath: path.join(repoRoot, 'frontend', 'package.json'),
    dependencies: [
      '@angular/common',
      '@angular/compiler',
      '@angular/core',
      '@angular/forms',
      '@angular/platform-browser',
      '@angular/platform-server',
      '@angular/router',
      '@angular/ssr',
      'apexcharts',
      'express',
      'rxjs',
      'tslib',
    ],
    devDependencies: [
      '@angular/build',
      '@angular/cli',
      '@angular/compiler-cli',
      '@types/express',
      '@types/node',
      'typescript',
      'vitest',
    ],
  },
];

const coreBoundaryDirectories = [
  path.join(repoRoot, 'backend', 'src', 'modules', 'concepts'),
  path.join(repoRoot, 'backend', 'src', 'modules', 'legal-vocabulary'),
  path.join(repoRoot, 'backend', 'src', 'lib'),
  path.join(repoRoot, 'backend', 'src', 'security'),
];

const importPatterns = [
  /\bfrom\s+['"]([^'"]+)['"]/g,
  /^\s*import\s+['"]([^'"]+)['"]/gm,
  /^\s*export\s+.*?\sfrom\s+['"]([^'"]+)['"]/gm,
  /require\(\s*['"]([^'"]+)['"]\s*\)/g,
  /import\(\s*['"]([^'"]+)['"]\s*\)/g,
];

const builtinSpecifiers = new Set([
  ...builtinModules,
  ...builtinModules.map((moduleName) => `node:${moduleName}`),
]);

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function assertExactDependencySet(manifestName, sectionName, actualSection, expectedNames) {
  const actualNames = Object.keys(actualSection || {});
  const missing = expectedNames.filter((name) => !actualNames.includes(name));
  const unexpected = actualNames.filter((name) => !expectedNames.includes(name));

  if (missing.length > 0 || unexpected.length > 0) {
    const issues = [];

    if (missing.length > 0) {
      issues.push(`missing ${sectionName}: ${missing.join(', ')}`);
    }

    if (unexpected.length > 0) {
      issues.push(`unexpected ${sectionName}: ${unexpected.join(', ')}`);
    }

    throw new Error(`${manifestName} manifest drift detected: ${issues.join('; ')}.`);
  }
}

function verifyManifest(policy) {
  const manifest = readJson(policy.filePath);

  assertExactDependencySet(policy.name, 'dependencies', manifest.dependencies, policy.dependencies);
  assertExactDependencySet(policy.name, 'devDependencies', manifest.devDependencies, policy.devDependencies);

  if (manifest.optionalDependencies && Object.keys(manifest.optionalDependencies).length > 0) {
    throw new Error(`${policy.name} manifest must not declare optionalDependencies.`);
  }

  if (manifest.peerDependencies && Object.keys(manifest.peerDependencies).length > 0) {
    throw new Error(`${policy.name} manifest must not declare peerDependencies.`);
  }

  if (manifest.overrides && Object.keys(manifest.overrides).length > 0) {
    throw new Error(`${policy.name} manifest must not declare overrides.`);
  }
}

function listSourceFiles(rootDirectory) {
  if (!fs.existsSync(rootDirectory)) {
    return [];
  }

  const files = [];
  const stack = [rootDirectory];

  while (stack.length > 0) {
    const currentDirectory = stack.pop();
    const entries = fs.readdirSync(currentDirectory, { withFileTypes: true });

    entries.forEach((entry) => {
      const resolvedPath = path.join(currentDirectory, entry.name);

      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.angular') {
          return;
        }

        stack.push(resolvedPath);
        return;
      }

      if (/\.(?:c?m?js|ts|tsx)$/.test(entry.name)) {
        files.push(resolvedPath);
      }
    });
  }

  return files.sort();
}

function collectImportSpecifiers(sourceText) {
  const specifiers = new Set();

  importPatterns.forEach((pattern) => {
    pattern.lastIndex = 0;

    let match = null;
    while ((match = pattern.exec(sourceText)) !== null) {
      specifiers.add(match[1]);
    }
  });

  return [...specifiers];
}

function isRelativeSpecifier(specifier) {
  return specifier.startsWith('.') || specifier.startsWith('/');
}

function isBuiltinSpecifier(specifier) {
  return builtinSpecifiers.has(specifier);
}

function verifyCoreBoundaryDirectory(directoryPath) {
  const files = listSourceFiles(directoryPath);
  const violations = [];

  files.forEach((filePath) => {
    const sourceText = fs.readFileSync(filePath, 'utf8');
    const specifiers = collectImportSpecifiers(sourceText);

    specifiers.forEach((specifier) => {
      if (isRelativeSpecifier(specifier) || isBuiltinSpecifier(specifier)) {
        return;
      }

      violations.push(`${path.relative(repoRoot, filePath)} -> ${specifier}`);
    });
  });

  if (violations.length > 0) {
    throw new Error(
      `Core pipeline dependency boundary violated:\n${violations.map((entry) => `- ${entry}`).join('\n')}`,
    );
  }
}

function main() {
  manifestPolicies.forEach(verifyManifest);
  coreBoundaryDirectories.forEach(verifyCoreBoundaryDirectory);

  process.stdout.write('PASS dependency_discipline_manifests_and_core_boundaries\n');
}

main();
