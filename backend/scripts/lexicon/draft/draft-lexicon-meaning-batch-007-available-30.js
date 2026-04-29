'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const {
  buildVocabularyBoundaryResponse,
} = require('../../../src/modules/legal-vocabulary/vocabulary-boundary');

const repoRoot = path.resolve(__dirname, '../../../..');
const workspaceRoot = '/mnt/c/Users/coupy/Desktop/vocabulary-reference-lexicons';
const lexiconRoot = path.join(workspaceRoot, 'vocabulary_reference_lexicons');
const draftRoot = path.join(lexiconRoot, 'draft_meanings');
const batchRoot = path.join(draftRoot, 'batch_007');
const sliceRoot = path.join(batchRoot, 'slice_007A');
const multiSourceRoot = path.join(lexiconRoot, 'multi_source');
const multiSourceV3Root = path.join(lexiconRoot, 'multi_source_v3');

const batchId = 'batch_007';
const sliceId = '007A';
const batchStartIndex = 300;
const batchSize = 30;

const inputPaths = Object.freeze({
  mainApprovalQueue: path.join(lexiconRoot, 'approval_queue/main_approval_queue.json'),
  duplicateTermGroups: path.join(repoRoot, 'docs/boundary/duplicate-term-groups.json'),
  meaningSources: path.join(
    repoRoot,
    'backend/src/modules/legal-vocabulary/vocabulary-meaning-sources.generated.json',
  ),
  andersonAlignment: path.join(multiSourceRoot, 'alignment/anderson_1889.boundary_alignment.ndjson'),
  osbornAlignment: path.join(multiSourceRoot, 'alignment/osborn_1927.boundary_alignment.ndjson'),
  whartonAlignment: path.join(multiSourceV3Root, 'alignment/wharton_1883.boundary_alignment.ndjson'),
  stroudAlignment: path.join(multiSourceV3Root, 'alignment/stroud_1903.boundary_alignment.ndjson'),
});

const outputPaths = Object.freeze({
  batchDrafts: path.join(batchRoot, 'batch_007_available_30_drafts.json'),
  batchReview: path.join(batchRoot, 'batch_007_available_30_review.md'),
  batchSkipped: path.join(batchRoot, 'batch_007_available_30_skipped.json'),
  batchWritebackNotApplied: path.join(batchRoot, 'batch_007_available_30_writeback_NOT_APPLIED.json'),
  batchSummary: path.join(batchRoot, 'batch_007_available_30_summary.json'),
  sliceDrafts: path.join(sliceRoot, 'batch_007A_drafts.json'),
  sliceReview: path.join(sliceRoot, 'batch_007A_review.md'),
  sliceSkipped: path.join(sliceRoot, 'batch_007A_skipped.json'),
  sliceWritebackNotApplied: path.join(sliceRoot, 'batch_007A_writeback_NOT_APPLIED.json'),
});

const draftPlan = Object.freeze({
  expulsion: {
    decision: 'draft_ready',
    meaning: 'A putting or driving out, including depriving a member of a corporation, legislative body, assembly, society, or company of membership.',
    sourceBasis: 'black_only',
    reason: 'Black gives exact support for expulsion as putting out and deprivation of membership.',
    support: 'Black defines expulsion through driving out and removal from membership.',
  },
  felony: {
    decision: 'draft_ready',
    meaning: 'In criminal law, an offense of high grade historically associated with forfeiture and distinguished from misdemeanors by severity.',
    sourceBasis: 'black_plus_anderson_osborn_stroud_v3',
    reason: 'Black supports felony as a serious criminal offense with historical forfeiture context; Anderson, Osborn, and Stroud provide exact comparator context.',
    support: 'Black and comparators support felony as a serious criminal-law category.',
    weak: true,
    scopeWarning: 'Historical English-law forfeiture context; modern grading varies by jurisdiction.',
  },
  guarantee: {
    decision: 'draft_ready',
    meaning: 'A collateral undertaking to answer for another person\'s debt, default, or miscarriage, or the person to whom such guaranty is made.',
    sourceBasis: 'black_plus_anderson_osborn_stroud_v3',
    reason: 'Black supports guarantee as guaranty obligation and recipient usage; Anderson, Osborn, and Stroud provide exact comparator context.',
    support: 'Black and comparators support guarantee through collateral undertaking and guaranty usage.',
  },
  guarantor: {
    decision: 'draft_ready',
    meaning: 'A person who makes a guaranty or undertakes collaterally to answer for another\'s debt, default, or miscarriage.',
    sourceBasis: 'black_plus_anderson_osborn',
    reason: 'Black supports guarantor as one who makes a guaranty; Anderson and Osborn provide exact comparator context.',
    support: 'Black and comparators define guarantor through making a guaranty or collateral undertaking.',
  },
  immunity: {
    decision: 'draft_ready',
    meaning: 'An exemption from serving in an office or performing duties that the law generally requires of citizens.',
    sourceBasis: 'black_only',
    reason: 'Black gives exact support for immunity as exemption from public office or legal duties.',
    support: 'Black defines immunity through exemption from generally required service or duties.',
  },
  impossibility: {
    decision: 'draft_ready',
    meaning: 'That which, in the constitution and course of nature or of law, no person can do or perform.',
    sourceBasis: 'black_plus_anderson_osborn',
    reason: 'Black supports impossibility as what nature or law prevents; Anderson and Osborn provide exact comparator context.',
    support: 'Black and comparators define impossibility through natural or legal inability to perform.',
  },
  independence: {
    decision: 'draft_ready',
    meaning: 'The state or condition of being free from dependence, subjection, or control.',
    sourceBasis: 'black_plus_anderson',
    reason: 'Black supports independence as freedom from dependence, subjection, or control; Anderson provides exact comparator context.',
    support: 'Black and Anderson define independence through freedom from dependence or control.',
  },
  inducement: {
    decision: 'draft_ready',
    meaning: 'In contracts, the benefit or advantage that leads a promisor to enter an obligation.',
    sourceBasis: 'black_plus_anderson',
    reason: 'Black supports inducement in contract usage as the promisor\'s benefit or advantage; Anderson provides exact comparator context.',
    support: 'Black and Anderson support inducement as contract-related benefit or moving cause.',
  },
  'inherent power': {
    decision: 'review_needed',
    meaning: 'An authority possessed without being derived from another; a right, ability, or faculty of acting without receiving it from another source.',
    sourceBasis: 'black_only',
    reason: 'Black gives exact phrase support, but the term is in a duplicate alias group with an underscore surface and should receive human boundary review before draft-ready status.',
    support: 'Black defines inherent power as authority possessed without derivation from another.',
    weak: true,
    scopeWarning: 'Phrase surface is exact, but alias-policy implications require review.',
    conflictWarning: 'Duplicate alias group includes inherent_power; no alias fan-out policy exists.',
  },
  inherent_power: {
    decision: 'skip',
    sourceBasis: 'black_only',
    reason: 'Underscore alias surface for inherent power; skipped because no alias fan-out policy exists.',
    support: 'Exact Black support belongs to the human-readable phrase surface, not a separate underscore admission.',
  },
  instigation: {
    decision: 'draft_ready',
    meaning: 'Incitation or urging; the act by which one person incites another to do something, especially to commit an offense.',
    sourceBasis: 'black_plus_stroud_v3',
    reason: 'Black supports instigation as incitation or urging; Stroud provides exact assistive v3 context.',
    support: 'Black defines instigation through inciting or urging another to act.',
  },
  intent: {
    decision: 'draft_ready',
    meaning: 'In criminal law and evidence, purpose, formulated design, or resolve to do or forbear from an act.',
    sourceBasis: 'black_plus_anderson_stroud_v3',
    reason: 'Black supports criminal-law and evidence-law intent; Anderson and Stroud provide exact comparator context.',
    support: 'Black and comparators define intent through purpose, design, and resolve.',
    weak: true,
    scopeWarning: 'Field-specific criminal-law and evidence-law sense.',
  },
  legality: {
    decision: 'draft_ready',
    meaning: 'Lawfulness.',
    sourceBasis: 'black_plus_anderson_stroud_v3',
    reason: 'Black directly supports legality as lawfulness; Anderson and Stroud provide exact comparator context.',
    support: 'Black defines legality as lawfulness.',
  },
  mandate: {
    decision: 'draft_ready',
    meaning: 'In practice, a judicial command or precept from a court or judicial officer directing an officer to enforce a judgment or perform an act.',
    sourceBasis: 'black_plus_anderson_osborn',
    reason: 'Black supports mandate as judicial command or precept; Anderson and Osborn provide exact comparator context.',
    support: 'Black and comparators define mandate through judicial command or precept.',
  },
  maxim: {
    decision: 'draft_ready',
    meaning: 'An established principle or proposition, especially a principle of law generally received as just and consonant with reason.',
    sourceBasis: 'black_plus_anderson',
    reason: 'Black supports maxim as established legal principle; Anderson provides exact comparator context.',
    support: 'Black and Anderson define maxim through established legal principles.',
  },
  misdemeanor: {
    decision: 'draft_ready',
    meaning: 'In criminal law, a general name for criminal offenses of a lower grade than felony and punishable by indictment or statutory process.',
    sourceBasis: 'black_plus_stroud_v3',
    reason: 'Black supports misdemeanor as a criminal-law offense category; Stroud provides exact assistive v3 context.',
    support: 'Black and Stroud support misdemeanor as a criminal-law offense category.',
    weak: true,
    scopeWarning: 'Criminal-law grading varies by jurisdiction and historical period.',
  },
  novation: {
    decision: 'draft_ready',
    meaning: 'The substitution of a new debt or obligation for an existing one, extinguishing the old obligation.',
    sourceBasis: 'black_plus_anderson_osborn_stroud_v3',
    reason: 'Black supports novation as substitution of a new obligation; Anderson, Osborn, and Stroud provide exact comparator context.',
    support: 'Black and comparators define novation through substitution and extinguishment of an old obligation.',
  },
  obscenity: {
    decision: 'draft_ready',
    meaning: 'The character or quality of being obscene, including conduct tending to corrupt public morals by indecency or lewdness.',
    sourceBasis: 'black_only',
    reason: 'Black gives exact support for obscenity as obscene character or corrupting indecency.',
    support: 'Black defines obscenity through indecency, lewdness, and public-morals corruption.',
  },
  offer: {
    decision: 'draft_ready',
    meaning: 'A proposal to do a thing or to make a contract.',
    sourceBasis: 'black_plus_anderson_osborn_stroud_v3',
    reason: 'Black supports offer as proposal to act or contract; Anderson, Osborn, and Stroud provide exact comparator context.',
    support: 'Black and comparators define offer through proposal and contract formation.',
  },
  oppression: {
    decision: 'draft_ready',
    meaning: 'The misdemeanor committed by a public officer who, under color of office, wrongfully abuses authority.',
    sourceBasis: 'black_plus_anderson_osborn_stroud_v3',
    reason: 'Black supports oppression as public-officer misconduct under color of office; Anderson, Osborn, and Stroud provide exact comparator context.',
    support: 'Black and comparators define oppression through abuse of official authority.',
  },
  option: {
    decision: 'draft_ready',
    meaning: 'In English ecclesiastical law, the customary prerogative of an archbishop or bishop to select a dignity or benefice in the gift of a suffragan bishop.',
    sourceBasis: 'black_plus_anderson_osborn_wharton_v3_stroud_v3',
    reason: 'Black supports a historically narrow ecclesiastical option; Anderson, Osborn, Wharton, and Stroud provide exact comparator context.',
    support: 'Black and comparators support option in the English ecclesiastical-law prerogative sense.',
    weak: true,
    scopeWarning: 'Historically narrow English ecclesiastical-law sense; not a general contract option definition.',
  },
  parole: {
    decision: 'draft_ready',
    meaning: 'In military law, a promise by a prisoner of war released from custody that he will not again take up arms against the captor during the war unless exchanged.',
    sourceBasis: 'black_only',
    reason: 'Black supports parole in the military-law prisoner-of-war sense.',
    support: 'Black defines parole through a prisoner-of-war promise after release from custody.',
    weak: true,
    scopeWarning: 'Military-law prisoner-of-war sense; not modern criminal supervised-release usage.',
  },
  regulation: {
    decision: 'draft_ready',
    meaning: 'The act of regulating, or a rule or order prescribed for management or government.',
    sourceBasis: 'black_plus_anderson_stroud_v3',
    reason: 'Black supports regulation as act of regulating and rule or order for government; Anderson and Stroud provide exact comparator context.',
    support: 'Black and comparators define regulation through rules or orders for management or government.',
  },
  residence: {
    decision: 'draft_ready',
    meaning: 'Living or dwelling in a certain place permanently or for a considerable time; the place where a person makes a home or dwells.',
    sourceBasis: 'black_plus_osborn',
    reason: 'Black supports residence as dwelling or home; Osborn provides exact comparator context.',
    support: 'Black and Osborn define residence through living, dwelling, and home-place usage.',
  },
  retaliation: {
    decision: 'review_needed',
    meaning: 'The lex talionis, or returning like for like as a principle of retaliation.',
    sourceBasis: 'black_plus_anderson',
    reason: 'Black support is exact but terse and cross-referential; Anderson provides exact comparator context, but wording should be human-reviewed before draft-ready status.',
    support: 'Black identifies retaliation with lex talionis.',
    weak: true,
    scopeWarning: 'Historically narrow and cross-reference-heavy support.',
  },
  search: {
    decision: 'draft_ready',
    meaning: 'In international law, the right of warships to visit and search merchant vessels during war to discover enemy property or contraband.',
    sourceBasis: 'black_plus_anderson_osborn_stroud_v3',
    reason: 'Black supports search in the international-law right-of-search sense; Anderson, Osborn, and Stroud provide exact comparator context.',
    support: 'Black and comparators support search as a maritime or international-law visitation and inspection right.',
    weak: true,
    scopeWarning: 'International-law maritime sense; not a general search-and-seizure definition.',
  },
  stipulation: {
    decision: 'draft_ready',
    meaning: 'A material article in an agreement, or in practice an engagement or undertaking made in judicial proceedings.',
    sourceBasis: 'black_plus_anderson_stroud_v3',
    reason: 'Black supports stipulation as agreement article and practice undertaking; Anderson and Stroud provide exact comparator context.',
    support: 'Black and comparators define stipulation through agreement terms and procedural undertakings.',
  },
  suretyship: {
    decision: 'draft_ready',
    meaning: 'The contract by which one person obligates himself as surety for another.',
    sourceBasis: 'black_only',
    reason: 'Black gives exact support for suretyship as the contract of surety obligation.',
    support: 'Black defines suretyship through obligation as surety for another.',
  },
  tribunal: {
    decision: 'draft_ready',
    meaning: 'The seat of a judge, or the place where justice is administered; a judicial court or forum.',
    sourceBasis: 'black_plus_stroud_v3',
    reason: 'Black supports tribunal as judicial seat or place of administering justice; Stroud provides exact assistive v3 context.',
    support: 'Black and Stroud define tribunal through judicial seat, court, or forum.',
  },
  waiver: {
    decision: 'draft_ready',
    meaning: 'The renunciation, repudiation, abandonment, or surrender of a claim, right, privilege, or opportunity.',
    sourceBasis: 'black_plus_anderson_osborn_stroud_v3',
    reason: 'Black supports waiver as renunciation or abandonment; Anderson, Osborn, and Stroud provide exact comparator context.',
    support: 'Black and comparators define waiver through intentional relinquishment or abandonment.',
  },
});

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function writeText(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, value, 'utf8');
}

function readNdjson(filePath) {
  return fs.readFileSync(filePath, 'utf8')
    .split(/\r?\n/)
    .filter((line) => line.trim() !== '')
    .map((line) => JSON.parse(line));
}

function normalizeForComparison(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/[.,;:]+$/g, '')
    .trim()
    .replace(/\s+/g, ' ');
}

function sourceHash(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function referenceKey(reference) {
  return [
    reference.sourceId,
    reference.sourceTitle,
    reference.year,
    reference.page,
    reference.lineNumber,
    reference.headword,
  ].join('::');
}

function compactBlackReferences(references) {
  return references.map((reference) => ({
    sourceId: reference.sourceId,
    sourceTitle: reference.sourceTitle,
    year: reference.year,
    volume: reference.volume,
    sourceFile: reference.sourceFile,
    page: reference.page,
    lineNumber: reference.lineNumber,
    headword: reference.headword,
    rawLine: reference.rawLine,
    contextPreview: reference.contextPreview,
    parseConfidence: reference.parseConfidence,
  }));
}

function compactComparatorReferences(references, referenceRole) {
  return references.map((reference) => ({
    sourceId: reference.sourceId,
    sourceTitle: reference.sourceTitle,
    year: reference.year,
    volume: reference.volume,
    sourceFile: reference.sourceFile,
    page: reference.page,
    lineNumber: reference.lineNumber,
    headword: reference.headword,
    normalizedHeadword: reference.normalizedHeadword,
    matchStatus: reference.matchStatus,
    rawLine: reference.rawLine,
    contextPreview: reference.contextPreview,
    supportingSnippet: reference.supportingSnippet,
    parseConfidence: reference.parseConfidence,
    sourceQualityTier: reference.sourceQualityTier,
    extractionMode: reference.extractionMode,
    comparatorRole: reference.comparatorRole ?? referenceRole,
    authorityLevel: reference.authorityLevel ?? 'comparator_only_not_primary',
    mayCreateMeaning: false,
    mayOverrideBlack: false,
    mayAdmitRuntimeOntology: false,
    referenceRole,
  }));
}

function buildCurrentMeaningMap() {
  const response = buildVocabularyBoundaryResponse();
  return new Map(response.entries.map((entry) => [
    normalizeForComparison(entry.term),
    entry.meaningInLaw ?? null,
  ]));
}

function buildGeneratedSourceTermSet() {
  const sources = readJson(inputPaths.meaningSources);
  return new Set(Object.keys(sources.terms ?? {}).map(normalizeForComparison));
}

function buildAliasNotes() {
  const duplicateTermGroups = readJson(inputPaths.duplicateTermGroups);
  const notesByTerm = new Map();

  duplicateTermGroups.likelyAliasGroups.forEach((group) => {
    const terms = group.terms.map((entry) => entry.term).sort((left, right) => left.localeCompare(right));
    group.terms.forEach((entry) => {
      notesByTerm.set(
        normalizeForComparison(entry.term),
        `Likely alias group "${group.canonicalKey}" with ${terms.length} terms: ${terms.join(', ')}`,
      );
    });
  });

  return notesByTerm;
}

function buildComparatorReferenceMap(filePath) {
  const referencesByTerm = new Map();

  readNdjson(filePath)
    .filter((record) => record.matchStatus === 'exact_normalized_match')
    .forEach((record) => {
      const normalized = normalizeForComparison(record.normalizedBoundaryTerm ?? record.boundaryTerm);
      if (!referencesByTerm.has(normalized)) {
        referencesByTerm.set(normalized, new Map());
      }

      referencesByTerm.get(normalized).set(referenceKey(record), record);
    });

  return new Map([...referencesByTerm.entries()].map(([term, references]) => [
    term,
    [...references.values()].sort((left, right) => (
      (left.page ?? 0) - (right.page ?? 0)
      || (left.lineNumber ?? 0) - (right.lineNumber ?? 0)
      || String(left.headword ?? '').localeCompare(String(right.headword ?? ''))
    )),
  ]));
}

function sourceBasisUses(plan, key) {
  return plan.sourceBasis.split('_').includes(key)
    || plan.sourceBasis.includes(`${key}_v3`)
    || plan.sourceBasis.includes(`_${key}`);
}

function buildDraftRecords() {
  const queue = readJson(inputPaths.mainApprovalQueue);
  const currentMeaningByTerm = buildCurrentMeaningMap();
  const generatedSourceTerms = buildGeneratedSourceTermSet();
  const aliasNotesByTerm = buildAliasNotes();
  const andersonByTerm = buildComparatorReferenceMap(inputPaths.andersonAlignment);
  const osbornByTerm = buildComparatorReferenceMap(inputPaths.osbornAlignment);
  const whartonByTerm = buildComparatorReferenceMap(inputPaths.whartonAlignment);
  const stroudByTerm = buildComparatorReferenceMap(inputPaths.stroudAlignment);

  return queue.slice(batchStartIndex, batchStartIndex + batchSize).map((termRecord, index) => {
    const normalizedTerm = termRecord.normalizedTerm ?? normalizeForComparison(termRecord.term);
    const plan = draftPlan[termRecord.term] ?? draftPlan[normalizedTerm];
    const currentMeaning = currentMeaningByTerm.get(normalizedTerm) ?? null;
    const alreadyInGeneratedSource = generatedSourceTerms.has(normalizedTerm);
    const blackReferences = compactBlackReferences(termRecord.sourceReferences ?? []);
    const andersonReferences = andersonByTerm.get(normalizedTerm) ?? [];
    const osbornReferences = osbornByTerm.get(normalizedTerm) ?? [];
    const whartonReferences = whartonByTerm.get(normalizedTerm) ?? [];
    const stroudReferences = stroudByTerm.get(normalizedTerm) ?? [];
    const comparatorsUsed = [];

    if (plan && plan.decision !== 'skip') {
      if (sourceBasisUses(plan, 'anderson')) comparatorsUsed.push('anderson_1889');
      if (sourceBasisUses(plan, 'osborn')) comparatorsUsed.push('osborn_1927');
      if (sourceBasisUses(plan, 'wharton')) comparatorsUsed.push('wharton_1883');
      if (sourceBasisUses(plan, 'stroud')) comparatorsUsed.push('stroud_1903');
    }

    let draftDecision = plan?.decision ?? 'skip';
    let draftReason = plan?.reason ?? 'No safe draft plan was authored for this exact term.';
    let draftMeaningInLaw = plan?.meaning ?? null;
    const hasUnderscoreSurface = termRecord.term.includes('_');

    if (currentMeaning || alreadyInGeneratedSource) {
      draftDecision = 'skip';
      draftReason = 'Already-existing meaningInLaw or generated source entry detected; draft-only batch will not modify existing meanings.';
      draftMeaningInLaw = null;
    } else if (hasUnderscoreSurface) {
      draftDecision = 'skip';
      draftReason = plan?.reason ?? 'Underscore alias surface skipped because no alias fan-out policy exists.';
      draftMeaningInLaw = null;
    } else if (blackReferences.length === 0) {
      draftDecision = 'skip';
      draftReason = 'Missing exact Black primary provenance; draft-only batch requires Black support.';
      draftMeaningInLaw = null;
    }

    const comparatorUsed = draftDecision !== 'skip' && comparatorsUsed.length > 0;

    return {
      batchId,
      sliceId,
      batchPosition: index + 1,
      approvalQueuePosition: batchStartIndex + index + 1,
      term: termRecord.term,
      normalizedTerm,
      family: termRecord.family,
      bucket: termRecord.bucket,
      riskTier: termRecord.riskTier,
      currentMeaningStatus: currentMeaning || alreadyInGeneratedSource
        ? 'authored_existing_do_not_requeue'
        : termRecord.currentMeaningStatus,
      currentMeaning,
      matchStatus: termRecord.matchStatus,
      aliasGroupNote: aliasNotesByTerm.get(normalizedTerm) ?? termRecord.aliasGroupNote ?? null,
      draftMeaningInLaw,
      draftDecision,
      draftReason,
      sourceBasis: plan?.sourceBasis ?? 'none',
      shortSupportNote: plan?.support ?? 'Skipped before draft support could be safely established.',
      weakOrHistoricallyNarrow: Boolean(plan?.weak),
      scopeWarning: plan?.scopeWarning ?? null,
      conflictWarning: plan?.conflictWarning ?? null,
      boundaryDisciplineNote: 'Draft only; registry-only meaning/reference layer, no writeback, no runtime ontology admission, no concept packet change, no resolver behavior change, and no alias fan-out.',
      provenancePointers: {
        black: blackReferences,
        anderson: comparatorUsed && comparatorsUsed.includes('anderson_1889')
          ? compactComparatorReferences(andersonReferences, 'comparator_support')
          : [],
        osborn: comparatorUsed && comparatorsUsed.includes('osborn_1927')
          ? compactComparatorReferences(osbornReferences, 'comparator_support')
          : [],
        wharton_v3: comparatorUsed && comparatorsUsed.includes('wharton_1883')
          ? compactComparatorReferences(whartonReferences, 'assistive_v3_only')
          : [],
        stroud_v3: comparatorUsed && comparatorsUsed.includes('stroud_1903')
          ? compactComparatorReferences(stroudReferences, 'assistive_v3_only')
          : [],
      },
      comparatorUsed,
      comparatorsUsed: comparatorUsed ? comparatorsUsed : [],
      comparatorAvailability: {
        andersonExactReferenceCount: andersonReferences.length,
        osbornExactReferenceCount: osbornReferences.length,
        whartonV3ExactReferenceCount: whartonReferences.length,
        stroudV3ExactReferenceCount: stroudReferences.length,
      },
    };
  });
}

function markdownCell(value) {
  return String(value ?? '')
    .replaceAll('|', '\\|')
    .replace(/\s+/g, ' ')
    .trim();
}

function markdownTable(headers, rows) {
  return [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.map(markdownCell).join(' | ')} |`),
  ].join('\n');
}

function summarize(records) {
  const draftReady = records.filter((record) => record.draftDecision === 'draft_ready');
  const reviewNeeded = records.filter((record) => record.draftDecision === 'review_needed');
  const skipped = records.filter((record) => record.draftDecision === 'skip');
  const nonSkipped = records.filter((record) => record.draftDecision !== 'skip');
  const blackOnly = draftReady.filter((record) => record.sourceBasis === 'black_only');

  return {
    scannedCount: records.length,
    draftReadyCount: draftReady.length,
    reviewNeededCount: reviewNeeded.length,
    skippedCount: skipped.length,
    blackOnlyCount: blackOnly.length,
    blackPlusAndersonCount: draftReady.filter((record) => (
      record.comparatorsUsed.includes('anderson_1889')
      && !record.comparatorsUsed.includes('osborn_1927')
    )).length,
    blackPlusOsbornCount: draftReady.filter((record) => (
      record.comparatorsUsed.includes('osborn_1927')
      && !record.comparatorsUsed.includes('anderson_1889')
    )).length,
    blackPlusAndersonOsbornCount: draftReady.filter((record) => (
      record.comparatorsUsed.includes('anderson_1889')
      && record.comparatorsUsed.includes('osborn_1927')
    )).length,
    whartonV3AssistCount: nonSkipped.filter((record) => record.comparatorsUsed.includes('wharton_1883')).length,
    stroudV3AssistCount: nonSkipped.filter((record) => record.comparatorsUsed.includes('stroud_1903')).length,
    v3ScopeOrConflictWarningCount: nonSkipped.filter((record) => (
      record.comparatorsUsed.some((sourceId) => sourceId.endsWith('_1903') || sourceId.endsWith('_1883'))
      && (record.scopeWarning || record.conflictWarning)
    )).length,
    aliasUnderscoreSkips: skipped.filter((record) => (
      record.term.includes('_') || String(record.draftReason).toLowerCase().includes('alias')
    )).length,
    existingMeaningSkips: skipped.filter((record) => record.currentMeaningStatus === 'authored_existing_do_not_requeue').length,
    noBlackProvenanceSkips: skipped.filter((record) => record.provenancePointers.black.length === 0).length,
    historicallyNarrowTerms: nonSkipped
      .filter((record) => record.weakOrHistoricallyNarrow || record.scopeWarning)
      .map((record) => record.term),
    broadOrdinaryWordRiskTerms: [],
    draftReadyTerms: draftReady.map((record) => record.term),
    reviewNeededTerms: reviewNeeded.map((record) => record.term),
    skippedTerms: skipped.map((record) => record.term),
  };
}

function buildReviewMarkdown(records, summary) {
  const comparatorRows = records.map((record) => [
    record.term,
    record.sourceBasis,
    record.comparatorAvailability.andersonExactReferenceCount,
    record.comparatorAvailability.osbornExactReferenceCount,
    record.comparatorAvailability.whartonV3ExactReferenceCount,
    record.comparatorAvailability.stroudV3ExactReferenceCount,
    record.comparatorsUsed.join(', ') || 'not used',
  ]);

  const rows = records.map((record) => [
    record.batchPosition,
    record.approvalQueuePosition,
    record.term,
    record.draftDecision,
    record.sourceBasis,
    record.comparatorsUsed.join(', ') || 'none',
    record.scopeWarning ?? '',
    record.draftMeaningInLaw ?? 'Skipped',
  ]);

  const skipped = records.filter((record) => record.draftDecision === 'skip');
  const reviewNeeded = records.filter((record) => record.draftDecision === 'review_needed');

  return [
    '# Batch 007 Available 30 Draft Review',
    '',
    'Batch 007 is draft-only. It processes only the 30 available approval-queue records at positions 301-330. No writeback was applied.',
    '',
    'Black remains the mandatory primary source. Anderson and Osborn are comparator context. Wharton and Stroud are Comparator v3 assistive-only sources and did not create meanings or override Black. Bouvier, Burrill, and Ballentine were not used because they are OCR-blocked.',
    '',
    '## Counts',
    '',
    markdownTable(
      ['Metric', 'Count'],
      [
        ['Scanned count', summary.scannedCount],
        ['Draft ready', summary.draftReadyCount],
        ['Review needed', summary.reviewNeededCount],
        ['Skipped', summary.skippedCount],
        ['Black only', summary.blackOnlyCount],
        ['Black plus Anderson', summary.blackPlusAndersonCount],
        ['Black plus Osborn', summary.blackPlusOsbornCount],
        ['Black plus Anderson and Osborn', summary.blackPlusAndersonOsbornCount],
        ['Wharton v3 assist', summary.whartonV3AssistCount],
        ['Stroud v3 assist', summary.stroudV3AssistCount],
        ['V3 scope/conflict warnings', summary.v3ScopeOrConflictWarningCount],
        ['Alias/underscore skips', summary.aliasUnderscoreSkips],
        ['Existing meaning skips', summary.existingMeaningSkips],
        ['No-Black-provenance skips', summary.noBlackProvenanceSkips],
      ],
    ),
    '',
    '## Draft Review Table',
    '',
    markdownTable(
      ['#', 'Queue #', 'Term', 'Decision', 'Source basis', 'Comparators used', 'Scope warning', 'Draft meaning'],
      rows,
    ),
    '',
    '## Review Needed Terms',
    '',
    reviewNeeded.length > 0
      ? markdownTable(['Term', 'Reason'], reviewNeeded.map((record) => [record.term, record.draftReason]))
      : 'No terms marked review_needed.',
    '',
    '## Skipped Terms',
    '',
    skipped.length > 0
      ? markdownTable(['Term', 'Reason'], skipped.map((record) => [record.term, record.draftReason]))
      : 'No terms skipped.',
    '',
    '## Historically Narrow Terms',
    '',
    summary.historicallyNarrowTerms.length > 0
      ? markdownTable(
        ['Term', 'Scope note'],
        records
          .filter((record) => summary.historicallyNarrowTerms.includes(record.term))
          .map((record) => [record.term, record.scopeWarning ?? record.draftReason]),
      )
      : 'No historically narrow terms flagged.',
    '',
    '## Broad Ordinary-Word Risk Terms',
    '',
    summary.broadOrdinaryWordRiskTerms.length > 0
      ? summary.broadOrdinaryWordRiskTerms.join(', ')
      : 'No broad ordinary-word risk terms flagged.',
    '',
    '## Exact Comparator Observations',
    '',
    markdownTable(
      ['Term', 'Source basis', 'Anderson refs', 'Osborn refs', 'Wharton v3 refs', 'Stroud v3 refs', 'Comparator role'],
      comparatorRows,
    ),
    '',
    '## Boundary Notes',
    '',
    '- Exact-term only. No fuzzy matching was used.',
    '- No aliases were added and no alias fan-out was used.',
    '- `inherent_power` was skipped as an underscore alias surface.',
    '- `inherent power` is review_needed, not draft_ready, because the phrase has exact Black support but shares a duplicate alias group.',
    '- V3 sources are assistive-only and cannot originate meanings.',
    '- Registry-only boundary is preserved; these drafts do not admit runtime ontology terms.',
    '- No writeback preview was created.',
    '',
    '## Recommendation',
    '',
    '- Review the 27 draft_ready candidates and 2 review_needed candidates before any Batch 007 writeback-preview step.',
    '- Keep `inherent_power` skipped unless an explicit alias policy permits underscore-surface authoring.',
    '- Resolve `inherent power` and `retaliation` wording/scope before treating them as apply-eligible.',
    '',
  ].join('\n');
}

function main() {
  const sourceHashBefore = sourceHash(inputPaths.meaningSources);
  const records = buildDraftRecords();
  const summary = summarize(records);
  const sourceHashAfter = sourceHash(inputPaths.meaningSources);
  const nonSkipped = records.filter((record) => record.draftDecision !== 'skip');
  const skipped = records.filter((record) => record.draftDecision === 'skip');

  const writebackNotApplied = {
    status: 'NOT_APPLIED',
    batchId,
    sliceId,
    mode: 'draft_only',
    writebackExecuted: false,
    writebackPreviewCreated: false,
    candidateCount: summary.draftReadyCount,
    reviewNeededCount: summary.reviewNeededCount,
    skippedCount: summary.skippedCount,
    sourceHashBefore,
    sourceHashAfter,
    sourceHashUnchanged: sourceHashBefore === sourceHashAfter,
    note: 'Draft-only placeholder. No writeback script was executed and no live vocabulary source file was modified.',
  };

  const summaryRecord = {
    generatedAt: new Date().toISOString(),
    batchId,
    sliceId,
    queueRange: {
      start: 301,
      end: 330,
    },
    outputMode: 'draft_only_available_30',
    summary,
    blockedOcrSourcesExcluded: [
      'bouvier_1839_vol_1',
      'bouvier_1839_vol_2',
      'burrill_1860',
      'ballentine_1916',
    ],
    allowedV3AssistSources: [
      'wharton_1883',
      'stroud_1903',
    ],
    sourceHashBefore,
    sourceHashAfter,
    sourceHashUnchanged: sourceHashBefore === sourceHashAfter,
    safety: {
      noVocabularyMeaningsWritten: true,
      noWritebackApplied: true,
      noWritebackPreviewCreated: true,
      noAliasesAdded: true,
      noFuzzyMatching: true,
      whartonStroudAssistiveOnly: true,
      bouvierBurrillBallentineNotUsed: true,
      blackPrimaryRequired: true,
    },
  };

  writeJson(outputPaths.batchDrafts, nonSkipped);
  writeJson(outputPaths.batchSkipped, skipped);
  writeJson(outputPaths.batchWritebackNotApplied, writebackNotApplied);
  writeJson(outputPaths.batchSummary, summaryRecord);
  writeText(outputPaths.batchReview, buildReviewMarkdown(records, summary));

  writeJson(outputPaths.sliceDrafts, nonSkipped);
  writeJson(outputPaths.sliceSkipped, skipped);
  writeJson(outputPaths.sliceWritebackNotApplied, writebackNotApplied);
  writeText(outputPaths.sliceReview, buildReviewMarkdown(records, summary));

  console.log(JSON.stringify({
    batchId,
    sliceId,
    scannedCount: summary.scannedCount,
    draftReadyCount: summary.draftReadyCount,
    reviewNeededCount: summary.reviewNeededCount,
    skippedCount: summary.skippedCount,
    whartonV3AssistCount: summary.whartonV3AssistCount,
    stroudV3AssistCount: summary.stroudV3AssistCount,
    sourceHashUnchanged: sourceHashBefore === sourceHashAfter,
    outputPaths,
  }, null, 2));
}

main();
