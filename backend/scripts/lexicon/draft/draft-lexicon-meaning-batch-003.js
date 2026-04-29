'use strict';

const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '../../../..');
const workspaceRoot = '/mnt/c/Users/coupy/Desktop/vocabulary-reference-lexicons';
const approvalRoot = path.join(workspaceRoot, 'vocabulary_reference_lexicons/approval_queue');
const draftRoot = path.join(workspaceRoot, 'vocabulary_reference_lexicons/draft_meanings');
const reportsDirectory = path.join(draftRoot, 'reports');

const inputPaths = Object.freeze({
  mainApprovalQueue: path.join(approvalRoot, 'main_approval_queue.json'),
  approvalSummary: path.join(approvalRoot, 'reports/approval_queue_summary.md'),
  approvedBatch001: path.join(draftRoot, 'review/approved_batch_001.json'),
  reviseBatch001: path.join(draftRoot, 'review/revise_batch_001.json'),
  approvedBatch002: path.join(draftRoot, 'review/approved_batch_002.json'),
  reviseBatch002: path.join(draftRoot, 'review/revise_batch_002.json'),
  meaningCoverageAudit: path.join(repoRoot, 'docs/boundary/meaning-coverage-audit.json'),
  duplicateTermGroups: path.join(repoRoot, 'docs/boundary/duplicate-term-groups.json'),
});

const outputPaths = Object.freeze({
  draftBatchJson: path.join(draftRoot, 'batch_003_third_50_drafts.json'),
  reviewMarkdown: path.join(reportsDirectory, 'batch_003_review.md'),
  skippedJson: path.join(reportsDirectory, 'batch_003_skipped.json'),
  writebackNotAppliedJson: path.join(draftRoot, 'batch_003_writeback_NOT_APPLIED.json'),
});

const batchStartIndex = 100;
const batchSize = 50;

const draftPlan = Object.freeze({
  trust: {
    decision: 'draft_ready',
    meaning: 'A relationship in which property is held by one person for the benefit or use of another.',
    reason: 'Black references support trust as holding legal title or property for trust purposes.',
    support: 'Black references describe property or title held in trust and trust duties.',
  },
  easement: {
    decision: 'draft_ready',
    meaning: 'A right connected with land to use, benefit from, or restrict another parcel of land.',
    reason: 'Black support is OCR-noisy but identifies easement as a land-based right associated with another parcel.',
    support: 'Black references describe easement as a right involving one parcel of land and another.',
  },
  servitude: {
    decision: 'draft_ready',
    meaning: 'In property usage, a charge or burden on an estate for the benefit of another estate or person.',
    reason: 'Black support includes real or predial servitude as a charge laid on an estate.',
    support: 'Black references connect servitude to a charge on an estate and to civil-law servitude usage.',
  },
  remainder: {
    decision: 'draft_ready',
    meaning: 'A future estate that takes effect after the end of a prior particular estate.',
    reason: 'Black references support remainder as an estate limited to take effect after a prior estate or term.',
    support: 'Black references describe remainder as a remnant or future estate after a prior estate.',
  },
  lien: {
    decision: 'draft_ready',
    meaning: 'A creditor\'s qualified right or charge over specific property as security for a debt or obligation.',
    reason: 'Black 1910 directly supports lien as a qualified property right over specific debtor property as security.',
    support: 'Black references define lien as a right or charge over specific property securing debt or performance.',
  },
  trustee: {
    decision: 'draft_ready',
    meaning: 'A person appointed or required to execute a trust or hold property for trust purposes.',
    reason: 'Black support identifies trustee as the person appointed or required by law to execute a trust.',
    support: 'Black references define trustee through executing a trust and trust administration.',
  },
  'fee simple': {
    decision: 'draft_ready',
    meaning: 'An absolute and unqualified freehold estate of inheritance.',
    reason: 'Black support directly identifies fee simple as an absolute and unqualified freehold estate of inheritance.',
    support: 'Black references describe fee simple as a freehold estate of inheritance, absolute and unqualified.',
  },
  fee_simple: {
    decision: 'draft_ready',
    meaning: 'An absolute and unqualified freehold estate of inheritance.',
    reason: 'Black support directly identifies fee simple as an absolute and unqualified freehold estate; underscore form is an alias surface.',
    support: 'Black references describe fee simple as a freehold estate of inheritance, absolute and unqualified.',
  },
  holding: {
    decision: 'draft_ready',
    meaning: 'In land usage, a piece of land held under a lease or similar tenancy.',
    reason: 'Black support is historically narrow and identifies holding in English law as land held under lease or tenancy.',
    support: 'Black references describe holding as a piece of land held under a lease or similar tenancy.',
  },
  tenure: {
    decision: 'draft_ready',
    meaning: 'The mode or system by which land or tenements are held, historically under a superior.',
    reason: 'Black references support tenure as the mode or system of holding land in subordination to a superior.',
    support: 'Black references describe tenure as the system of holding lands or tenements.',
  },
  transfer: {
    decision: 'draft_ready',
    meaning: 'The passing or conveyance of a thing or property from one person to another.',
    reason: 'Black references directly support transfer as passing a thing or property to another.',
    support: 'Black references define transfer as passing over, conveyance, or alienation.',
  },
  homestead: {
    decision: 'draft_ready',
    meaning: 'The home place or fixed residence, usually including the dwelling and adjoining land.',
    reason: 'Black references support homestead as the home place and fixed family residence with surrounding land.',
    support: 'Black references describe homestead as the home place, home farm, or fixed residence.',
  },
  hypothecation: {
    decision: 'draft_ready',
    meaning: 'A civil-law-derived pledge or mortgage given as security without necessarily transferring possession.',
    reason: 'Black references support hypothecation as a civil-law term naturalized as mortgage or pledge.',
    support: 'Black references describe hypothecation as a civil-law pledge or mortgage concept.',
  },
  lease: {
    decision: 'draft_ready',
    meaning: 'A conveyance of land or tenements for life, for a term of years, or at will, usually for rent or recompense.',
    reason: 'Black references directly support lease as a conveyance of land or tenements for a term or at will.',
    support: 'Black references describe lease as conveyance for life, years, or at will for rent or recompense.',
  },
  ownership: {
    decision: 'draft_ready',
    meaning: 'Title, dominion, or proprietary right in a thing or claim.',
    reason: 'Black references support ownership as complete dominion, title, or proprietary right.',
    support: 'Black references describe ownership as title, dominion, and right to possess and use.',
  },
  reversion: {
    decision: 'draft_ready',
    meaning: 'The residue of an estate left by operation of law in the grantor or the grantor\'s heirs.',
    reason: 'Black references support reversion as the residue of an estate left in the grantor or heirs.',
    support: 'Black references define reversion as a remaining estate arising by operation of law.',
  },
  occupancy: {
    decision: 'draft_ready',
    meaning: 'A mode of acquiring property by taking possession of a thing that belongs to no one.',
    reason: 'Black references directly support occupancy as acquiring ownerless property through possession.',
    support: 'Black references describe occupancy as taking possession of a thing belonging to nobody.',
  },
  pledge: {
    decision: 'draft_ready',
    meaning: 'A bailment of goods to a creditor as security for a debt or engagement.',
    reason: 'Black references directly support pledge as a bailment of goods as security.',
    support: 'Black references describe pledge as goods delivered to a creditor for security.',
  },
  leasehold: {
    decision: 'draft_ready',
    meaning: 'An estate in real property held under a lease, commonly for a fixed term of years.',
    reason: 'Black references directly support leasehold as an estate in realty held under a lease.',
    support: 'Black references describe leasehold as an estate in realty held under a lease.',
  },
  lessee: {
    decision: 'draft_ready',
    meaning: 'A person to whom a lease is made and who holds an estate by virtue of it.',
    reason: 'Black references directly support lessee as the person to whom a lease is made.',
    support: 'Black references define lessee through receiving and holding under a lease.',
  },
  lessor: {
    decision: 'draft_ready',
    meaning: 'A person who grants a lease.',
    reason: 'Black references directly support lessor as the person granting a lease.',
    support: 'Black references define lessor as one who grants a lease.',
  },
  mortgagor: {
    decision: 'draft_ready',
    meaning: 'A person who gives or grants a mortgage.',
    reason: 'Black support is brief but directly identifies mortgagor as the person who gives a mortgage.',
    support: 'Black references describe mortgagor as one who gives a mortgage.',
  },
  pledgee: {
    decision: 'draft_ready',
    meaning: 'The party to whom goods are delivered or pledged as security.',
    reason: 'Black references directly support pledgee as the party to whom goods are pledged.',
    support: 'Black references define pledgee as the party receiving goods in pledge.',
  },
  pledgor: {
    decision: 'draft_ready',
    meaning: 'The party who delivers goods in pledge.',
    reason: 'Black references directly support pledgor as the party delivering goods in pledge.',
    support: 'Black references define pledgor as the party pledging or delivering goods in pledge.',
  },
  transferee: {
    decision: 'draft_ready',
    meaning: 'A person to whom a transfer is made.',
    reason: 'Black references directly support transferee as the person receiving a transfer.',
    support: 'Black references define transferee as one to whom a transfer is made.',
  },
  usufruct: {
    decision: 'skip',
    reason: 'The queued Black snippets for usufruct itself are truncated and do not provide enough definition text.',
    support: 'Attached references say only "In the civil law. The" and are too thin for safe drafting.',
  },
  usufructuary: {
    decision: 'draft_ready',
    meaning: 'In civil-law usage, a person who has the right to enjoy property in which they do not own the property itself.',
    reason: 'Black references directly support usufructuary as one who has a usufruct or right of enjoyment without property ownership.',
    support: 'Black references describe a usufructuary as one enjoying a thing without owning it.',
  },
  debt: {
    decision: 'draft_ready',
    meaning: 'A sum of money or other obligation that is due or owing.',
    reason: 'Black references support debt as something due or owing, including a sum due by agreement.',
    support: 'Black references define debt through money due and obligations owed.',
  },
  fund: {
    decision: 'draft_ready',
    meaning: 'A sum of money or capital set apart or available for a particular purpose, debt, or claim.',
    reason: 'Black references support fund as money set apart for a specific purpose or available for payment.',
    support: 'Black references describe fund as capital or money set apart for a purpose or claim.',
  },
  payment: {
    decision: 'draft_ready',
    meaning: 'Performance or discharge of a debt, duty, promise, or obligation, often by delivery of money.',
    reason: 'Black references support payment as performance or discharge of debt or obligation.',
    support: 'Black references describe payment as discharging debt or performing what was undertaken.',
  },
  patent: {
    decision: 'draft_ready',
    meaning: 'A governmental or sovereign grant of a privilege, property, or authority.',
    reason: 'Black references support patent as a government or sovereign grant of privilege, property, or authority.',
    support: 'Black references describe patent as an open grant made by government or sovereign authority.',
  },
  debtor: {
    decision: 'draft_ready',
    meaning: 'A person who owes a debt.',
    reason: 'Black references directly support debtor as one who owes a debt.',
    support: 'Black references define debtor as a person who owes a debt.',
  },
  license: {
    decision: 'draft_ready',
    meaning: 'Permission from a competent authority to do an act that would otherwise lack authorization.',
    reason: 'Black references support license as permission conferring a right to do an act under authority.',
    support: 'Black references define license as permission accorded by competent authority.',
  },
  franchise: {
    decision: 'draft_ready',
    meaning: 'A special privilege conferred by government on an individual or corporation.',
    reason: 'Black references support franchise as a special privilege conferred by government.',
    support: 'Black references define franchise as a governmental special privilege.',
  },
  premium: {
    decision: 'draft_ready',
    meaning: 'A sum paid or agreed to be paid as consideration for insurance or similar protection.',
    reason: 'Black references support premium as the sum paid by an assured to the underwriter as insurance consideration.',
    support: 'Black references define premium in insurance payment terms.',
  },
  price: {
    decision: 'draft_ready',
    meaning: 'The consideration, usually money, given for the purchase of a thing.',
    reason: 'Black references directly support price as consideration given for purchase.',
    support: 'Black references define price as consideration, usually money, for purchase.',
  },
  security: {
    decision: 'draft_ready',
    meaning: 'Protection, assurance, or indemnification, often furnished to secure an obligation.',
    reason: 'Black references support security as protection, assurance, or indemnification.',
    support: 'Black references define security as protection, assurance, and indemnification.',
  },
  surplusage: {
    decision: 'skip',
    reason: 'The queued support is mostly pleading-specific, while the queued registry family is commerce and allocation.',
    support: 'The accounting snippet is too thin to overcome the wrong-sense pleading support.',
  },
  taxation: {
    decision: 'draft_ready',
    meaning: 'The imposition and levying of a tax or enforced pecuniary contribution.',
    reason: 'Black references directly support taxation as imposing and levying a tax or pecuniary charge.',
    support: 'Black references define taxation as the imposition and levy of a tax.',
  },
  distribution: {
    decision: 'draft_ready',
    meaning: 'The apportionment and division of an estate or fund under legal authority.',
    reason: 'Black references support distribution as court-authorized apportionment and division of an estate remainder.',
    support: 'Black references describe distribution as apportionment and division under authority.',
  },
  licensor: {
    decision: 'draft_ready',
    meaning: 'A person who gives or grants a license.',
    reason: 'Black references directly support licensor as the person who grants a license.',
    support: 'Black references define licensor as one who gives or grants a license.',
  },
  patentee: {
    decision: 'draft_ready',
    meaning: 'A person to whom a patent has been granted.',
    reason: 'Black references directly support patentee as the person to whom a patent is granted.',
    support: 'Black references define patentee as one who has received a patent.',
  },
  rate: {
    decision: 'draft_ready',
    meaning: 'A proportional or relative value, measure, degree, or standard by which quantity or value is adjusted.',
    reason: 'Black references directly support rate as proportional value or standard of adjustment.',
    support: 'Black references describe rate as a proportional value, measure, or standard.',
  },
  royalty: {
    decision: 'draft_ready',
    meaning: 'A payment reserved by the grantor of a patent, lease, mine, or similar right, usually proportioned to use.',
    reason: 'Black references directly support royalty as a reserved payment proportional to use of a granted right.',
    support: 'Black references define royalty as a reserved payment to the grantor of a right.',
  },
  heir: {
    decision: 'draft_ready',
    meaning: 'A person entitled or expected to inherit property or an estate from another.',
    reason: 'Black references support heir as a person inheriting or expecting to inherit property or an estate.',
    support: 'Black references define heir through inheritance of property or estate.',
  },
  marriage: {
    decision: 'draft_ready',
    meaning: 'A legally recognized marital union, historically described in Black as the formal act of becoming husband and wife.',
    reason: 'Black support is historically worded, so the draft makes historical scope explicit while preserving the conventional legal usage.',
    support: 'Black references describe marriage as a formal legal act creating husband-and-wife status.',
  },
  succession: {
    decision: 'draft_ready',
    meaning: 'The transmission or taking of rights, property, or status from one person or holder to another.',
    reason: 'Black references support succession through estate partition, inheritance-related usage, and continuity of legal holding.',
    support: 'Black references connect succession to estates, inheritance, and continuity of rights.',
  },
  testament: {
    decision: 'draft_ready',
    meaning: 'A will or testamentary disposition that takes effect after the owner\'s death.',
    reason: 'Black references support testament as a disposition of property to take place after death.',
    support: 'Black references define testament through post-death disposition, with some historical form variants.',
  },
  inheritance: {
    decision: 'draft_ready',
    meaning: 'An estate or property interest descending to an heir.',
    reason: 'Black references support inheritance as an estate in real things descending to the heir.',
    support: 'Black references define inheritance through property descending to an heir.',
  },
  ward: {
    decision: 'draft_ready',
    meaning: 'A person, especially a minor or protected person, for whom a guardian is appointed.',
    reason: 'Black references support ward through guardianship usage despite also listing older guarding and district senses.',
    support: 'Black references identify the person for whom a guardian is appointed as a ward.',
  },
});

function toWindowsPath(filePath) {
  if (filePath.startsWith('/mnt/c/')) {
    return `C:\\${filePath.slice('/mnt/c/'.length).replaceAll('/', '\\')}`;
  }

  return filePath;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function normalizeForComparison(value) {
  return value
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/[.,;:]+$/g, '')
    .trim()
    .replace(/\s+/g, ' ');
}

function buildCurrentMeaningMap(meaningCoverageAudit) {
  const map = new Map();

  Object.values(meaningCoverageAudit.weakContentAudit.groups).forEach((group) => {
    group.forEach((entry) => {
      map.set(normalizeForComparison(entry.term), entry.meaningInLaw ?? null);
    });
  });

  return map;
}

function buildAliasNotes(duplicateTermGroups) {
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

function compactReferences(references) {
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

function buildAppliedTermSet() {
  return new Set([
    ...readJson(inputPaths.approvedBatch001),
    ...readJson(inputPaths.reviseBatch001),
    ...readJson(inputPaths.approvedBatch002),
    ...readJson(inputPaths.reviseBatch002),
  ].map((record) => normalizeForComparison(record.term)));
}

function buildDraftRecords() {
  const mainApprovalQueue = readJson(inputPaths.mainApprovalQueue);
  const meaningCoverageAudit = readJson(inputPaths.meaningCoverageAudit);
  const duplicateTermGroups = readJson(inputPaths.duplicateTermGroups);
  const appliedTerms = buildAppliedTermSet();

  const currentMeaningByTerm = buildCurrentMeaningMap(meaningCoverageAudit);
  const aliasNotesByTerm = buildAliasNotes(duplicateTermGroups);
  const batchTerms = mainApprovalQueue.slice(batchStartIndex, batchStartIndex + batchSize);

  return batchTerms.map((termRecord, index) => {
    const normalizedTerm = termRecord.normalizedTerm ?? normalizeForComparison(termRecord.term);
    if (appliedTerms.has(normalizedTerm)) {
      throw new Error(`Batch 003 unexpectedly reused applied term: ${termRecord.term}`);
    }

    const plan = draftPlan[termRecord.term] ?? draftPlan[normalizedTerm];
    if (!plan) {
      throw new Error(`Missing draft plan for ${termRecord.term}`);
    }

    const currentMeaning = currentMeaningByTerm.get(normalizedTerm) ?? null;
    const currentMeaningStatus = currentMeaning ? 'authored_review_needed' : termRecord.currentMeaningStatus;
    const draftDecision = currentMeaning && plan.decision === 'draft_ready'
      ? 'revise_existing'
      : plan.decision;

    return {
      batchId: 'batch_003_third_50',
      batchPosition: index + 1,
      approvalQueuePosition: batchStartIndex + index + 1,
      term: termRecord.term,
      normalizedTerm,
      family: termRecord.family,
      bucket: termRecord.bucket,
      riskTier: termRecord.riskTier,
      currentMeaningStatus,
      currentMeaning,
      matchStatus: termRecord.matchStatus,
      aliasGroupNote: aliasNotesByTerm.get(normalizedTerm) ?? termRecord.aliasGroupNote ?? null,
      sourceReferences: compactReferences(termRecord.sourceReferences),
      draftMeaningInLaw: plan.meaning ?? null,
      draftDecision,
      draftReason: plan.reason,
      shortSupportNote: plan.support,
      boundaryDisciplineNote: 'Draft only; registry-only meaning text, not runtime ontology admission.',
    };
  });
}

function markdownTable(headers, rows) {
  return [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.join(' | ')} |`),
  ].join('\n');
}

function buildReviewMarkdown(records) {
  const ready = records.filter((record) => record.draftDecision === 'draft_ready');
  const skipped = records.filter((record) => record.draftDecision === 'skip');
  const kept = records.filter((record) => record.draftDecision === 'keep_existing');
  const revised = records.filter((record) => record.draftDecision === 'revise_existing');
  const unexpectedExisting = records.filter((record) => record.currentMeaning);

  const rows = records.map((record) => [
    record.batchPosition,
    record.approvalQueuePosition,
    record.term,
    record.currentMeaningStatus,
    record.draftDecision,
    record.draftMeaningInLaw ?? 'Skipped',
  ]);

  const skippedRows = skipped.map((record) => [
    record.term,
    record.draftReason,
  ]);

  return [
    '# Batch 003 Meaning Draft Review',
    '',
    'Scope: queue positions 101-150 from `main_approval_queue.json`. These are draft-only boundary meanings supported only by listed Black 1910 and Black 1891 references. This report does not modify the live vocabulary dataset, runtime ontology, boundary content, or concept packets.',
    '',
    '## Implemented / Partial / Missing / Not Evidenced',
    '',
    '- Implemented: draft-only meaning proposals and skip decisions for batch 003.',
    '- Partial: source inspection uses extracted Black snippets from the approval queue, not full manual page review.',
    '- Missing: live writeback, UI display, Bouvier comparison, and final human approval.',
    '- Not evidenced: modern jurisdiction-specific completeness or sufficiency for runtime concept admission.',
    '',
    '## Counts',
    '',
    `- Draft ready: ${ready.length}`,
    `- Skipped: ${skipped.length}`,
    `- Existing meanings kept: ${kept.length}`,
    `- Existing meanings revised/proposed for replacement: ${revised.length}`,
    `- Unexpected existing meanings encountered: ${unexpectedExisting.length}`,
    '',
    '## Draft Review Table',
    '',
    markdownTable(
      ['#', 'Queue #', 'Term', 'Current meaning status', 'Decision', 'Draft meaning'],
      rows,
    ),
    '',
    '## Skipped Terms',
    '',
    skippedRows.length > 0
      ? markdownTable(['Term', 'Reason'], skippedRows)
      : 'No terms skipped.',
    '',
    '## Weakest Terms Inside This Batch',
    '',
    '- usufruct: skipped because the queued snippets are truncated before definition text.',
    '- surplusage: skipped because the support is mostly pleading-specific while the queued family is commerce/allocation.',
    '- easement: drafted from OCR-noisy support; review should confirm property scope.',
    '- servitude: drafted with property/civil-law scope because support mixes predial and personal senses.',
    '- mortgagor: drafted from brief but direct support.',
    '- marriage: drafted with historical-scope caution because Black wording is historically gendered.',
    '- ward: drafted with guardianship scope despite older guarding/district senses in the snippets.',
    '',
    '## Recommendation',
    '',
    '- Batch 004 should remain at 50 until batch 003 is reviewed and writeback preview passes.',
    '- Black-only still holds for one more review cycle, but Bouvier should be reconsidered after batch 003 review if skip rate or wrong-sense rate rises.',
    '- Keep alias surfaces visible and do not assume fan-out behavior for `fee simple` and `fee_simple`.',
    '',
    '## Exact Next Prompt',
    '',
    'Task: Review batch_003_third_50_drafts.json for boundary-safe wording quality. Approve, revise, or reject each draft; keep skipped terms out of writeback. Do not modify the live vocabulary dataset until the approved writeback set is explicitly confirmed.',
    '',
  ].join('\n');
}

function main() {
  fs.mkdirSync(reportsDirectory, { recursive: true });
  const records = buildDraftRecords();
  const skipped = records.filter((record) => record.draftDecision === 'skip');
  const writebackNotApplied = records
    .filter((record) => record.draftDecision === 'draft_ready' || record.draftDecision === 'revise_existing')
    .map((record) => ({
      status: 'NOT_APPLIED',
      term: record.term,
      normalizedTerm: record.normalizedTerm,
      meaningInLaw: record.draftMeaningInLaw,
      source: 'batch_003_third_50_drafts',
      note: 'Writeback-ready draft only; not applied to live vocabulary dataset.',
    }));

  writeJson(outputPaths.draftBatchJson, records);
  writeJson(outputPaths.skippedJson, skipped);
  writeJson(outputPaths.writebackNotAppliedJson, writebackNotApplied);
  fs.writeFileSync(outputPaths.reviewMarkdown, buildReviewMarkdown(records), 'utf8');

  Object.values(outputPaths).forEach((filePath) => {
    process.stdout.write(`Wrote ${toWindowsPath(filePath)}\n`);
  });
}

main();
