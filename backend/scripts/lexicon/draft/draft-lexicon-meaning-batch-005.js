'use strict';

const fs = require('node:fs');
const path = require('node:path');

const {
  buildVocabularyBoundaryResponse,
} = require('../../../src/modules/legal-vocabulary/vocabulary-boundary');

const repoRoot = path.resolve(__dirname, '../../../..');
const workspaceRoot = '/mnt/c/Users/coupy/Desktop/vocabulary-reference-lexicons';
const approvalRoot = path.join(workspaceRoot, 'vocabulary_reference_lexicons/approval_queue');
const draftRoot = path.join(workspaceRoot, 'vocabulary_reference_lexicons/draft_meanings');
const multiSourceRoot = path.join(workspaceRoot, 'vocabulary_reference_lexicons/multi_source');
const reportsDirectory = path.join(draftRoot, 'reports');

const inputPaths = Object.freeze({
  mainApprovalQueue: path.join(approvalRoot, 'main_approval_queue.json'),
  duplicateTermGroups: path.join(repoRoot, 'docs/boundary/duplicate-term-groups.json'),
  andersonAlignment: path.join(multiSourceRoot, 'alignment/anderson_1889.boundary_alignment.ndjson'),
  meaningSources: path.join(repoRoot, 'backend/src/modules/legal-vocabulary/vocabulary-meaning-sources.generated.json'),
});

const outputPaths = Object.freeze({
  draftBatchJson: path.join(draftRoot, 'batch_005_fifth_50_drafts.json'),
  reviewMarkdown: path.join(reportsDirectory, 'batch_005_review.md'),
  skippedJson: path.join(reportsDirectory, 'batch_005_skipped.json'),
  writebackNotAppliedJson: path.join(draftRoot, 'batch_005_writeback_NOT_APPLIED.json'),
});

const batchStartIndex = 200;
const batchSize = 50;

const draftPlan = Object.freeze({
  nonfeasance: {
    decision: 'draft_ready',
    meaning: 'The neglect or failure to do an act that a person ought to do.',
    sourceBasis: 'black_only',
    reason: 'Black directly supports nonfeasance as neglect or failure to do an act one ought to do.',
    support: 'Black references define nonfeasance through neglect or failure to perform an act owed.',
  },
  obstruction: {
    decision: 'draft_ready',
    meaning: 'An interference or impediment that obstructs a legal right, way, or incorporeal interest.',
    sourceBasis: 'black_only',
    reason: 'Black support is narrow but identifies obstruction as injury to an incorporeal hereditament.',
    support: 'Black references describe obstruction as interference or injury affecting incorporeal rights.',
    weak: true,
  },
  election: {
    decision: 'draft_ready',
    meaning: 'The act or result of choosing or selecting a person, thing, course, right, or office holder.',
    sourceBasis: 'black_plus_anderson',
    reason: 'Black supports choosing from alternatives, and Anderson adds exact-term office-selection support.',
    support: 'Black and Anderson define election through choosing or selecting, including selection to office.',
  },
  assembly: {
    decision: 'draft_ready',
    meaning: 'A meeting, gathering, or body of persons assembled, including a legislative body in some states.',
    sourceBasis: 'black_plus_anderson',
    reason: 'Black supports assembly as a gathered body and a state legislative body; Anderson adds exact-term gathering support.',
    support: 'Black and Anderson describe assembly as a gathering or body of persons.',
  },
  citizen: {
    decision: 'draft_ready',
    meaning: 'A member of a political or jural community who possesses civil rights and privileges under its law.',
    sourceBasis: 'black_plus_anderson',
    reason: 'Black and Anderson support citizen as a member of a civic or political community with legal rights.',
    support: 'Black and Anderson define citizen through membership, civil rights, and political community.',
  },
  treaty: {
    decision: 'draft_ready',
    meaning: 'An agreement between two or more independent states.',
    sourceBasis: 'black_only',
    reason: 'Black directly supports treaty as an international-law agreement between independent states.',
    support: 'Black references define treaty as an agreement between independent states.',
  },
  judiciary: {
    decision: 'draft_ready',
    meaning: 'The branch or system of government invested with judicial power and related to courts of justice.',
    sourceBasis: 'black_only',
    reason: 'Black directly supports judiciary as the branch of government invested with judicial power.',
    support: 'Black references define judiciary through courts, judicial power, and the judicial department.',
  },
  representation: {
    decision: 'skip',
    sourceBasis: 'black_only',
    reason: 'The available support is contract, insurance, or legal-fiction usage, not the constitutional/political sense implied by this queue row.',
    support: 'Black and Anderson snippets do not safely support political representation for this family.',
  },
  subject: {
    decision: 'skip',
    sourceBasis: 'black_only',
    reason: 'The queued support is mostly logic, subject-matter, or old dependent/vassal usage rather than a safe constitutional status meaning.',
    support: 'The available snippets do not provide enough direct support for the queued constitutional/political sense.',
  },
  sanctuary: {
    decision: 'draft_ready',
    meaning: 'In old law, a privileged or consecrated place of asylum for offenders.',
    sourceBasis: 'black_only',
    reason: 'Black supports sanctuary as an old-law asylum or consecrated privileged place.',
    support: 'Black references describe sanctuary as old English or Scotch asylum usage.',
    weak: true,
  },
  elector: {
    decision: 'draft_ready',
    meaning: 'A qualified voter or person who has the right to vote in the choice of an officer.',
    sourceBasis: 'black_plus_anderson',
    reason: 'Black and Anderson both support elector as one with the right to vote or choose an officer.',
    support: 'Black and Anderson define elector through voting rights and choice of public officers.',
  },
  legislator: {
    decision: 'draft_ready',
    meaning: 'A lawmaker or member of a legislative body.',
    sourceBasis: 'black_plus_anderson',
    reason: 'Black and Anderson directly support legislator as a maker of laws or member of a law-making body.',
    support: 'Black and Anderson define legislator through lawmaking and legislative membership.',
  },
  sovereignty: {
    decision: 'draft_ready',
    meaning: 'Supreme political authority or power governing a body politic or state.',
    sourceBasis: 'black_plus_anderson',
    reason: 'Black supports sovereign power and paramount control; Anderson adds public authority and supreme governing power.',
    support: 'Black and Anderson define sovereignty through supreme political authority and governing power.',
  },
  insanity: {
    decision: 'draft_ready',
    meaning: 'Unsoundness or disorder of mind arising from disease or defect and affecting mental faculties.',
    sourceBasis: 'black_plus_anderson',
    reason: 'Black and Anderson support insanity as mental unsoundness or disorder caused by disease or defect.',
    support: 'Black and Anderson define insanity through disease or disorder of the mind and faculties.',
  },
  duress: {
    decision: 'draft_ready',
    meaning: 'Unlawful constraint that forces a person to do an act against that person\'s will.',
    sourceBasis: 'black_only',
    reason: 'Black directly supports duress as unlawful constraint compelling action against the will.',
    support: 'Black references define duress through unlawful constraint, imprisonment, and threats.',
  },
  mistake: {
    decision: 'draft_ready',
    meaning: 'An unintentional act, omission, or error arising from ignorance, surprise, imposition, or misplaced confidence.',
    sourceBasis: 'black_only',
    reason: 'Black directly supports mistake as an unintentional act, omission, or error; Anderson support appears OCR-noisy.',
    support: 'Black references define mistake through unintentional error or omission.',
  },
  alibi: {
    decision: 'draft_ready',
    meaning: 'In criminal law, presence elsewhere or in another place when the alleged act occurred.',
    sourceBasis: 'black_only',
    reason: 'Black directly supports alibi as elsewhere or in another place in criminal law.',
    support: 'Black references define alibi through being elsewhere or in another place.',
  },
  condonation: {
    decision: 'draft_ready',
    meaning: 'Conditional remission or forgiveness of a matrimonial offense by the other married party.',
    sourceBasis: 'black_only',
    reason: 'Black directly supports condonation as conditional forgiveness of a matrimonial offense.',
    support: 'Black references define condonation through matrimonial forgiveness or remission.',
  },
  excuse: {
    decision: 'draft_ready',
    meaning: 'A reason alleged for doing or not doing a thing, or for relief or exemption from duty or obligation.',
    sourceBasis: 'black_plus_anderson',
    reason: 'Black and Anderson support excuse as a reason for doing or not doing something or avoiding liability.',
    support: 'Black and Anderson define excuse through reasons for action, inaction, relief, or exemption.',
  },
  exoneration: {
    decision: 'draft_ready',
    meaning: 'The removal of a burden, charge, duty, or liability from a person or estate.',
    sourceBasis: 'black_only',
    reason: 'Black directly supports exoneration as removal of a burden, charge, duty, or liability.',
    support: 'Black references define exoneration through relieving a person or estate of a charge or liability.',
  },
  justification: {
    decision: 'draft_ready',
    meaning: 'A showing or allegation of sufficient legal reason why an act complained of was lawful.',
    sourceBasis: 'black_plus_anderson',
    reason: 'Black and Anderson support justification as showing a lawful or sufficient reason for the defendant\'s act.',
    support: 'Black and Anderson define justification through lawful reason for an act complained of.',
  },
  minority: {
    decision: 'draft_ready',
    meaning: 'The state or condition of being a minor; infancy.',
    sourceBasis: 'black_only',
    reason: 'Black directly supports minority as the state or condition of a minor or infancy.',
    support: 'Black references define minority through minor status and infancy.',
  },
  mitigation: {
    decision: 'draft_ready',
    meaning: 'Alleviation, abatement, or reduction in the severity or amount of a penalty, punishment, or damages.',
    sourceBasis: 'black_plus_anderson',
    reason: 'Black and Anderson support mitigation as lessening or reducing a penalty, punishment, or damages.',
    support: 'Black and Anderson define mitigation through alleviation, abatement, diminution, or reduction.',
  },
  necessity: {
    decision: 'draft_ready',
    meaning: 'Controlling force, irresistible compulsion, or constraint that may excuse an otherwise wrongful act.',
    sourceBasis: 'black_plus_anderson',
    reason: 'Black supports controlling force, and Anderson adds exact-term constraint on will excusing acts.',
    support: 'Black and Anderson define necessity through compulsion, constraint, and excuse of acts.',
  },
  provocation: {
    decision: 'draft_ready',
    meaning: 'The act of inciting another to do a particular deed.',
    sourceBasis: 'black_only',
    reason: 'Black directly supports provocation as inciting another to do a particular deed.',
    support: 'Black references define provocation through incitement to action.',
  },
  condition: {
    decision: 'draft_ready',
    meaning: 'A qualification, event, or circumstance on which an estate, right, duty, or legal effect depends.',
    sourceBasis: 'black_plus_anderson',
    reason: 'Black and Anderson support condition through estate qualifications and express or implied legal conditions.',
    support: 'Black and Anderson define condition through qualifications affecting estates, rights, or legal effects.',
  },
  code: {
    decision: 'draft_ready',
    meaning: 'A collection, compendium, or systematized statement of laws or procedure enacted as positive law.',
    sourceBasis: 'black_plus_anderson',
    reason: 'Black and Anderson support code as a collection or systematized enactment of law or procedure.',
    support: 'Black and Anderson define code through collections or revisions of law and procedure.',
  },
  assignment: {
    decision: 'draft_ready',
    meaning: 'The transfer of a right, interest, property, or claim from one person to another.',
    sourceBasis: 'black_plus_anderson',
    reason: 'Black and Anderson support assignment as transfer of property or rights to another.',
    support: 'Black and Anderson define assignment through transfer of rights, interests, property, or claims.',
  },
  consideration: {
    decision: 'draft_ready',
    meaning: 'The inducement, benefit, detriment, loss, or responsibility that supports a promise or contract.',
    sourceBasis: 'black_plus_anderson',
    reason: 'Black and Anderson support consideration as the inducement and benefit or detriment supporting contractual obligation.',
    support: 'Black and Anderson define consideration through inducement, benefit, detriment, loss, or responsibility.',
  },
  forum: {
    decision: 'draft_ready',
    meaning: 'A court, judicial tribunal, place of jurisdiction, or place where redress is sought.',
    sourceBasis: 'black_plus_anderson',
    reason: 'Black and Anderson support forum as a court, tribunal, or place of jurisdiction.',
    support: 'Black and Anderson define forum through courts, tribunals, jurisdiction, and redress.',
  },
  release: {
    decision: 'draft_ready',
    meaning: 'The act or instrument by which a claim, interest, restraint, liability, or confinement is surrendered or discharged.',
    sourceBasis: 'black_plus_anderson',
    reason: 'Black and Anderson support release as liberation, discharge, or surrender of a claim or interest.',
    support: 'Black and Anderson define release through discharge, liberation, and surrender of claims or interests.',
  },
  policy: {
    decision: 'draft_ready',
    meaning: 'The general principles or purpose by which government, legislation, or a rule of law is guided.',
    sourceBasis: 'black_only',
    reason: 'Black directly supports policy as governmental principles and the purpose of a law, ordinance, or rule.',
    support: 'Black references define policy through governmental guidance and the purpose of laws or rules.',
  },
  custom: {
    decision: 'draft_ready',
    meaning: 'A long-established usage or practice that has acquired the force of law.',
    sourceBasis: 'black_plus_anderson',
    reason: 'Black and Anderson support custom as usage adopted over time and treated as law.',
    support: 'Black and Anderson define custom through long usage, practice, adoption, and legal force.',
  },
  liberty: {
    decision: 'draft_ready',
    meaning: 'Freedom or exemption from restraint, servitude, imprisonment, or extraneous control.',
    sourceBasis: 'black_plus_anderson',
    reason: 'Black and Anderson support liberty as freedom from restraint and control.',
    support: 'Black and Anderson define liberty through freedom and exemption from restraint or control.',
  },
  dictum: {
    decision: 'draft_ready',
    meaning: 'A statement, remark, observation, or judicial opinion expressed in a case.',
    sourceBasis: 'black_only',
    reason: 'Black directly supports dictum as a statement, remark, observation, or judicial opinion; Anderson support is wrong-sense context.',
    support: 'Black references define dictum through statements, remarks, observations, and judicial opinions.',
  },
  force: {
    decision: 'draft_ready',
    meaning: 'Power in action, compulsion, or strength directed to an end.',
    sourceBasis: 'black_plus_anderson',
    reason: 'Black and Anderson support force as power in action, compulsion, and strength.',
    support: 'Black and Anderson define force through dynamic power, action, compulsion, and strength.',
  },
  ordinance: {
    decision: 'draft_ready',
    meaning: 'A rule established by authority, including a permanent rule of action or municipal enactment.',
    sourceBasis: 'black_only',
    reason: 'Black directly supports ordinance as an authoritative rule and municipal enactment.',
    support: 'Black references define ordinance through rules established by authority and municipal lawmaking.',
  },
  treason: {
    decision: 'draft_ready',
    meaning: 'An offense against the government or sovereign to which the offender owes allegiance, especially attempting to overthrow it.',
    sourceBasis: 'black_plus_anderson',
    reason: 'Black directly supports treason as attempting to overthrow a government; Anderson adds offense-against-government context.',
    support: 'Black and Anderson define treason through offenses against sovereign or government allegiance.',
  },
  warranty: {
    decision: 'draft_ready',
    meaning: 'A covenant, stipulation, or assurance as to title, quality, quantity, fact, or performance.',
    sourceBasis: 'black_plus_anderson',
    reason: 'Black and Anderson support warranty in real-property, sales, and insurance senses as covenant or stipulation.',
    support: 'Black and Anderson define warranty through covenants, stipulations, title, quality, quantity, and facts.',
  },
  acceptance: {
    decision: 'draft_ready',
    meaning: 'The taking or receiving of something with approval, assent, or intent to retain.',
    sourceBasis: 'black_plus_anderson',
    reason: 'Black and Anderson support acceptance as taking or receiving with assent or approval.',
    support: 'Black and Anderson define acceptance through receiving, approval, assent, and retention.',
  },
  arrest: {
    decision: 'draft_ready',
    meaning: 'The stopping, seizing, apprehending, or detaining of a person by lawful authority.',
    sourceBasis: 'black_only',
    reason: 'Black directly supports arrest as stopping, seizing, or apprehending a person by lawful authority.',
    support: 'Black references define arrest through seizure, apprehension, and lawful authority.',
  },
  assault: {
    decision: 'draft_ready',
    meaning: 'An unlawful attempt or offer, with force or violence, to inflict bodily hurt on another.',
    sourceBasis: 'black_plus_anderson',
    reason: 'Black and Anderson directly support assault as an attempt or offer to beat or inflict bodily hurt.',
    support: 'Black and Anderson define assault through attempted or offered force or violence against another.',
  },
  charter: {
    decision: 'draft_ready',
    meaning: 'An instrument or grant from sovereign authority conferring rights, franchises, or powers.',
    sourceBasis: 'black_only',
    reason: 'Black directly supports charter as a sovereign instrument or grant to people, colonies, or corporations.',
    support: 'Black references define charter through sovereign grants and public or corporate powers.',
  },
  imprisonment: {
    decision: 'draft_ready',
    meaning: 'The confinement or restraint of a person\'s liberty or power of locomotion.',
    sourceBasis: 'black_plus_anderson',
    reason: 'Black and Anderson support imprisonment as confinement or restraint of personal liberty.',
    support: 'Black and Anderson define imprisonment through confinement, detention, and restraint of locomotion.',
  },
  indictment: {
    decision: 'draft_ready',
    meaning: 'A written accusation of crime found and presented by a grand jury to a court.',
    sourceBasis: 'black_plus_anderson',
    reason: 'Black and Anderson directly support indictment as a written criminal accusation presented by a grand jury.',
    support: 'Black and Anderson define indictment through written accusation, crime, and grand-jury presentment.',
  },
  instrument: {
    decision: 'draft_ready',
    meaning: 'A written, formal, or legal document, such as a contract, deed, will, bond, or writ.',
    sourceBasis: 'black_only',
    reason: 'Black directly supports instrument as a written formal or legal document.',
    support: 'Black references define instrument through written legal documents and formal writings.',
  },
  negligence: {
    decision: 'draft_ready',
    meaning: 'Failure to do what a reasonable and prudent person would do, or doing what such a person would not do, under the circumstances.',
    sourceBasis: 'black_plus_anderson',
    reason: 'Black and Anderson support negligence as omission or failure measured by reasonable-person conduct.',
    support: 'Black and Anderson define negligence through omission, reasonable care, and prudent conduct.',
  },
  precedent: {
    decision: 'draft_ready',
    meaning: 'An adjudged case or court decision used as an example or authority for a later similar case.',
    sourceBasis: 'black_plus_anderson',
    reason: 'Black and Anderson support precedent as an authoritative example or prior decision.',
    support: 'Black and Anderson define precedent through adjudged cases, authority, and later similar cases.',
  },
  privilege: {
    decision: 'draft_ready',
    meaning: 'A peculiar benefit, advantage, right, exemption, or immunity enjoyed by a person, body, or class.',
    sourceBasis: 'black_plus_anderson',
    reason: 'Black and Anderson support privilege as special benefit, advantage, exemption, immunity, or peculiar right.',
    support: 'Black and Anderson define privilege through peculiar rights, exemptions, immunities, and advantages.',
  },
  restraint: {
    decision: 'draft_ready',
    meaning: 'Confinement, abridgment, limitation, or prohibition of action.',
    sourceBasis: 'black_only',
    reason: 'Black directly supports restraint as confinement, abridgment, limitation, or prohibition of action.',
    support: 'Black references define restraint through confinement, limitation, and holding back from action.',
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

function compactAndersonReferences(references) {
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
    supportingSnippet: reference.supportingSnippet,
    parseConfidence: reference.parseConfidence,
    sourceQualityTier: reference.sourceQualityTier,
    extractionMode: reference.extractionMode,
    referenceRole: 'comparator_support',
  }));
}

function readNdjson(filePath) {
  return fs.readFileSync(filePath, 'utf8')
    .split(/\r?\n/)
    .filter((line) => line.trim() !== '')
    .map((line) => JSON.parse(line));
}

function buildCurrentMeaningMap() {
  const response = buildVocabularyBoundaryResponse();
  const map = new Map();

  response.entries.forEach((entry) => {
    map.set(normalizeForComparison(entry.term), entry.meaningInLaw ?? null);
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

function buildAndersonReferenceMap() {
  const referencesByTerm = new Map();

  readNdjson(inputPaths.andersonAlignment)
    .filter((record) => record.matchStatus === 'exact_normalized_match')
    .forEach((record) => {
      const normalized = normalizeForComparison(record.normalizedBoundaryTerm);
      if (!referencesByTerm.has(normalized)) {
        referencesByTerm.set(normalized, new Map());
      }

      referencesByTerm.get(normalized).set(referenceKey(record), record);
    });

  return new Map([...referencesByTerm.entries()].map(([term, references]) => [
    term,
    [...references.values()].sort((left, right) => (
      left.page - right.page
      || left.lineNumber - right.lineNumber
      || left.headword.localeCompare(right.headword)
    )),
  ]));
}

function buildDraftRecords() {
  const mainApprovalQueue = readJson(inputPaths.mainApprovalQueue);
  const duplicateTermGroups = readJson(inputPaths.duplicateTermGroups);
  const currentMeaningByTerm = buildCurrentMeaningMap();
  const aliasNotesByTerm = buildAliasNotes(duplicateTermGroups);
  const andersonByTerm = buildAndersonReferenceMap();
  const batchTerms = mainApprovalQueue.slice(batchStartIndex, batchStartIndex + batchSize);

  return batchTerms.map((termRecord, index) => {
    const normalizedTerm = termRecord.normalizedTerm ?? normalizeForComparison(termRecord.term);
    const currentMeaning = currentMeaningByTerm.get(normalizedTerm) ?? null;
    if (currentMeaning) {
      throw new Error(`Batch 005 cannot requeue already-authored term: ${termRecord.term}`);
    }

    const plan = draftPlan[termRecord.term] ?? draftPlan[normalizedTerm];
    if (!plan) {
      throw new Error(`Missing draft plan for ${termRecord.term}`);
    }

    const andersonReferences = andersonByTerm.get(normalizedTerm) ?? [];
    if (plan.sourceBasis === 'black_plus_anderson' && andersonReferences.length === 0) {
      throw new Error(`Missing exact Anderson comparator support for ${termRecord.term}`);
    }

    const comparatorUsed = plan.sourceBasis === 'black_plus_anderson';

    return {
      batchId: 'batch_005_fifth_50',
      batchPosition: index + 1,
      approvalQueuePosition: batchStartIndex + index + 1,
      term: termRecord.term,
      normalizedTerm,
      family: termRecord.family,
      bucket: termRecord.bucket,
      riskTier: termRecord.riskTier,
      currentMeaningStatus: currentMeaning ? 'authored_existing_do_not_requeue' : termRecord.currentMeaningStatus,
      currentMeaning,
      matchStatus: termRecord.matchStatus,
      aliasGroupNote: aliasNotesByTerm.get(normalizedTerm) ?? termRecord.aliasGroupNote ?? null,
      sourceReferences: compactReferences(termRecord.sourceReferences),
      draftMeaningInLaw: plan.meaning ?? null,
      draftDecision: plan.decision,
      draftReason: plan.reason,
      shortSupportNote: plan.support,
      sourceBasis: plan.sourceBasis,
      provenancePointers: {
        black: compactReferences(termRecord.sourceReferences),
        anderson: comparatorUsed ? compactAndersonReferences(andersonReferences) : [],
      },
      comparatorUsed,
      weakOrHistoricallyNarrow: Boolean(plan.weak || plan.decision === 'skip'),
      boundaryDisciplineNote: 'Draft only; registry-only meaning text, no writeback, no runtime ontology admission, and no alias fan-out.',
    };
  });
}

function escapeMarkdownCell(value) {
  return String(value ?? 'NULL').replaceAll('|', '\\|').replace(/\s+/g, ' ').trim();
}

function markdownTable(headers, rows) {
  return [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.map(escapeMarkdownCell).join(' | ')} |`),
  ].join('\n');
}

function buildReviewMarkdown(records) {
  const ready = records.filter((record) => record.draftDecision === 'draft_ready');
  const skipped = records.filter((record) => record.draftDecision === 'skip');
  const blackOnly = ready.filter((record) => record.sourceBasis === 'black_only');
  const blackPlusAnderson = ready.filter((record) => record.sourceBasis === 'black_plus_anderson');
  const weakRows = records
    .filter((record) => record.weakOrHistoricallyNarrow)
    .map((record) => [record.term, record.draftDecision, record.draftReason]);

  const rows = records.map((record) => [
    record.batchPosition,
    record.approvalQueuePosition,
    record.term,
    record.draftDecision,
    record.sourceBasis,
    record.comparatorUsed,
    record.draftMeaningInLaw ?? 'Skipped',
  ]);

  return [
    '# Batch 005 Meaning Draft Review',
    '',
    'Scope: queue positions 201-250 from `main_approval_queue.json`. These are draft-only boundary meanings. Black remains the primary lane; Anderson is used only where exact-term comparator support materially improves precision or safety. This report does not modify the live vocabulary dataset, runtime ontology, concept packets, or existing meaning text.',
    '',
    '## Implemented / Partial / Missing / Not Evidenced',
    '',
    '- Implemented: draft-only meaning proposals, skip decisions, source-basis labels, and exact provenance pointers for batch 005.',
    '- Partial: source review uses extracted snippets and Anderson alignment outputs, not fresh manual page review.',
    '- Missing: live writeback, final human approval, and source-provenance writeback for any future applied terms.',
    '- Not evidenced: modern jurisdiction-specific completeness or runtime concept admission.',
    '',
    '## Counts',
    '',
    `- Draft ready: ${ready.length}`,
    `- Skipped: ${skipped.length}`,
    `- Black only: ${blackOnly.length}`,
    `- Black plus Anderson: ${blackPlusAnderson.length}`,
    '',
    '## Draft Review Table',
    '',
    markdownTable(
      ['#', 'Queue #', 'Term', 'Decision', 'Source basis', 'Comparator used', 'Draft meaning'],
      rows,
    ),
    '',
    '## Skipped Terms',
    '',
    skipped.length > 0
      ? markdownTable(['Term', 'Reason'], skipped.map((record) => [record.term, record.draftReason]))
      : 'No terms skipped.',
    '',
    '## Weakest / Historically Narrow Terms',
    '',
    weakRows.length > 0
      ? markdownTable(['Term', 'Decision', 'Reason'], weakRows)
      : 'No weak or historically narrow terms flagged.',
    '',
    '## Recommendation',
    '',
    '- Batch 006 should remain at 50 until batch 005 review and writeback preview pass.',
    '- Keep Anderson as comparator support, not a replacement authoring lane.',
    '- Review skipped terms before requeueing them; do not infer modern meanings from wrong-sense snippets.',
    '',
    '## Exact Next Prompt',
    '',
    'Task: Review batch_005_fifth_50_drafts.json for boundary-safe wording quality. Approve, revise, or reject each draft; keep skipped terms out of writeback. Do not modify the live vocabulary dataset, runtime ontology, concept packets, or existing meaning text.',
    '',
  ].join('\n');
}

function main() {
  fs.mkdirSync(reportsDirectory, { recursive: true });
  const records = buildDraftRecords();
  const skipped = records.filter((record) => record.draftDecision === 'skip');
  const writebackNotApplied = records
    .filter((record) => record.draftDecision === 'draft_ready')
    .map((record) => ({
      status: 'NOT_APPLIED',
      term: record.term,
      normalizedTerm: record.normalizedTerm,
      meaningInLaw: record.draftMeaningInLaw,
      sourceBasis: record.sourceBasis,
      comparatorUsed: record.comparatorUsed,
      provenancePointers: record.provenancePointers,
      source: 'batch_005_fifth_50_drafts',
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
