'use strict';

const path = require('node:path');

const repoRoot = path.resolve(__dirname, '../../../..');
const workspaceRoot = '/mnt/c/Users/coupy/Desktop/vocabulary-reference-lexicons';
const multiSourceRoot = path.join(
  workspaceRoot,
  'vocabulary_reference_lexicons/multi_source_v3',
);

const sourceRecords = Object.freeze([
  {
    sourceId: 'bouvier_1839_vol_1',
    sourceTitle: "Bouvier's Law Dictionary",
    year: 1839,
    volume: '1',
    folderName: 'bouviers_law_dictionary_1839_vol_1',
    expectedPdf: 'bouvierlawdictionary01.pdf',
    alignmentFile: 'bouvier_1839_vol_1.boundary_alignment.ndjson',
    risks: [
      'early nineteenth-century legal terminology',
      'multi-volume continuation',
      'OCR/PDF extraction spacing noise',
      'obsolete or jurisdiction-bound definitions',
    ],
  },
  {
    sourceId: 'bouvier_1839_vol_2',
    sourceTitle: "Bouvier's Law Dictionary",
    year: 1839,
    volume: '2',
    folderName: 'bouviers_law_dictionary_1839_vol_2',
    expectedPdf: 'bouvierlawdictionary02.pdf',
    alignmentFile: 'bouvier_1839_vol_2.boundary_alignment.ndjson',
    risks: [
      'early nineteenth-century legal terminology',
      'multi-volume continuation',
      'OCR/PDF extraction spacing noise',
      'obsolete or jurisdiction-bound definitions',
    ],
  },
  {
    sourceId: 'wharton_1883',
    sourceTitle: "Wharton's Law Lexicon",
    year: 1883,
    volume: null,
    folderName: 'whartons_law_lexicon_1883',
    expectedPdf: 'WHARTONS_LAW-LEXICON-1883.pdf',
    alignmentFile: 'wharton_1883.boundary_alignment.ndjson',
    risks: [
      'English-law and historical scope',
      'page header and column noise',
      'hyphenation and split-entry extraction',
      'obsolete legal usage',
    ],
  },
  {
    sourceId: 'burrill_1860',
    sourceTitle: 'Burrill, A Law Dictionary and Glossary',
    year: 1860,
    volume: null,
    folderName: 'burrill_a_law_dictionary_and_glossary_1860',
    expectedPdf: 'lawdictionar_burr_1860_00.pdf',
    alignmentFile: 'burrill_1860.boundary_alignment.ndjson',
    risks: [
      'glossary-heavy historical definitions',
      'abbreviation and citation noise',
      'split columns',
      'obsolete common-law usage',
    ],
  },
  {
    sourceId: 'stroud_1903',
    sourceTitle: "Stroud's Judicial Dictionary",
    year: 1903,
    volume: null,
    folderName: 'strouds_judicial_dictionary_1903',
    expectedPdf: 'Strouds_Judicial_Dictionary.pdf',
    alignmentFile: 'stroud_1903.boundary_alignment.ndjson',
    risks: [
      'judicial/example-heavy entries',
      'case citation density',
      'English-law scope',
      'definitions may be interpretive rather than lexical',
    ],
  },
  {
    sourceId: 'ballentine_1916',
    sourceTitle: "Ballentine's Law Dictionary",
    year: 1916,
    volume: null,
    folderName: 'ballentines_law_dictionary_1916_first_edition',
    expectedPdf: 'lawdictionar_ball_1916_00.pdf',
    alignmentFile: 'ballentine_1916.boundary_alignment.ndjson',
    risks: [
      'early twentieth-century legal usage',
      'OCR/PDF extraction line noise',
      'page header/footer noise',
      'modern-scope overread risk',
    ],
  },
]);

const outputDirs = Object.freeze({
  rawPages: path.join(multiSourceRoot, 'raw_pages'),
  entryCandidates: path.join(multiSourceRoot, 'entry_candidates'),
  alignment: path.join(multiSourceRoot, 'alignment'),
  reports: path.join(multiSourceRoot, 'reports'),
  ocrPages: path.join(multiSourceRoot, 'ocr_pages'),
  ocrEntryCandidates: path.join(multiSourceRoot, 'ocr_entry_candidates'),
  ocrAlignment: path.join(multiSourceRoot, 'ocr_alignment'),
  ocrReports: path.join(multiSourceRoot, 'ocr_reports'),
});

const ocrRepairSourceIds = Object.freeze([
  'bouvier_1839_vol_1',
  'bouvier_1839_vol_2',
  'burrill_1860',
  'ballentine_1916',
]);

module.exports = {
  repoRoot,
  workspaceRoot,
  multiSourceRoot,
  sourceRecords,
  ocrRepairSourceIds,
  outputDirs,
};
