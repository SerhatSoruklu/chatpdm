'use strict';

const fs = require('node:fs');
const path = require('node:path');

const workspaceRoot = '/mnt/c/Users/coupy/Desktop/vocabulary-reference-lexicons';
const multiSourceReportsRoot = path.join(
  workspaceRoot,
  'vocabulary_reference_lexicons/multi_source/reports',
);

const inputPaths = Object.freeze({
  candidates: path.join(multiSourceReportsRoot, 'comparator_draft_revision_candidates_v2.json'),
  deferred: path.join(multiSourceReportsRoot, 'comparator_draft_revision_deferred_v2.json'),
});

const outputPaths = Object.freeze({
  approved: path.join(multiSourceReportsRoot, 'comparator_draft_revision_v2_approved.json'),
  revise: path.join(multiSourceReportsRoot, 'comparator_draft_revision_v2_revise.json'),
  rejected: path.join(multiSourceReportsRoot, 'comparator_draft_revision_v2_rejected.json'),
  decisionsMarkdown: path.join(multiSourceReportsRoot, 'comparator_draft_revision_v2_review_decisions.md'),
});

const PRIORITY_ORDER = Object.freeze([
  'probation',
  'debenture',
  'bequest',
  'employment',
  'pardon',
  'ward',
  'security',
  'occupancy',
  'premium',
  'condonation',
  'heir',
  'marriage',
  'amnesty',
  'arrest',
  'deceit',
  'default',
  'injunction',
  'release',
  'treason',
  'trial',
]);

const APPROVALS = Object.freeze({
  adjudication: 'Short and source-safe; Anderson and Osborn support judicial determination or order language.',
  affidavit: 'Short and source-safe; Osborn gives direct oath/deponent support and the wording avoids raw extraction noise.',
  agent: 'Source-fit agency wording; it keeps authority or employment to act for another central.',
  allocation: 'Osborn gives direct appropriation-of-fund support, making the revision safer than the narrow exchequer-only current wording.',
  appeal: 'Source-safe appellate review wording; Osborn supports bringing a decision before another court for correction.',
  apportionment: 'Short proportional-division wording directly supported by Osborn.',
  arrest: 'Narrower and safer than the current seizing/stopping wording; Osborn supports deprivation of liberty under lawful authority.',
  bailee: 'Directly supported by Black, Anderson, and Osborn; the entrusted-possession wording is bounded.',
  bailment: 'Source-safe personal-property delivery wording; the return/account duty is a cautious bailment constraint.',
  condonation: 'Boundary-safe matrimonial wording; it preserves the historical narrowness signaled by comparator support.',
  debt: 'Short and safer than generic obligation language; Anderson supports debt as what is owed and as a liquidated demand.',
  debenture: 'Short and source-safe; Osborn directly supports instrument/security-for-loan wording.',
  deceit: 'Source-safe fraud-by-misrepresentation wording and properly requires misleading injury.',
  default: 'Short and stable; Anderson and Osborn support omission, non-performance, and non-appearance.',
  deposition: 'Source-safe oath/proceeding wording and stays within evidence/procedure.',
  distribution: 'Osborn supports estate division among entitled persons, improving the current general property wording.',
  easement: 'Source-safe property-right wording; Osborn supports servitude and right over another land.',
  election: 'Acceptably bounded as legal choice or selection; it avoids making public-office election the only sense.',
  exhibit: 'Osborn directly supports marked/produced evidence usage; the wording is concrete and procedural.',
  'fee simple': 'Short and source-safe; Anderson supports absolute estate of inheritance in land.',
  foreclosure: 'Source-safe mortgage/redemption wording.',
  franchise: 'Short and historically controlled; Osborn supports royal or sovereign privilege and Anderson supports public grant.',
  fraud: 'Source-safe deceit/false-representation wording that keeps intent and injury/advantage in scope.',
  garnishment: 'Anderson supports warning/citation and attachment of third-party-held money or property.',
  guardian: 'Osborn supports legal right and duty language; wording is bounded to person/property protection or management.',
  heir: 'Short and source-fit; Anderson supports descent by law immediately on death and noisy snippet text is not used.',
  hypothecation: 'Source-safe pledge/security wording with the no-possession limitation preserved.',
  indemnity: 'Anderson supports both compensation and undertaking-to-make-good-loss wording.',
  injunction: 'Short, stable court-order wording directly supported by Osborn and Anderson.',
  intrusion: 'Narrow property-law wording directly supported by Anderson and Osborn.',
  lease: 'Source-safe possession-for-term wording and avoids over-specific estate-duration detail.',
  marriage: 'Source-safe and historically cautious; the wording stays legal and consent/status based.',
  misrepresentation: 'Source-safe false-statement wording that keeps materiality and injury in scope.',
  occupancy: 'Anderson supports possession, actual control, and occupation; removing the older ownerless-property tail improves boundary safety.',
  ownership: 'Source-safe exclusive enjoyment, possession, and dominion wording.',
  premium: 'Source-safe payment/reward wording; it avoids treating insurance as the only sense.',
  process: 'Source-safe procedural writ/court-proceeding wording; noisy Osborn support was excluded from final wording.',
  redemption: 'Source-safe buyback/recovery wording with mortgage-payment context preserved.',
  reprieve: 'Short and source-safe; Anderson and Osborn both support temporary suspension of sentence execution.',
  rescission: 'Source-safe contract cancellation/abrogation wording.',
  restitution: 'Short and stable; Anderson directly supports restoration and return-to-owner meanings.',
  reversion: 'Source-safe future-interest wording tied to the end of a prior estate.',
  sanctuary: 'Historical limitation is explicit and Osborn supports asylum/process-immunity scope.',
  security: 'Source-safe and short; it keeps surety, assurance, indemnity, and instrument support together.',
  sentence: 'Already boundary-safe and source-confirmed; no wording change beyond confirmation is needed.',
  servitude: 'Source-safe property/civil-law wording, with easement/burden scope explicit.',
  succession: 'Source-safe transmission wording; Anderson supports rights and obligations passing to successors.',
  tenure: 'Short, historical land-holding wording directly supported by Anderson.',
  testament: 'Source-safe testamentary disposition wording.',
  transfer: 'Short and source-safe passage or conveyance wording.',
  treason: 'Short and historically grounded; Osborn supports breach of allegiance and Anderson supports offense against government or sovereign.',
  trial: 'Source-safe court/tribunal examination-and-decision wording.',
  warranty: 'Source-safe assurance/covenant wording and broad enough for title, fact, quality, or performance.',
});

const REVISIONS = Object.freeze({
  amnesty: {
    revisedMeaningInLaw: 'A governmental act forgiving or overlooking past offenses, especially in public or international-law contexts.',
    reason: 'The candidate is source-fit but "oblivion" is too archaic for the boundary meaning. Revised wording preserves Anderson and Osborn public-forgiveness support.',
    confidence: 'high',
  },
  bequest: {
    revisedMeaningInLaw: 'A gift of personal property by will, or the clause or thing so given.',
    reason: 'The candidate is safe but loses Anderson and Osborn support for the thing itself so given. Revised wording keeps the established narrow testamentary-property wording.',
    confidence: 'high',
  },
  condition: {
    revisedMeaningInLaw: 'A provision, qualification, event, or circumstance on which an estate, right, duty, or legal effect depends.',
    reason: 'The candidate drops the current qualification sense. Revised wording preserves the existing boundary scope while adding the Osborn provision framing.',
    confidence: 'high',
  },
  employment: {
    revisedMeaningInLaw: 'Occupation, service, or a position involving business or work.',
    reason: 'The candidate over-narrows employment to service for another. Anderson also supports occupation and business position.',
    confidence: 'high',
  },
  pardon: {
    revisedMeaningInLaw: 'An act of legal forgiveness or grace releasing a person from punishment for an offense.',
    reason: 'The candidate is too sovereign-authority specific for the registry wording. Revised wording keeps Anderson act-of-grace and Osborn punishment-release support.',
    confidence: 'high',
  },
  possession: {
    revisedMeaningInLaw: 'Physical detention, custody, or control of property with an accompanying intent, right, or claim to hold it.',
    reason: 'The candidate is source-fit but "right or claim" alone is too narrow. Revised wording keeps Osborn physical detention plus intent and Anderson custody/control support.',
    confidence: 'medium',
  },
  probation: {
    revisedMeaningInLaw: 'In criminal procedure, conditional release or discharge of an offender subject to recognizance, good behavior, or other legal terms.',
    reason: 'The draft is source-fit but "supervision" risks modern expansion from a narrow Osborn probation-of-offenders entry. Revised wording keeps the conditional-release sense.',
    confidence: 'medium',
  },
  release: {
    revisedMeaningInLaw: 'An act or instrument by which a claim, right, interest, restraint, liability, or confinement is discharged or surrendered.',
    reason: 'The candidate improperly drops confinement/release-from-restraint support. Revised wording keeps the existing boundary span while tightening the discharge/surrender phrasing.',
    confidence: 'high',
  },
  submission: {
    revisedMeaningInLaw: 'The placing of a dispute, question, or matter before another for decision, especially by agreement to arbitration.',
    reason: 'The candidate is safe but "person or tribunal" is broader than needed. Revised wording keeps Osborn arbitration support without overbuilding institutional scope.',
    confidence: 'medium',
  },
  witness: {
    revisedMeaningInLaw: 'A person who gives evidence in a proceeding, has knowledge of an event, or attests a legal instrument.',
    reason: 'The candidate loses the current knowledge and attestation senses. Revised wording keeps Osborn court-evidence support and existing attestation scope.',
    confidence: 'medium',
  },
});

const REJECTIONS = Object.freeze({});

const HIGHEST_RISK_TERMS = Object.freeze([
  'probation',
  'allocation',
  'condonation',
  'sanctuary',
  'servitude',
  'submission',
  'process',
  'marriage',
  'succession',
]);

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
  return String(value ?? '')
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/[.,;:]+$/g, '')
    .trim()
    .replace(/\s+/g, ' ');
}

function proposedMeaning(candidate) {
  return candidate.proposedDraftMeaningInLaw ?? candidate.proposedRevisedMeaningInLaw;
}

function prioritySort(left, right) {
  const leftIndex = PRIORITY_ORDER.indexOf(normalizeForComparison(left.term));
  const rightIndex = PRIORITY_ORDER.indexOf(normalizeForComparison(right.term));
  const leftPriority = leftIndex === -1 ? Number.POSITIVE_INFINITY : leftIndex;
  const rightPriority = rightIndex === -1 ? Number.POSITIVE_INFINITY : rightIndex;

  return leftPriority - rightPriority || left.term.localeCompare(right.term);
}

function baseReviewRecord(candidate) {
  return {
    term: candidate.term,
    normalizedTerm: candidate.normalizedTerm,
    currentStatus: candidate.currentStatus,
    currentMeaning: candidate.currentMeaning,
    comparatorDecisionType: candidate.comparatorDecisionType,
    sourceBasis: candidate.sourceBasis,
    draftMeaningInLaw: proposedMeaning(candidate),
    blackSupportSummary: candidate.blackSupportSummary,
    andersonSupportSummary: candidate.andersonSupportSummary,
    osbornSupportSummary: candidate.osbornSupportSummary,
    sourceProvenancePointers: candidate.provenancePointers,
    osbornComparisonFlags: candidate.osbornComparisonFlags,
    osbornContradictsOrNarrowsAnderson: candidate.osbornContradictsOrNarrowsAnderson,
    osbornNoisySnippetCount: candidate.osbornNoisySnippetCount,
    osbornNoisySnippetsExcludedFromWording: candidate.osbornNoisySnippetsExcludedFromWording,
    family: candidate.family,
    bucket: candidate.bucket,
    riskTier: candidate.riskTier,
    aliasCaution: candidate.aliasCaution,
    boundaryDisciplineNote: 'Review decision only; no meaning authored, no writeback, no live dataset change, no vocabulary boundary source change, no meaning-source storage change, no runtime ontology change, no concept packet change, no alias fan-out, exact-term provenance only.',
  };
}

function reviewCandidate(candidate) {
  const normalized = normalizeForComparison(candidate.term);
  const approvalReason = APPROVALS[normalized];
  const revision = REVISIONS[normalized];
  const rejectionReason = REJECTIONS[normalized];

  if (approvalReason) {
    return {
      ...baseReviewRecord(candidate),
      reviewDecision: 'approve',
      reviewReason: approvalReason,
      revisedMeaningInLaw: null,
      confidence: HIGHEST_RISK_TERMS.includes(normalized) ? 'medium' : 'high',
      writebackEligibleAfterPreview: true,
    };
  }

  if (revision) {
    return {
      ...baseReviewRecord(candidate),
      reviewDecision: 'revise',
      reviewReason: revision.reason,
      revisedMeaningInLaw: revision.revisedMeaningInLaw,
      confidence: revision.confidence,
      writebackEligibleAfterPreview: true,
    };
  }

  return {
    ...baseReviewRecord(candidate),
    reviewDecision: 'reject',
    reviewReason: rejectionReason ?? 'No source-safe approval or revision rule was available for this candidate; keep it out of writeback.',
    revisedMeaningInLaw: null,
    confidence: 'low',
    writebackEligibleAfterPreview: false,
  };
}

function markdownCell(value) {
  return String(value ?? '').replaceAll('|', '\\|').replace(/\s+/g, ' ').trim();
}

function markdownTable(headers, rows) {
  return [
    `| ${headers.map(markdownCell).join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.map(markdownCell).join(' | ')} |`),
  ].join('\n');
}

function countBy(records, key) {
  return records.reduce((counts, record) => {
    const value = record[key] ?? 'unknown';
    counts[value] = (counts[value] ?? 0) + 1;
    return counts;
  }, {});
}

function buildDecisionMarkdown(report) {
  const approvalRows = report.approved.map((record) => [
    record.term,
    record.comparatorDecisionType,
    record.sourceBasis,
    record.draftMeaningInLaw,
  ]);
  const reviseRows = report.revise.map((record) => [
    record.term,
    record.draftMeaningInLaw,
    record.revisedMeaningInLaw,
    record.reviewReason,
  ]);
  const rejectedRows = report.rejected.map((record) => [
    record.term,
    record.reviewReason,
  ]);
  const highRiskRows = report.highestRiskApprovedOrRevised.map((record) => [
    record.term,
    record.reviewDecision,
    record.sourceBasis,
    record.reviewReason,
  ]);

  return [
    '<!-- markdownlint-disable MD013 -->',
    '',
    '# Comparator Draft / Revision V2 Review Decisions',
    '',
    'Status: REVIEW_ONLY_NOT_APPLIED. No live vocabulary dataset was modified, no existing meaning text was changed, no vocabulary boundary source was modified, no vocabulary meaning-source storage was modified, no runtime ontology or concept packets were changed, no writeback was applied, and no alias fan-out was performed.',
    '',
    '## Counts',
    '',
    `- Reviewed candidates: ${report.counts.reviewedCandidateCount}`,
    `- Approved: ${report.counts.approvedCount}`,
    `- Require revision: ${report.counts.reviseCount}`,
    `- Rejected: ${report.counts.rejectedCount}`,
    `- Deferred kept out of writeback: ${report.counts.deferredInputCount}`,
    `- Osborn noisy snippet candidates kept out of wording: ${report.counts.osbornNoisySnippetCandidates}`,
    '',
    '## Source Basis Counts',
    '',
    markdownTable(['Source basis', 'Count'], Object.entries(report.counts.bySourceBasis).map(([basis, count]) => [basis, count])),
    '',
    '## Highest Risk Approved Or Revised',
    '',
    highRiskRows.length > 0
      ? markdownTable(['Term', 'Decision', 'Source basis', 'Reason'], highRiskRows)
      : 'No higher-risk approved or revised terms were identified.',
    '',
    '## Approved',
    '',
    approvalRows.length > 0
      ? markdownTable(['Term', 'Type', 'Source basis', 'Approved wording'], approvalRows)
      : 'No candidates approved as written.',
    '',
    '## Require Revision',
    '',
    reviseRows.length > 0
      ? markdownTable(['Term', 'Candidate wording', 'Revised wording', 'Reason'], reviseRows)
      : 'No candidates require revision.',
    '',
    '## Rejected',
    '',
    rejectedRows.length > 0
      ? markdownTable(['Term', 'Reason'], rejectedRows)
      : 'No candidates rejected.',
    '',
    '## Recommendation',
    '',
    '- Build a NOT_APPLIED comparator v2 writeback preview only from approved plus revised comparator records.',
    '- Keep deferred and rejected rows out of writeback.',
    '- Preserve exact Black, Anderson, and Osborn provenance in the preview candidate set.',
    '- Continue excluding noisy Osborn snippets from wording and future UI presentation.',
    '',
    '## Exact Next Prompt',
    '',
    report.exactNextPrompt,
    '',
  ].join('\n');
}

function main() {
  const candidatesReport = readJson(inputPaths.candidates);
  const deferredInput = readJson(inputPaths.deferred);
  const candidates = [
    ...candidatesReport.reopened_draft_candidates,
    ...candidatesReport.revision_review_candidates,
  ];
  const reviewed = candidates.map(reviewCandidate).sort(prioritySort);
  const approved = reviewed.filter((record) => record.reviewDecision === 'approve');
  const revise = reviewed.filter((record) => record.reviewDecision === 'revise');
  const rejected = reviewed.filter((record) => record.reviewDecision === 'reject');
  const highestRiskApprovedOrRevised = reviewed
    .filter((record) => HIGHEST_RISK_TERMS.includes(record.normalizedTerm))
    .sort(prioritySort);
  const exactNextPrompt = 'Task: Build a NOT_APPLIED comparator v2 writeback preview from comparator_draft_revision_v2_approved.json and comparator_draft_revision_v2_revise.json, using revisedMeaningInLaw where present. Do not modify the live vocabulary dataset, do not modify vocabulary-boundary.js, do not modify vocabulary-meaning-sources.generated.json, and produce a diff preview plus validation report for explicit approval.';

  const report = {
    generatedAt: new Date().toISOString(),
    status: 'REVIEW_ONLY_NOT_APPLIED',
    scope: 'Comparator v2 draft/revision review decisions only',
    boundaryDiscipline: {
      liveVocabularyDatasetChanged: false,
      existingMeaningTextChanged: false,
      vocabularyBoundarySourceChanged: false,
      vocabularyMeaningSourcesChanged: false,
      runtimeOntologyChanged: false,
      conceptPacketsChanged: false,
      writebackApplied: false,
      aliasFanOutPerformed: false,
      exactTermProvenanceOnly: true,
      deferredRowsKeptOutOfWriteback: true,
      confirmKeepRecordsRewritten: false,
    },
    counts: {
      reviewedCandidateCount: reviewed.length,
      approvedCount: approved.length,
      reviseCount: revise.length,
      rejectedCount: rejected.length,
      deferredInputCount: deferredInput.length,
      osbornNoisySnippetCandidates: reviewed.filter((record) => record.osbornNoisySnippetCount > 0).length,
      bySourceBasis: countBy(reviewed, 'sourceBasis'),
    },
    highestRiskApprovedOrRevised,
    inputFiles: Object.fromEntries(
      Object.entries(inputPaths).map(([key, filePath]) => [key, toWindowsPath(filePath)]),
    ),
    outputFiles: Object.fromEntries(
      Object.entries(outputPaths).map(([key, filePath]) => [key, toWindowsPath(filePath)]),
    ),
    exactNextPrompt,
    approved,
    revise,
    rejected,
    deferredInput,
  };

  writeJson(outputPaths.approved, approved);
  writeJson(outputPaths.revise, revise);
  writeJson(outputPaths.rejected, rejected);
  fs.writeFileSync(outputPaths.decisionsMarkdown, buildDecisionMarkdown(report), 'utf8');

  Object.values(outputPaths).forEach((filePath) => {
    process.stdout.write(`Wrote ${toWindowsPath(filePath)}\n`);
  });
}

main();
