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
  meaningCoverageAudit: path.join(repoRoot, 'docs/boundary/meaning-coverage-audit.json'),
  duplicateTermGroups: path.join(repoRoot, 'docs/boundary/duplicate-term-groups.json'),
});

const outputPaths = Object.freeze({
  draftBatchJson: path.join(draftRoot, 'batch_001_first_50_drafts.json'),
  reviewMarkdown: path.join(reportsDirectory, 'batch_001_review.md'),
  skippedJson: path.join(reportsDirectory, 'batch_001_skipped.json'),
  writebackNotAppliedJson: path.join(draftRoot, 'batch_001_writeback_NOT_APPLIED.json'),
});

const draftPlan = Object.freeze({
  evidence: {
    decision: 'draft_ready',
    meaning: 'Information, testimony, documents, or other material used in legal proceedings to prove or disprove a fact.',
    reason: 'Multiple Black references support evidence as material directed to proof in proceedings.',
    support: 'Black references connect the term to proof of matters or facts in legal proceedings.',
  },
  appeal: {
    decision: 'draft_ready',
    meaning: 'A proceeding or request by which a party seeks review of a decision by a higher court or tribunal.',
    reason: 'Black references support appellate review from a lower forum to a superior court.',
    support: 'Black references describe appeal practice and proceedings before appellate courts.',
  },
  adjudication: {
    decision: 'draft_ready',
    meaning: 'The act of giving or pronouncing a judgment or decision in a legal matter.',
    reason: 'Black references support adjudication as the giving or pronouncing of judgment.',
    support: 'Black references identify adjudication with judgment or decree in a cause.',
  },
  affidavit: {
    decision: 'draft_ready',
    meaning: 'A written statement of facts confirmed by oath or affirmation before an authorized officer.',
    reason: 'Black references give stable support for the conventional sworn-statement meaning.',
    support: 'Black references describe a written declaration of facts confirmed by oath or affirmation.',
  },
  attestation: {
    decision: 'draft_ready',
    meaning: 'The act of witnessing the execution of a written instrument and subscribing as a witness.',
    reason: 'Black references support attestation as witnessed execution of an instrument.',
    support: 'Black references describe witnessing an instrument and subscribing it as a witness.',
  },
  cassation: {
    decision: 'draft_ready',
    meaning: 'In French-law usage, the annulment or quashing of a lower-court judgment.',
    reason: 'Black references support a narrow French-law usage tied to annulment or reversal.',
    support: 'Black references describe cassation as annulling, reversal, or quashing lower decrees.',
  },
  complaint: {
    decision: 'draft_ready',
    meaning: 'An initial pleading by which a plaintiff starts a civil action and states the claim.',
    reason: 'Black references support complaint as the first pleading in civil practice.',
    support: 'Black references identify the complaint as the initiatory pleading by the plaintiff.',
  },
  audit: {
    decision: 'draft_ready',
    meaning: 'An official examination of accounts, vouchers, or financial records.',
    reason: 'Black references support audit as official investigation and examination of accounts and vouchers.',
    support: 'Black references describe auditing as official examination of accounts and vouchers.',
  },
  deposition: {
    decision: 'draft_ready',
    meaning: 'Testimony taken outside open court under legal authority and recorded for use in a proceeding.',
    reason: 'Black references support testimony taken outside open court under commission or law.',
    support: 'Black references describe deposition as witness testimony taken outside open court and reduced to writing.',
  },
  admissibility: {
    decision: 'skip',
    reason: 'The queued support references objections to admissibility but does not provide enough direct definition text.',
    support: 'Single Black reference is procedurally relevant but too thin for safe drafting.',
  },
  burden: {
    decision: 'skip',
    reason: 'The queued support is a narrow Scots-property usage and does not safely support the broader procedural term.',
    support: 'Single Black reference appears jurisdiction- and property-specific.',
  },
  alienation: {
    decision: 'draft_ready',
    meaning: 'The transfer of property or possession, especially of real property, from one person to another.',
    reason: 'Black 1910 directly supports alienation as transfer of property and possession of land.',
    support: 'Black references include real-property transfer language for alienation.',
  },
  chattel: {
    decision: 'draft_ready',
    meaning: 'An item of personal property, especially movable property as distinct from land.',
    reason: 'Black references support chattel as personal property and distinguish chattels from real property.',
    support: 'Black references identify chattel with personal property and movable-property usage.',
  },
  conveyance: {
    decision: 'draft_ready',
    meaning: 'An act or instrument by which a right or property interest is transferred.',
    reason: 'Black references support conveyance as transfer of property rights, especially by deed.',
    support: 'Black references describe conveyance in real-property transfer and deed contexts.',
  },
  betterment: {
    decision: 'draft_ready',
    meaning: 'An improvement made to real property or an estate.',
    reason: 'Black references support betterment as an improvement put upon an estate.',
    support: 'Black references identify betterment with improvements to an estate.',
  },
  appurtenance: {
    decision: 'draft_ready',
    meaning: 'Something attached to or belonging with another thing as an accessory or incident.',
    reason: 'Black references support appurtenance as something belonging to or appended to another thing.',
    support: 'Black references describe appurtenance as an adjunct, appendage, or thing belonging to something else.',
  },
  bailee: {
    decision: 'draft_ready',
    meaning: 'A person who receives personal property from another under a bailment.',
    reason: 'Black references support bailee as the recipient of goods under a bailment.',
    support: 'Black references describe the bailee as the party to whom personal property is delivered in bailment.',
  },
  bailor: {
    decision: 'draft_ready',
    meaning: 'A person who delivers personal property to another under a bailment.',
    reason: 'Black references support bailor as the party delivering goods in bailment.',
    support: 'Black references describe the bailor as the party who delivers goods to another in bailment.',
  },
  beneficiary: {
    decision: 'draft_ready',
    meaning: 'A person for whose benefit a trust or similar legal arrangement is created.',
    reason: 'Black references support beneficiary as one for whose benefit a trust is created.',
    support: 'Black references identify the beneficiary as the person benefited by a trust.',
  },
  custody: {
    decision: 'draft_ready',
    meaning: 'Care, keeping, or control of a person, thing, or property.',
    reason: 'Black references support custody as care and keeping.',
    support: 'Black references describe custody as care and keeping, including property held by a court.',
  },
  bailment: {
    decision: 'draft_ready',
    meaning: 'Delivery of personal property by one person to another for a particular purpose, with the property to be returned or dealt with as agreed.',
    reason: 'Black reference supports bailment as delivery of goods or personal property from one person to another.',
    support: 'Black reference identifies bailment with delivery of personal property.',
  },
  bond: {
    decision: 'draft_ready',
    meaning: 'A sealed or formal obligation by which a person binds themselves to pay money or perform a condition.',
    reason: 'Black references support bond as a formal obligation to pay a sum or satisfy a condition.',
    support: 'Black references describe bond as a specialty obligation under seal.',
  },
  account: {
    decision: 'draft_ready',
    meaning: 'A detailed statement of mutual demands, debts, credits, or financial dealings between parties.',
    reason: 'Black references support account as a statement of mutual demands or financial dealings.',
    support: 'Black references describe account as a detailed statement of debts and credits between parties.',
  },
  creditor: {
    decision: 'draft_ready',
    meaning: 'A person to whom a debt or obligation is owed.',
    reason: 'Black references support creditor as the person to whom a debt is owed.',
    support: 'Black references define creditor in relation to a debtor and owed debt.',
  },
  credit: {
    decision: 'draft_ready',
    meaning: 'The ability to obtain money, goods, or financial accommodation on the expectation of later payment.',
    reason: 'Black references support credit as borrowing or obtaining goods on trust in solvency or reliability.',
    support: 'Black references describe credit in borrowing, goods, loans, and financial-reliability contexts.',
  },
  accounting: {
    decision: 'draft_ready',
    meaning: 'The making and rendering of an account, voluntarily or by order of a court.',
    reason: 'Black references support accounting as making up and rendering an account.',
    support: 'Black references describe accounting as rendition of an account by choice or court order.',
  },
  allocation: {
    decision: 'draft_ready',
    meaning: 'In older account practice, an allowance made upon an account.',
    reason: 'Black references support a narrow historical account-practice usage.',
    support: 'Black references describe allocation as an allowance upon an account.',
  },
  apportionment: {
    decision: 'draft_ready',
    meaning: 'The division or distribution of a subject matter into proportionate shares.',
    reason: 'Black references support apportionment as division or distribution in proportionate parts.',
    support: 'Black references describe apportionment as proportionate division, partition, or distribution.',
  },
  debenture: {
    decision: 'skip',
    reason: 'The queued support is a single truncated reference and does not safely support a general boundary meaning.',
    support: 'Single Black reference is OCR-truncated and too thin for safe drafting.',
  },
  guardian: {
    decision: 'draft_ready',
    meaning: "A person legally responsible for the care, control, or management of another person or that person's property.",
    reason: 'Black references support guardian as having care and control over person or property.',
    support: 'Black references describe guardian in care, control, and appointment contexts.',
  },
  executor: {
    decision: 'draft_ready',
    meaning: "A person appointed by a will to carry out its directions and administer the testator's estate.",
    reason: 'Black references support executor as a person appointed by a testator to carry out a will.',
    support: 'Black references describe executor as appointed to carry out directions in a will.',
  },
  emancipation: {
    decision: 'draft_ready',
    meaning: "The legal act of freeing a person from another's control or legal disability.",
    reason: "Black references support emancipation as setting free someone under another person's power or control.",
    support: 'Black references describe emancipation as release from control and legal dependence.',
  },
  citizenship: {
    decision: 'draft_ready',
    meaning: 'The legal status of being a citizen.',
    reason: 'Black references support citizenship as the status of being a citizen.',
    support: 'Black references directly identify citizenship as citizen status.',
  },
  divorce: {
    decision: 'draft_ready',
    meaning: 'A court-ordered legal separation or dissolution of the marriage relationship.',
    reason: 'Black references support divorce as court-effected separation or dissolution of marriage.',
    support: 'Black references describe divorce as legal separation by judgment, either dissolving or suspending marriage effects.',
  },
  dowry: {
    decision: 'draft_ready',
    meaning: 'Property brought by a woman to her husband in marriage; historically also called a portion.',
    reason: 'Black references support dowry as property brought by a woman to her husband in marriage.',
    support: 'Black references describe dowry as marriage property brought by a woman to her husband.',
  },
  filiation: {
    decision: 'draft_ready',
    meaning: 'The legal relation of a child to a parent, including formal attribution of parentage.',
    reason: 'Black references support filiation as the relation of child to parent and judicial assignment of parentage.',
    support: 'Black references describe filiation as child-parent relation and parentage assignment.',
  },
  administrator: {
    decision: 'draft_ready',
    meaning: 'A person authorized to administer the estate of a deceased person.',
    reason: "Black reference supports administrator as a person granted authority to administer a deceased person's estate.",
    support: 'Black reference describes letters of administration and estate administration.',
  },
  ancestor: {
    decision: 'draft_ready',
    meaning: 'A lineal ascendant or predecessor in a direct line of descent.',
    reason: 'Black reference directly supports ancestor as one preceding another in a direct line of descent.',
    support: 'Black reference describes ancestor as a lineal ascendant.',
  },
  bequest: {
    decision: 'skip',
    reason: 'The queued support is cross-reference-like and OCR-corrupted, not enough for safe drafting.',
    support: 'Single Black reference does not provide a usable definition snippet.',
  },
  cohabitation: {
    decision: 'draft_ready',
    meaning: 'Living together, especially as spouses or as husband and wife.',
    reason: 'Black reference supports cohabitation as living together, including husband-and-wife usage.',
    support: 'Black reference describes cohabitation as living together and living together as husband and wife.',
  },
  consortium: {
    decision: 'skip',
    reason: 'The queued support is a narrow civil-law marriage usage and does not safely cover broader modern consortium usage.',
    support: 'Single Black reference is narrow and historically framed.',
  },
  damages: {
    decision: 'draft_ready',
    meaning: 'Money recoverable in court as compensation or indemnity for loss, injury, or detriment.',
    reason: 'Black references support damages as pecuniary compensation or indemnity for loss or injury.',
    support: 'Black references describe damages as money recoverable for loss, detriment, or injury.',
  },
  contribution: {
    decision: 'draft_ready',
    meaning: 'The sharing of a loss, liability, or payment among persons responsible for it.',
    reason: 'Black references support contribution as sharing a loss or payment among several persons.',
    support: 'Black references describe contribution as shared loss or payment.',
  },
  injunction: {
    decision: 'draft_ready',
    meaning: 'A court order requiring a person to do or refrain from doing a specified act.',
    reason: 'Black references support injunction as an equitable court order, including prohibitive and restorative forms.',
    support: 'Black references describe injunctions as court orders in equity practice.',
  },
  indemnity: {
    decision: 'draft_ready',
    meaning: 'An undertaking or protection against loss, liability, or legal consequences.',
    reason: 'Black references support indemnity as assurance securing another against anticipated loss or legal consequences.',
    support: 'Black references describe indemnity as protection against loss or being legally damnified.',
  },
  levy: {
    decision: 'draft_ready',
    meaning: 'A seizure or collection made under legal authority, especially to satisfy an execution.',
    reason: 'Black references support levy as seizure and raising money under execution.',
    support: 'Black references describe levy in practice as seizure and collection under execution.',
  },
  penalty: {
    decision: 'draft_ready',
    meaning: 'A monetary sum or other sanction imposed for failure to perform an obligation or for violating a rule.',
    reason: 'Black references support penalty as a sum payable on failure to perform an obligation and as a generic sanction.',
    support: 'Black references describe penalty in bond and fine/forfeiture contexts.',
  },
  amnesty: {
    decision: 'draft_ready',
    meaning: 'A governmental pardon or oblivion for past offenses, often granted to a class of persons.',
    reason: 'Black references support amnesty as a sovereign act of pardon and oblivion for past acts.',
    support: 'Black references describe amnesty as governmental pardon for past offenses or delicts.',
  },
  compensation: {
    decision: 'draft_ready',
    meaning: 'Payment or redress given to make amends for loss, injury, or damage.',
    reason: 'Black references support compensation as indemnification, damages, or making amends.',
    support: 'Black references describe compensation as payment, indemnification, and restoration for injury.',
  },
  garnishment: {
    decision: 'draft_ready',
    meaning: "An attachment process warning a third party holding another's property or money not to deliver it except as directed by law.",
    reason: 'Black references support garnishment as an attachment warning to a third party holding property or money.',
    support: 'Black references describe garnishment in attachment process against effects held by another person.',
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

function buildDraftRecords() {
  const mainApprovalQueue = readJson(inputPaths.mainApprovalQueue);
  const meaningCoverageAudit = readJson(inputPaths.meaningCoverageAudit);
  readJson(inputPaths.duplicateTermGroups);

  const currentMeaningByTerm = buildCurrentMeaningMap(meaningCoverageAudit);
  const firstFifty = mainApprovalQueue.slice(0, 50);

  return firstFifty.map((termRecord, index) => {
    const normalizedTerm = termRecord.normalizedTerm ?? normalizeForComparison(termRecord.term);
    const plan = draftPlan[normalizedTerm];
    if (!plan) {
      throw new Error(`Missing draft plan for ${termRecord.term}`);
    }

    const currentMeaning = currentMeaningByTerm.get(normalizedTerm) ?? null;
    const currentMeaningStatus = currentMeaning ? 'authored_review_needed' : termRecord.currentMeaningStatus;
    const draftDecision = currentMeaning && plan.decision === 'draft_ready'
      ? 'revise_existing'
      : plan.decision;

    return {
      batchId: 'batch_001_first_50',
      batchPosition: index + 1,
      term: termRecord.term,
      normalizedTerm,
      family: termRecord.family,
      bucket: termRecord.bucket,
      riskTier: termRecord.riskTier,
      currentMeaningStatus,
      currentMeaning,
      matchStatus: termRecord.matchStatus,
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

  const rows = records.map((record) => [
    record.batchPosition,
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
    '# Batch 001 Meaning Draft Review',
    '',
    'Scope: first 50 terms from `main_approval_queue.json`. These are draft-only boundary meanings supported only by listed Black 1910 and Black 1891 references. This report does not modify the live vocabulary dataset, runtime ontology, boundary content, or concept packets.',
    '',
    '## Implemented / Partial / Missing / Not Evidenced',
    '',
    '- Implemented: draft-only one-sentence meaning proposals and skip decisions for weakly supported terms.',
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
    '',
    '## Draft Review Table',
    '',
    markdownTable(
      ['#', 'Term', 'Current meaning status', 'Decision', 'Draft meaning'],
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
    '- admissibility: single support snippet discusses objections rather than a direct definition.',
    '- burden: support is narrow Scots-property usage and does not support the likely procedural sense.',
    '- bequest: support is OCR-corrupted and cross-reference-like.',
    '- debenture: support is a single truncated entry.',
    '- consortium: support is narrow civil-law historical usage and does not cover broader modern usage.',
    '',
    '## Recommendation',
    '',
    '- Batch 002 should stay at 50 until this first draft style is reviewed.',
    '- Do not write back any batch 001 draft until the skipped terms and source notes are reviewed.',
    '',
    '## Exact Next Prompt',
    '',
    'Task: Review batch_001_first_50_drafts.json for boundary-safe wording quality. Approve, revise, or reject each draft; keep skipped terms out of writeback. Do not modify the live vocabulary dataset until the approved writeback set is explicitly confirmed.',
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
      source: 'batch_001_first_50_drafts',
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
