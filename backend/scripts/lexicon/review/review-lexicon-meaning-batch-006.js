'use strict';

const fs = require('node:fs');
const path = require('node:path');

const workspaceRoot = '/mnt/c/Users/coupy/Desktop/vocabulary-reference-lexicons';
const draftRoot = path.join(workspaceRoot, 'vocabulary_reference_lexicons/draft_meanings');
const reviewRoot = path.join(draftRoot, 'review');

const inputPaths = Object.freeze({
  draftBatch: path.join(draftRoot, 'batch_006_sixth_50_drafts.json'),
  skippedReport: path.join(draftRoot, 'reports/batch_006_skipped.json'),
  writebackNotApplied: path.join(draftRoot, 'batch_006_writeback_NOT_APPLIED.json'),
});

const outputPaths = Object.freeze({
  reviewMarkdown: path.join(reviewRoot, 'batch_006_wording_review.md'),
  reviewJson: path.join(reviewRoot, 'batch_006_wording_review.json'),
  revisedDraftsPreWriteback: path.join(reviewRoot, 'batch_006_revised_drafts_PRE_WRITEBACK.json'),
});

const revisionPlan = Object.freeze({
  acquittal: {
    revisedMeaningInLaw: 'In criminal practice, the legal discharge of an accused person from a criminal accusation by verdict or judgment.',
    reason: 'The draft mixed the contract/discharge sense with the criminal-practice sense. Revised wording keeps the batch-family criminal scope and exact Black, Anderson, and Osborn support.',
    flags: ['mixing_separate_legal_senses'],
    confidence: 'high',
  },
  appointment: {
    revisedMeaningInLaw: 'The exercise of a right to designate the person or persons who are to take a use, or the selection or designation of a person for an office or place of trust.',
    reason: 'The draft was safe but slightly smoothed over the chancery/use sense. Revised wording preserves Black primary wording while retaining Anderson office/trust comparator context.',
    flags: ['scope_tightened_to_source'],
    confidence: 'high',
  },
  knowledge: {
    revisedMeaningInLaw: 'A state distinguished from belief by the degree of certainty.',
    reason: 'Removed unsupported general "awareness" language and kept the exact Black knowledge/belief distinction.',
    flags: ['unsupported_generalization_removed'],
    confidence: 'medium',
  },
  accord: {
    revisedMeaningInLaw: 'A satisfaction agreed upon between the party injuring and the party injured which, when performed, bars the claim.',
    reason: 'The draft was slightly broad because it referred generally to existing claims or promised acts. Revised wording tracks Black and Anderson accord/satisfaction support more closely.',
    flags: ['scope_tightened_to_source'],
    confidence: 'high',
  },
  capture: {
    revisedMeaningInLaw: 'In international or maritime-law usage, the taking or wresting of property by force, including belligerent or prize-related taking.',
    reason: 'The draft could read as any taking by force. Revised wording keeps the international/maritime and property scope supported by Black and comparator context.',
    flags: ['historically_narrow', 'jurisdiction_or_domain_scope_marker_added'],
    confidence: 'medium',
  },
  exception: {
    revisedMeaningInLaw: 'In practice, a formal objection to the court\'s action during trial, including refusal of a request or overruling of an objection.',
    reason: 'The draft mixed the procedural objection sense with broader exclusion/saving-clause senses. Revised wording keeps Black primary practice scope.',
    flags: ['mixing_separate_legal_senses', 'scope_tightened_to_source'],
    confidence: 'high',
  },
  sedition: {
    revisedMeaningInLaw: 'An insurrectionary movement tending toward treason but lacking an overt act, including attempts by meetings, speeches, or publications to disturb public order.',
    reason: 'The draft was source-supported but ended with a broad "including attempts" phrase. Revised wording keeps the Black treason-adjacent and public-order scope explicit.',
    flags: ['scope_marker_added'],
    confidence: 'medium',
  },
  constraint: {
    revisedMeaningInLaw: 'A restraint.',
    reason: 'The draft was commentary-like because it described Black\'s treatment instead of stating the meaning. Revised wording preserves the exact Black equivalence to restraint.',
    flags: ['source_commentary_like'],
    confidence: 'medium',
  },
  designation: {
    revisedMeaningInLaw: 'In will usage, a description or descriptive expression by which a person or thing is denoted.',
    reason: 'The draft was source-supported but needed a clearer scope marker because Black support is will-specific.',
    flags: ['historically_narrow', 'scope_marker_added'],
    confidence: 'medium',
  },
  embargo: {
    revisedMeaningInLaw: 'A proclamation or order of state, usually in time of war or threatened hostilities, prohibiting the departure or detaining ships or property.',
    reason: 'The draft was safe but modernized the source wording. Revised wording keeps Black\'s state-order and wartime/threatened-hostilities scope while retaining Osborn detention context.',
    flags: ['scope_tightened_to_source'],
    confidence: 'high',
  },
  'accord and satisfaction': {
    revisedMeaningInLaw: 'An agreement to accept substituted performance or payment, together with the satisfaction that extinguishes or bars the original claim.',
    reason: 'The draft was broadly safe, but revised wording makes the two-part accord plus satisfaction structure explicit and source-grounded.',
    flags: ['scope_tightened_to_source'],
    confidence: 'medium',
  },
});

const flaggedApprovals = Object.freeze({
  amendment: {
    reason: 'Approved. Black directly supports correction of an error in process, pleading, or proceeding; Osborn confirms correction-of-error context.',
    flags: [],
    confidence: 'high',
  },
  assent: {
    reason: 'Approved. Wording tracks Black compliance, approval, and declared willingness language; Anderson comparator context is consistent.',
    flags: [],
    confidence: 'high',
  },
  abduction: {
    reason: 'Approved with criminal-law scope marker already present. Black, Anderson, and Osborn support taking away by fraud, persuasion, or violence.',
    flags: ['historically_narrow_scope_preserved'],
    confidence: 'high',
  },
  separation: {
    reason: 'Approved with matrimonial-law scope marker already present; does not broaden to general separation.',
    flags: ['historically_narrow_scope_preserved'],
    confidence: 'medium',
  },
  competency: {
    reason: 'Approved with evidence-law scope marker already present; does not broaden to general competence.',
    flags: ['historically_narrow_scope_preserved'],
    confidence: 'medium',
  },
  deprivation: {
    reason: 'Approved with English ecclesiastical-law scope marker already present; historically narrow support is not broadened.',
    flags: ['historically_narrow_scope_preserved'],
    confidence: 'medium',
  },
  restriction: {
    reason: 'Approved with registered-land scope marker already present; historically narrow support is not broadened.',
    flags: ['historically_narrow_scope_preserved'],
    confidence: 'medium',
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

function buildReviewRecord(record) {
  const revision = revisionPlan[record.normalizedTerm] ?? revisionPlan[record.term];
  if (revision) {
    return {
      term: record.term,
      normalizedTerm: record.normalizedTerm,
      reviewDecision: 'revise',
      oldWording: record.draftMeaningInLaw,
      revisedWording: revision.revisedMeaningInLaw,
      reason: revision.reason,
      sourceBasisRetained: record.sourceBasis,
      writebackEligibility: true,
      confidence: revision.confidence,
      flags: revision.flags,
      sourceReferenceCount: record.sourceReferences.length,
      comparatorUsed: record.comparatorUsed,
      comparatorsUsed: record.comparatorsUsed,
      provenancePointers: record.provenancePointers,
      boundaryDisciplineNote: 'Wording review only; pre-writeback candidate, no live vocabulary mutation, no runtime ontology admission, no resolver change, no alias fan-out.',
    };
  }

  const flaggedApproval = flaggedApprovals[record.normalizedTerm] ?? flaggedApprovals[record.term];
  return {
    term: record.term,
    normalizedTerm: record.normalizedTerm,
    reviewDecision: 'approve',
    oldWording: record.draftMeaningInLaw,
    revisedWording: null,
    reason: flaggedApproval?.reason
      ?? 'Approved. Draft wording fits exact Black primary support and declared comparator context without obvious overreach.',
    sourceBasisRetained: record.sourceBasis,
    writebackEligibility: true,
    confidence: flaggedApproval?.confidence ?? (record.weakOrHistoricallyNarrow ? 'medium' : 'high'),
    flags: flaggedApproval?.flags ?? (record.weakOrHistoricallyNarrow ? ['historically_narrow_scope_preserved'] : []),
    sourceReferenceCount: record.sourceReferences.length,
    comparatorUsed: record.comparatorUsed,
    comparatorsUsed: record.comparatorsUsed,
    provenancePointers: record.provenancePointers,
    boundaryDisciplineNote: 'Wording review only; pre-writeback candidate, no live vocabulary mutation, no runtime ontology admission, no resolver change, no alias fan-out.',
  };
}

function buildRevisedDraft(record, reviewRecord) {
  return {
    ...record,
    reviewDecision: reviewRecord.reviewDecision,
    reviewedMeaningInLaw: reviewRecord.revisedWording ?? reviewRecord.oldWording,
    revisedMeaningInLaw: reviewRecord.revisedWording,
    reviewReason: reviewRecord.reason,
    reviewConfidence: reviewRecord.confidence,
    reviewFlags: reviewRecord.flags,
    writebackEligibility: reviewRecord.writebackEligibility,
    preWritebackStatus: 'PRE_WRITEBACK_REVIEW_ONLY',
    boundaryDisciplineNote: 'Reviewed draft only; no writeback has been applied, no live vocabulary data changed, no runtime ontology admission, no concept packet change, no resolver change, and no alias fan-out.',
  };
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

function buildMarkdown(reviewArtifact) {
  const rows = reviewArtifact.records.map((record) => [
    record.term,
    record.reviewDecision,
    record.oldWording,
    record.revisedWording ?? '',
    record.reason,
    record.sourceBasisRetained,
    record.writebackEligibility,
  ]);

  const revisedRows = reviewArtifact.records
    .filter((record) => record.reviewDecision === 'revise')
    .map((record) => [
      record.term,
      record.oldWording,
      record.revisedWording,
      record.reason,
    ]);

  return [
    '# Batch 006 Wording Review',
    '',
    'Scope: review-only wording quality pass for the 48 Batch 006 draft candidates. This report does not modify the live vocabulary dataset, runtime ontology, concept packets, resolver behavior, aliases, skipped terms, or existing meaningInLaw text.',
    '',
    '## Counts',
    '',
    `- Total reviewed: ${reviewArtifact.summary.totalReviewed}`,
    `- Approved: ${reviewArtifact.summary.approvedCount}`,
    `- Revised: ${reviewArtifact.summary.revisedCount}`,
    `- Rejected: ${reviewArtifact.summary.rejectedCount}`,
    `- Writeback eligible after review: ${reviewArtifact.summary.writebackEligibleCount}`,
    `- Existing skipped terms left skipped: ${reviewArtifact.summary.skippedTermsLeftUnchanged}`,
    '',
    '## Decision Table',
    '',
    markdownTable(
      ['Term', 'Decision', 'Old wording', 'Revised wording', 'Reason', 'Source basis retained', 'Writeback eligibility'],
      rows,
    ),
    '',
    '## Revised Wording',
    '',
    revisedRows.length > 0
      ? markdownTable(['Term', 'Old wording', 'Revised wording', 'Boundary reason'], revisedRows)
      : 'No revisions required.',
    '',
    '## Rejected',
    '',
    reviewArtifact.summary.rejectedCount > 0
      ? markdownTable(
        ['Term', 'Reason'],
        reviewArtifact.records
          .filter((record) => record.reviewDecision === 'reject')
          .map((record) => [record.term, record.reason]),
      )
      : 'No draft candidates rejected in this wording review.',
    '',
    '## Boundary Notes',
    '',
    '- Black remains the primary source for every reviewed candidate.',
    '- Anderson and Osborn were used only as comparator context.',
    '- Historically narrow terms were approved or revised only with scope markers.',
    '- Skipped terms were not converted into drafts.',
    '- This is pre-writeback review only; writeback was not applied.',
    '',
  ].join('\n');
}

function buildReview() {
  const draftRecords = readJson(inputPaths.draftBatch);
  const skippedRecords = readJson(inputPaths.skippedReport);
  const writebackNotApplied = readJson(inputPaths.writebackNotApplied);
  const reviewRecords = draftRecords.map(buildReviewRecord);
  const revisedDrafts = draftRecords
    .map((record) => buildRevisedDraft(
      record,
      reviewRecords.find((reviewRecord) => reviewRecord.term === record.term),
    ))
    .filter((record) => record.writebackEligibility);

  const approvedCount = reviewRecords.filter((record) => record.reviewDecision === 'approve').length;
  const revisedCount = reviewRecords.filter((record) => record.reviewDecision === 'revise').length;
  const rejectedCount = reviewRecords.filter((record) => record.reviewDecision === 'reject').length;

  return {
    batchId: 'batch_006_sixth_50',
    mode: 'wording_review_only',
    writebackExecuted: false,
    sourceFiles: inputPaths,
    summary: {
      totalReviewed: reviewRecords.length,
      approvedCount,
      revisedCount,
      rejectedCount,
      writebackEligibleCount: revisedDrafts.length,
      skippedTermsLeftUnchanged: skippedRecords.length,
      originalWritebackPlaceholderStatus: writebackNotApplied.status,
      originalWritebackExecuted: writebackNotApplied.writebackExecuted,
    },
    records: reviewRecords,
    skippedTermsNotReviewedAsDrafts: skippedRecords.map((record) => ({
      term: record.term,
      reason: record.draftReason,
      status: 'left_skipped',
    })),
    boundaryDisciplineNote: 'Review artifacts only. No writeback, no live vocabulary mutation, no runtime ontology change, no concept packet change, no resolver change, no aliases added, and no skipped terms converted to drafts.',
  };
}

function main() {
  fs.mkdirSync(reviewRoot, { recursive: true });
  const reviewArtifact = buildReview();
  const draftRecords = readJson(inputPaths.draftBatch);
  const revisedDrafts = draftRecords
    .map((record) => buildRevisedDraft(
      record,
      reviewArtifact.records.find((reviewRecord) => reviewRecord.term === record.term),
    ))
    .filter((record) => record.writebackEligibility);

  writeJson(outputPaths.reviewJson, reviewArtifact);
  writeJson(outputPaths.revisedDraftsPreWriteback, revisedDrafts);
  fs.writeFileSync(outputPaths.reviewMarkdown, buildMarkdown(reviewArtifact), 'utf8');

  Object.values(outputPaths).forEach((filePath) => {
    process.stdout.write(`Wrote ${toWindowsPath(filePath)}\n`);
  });
  process.stdout.write(`Approved: ${reviewArtifact.summary.approvedCount}\n`);
  process.stdout.write(`Revised: ${reviewArtifact.summary.revisedCount}\n`);
  process.stdout.write(`Rejected: ${reviewArtifact.summary.rejectedCount}\n`);
}

main();
