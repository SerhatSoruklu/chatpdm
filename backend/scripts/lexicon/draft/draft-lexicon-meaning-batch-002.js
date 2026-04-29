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
  meaningCoverageAudit: path.join(repoRoot, 'docs/boundary/meaning-coverage-audit.json'),
  duplicateTermGroups: path.join(repoRoot, 'docs/boundary/duplicate-term-groups.json'),
});

const outputPaths = Object.freeze({
  draftBatchJson: path.join(draftRoot, 'batch_002_second_50_drafts.json'),
  reviewMarkdown: path.join(reportsDirectory, 'batch_002_review.md'),
  skippedJson: path.join(reportsDirectory, 'batch_002_skipped.json'),
  writebackNotAppliedJson: path.join(draftRoot, 'batch_002_writeback_NOT_APPLIED.json'),
});

const batchStartIndex = 50;
const batchSize = 50;

const draftPlan = Object.freeze({
  foreclosure: {
    decision: 'draft_ready',
    meaning: "A proceeding that cuts off a mortgagor's right to redeem mortgaged property.",
    reason: 'Black support identifies foreclosure as a chancery process defeating the right of redemption.',
    support: 'Black reference describes foreclosure as ending the mortgagor redemption right.',
  },
  pardon: {
    decision: 'skip',
    reason: 'The only queued Black snippet is OCR-corrupted and too thin to support a safe draft.',
    support: 'Single reference is not readable enough for boundary-safe wording.',
  },
  corporation: {
    decision: 'draft_ready',
    meaning: 'A legal body or franchise formed by one or more persons under a distinct name.',
    reason: 'Black references support corporation as a body politic or franchise under a special denomination.',
    support: 'Black references describe a corporation as a body politic under a special name.',
  },
  board: {
    decision: 'draft_ready',
    meaning: 'A body of persons authorized to manage, supervise, or administer a public or organizational matter.',
    reason: 'Black references show board usage for official or administrative bodies such as health, supervisors, works, and directors.',
    support: 'Black references provide repeated official-board examples and administrative usage.',
  },
  committee: {
    decision: 'draft_ready',
    meaning: 'A body of persons to whom consideration or management of a matter is committed or referred.',
    reason: 'Black 1910 directly supports committee as a board of persons entrusted with a matter.',
    support: 'Black reference describes a committee as an assembly or board given a matter to consider or manage.',
  },
  agent: {
    decision: 'draft_ready',
    meaning: 'A person authorized to act for another in managing a business or affair.',
    reason: 'Black references support agent as one who manages affairs for another by authority and on account of that person.',
    support: 'Black references describe agency authority and acting for another.',
  },
  association: {
    decision: 'draft_ready',
    meaning: 'A group of persons joined together for a special purpose, business, or designated affair.',
    reason: 'Black references support association as persons uniting for a special purpose or business.',
    support: 'Black references describe persons joining together for a special purpose or business.',
  },
  governor: {
    decision: 'draft_ready',
    meaning: 'A chief executive or chief civil officer of a state, territory, colony, province, or similar political unit.',
    reason: 'Black references support governor as a chief executive or chief civil officer in public government.',
    support: 'Black references describe governors as chief executives or magistrates of political units.',
  },
  boycott: {
    decision: 'draft_ready',
    meaning: "A concerted effort, historically treated in law as a conspiracy, to injure or prevent another's lawful business.",
    reason: 'Black references support boycott as concerted conduct intended to prevent lawful business or injure business.',
    support: 'Black references frame boycott in criminal-law conspiracy and business-interference terms.',
  },
  company: {
    decision: 'draft_ready',
    meaning: 'An association of persons united for a common business, commercial, or other object.',
    reason: 'Black references support company as a society or association of persons united for a common object.',
    support: 'Black references describe company as an association of persons pursuing a common object.',
  },
  employment: {
    decision: 'skip',
    reason: 'The queued references only say what employment does not necessarily import and do not provide enough positive definition support.',
    support: 'Two Black snippets are too thin and negative-framed for safe drafting.',
  },
  agency: {
    decision: 'draft_ready',
    meaning: 'A relationship in which one person is authorized to manage or transact an affair for another.',
    reason: 'Black reference supports agency as one party undertaking management of an affair for another on that person\'s account.',
    support: 'Black reference describes a party confiding management of an affair to another.',
  },
  discipline: {
    decision: 'skip',
    reason: 'The queued reference is to a specific Discipline Act, not a general legal meaning for discipline.',
    support: 'Single Black reference is statute-specific and not definitional.',
  },
  presumption: {
    decision: 'draft_ready',
    meaning: 'An inference or legal assumption drawn from law or fact unless displaced by proof where allowed.',
    reason: 'Black references support presumption as inference and as a rule concerning proof of facts.',
    support: 'Black references connect presumption to evidentiary inference and rules of proof.',
  },
  notice: {
    decision: 'draft_ready',
    meaning: 'Knowledge, information, or legally sufficient communication of a fact or state of affairs.',
    reason: 'Black references support notice as knowledge, information, and means of knowing a fact or state of affairs.',
    support: 'Black reference describes notice as knowledge or information of a fact or condition.',
  },
  authentication: {
    decision: 'skip',
    reason: 'The queued references only identify the evidence-law context and do not provide enough definition text.',
    support: 'Two snippets say only "in the law of evidence."',
  },
  certainty: {
    decision: 'draft_ready',
    meaning: 'Distinctness, clearness, or particularity in a legal statement, especially in pleading.',
    reason: 'Black references support certainty as distinctness, clearness, and particularity in pleading.',
    support: 'Black references identify certainty with clear and particular pleading statements.',
  },
  inference: {
    decision: 'draft_ready',
    meaning: 'A conclusion or proposition drawn by reasoning from another fact or proposition.',
    reason: 'Black references support inference as a truth or proposition drawn from another supposed or admitted truth.',
    support: 'Black references define inference through reasoning from one fact or proposition to another.',
  },
  insufficiency: {
    decision: 'draft_ready',
    meaning: 'Legal inadequacy, especially of a pleading or answer that fails to respond sufficiently to material allegations.',
    reason: 'Black references support insufficiency as legal inadequacy in equity pleading.',
    support: 'Black references describe insufficiency as an answer failing to reply fully and specifically.',
  },
  materiality: {
    decision: 'draft_ready',
    meaning: 'The quality of having legal significance or relevance to an issue.',
    reason: 'Black references support materiality as the quality of being material; wording is kept general and descriptive.',
    support: 'Black references identify materiality as the property or character of being material.',
  },
  credibility: {
    decision: 'draft_ready',
    meaning: 'Worthiness of belief, especially the quality that makes a witness or statement believable.',
    reason: 'Black reference supports credibility as worthiness of belief.',
    support: 'Black reference describes credibility as worthiness of belief.',
  },
  notoriety: {
    decision: 'draft_ready',
    meaning: 'The state of being generally or widely known.',
    reason: 'Black reference supports notoriety as being notorious or universally well known.',
    support: 'Black reference describes notoriety as being notorious or universally well known.',
  },
  process: {
    decision: 'draft_ready',
    meaning: 'A legal writ, procedure, or means used to compel a party to appear or act in a proceeding.',
    reason: 'Black references support process as the means of compelling a defendant to appear in court and as procedural writs.',
    support: 'Black references describe process in practice as compelled court appearance and procedural writ usage.',
  },
  trial: {
    decision: 'draft_ready',
    meaning: 'The examination of disputed facts or law before a competent tribunal to determine a cause.',
    reason: 'Black reference supports trial as examination before a tribunal of facts or law in issue.',
    support: 'Black references describe trial as tribunal examination for determining issues.',
  },
  witness: {
    decision: 'draft_ready',
    meaning: 'A person who has knowledge of an event or who attests a legal instrument.',
    reason: 'Black references support both primary knowledge-of-event and attesting-instrument usages.',
    support: 'Black references describe witnesses as persons with knowledge and as attesting signers.',
  },
  testimony: {
    decision: 'draft_ready',
    meaning: 'Evidence given by a witness under oath or affirmation.',
    reason: 'Black references support testimony as witness evidence given under oath or affirmation.',
    support: 'Black reference describes testimony as evidence given by a witness under oath or affirmation.',
  },
  exhibit: {
    decision: 'draft_ready',
    meaning: 'A document or item produced and shown to a court during a trial or hearing.',
    reason: 'Black references support exhibit as a paper or document produced and exhibited to a court.',
    support: 'Black reference describes an exhibit as a document produced in court during trial or hearing.',
  },
  joinder: {
    decision: 'draft_ready',
    meaning: 'The joining together of parties, claims, issues, or other procedural elements in a legal proceeding.',
    reason: 'Black references support joinder as joining or coupling together, including parties and actions.',
    support: 'Black references describe joinder as uniting two or more procedural constituents.',
  },
  pleading: {
    decision: 'draft_ready',
    meaning: 'The formal system or practice by which parties state claims, defenses, and issues in a legal proceeding.',
    reason: 'Black references support pleading as a system of rules and allegations in litigation.',
    support: 'Black references describe pleading as a system of rules and special allegations.',
  },
  motion: {
    decision: 'draft_ready',
    meaning: 'An application to a court by a party or counsel seeking a rule, order, or other action.',
    reason: 'Black references support motion as an application to court by parties or counsel for a rule or order.',
    support: 'Black references describe motion as an application to court for a rule or order.',
  },
  hearing: {
    decision: 'draft_ready',
    meaning: 'A proceeding in which a court or tribunal hears argument, evidence, or other matters from the parties.',
    reason: 'Black references support hearing as argument before the court on pleadings in equity practice.',
    support: 'Black references describe hearing as arguments of counsel before the court.',
  },
  intervention: {
    decision: 'skip',
    reason: 'The queued Black support is international-law interference, while the queued registry family is procedural adjudication.',
    support: 'Source support and registry family do not align well enough for safe batch drafting.',
  },
  petition: {
    decision: 'draft_ready',
    meaning: 'A written application or request presented to an authority for the exercise of its power.',
    reason: 'Black 1910 supports petition as a written address or application to a person or body with authority.',
    support: 'Black reference describes petition as a written application or prayer to an authority.',
  },
  review: {
    decision: 'draft_ready',
    meaning: 'A reconsideration or reexamination of a matter for correction, revision, or reversal.',
    reason: 'Black references support review as second examination, reconsideration, or correction.',
    support: 'Black references describe review as reconsideration or second examination for correction.',
  },
  submission: {
    decision: 'draft_ready',
    meaning: 'A yielding to authority or an agreement to place a matter before another for decision.',
    reason: 'Black references support submission as yielding to authority and practice usage for submitting disputes.',
    support: 'Black references describe submission as yielding and as practice involving lawsuit submission.',
  },
  'best evidence': {
    decision: 'draft_ready',
    meaning: 'Primary or original evidence, distinguished from secondary or substitute evidence.',
    reason: 'Black references directly support best evidence as primary and original evidence.',
    support: 'Black references describe best evidence as primary, original, and highest available evidence.',
  },
  best_evidence: {
    decision: 'draft_ready',
    meaning: 'Primary or original evidence, distinguished from secondary or substitute evidence.',
    reason: 'Black references directly support best evidence as primary and original evidence; underscore form is an alias surface.',
    support: 'Black references describe best evidence as primary, original, and highest available evidence.',
  },
  'burden of proof': {
    decision: 'draft_ready',
    meaning: 'The necessity or duty of affirmatively proving a fact or issue.',
    reason: 'Black references support burden of proof as the duty or necessity of affirmative proof.',
    support: 'Black references identify burden of proof with the necessity of proving a fact.',
  },
  burden_of_proof: {
    decision: 'draft_ready',
    meaning: 'The necessity or duty of affirmatively proving a fact or issue.',
    reason: 'Black references support burden of proof as the duty or necessity of affirmative proof; underscore form is an alias surface.',
    support: 'Black references identify burden of proof with the necessity of proving a fact.',
  },
  hearsay: {
    decision: 'draft_ready',
    meaning: 'Testimony in which a witness relates what others said or reported, rather than personal knowledge.',
    reason: 'Black references support hearsay as testimony based on what others told the witness or what the witness heard.',
    support: 'Black references describe hearsay as testimony about what others said rather than personal knowledge.',
  },
  inspection: {
    decision: 'draft_ready',
    meaning: 'An examination or viewing of a person, thing, or matter under legal authority.',
    reason: 'Black references support inspection as examination, including court viewing and legally required testing.',
    support: 'Black references describe inspection as examination by court or under law.',
  },
  interpleader: {
    decision: 'draft_ready',
    meaning: 'A procedure used when multiple persons claim the same property or fund held by a third party who claims no interest in it.',
    reason: 'Black references support interpleader as a dispute over the same thing or fund held by a disinterested third party.',
    support: 'Black references describe multiple claimants to one thing or fund held by a third party.',
  },
  misjoinder: {
    decision: 'draft_ready',
    meaning: 'The improper joining of parties, claims, or proceedings in a suit.',
    reason: 'Black reference supports misjoinder as improper joining of parties to a suit.',
    support: 'Black references describe misjoinder as improper joining in litigation.',
  },
  preponderance: {
    decision: 'draft_ready',
    meaning: 'Superiority of weight or greater persuasive force, especially in weighing evidence.',
    reason: 'Black references support preponderance as superiority of weight or outweighing.',
    support: 'Black references describe preponderance as superiority of weight.',
  },
  rejoinder: {
    decision: 'draft_ready',
    meaning: 'In common-law pleading, the defendant\'s second pleading.',
    reason: 'Black references support rejoinder as the second pleading by the defendant.',
    support: 'Black references describe rejoinder as the second pleading on the defendant side.',
  },
  reply: {
    decision: 'draft_ready',
    meaning: "A plaintiff's or petitioner's answer to the defendant's case or response.",
    reason: 'Black references support reply as what the plaintiff or petitioner says in answer to the defendant case.',
    support: 'Black references describe reply as an answer by the person who instituted the proceeding.',
  },
  transcript: {
    decision: 'draft_ready',
    meaning: 'An official copy of court proceedings or records.',
    reason: 'Black references support transcript as an official copy of certain court proceedings.',
    support: 'Black references describe transcript as an official copy of court proceedings.',
  },
  mortgage: {
    decision: 'draft_ready',
    meaning: 'A conveyance or security interest in property given to secure payment of a debt or obligation.',
    reason: 'Black references support mortgage as a conditional conveyance of land or security for payment of money.',
    support: 'Black references describe mortgage as conveyance or security for debt payment.',
  },
  possession: {
    decision: 'draft_ready',
    meaning: 'Detention, control, or custody of property for use or enjoyment, whether as owner or under a qualified right.',
    reason: 'Black references support possession as detention and control or custody of property.',
    support: 'Black references describe possession as control or custody of property for use and enjoyment.',
  },
  title: {
    decision: 'draft_ready',
    meaning: 'A lawful basis, right, or document establishing a claim to property.',
    reason: 'Black references support title as lawful ground of possessing property and as a document establishing property title.',
    support: 'Black references describe title as a legal ground or document establishing property rights.',
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

function buildDraftRecords() {
  const mainApprovalQueue = readJson(inputPaths.mainApprovalQueue);
  const meaningCoverageAudit = readJson(inputPaths.meaningCoverageAudit);
  const duplicateTermGroups = readJson(inputPaths.duplicateTermGroups);
  readJson(inputPaths.approvedBatch001);
  readJson(inputPaths.reviseBatch001);

  const currentMeaningByTerm = buildCurrentMeaningMap(meaningCoverageAudit);
  const aliasNotesByTerm = buildAliasNotes(duplicateTermGroups);
  const batchTerms = mainApprovalQueue.slice(batchStartIndex, batchStartIndex + batchSize);

  return batchTerms.map((termRecord, index) => {
    const normalizedTerm = termRecord.normalizedTerm ?? normalizeForComparison(termRecord.term);
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
      batchId: 'batch_002_second_50',
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
    '# Batch 002 Meaning Draft Review',
    '',
    'Scope: queue positions 51-100 from `main_approval_queue.json`. These are draft-only boundary meanings supported only by listed Black 1910 and Black 1891 references. This report does not modify the live vocabulary dataset, runtime ontology, boundary content, or concept packets.',
    '',
    '## Implemented / Partial / Missing / Not Evidenced',
    '',
    '- Implemented: draft-only meaning proposals and skip decisions for batch 002.',
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
    '- pardon: single OCR-corrupted support snippet.',
    '- employment: support is negative-framed and not definitional.',
    '- discipline: support is a statute title rather than general meaning.',
    '- authentication: snippets only identify the evidence-law context.',
    '- intervention: source support is international-law usage while queue family is procedural adjudication.',
    '- board: drafted, but should be checked because the support is mostly example-driven.',
    '- inspection: drafted broadly from divergent inspection usages; review should confirm scope.',
    '',
    '## Recommendation',
    '',
    '- Batch 003 should remain at 50 until batch 002 is reviewed and writeback preview passes.',
    '- Do not write back any batch 002 draft until skipped terms and alias duplicates are reviewed.',
    '',
    '## Exact Next Prompt',
    '',
    'Task: Review batch_002_second_50_drafts.json for boundary-safe wording quality. Approve, revise, or reject each draft; keep skipped terms out of writeback. Do not modify the live vocabulary dataset until the approved writeback set is explicitly confirmed.',
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
      source: 'batch_002_second_50_drafts',
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
