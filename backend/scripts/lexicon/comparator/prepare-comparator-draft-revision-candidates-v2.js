'use strict';

const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '../../../..');
const workspaceRoot = '/mnt/c/Users/coupy/Desktop/vocabulary-reference-lexicons';
const multiSourceReportsRoot = path.join(
  workspaceRoot,
  'vocabulary_reference_lexicons/multi_source/reports',
);
const datasetPath = path.join(repoRoot, 'data/legal-vocabulary/legal-vocabulary-dataset.txt');

const inputPaths = Object.freeze({
  approvedReopen: path.join(multiSourceReportsRoot, 'comparator_review_v2_approved_reopen.json'),
  approvedRevisionReview: path.join(
    multiSourceReportsRoot,
    'comparator_review_v2_approved_revision_review.json',
  ),
  dataset: datasetPath,
});

const outputPaths = Object.freeze({
  candidatesJson: path.join(multiSourceReportsRoot, 'comparator_draft_revision_candidates_v2.json'),
  summaryMarkdown: path.join(multiSourceReportsRoot, 'comparator_draft_revision_summary_v2.md'),
  deferredJson: path.join(multiSourceReportsRoot, 'comparator_draft_revision_deferred_v2.json'),
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

const HEADER_TO_CLASSIFICATION = Object.freeze({
  'CORE / GOVERNANCE': 'unknown_structure',
  'AUTHORITY / VALIDITY / INSTITUTIONAL STATUS': 'derived',
  'POWER / FORCE / CONTROL': 'derived',
  'DUTY / OBLIGATION / CONSTRAINT': 'derived',
  'FAILURE / BREACH / NONCOMPLIANCE': 'derived',
  'RESPONSIBILITY / ATTRIBUTION / LIABILITY': 'derived',
  'LAW / RULE / SOURCES': 'derived',
  'PROCEDURE / ADJUDICATION': 'procedural',
  'REMEDIES / RESPONSES / OUTCOMES': 'procedural',
  'CONTRACT / AGREEMENT / CONSENSUS': 'derived',
  'PROPERTY / TITLE / POSSESSION': 'carrier',
  'COMMERCE / FINANCE / ALLOCATION': 'carrier',
  'CRIMINAL / PUBLIC ORDER': 'derived',
  'DEFENCES / JUSTIFICATIONS / EXCUSES': 'derived',
  'EVIDENCE / PROOF / EPISTEMIC': 'procedural',
  'STATUS / PERSON / RELATION': 'carrier',
  'LABOR / ORGANIZATIONAL / ASSOCIATIONAL': 'carrier',
  'CONSTITUTIONAL / POLITICAL': 'derived',
  'META / STRESS / EDGE TERMS': 'unknown_structure',
});

const EXPLICIT_CLASSIFICATION_OVERRIDES = Object.freeze({
  claim: 'rejected_candidate',
  defeasibility: 'rejected_candidate',
  enforcement: 'rejected_candidate',
  jurisdiction: 'rejected_candidate',
  liability: 'rejected_candidate',
  obligation: 'rejected_candidate',
});

const REOPEN_DRAFT_PLAN = Object.freeze({
  probation: {
    proposed: 'In criminal procedure, conditional release or discharge of an offender subject to terms such as recognizance, supervision, or good behavior.',
    reason: 'Osborn gives exact-term probation-of-offenders support, allowing a narrow criminal-procedure draft instead of the earlier proof/test wrong sense.',
  },
  debenture: {
    proposed: 'A written instrument, often under seal, issued as security for a loan or acknowledging a debt.',
    reason: 'Osborn supplies direct company/public-body security-for-loan support where the Black reference was too truncated for drafting.',
  },
});

const REVISION_PLAN = Object.freeze({
  adjudication: {
    proposed: 'A judicial determination or order deciding a legal matter.',
    reason: 'Anderson and Osborn support the judicial-decision sense, allowing tighter wording than a generic act of decision.',
  },
  affidavit: {
    proposed: 'A written statement of facts sworn or affirmed before an authorized officer.',
    reason: 'Osborn supplies direct deponent/oath support, while Anderson support remains noisy; the proposed wording keeps the ordinary evidentiary scope.',
  },
  agent: {
    proposed: 'A person authorized or employed to act on behalf of another in a business, legal, or other affair.',
    reason: 'Osborn gives direct agency support; the wording keeps authority-for-another central and avoids broader representative language.',
  },
  allocation: {
    proposed: 'The appropriation of a fund or allowance to particular persons or purposes.',
    reason: 'Osborn supplies the fund-appropriation sense and narrows the historically exchequer-only current wording.',
  },
  amnesty: {
    proposed: 'A governmental act of oblivion or forgiveness for past offenses, especially in public or international-law contexts.',
    reason: 'Anderson and Osborn both support public forgiveness while Anderson cautions that the common-law technical meaning is limited.',
  },
  appeal: {
    proposed: 'A proceeding by which a party brings a decision before a higher court or tribunal for review or correction.',
    reason: 'Osborn supplies direct review-of-erroneous-decision support, improving the current broader request wording.',
  },
  apportionment: {
    proposed: 'Division or assignment of a subject matter into proportionate shares.',
    reason: 'Osborn gives direct division-in-proportion support and fits the existing allocation-family scope.',
  },
  arrest: {
    proposed: 'The deprivation of a person\'s liberty under lawful authority.',
    reason: 'Osborn gives the cleanest exact-term support; the proposed wording removes overly broad stopping or seizing language.',
  },
  bailee: {
    proposed: 'A person to whom possession of goods or personal property is entrusted under a bailment.',
    reason: 'Black, Anderson, and Osborn all support the possession-entrusted sense.',
  },
  bailment: {
    proposed: 'Delivery of personal property to another for custody, service, or another particular purpose, usually with a duty to return or account for it.',
    reason: 'Anderson support is enough for a fuller custody-purpose wording while staying within personal-property bailment scope.',
  },
  bequest: {
    proposed: 'A gift of personal property made by will, or the clause in a will making that gift.',
    reason: 'Anderson and Osborn both support the personal-property-by-will sense; the wording preserves the narrow testamentary scope.',
  },
  condition: {
    proposed: 'A provision, event, or circumstance on which an estate, right, duty, or legal effect depends.',
    reason: 'Osborn supports condition as a provision affecting legal existence or effect, improving scope control.',
  },
  condonation: {
    proposed: 'Conditional forgiveness or remission of a matrimonial offense, with knowledge, treating the marriage as continuing.',
    reason: 'The comparator record flags matrimonial narrowing; the revised wording keeps the term out of generic forgiveness.',
  },
  debt: {
    proposed: 'A sum of money or liquidated demand that is due or owing.',
    reason: 'Anderson supports debt as what one owes and as a liquidated demand; the revision narrows away from vague obligation language.',
  },
  deceit: {
    proposed: 'A fraudulent misrepresentation, device, or artifice by which one person misleads another to that person\'s injury.',
    reason: 'Anderson and Osborn support deceit as fraud or false representation causing injury.',
  },
  default: {
    proposed: 'Failure to appear, pay, perform, or do what a legal duty requires.',
    reason: 'Osborn emphasizes non-appearance while Anderson supports omission and non-performance; the wording keeps both procedural and obligation senses.',
  },
  deposition: {
    proposed: 'A statement or testimony given under oath outside open court and recorded for use in a proceeding.',
    reason: 'Osborn gives direct oath-statement support; the wording remains procedural and evidence-focused.',
  },
  distribution: {
    proposed: 'The division and apportionment of an estate or property among persons entitled to it.',
    reason: 'Osborn supports estate distribution among next of kin, allowing a safer estate-centered wording.',
  },
  easement: {
    proposed: 'A servitude or right enjoyed over another person\'s land, such as a right of way or other use.',
    reason: 'Osborn provides clean servitude/right-over-land support and sharpens the property-right scope.',
  },
  election: {
    proposed: 'A legal choice or selection between persons, rights, remedies, or courses of action.',
    reason: 'Anderson supports choice and selection; the revision avoids making public-office election the only sense.',
  },
  employment: {
    proposed: 'Occupation, service, or a business position involving work or service for another.',
    reason: 'Anderson supplies direct occupation/service support and Osborn adds employment-context support.',
  },
  exhibit: {
    proposed: 'A document or thing produced, identified, and shown as evidence in a proceeding.',
    reason: 'Osborn supplies direct exhibit-by-affidavit support; the wording keeps it evidentiary and concrete.',
  },
  'fee simple': {
    proposed: 'An absolute and unqualified estate of inheritance in land.',
    reason: 'Anderson provides direct absolute-inheritance support, allowing a compact property-law wording.',
  },
  foreclosure: {
    proposed: 'A proceeding or decree that cuts off the mortgagor\'s right to redeem mortgaged property.',
    reason: 'Osborn supplies direct mortgage-debt and redemption support; the wording keeps foreclosure tied to redemption.',
  },
  franchise: {
    proposed: 'A special liberty, privilege, or authority conferred by the sovereign or government.',
    reason: 'Osborn supports franchise as a royal privilege and Anderson supports public grant and eminent-domain related usage.',
  },
  fraud: {
    proposed: 'Intentional deceit, false representation, or other dishonest practice used to obtain an advantage or injure another.',
    reason: 'Osborn gives direct general fraud support, while Anderson reinforces deceitful practice and injury.',
  },
  garnishment: {
    proposed: 'A legal process by which a third party holding another person\'s money or property is warned or required to answer or retain it.',
    reason: 'Anderson supports warning/citation and attachment of money or property held by a third party.',
  },
  guardian: {
    proposed: 'A person with the legal right and duty to protect or manage another person or that person\'s property.',
    reason: 'Osborn supplies direct right-and-duty support, tightening the current broader care/control wording.',
  },
  heir: {
    proposed: 'A person on whom an estate or property right descends by law immediately on another\'s death.',
    reason: 'Anderson supports the common-law descent formulation; noisy repeated-headword text is not used in the wording.',
  },
  hypothecation: {
    proposed: 'A pledge or mortgage of property as security for a debt, generally without transferring possession.',
    reason: 'Anderson and Osborn both support pledge/security wording, with Anderson preserving the no-possession feature.',
  },
  indemnity: {
    proposed: 'Compensation for loss, or an undertaking to make good a loss that may be sustained.',
    reason: 'Anderson supplies direct compensation and engagement-to-make-good-loss support.',
  },
  injunction: {
    proposed: 'A court order requiring a party to do, or refrain from doing, a specified act.',
    reason: 'Osborn gives direct order/decree support and Anderson confirms preventive court-remedy scope.',
  },
  intrusion: {
    proposed: 'In property law, an entry by a stranger into a freehold after a prior estate ends and before the next estate takes effect.',
    reason: 'Anderson and Osborn both support the narrow property-law ouster/freehold sense.',
  },
  lease: {
    proposed: 'A conveyance or grant of possession of property for a term, often in return for rent or other recompense.',
    reason: 'Osborn supplies direct grant-of-possession support; the wording avoids over-specific estate-duration phrasing.',
  },
  marriage: {
    proposed: 'A legally recognized marital relation founded on consent and treated as a civil status or contract.',
    reason: 'Comparator support preserves consent and civil-status framing while keeping the term legal rather than sociological.',
  },
  misrepresentation: {
    proposed: 'A false statement of fact that misleads another, especially where material to legal rights or injury.',
    reason: 'Anderson gives direct false-statement and injury support; Osborn confirms the representation lane.',
  },
  occupancy: {
    proposed: 'Possession, actual control, or occupation of property or premises.',
    reason: 'Anderson supports possession and actual control; the revision removes the older ownerless-property acquisition tail from the current meaning.',
  },
  ownership: {
    proposed: 'The right to exclusive enjoyment, possession, or dominion over a thing.',
    reason: 'Anderson and Osborn both support exclusive right/enjoyment/possession language.',
  },
  pardon: {
    proposed: 'A release by sovereign or public authority from punishment incurred for an offense.',
    reason: 'Osborn provides a clean release-from-punishment formulation, while Anderson supports act-of-grace forgiveness.',
  },
  possession: {
    proposed: 'Physical detention, custody, or control of property with an accompanying right or claim to hold it.',
    reason: 'Osborn supports physical detention plus intent, while Anderson supports custody and control.',
  },
  premium: {
    proposed: 'A reward, recompense, price, or sum paid or payable, including as consideration for insurance.',
    reason: 'Anderson and Osborn support payment/reward senses without limiting the term to insurance.',
  },
  process: {
    proposed: 'A writ or other court proceeding used to compel appearance, action, or response in a legal cause.',
    reason: 'Osborn supplies direct court-proceeding support; the wording keeps process procedural.',
  },
  redemption: {
    proposed: 'The act or right of buying back or recovering property by payment or performance, especially by paying a mortgage debt.',
    reason: 'Anderson and Osborn both support mortgage redemption and repurchase/recovery wording.',
  },
  release: {
    proposed: 'An act or instrument by which a claim, right, interest, restraint, or liability is discharged or surrendered.',
    reason: 'Comparator support includes conveyancing and discharge senses; the wording avoids treating release only as confinement.',
  },
  reprieve: {
    proposed: 'A temporary suspension of the execution of a sentence.',
    reason: 'Anderson and Osborn both support suspension of sentence execution, especially criminal punishment.',
  },
  rescission: {
    proposed: 'The abrogation, cancellation, or revocation of a contract or transaction.',
    reason: 'Osborn supplies direct abrogation/revocation support and Anderson supports contract cancellation context.',
  },
  restitution: {
    proposed: 'Restoration of a person, thing, right, or condition to its former owner, position, or state.',
    reason: 'Anderson provides direct restoration-to-former-condition and return-to-owner support.',
  },
  reversion: {
    proposed: 'A future interest remaining in a grantor or the grantor\'s heirs after a prior estate ends.',
    reason: 'Anderson and Osborn both support return of land or estate after the limited estate ends.',
  },
  sanctuary: {
    proposed: 'In old law, a privileged or consecrated place of asylum where ordinary process could not be executed.',
    reason: 'Osborn supplies the consecrated-place and process-immunity scope; the wording keeps the historical limitation explicit.',
  },
  security: {
    proposed: 'A surety, assurance, indemnity, or instrument furnished to secure payment, performance, or another obligation.',
    reason: 'Anderson supports surety and payment/performance instruments; Osborn gives additional exact-term confirmation.',
  },
  sentence: {
    proposed: 'The judgment formally pronounced by a court, especially after conviction in a criminal case.',
    reason: 'Osborn gives direct judgment-of-court support and preserves the criminal-judgment emphasis.',
  },
  servitude: {
    proposed: 'In property or civil-law usage, a burden or easement attached to property for another estate or person.',
    reason: 'Osborn identifies servitude with easement while preserving civil-law burden context.',
  },
  submission: {
    proposed: 'The placing of a dispute, question, or matter before another person or tribunal for decision, especially by agreement to arbitration.',
    reason: 'Osborn provides direct arbitration-submission support and keeps the term procedural.',
  },
  succession: {
    proposed: 'The transmission or taking of property, rights, duties, or legal position from one person to another.',
    reason: 'Anderson and Osborn both support rights/property passing on death or transfer of position.',
  },
  tenure: {
    proposed: 'The manner or system by which land or an estate is held, historically of a superior.',
    reason: 'Anderson supplies direct mode-of-holding support and preserves the land-tenure limitation.',
  },
  testament: {
    proposed: 'A will or testamentary disposition directing the disposition of property after death.',
    reason: 'Anderson supports testament as authenticated instructions for disposition of effects after death.',
  },
  transfer: {
    proposed: 'The passing or conveyance of a right, property, or interest from one person to another.',
    reason: 'Osborn gives clean passage-of-right support and Anderson supports conveyance context.',
  },
  treason: {
    proposed: 'Breach of allegiance or an offense against the government or sovereign to whom allegiance is owed.',
    reason: 'Osborn gives direct breach-of-allegiance support and Anderson supports offense-against-government scope.',
  },
  trial: {
    proposed: 'The examination and decision of a matter of law or fact by a competent court or tribunal.',
    reason: 'Osborn supplies direct examination-and-decision support; the wording is compact and procedural.',
  },
  warranty: {
    proposed: 'A guaranty, assurance, covenant, or stipulation concerning title, quality, quantity, fact, or performance.',
    reason: 'Osborn provides guaranty/assurance support and Anderson supports covenant/stipulation usage.',
  },
  witness: {
    proposed: 'A person who gives evidence in a proceeding or attests a legal instrument.',
    reason: 'Osborn supplies direct viva voce court-statement support while the wording preserves attestation usage.',
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
  return String(value ?? '')
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/[.,;:]+$/g, '')
    .trim()
    .replace(/\s+/g, ' ');
}

function normalizeFamily(value) {
  return String(value ?? '')
    .toLowerCase()
    .split('/')
    .map((segment) => segment.trim().replace(/\s+/g, ' '))
    .join(' / ');
}

function normalizeSurface(value) {
  return String(value ?? '').toLowerCase().replace(/[_-]+/g, ' ').trim().replace(/\s+/g, ' ');
}

function parseHeader(line) {
  const match = /^\[(.+)]$/.exec(line);
  return match ? match[1] : null;
}

function toRepoRelativePath(filePath) {
  return path.relative(repoRoot, filePath);
}

function buildDatasetTargetIndex() {
  const lines = fs.readFileSync(datasetPath, 'utf8').split(/\r?\n/);
  const targetsByNormalizedTerm = new Map();
  let activeHeader = null;
  let activeClassification = null;

  lines.forEach((rawLine, index) => {
    const lineNumber = index + 1;
    const trimmed = rawLine.trim();
    if (!trimmed) {
      return;
    }

    const header = parseHeader(trimmed);
    if (header) {
      activeHeader = header;
      activeClassification = HEADER_TO_CLASSIFICATION[header] ?? null;
      return;
    }

    if (!activeHeader || !activeClassification) {
      return;
    }

    const normalized = normalizeForComparison(trimmed);
    const forms = new Set([normalized]);
    if (trimmed.includes('_')) {
      forms.add(normalizeForComparison(trimmed.replaceAll('_', ' ')));
    }

    forms.forEach((form) => {
      if (!targetsByNormalizedTerm.has(form)) {
        targetsByNormalizedTerm.set(form, []);
      }
      targetsByNormalizedTerm.get(form).push({
        datasetPath: toRepoRelativePath(datasetPath),
        datasetWindowsPath: toWindowsPath(datasetPath),
        lineNumber,
        rawDatasetTerm: trimmed,
        familyHeader: activeHeader,
        classification: EXPLICIT_CLASSIFICATION_OVERRIDES[normalized.replaceAll(' ', '_')]
          ?? EXPLICIT_CLASSIFICATION_OVERRIDES[normalized]
          ?? activeClassification,
      });
    });
  });

  return targetsByNormalizedTerm;
}

function chooseExactTarget(record, targets) {
  const familyMatches = targets.filter((target) => (
    normalizeFamily(target.familyHeader) === normalizeFamily(record.family)
    && target.classification === record.bucket
  ));
  const exactSurfaceMatches = familyMatches.filter((target) => (
    normalizeSurface(target.rawDatasetTerm) === normalizeSurface(record.term)
  ));

  return {
    selectedTarget: exactSurfaceMatches.length === 1 ? exactSurfaceMatches[0] : null,
    targetDatasetMappings: exactSurfaceMatches,
    familyBucketMappings: familyMatches,
    alternateDatasetMappings: targets.filter((target) => !exactSurfaceMatches.includes(target)),
  };
}

function exactTargetGuard(record, targetIndex) {
  const targets = targetIndex.get(normalizeForComparison(record.term)) ?? [];
  const targetChoice = chooseExactTarget(record, targets);

  if (targetChoice.targetDatasetMappings.length === 1) {
    return {
      ok: true,
      targetChoice,
      reason: null,
    };
  }

  return {
    ok: false,
    targetChoice,
    reason: `Deferred by upstream exact-target guard: expected exactly one selected exact dataset row, found ${targetChoice.targetDatasetMappings.length}.`,
  };
}

function prioritySort(left, right) {
  const leftIndex = PRIORITY_ORDER.indexOf(normalizeForComparison(left.term));
  const rightIndex = PRIORITY_ORDER.indexOf(normalizeForComparison(right.term));
  const leftPriority = leftIndex === -1 ? Number.POSITIVE_INFINITY : leftIndex;
  const rightPriority = rightIndex === -1 ? Number.POSITIVE_INFINITY : rightIndex;

  return leftPriority - rightPriority || left.term.localeCompare(right.term);
}

function compactSupportSummary(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function hasNoisyOsborn(record) {
  return Number(record.osbornNoisySnippetCount ?? 0) > 0;
}

function baseCandidate(record, comparatorDecisionType, plan) {
  return {
    term: record.term,
    normalizedTerm: record.normalizedTerm,
    currentStatus: record.currentStatus,
    currentMeaning: record.currentMeaning,
    comparatorDecisionType,
    sourceBasis: record.sourceSupportBasis,
    blackSupportSummary: compactSupportSummary(record.blackSupportSummary),
    andersonSupportSummary: compactSupportSummary(record.andersonSupportSummary),
    osbornSupportSummary: compactSupportSummary(record.osbornSupportSummary),
    conciseReasonForProposedWording: plan.reason,
    provenancePointers: {
      black: record.sourceProvenancePointers.black,
      anderson: record.sourceProvenancePointers.anderson,
      osborn: record.sourceProvenancePointers.osborn,
    },
    osbornComparisonFlags: record.osbornComparisonFlags,
    osbornContradictsOrNarrowsAnderson: record.osbornContradictsOrNarrowsAnderson,
    osbornNoisySnippetCount: record.osbornNoisySnippetCount,
    osbornNoisySnippetsExcludedFromWording: hasNoisyOsborn(record),
    family: record.family,
    bucket: record.bucket,
    riskTier: record.riskTier,
    aliasCaution: record.aliasCaution,
    targetGuard: record.targetGuard ?? null,
    reviewDecisionSource: record.decision,
    reviewDecisionReason: record.reason,
    boundaryDisciplineNote: 'Draft/revision preparation only; not applied, no live vocabulary dataset change, no vocabulary boundary source change, no meaning-source storage change, no runtime ontology change, no concept packet change, no alias fan-out, exact-term provenance only.',
  };
}

function buildReopenCandidate(record) {
  const plan = REOPEN_DRAFT_PLAN[normalizeForComparison(record.term)];
  if (!plan) {
    return null;
  }

  return {
    ...baseCandidate(record, 'reopen_draft', plan),
    proposedDraftMeaningInLaw: plan.proposed,
    proposedRevisedMeaningInLaw: null,
  };
}

function buildRevisionCandidate(record) {
  const plan = REVISION_PLAN[normalizeForComparison(record.term)];
  if (!plan) {
    return null;
  }

  return {
    ...baseCandidate(record, 'revision_review', plan),
    proposedDraftMeaningInLaw: null,
    proposedRevisedMeaningInLaw: plan.proposed,
  };
}

function buildDeferred(record, sourceSet, reason) {
  return {
    term: record.term,
    normalizedTerm: record.normalizedTerm,
    currentStatus: record.currentStatus,
    currentMeaning: record.currentMeaning,
    comparatorDecisionType: sourceSet,
    decision: 'deferred',
    sourceBasis: record.sourceSupportBasis,
    reason,
    blackSupportSummary: compactSupportSummary(record.blackSupportSummary),
    andersonSupportSummary: compactSupportSummary(record.andersonSupportSummary),
    osbornSupportSummary: compactSupportSummary(record.osbornSupportSummary),
    provenancePointers: {
      black: record.sourceProvenancePointers.black,
      anderson: record.sourceProvenancePointers.anderson,
      osborn: record.sourceProvenancePointers.osborn,
    },
    osbornComparisonFlags: record.osbornComparisonFlags,
    osbornContradictsOrNarrowsAnderson: record.osbornContradictsOrNarrowsAnderson,
    osbornNoisySnippetCount: record.osbornNoisySnippetCount,
    family: record.family,
    bucket: record.bucket,
    riskTier: record.riskTier,
    aliasCaution: record.aliasCaution,
    targetGuard: record.targetGuard ?? null,
    boundaryDisciplineNote: 'Deferred from comparator draft/revision preparation; no authoring or writeback applied, no alias fan-out.',
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

function buildSummaryMarkdown(report) {
  const reopenRows = report.reopened_draft_candidates.map((candidate) => [
    candidate.term,
    candidate.sourceBasis,
    candidate.proposedDraftMeaningInLaw,
    candidate.conciseReasonForProposedWording,
  ]);
  const revisionRows = report.revision_review_candidates.map((candidate) => [
    candidate.term,
    candidate.sourceBasis,
    candidate.currentMeaning,
    candidate.proposedRevisedMeaningInLaw,
  ]);
  const deferredRows = report.deferred.map((record) => [
    record.term,
    record.comparatorDecisionType,
    record.sourceBasis,
    record.reason,
  ]);
  const strongestRows = report.strongestFirstReview.map((record) => [
    record.term,
    record.comparatorDecisionType,
    record.sourceBasis,
  ]);
  const sourceBasisRows = Object.entries(report.counts.bySourceBasis).map(([basis, count]) => [basis, count]);

  return [
    '<!-- markdownlint-disable MD013 -->',
    '',
    '# Comparator Draft / Revision Candidates V2',
    '',
    'Status: DRAFT_REVIEW_PREPARATION_ONLY. No live vocabulary dataset was modified, no existing meaning text was changed, no vocabulary boundary source was modified, no vocabulary meaning-source storage was modified, no runtime ontology or concept packets were changed, no writeback was applied, and no alias fan-out was performed.',
    '',
    '## Inputs',
    '',
    `- Approved reopen: ${report.inputFiles.approvedReopen}`,
    `- Approved revision review: ${report.inputFiles.approvedRevisionReview}`,
    '',
    '## Counts',
    '',
    `- Reopen draft candidates: ${report.counts.reopenedDraftCandidateCount}`,
    `- Revision-review candidates: ${report.counts.revisionReviewCandidateCount}`,
    `- Deferred terms: ${report.counts.deferredCount}`,
    `- Exact-target guard deferred: ${report.counts.exactTargetGuardDeferredCount}`,
    `- Osborn noisy snippets excluded from wording: ${report.counts.osbornNoisySnippetCandidates}`,
    '',
    '## Source Basis Counts',
    '',
    markdownTable(['Source basis', 'Count'], sourceBasisRows),
    '',
    '## Reopened Draft Candidates',
    '',
    reopenRows.length > 0
      ? markdownTable(['Term', 'Source basis', 'Proposed draft meaning', 'Reason'], reopenRows)
      : 'No reopen draft candidates were prepared.',
    '',
    '## Revision Review Candidates',
    '',
    revisionRows.length > 0
      ? markdownTable(['Term', 'Source basis', 'Current meaning', 'Proposed revised meaning'], revisionRows)
      : 'No revision-review candidates were prepared.',
    '',
    '## Deferred',
    '',
    deferredRows.length > 0
      ? markdownTable(['Term', 'Comparator type', 'Source basis', 'Reason'], deferredRows)
      : 'No terms were deferred.',
    '',
    '## Strongest First Review',
    '',
    markdownTable(['Term', 'Comparator type', 'Source basis'], strongestRows),
    '',
    '## Recommendation',
    '',
    '- Review only the reopen and revision candidates before any writeback preview.',
    '- Keep deferred terms out of writeback until a narrower exact-source plan is available.',
    '- Batch 006 can continue in parallel because this packet is draft/review preparation only.',
    '- Preserve exact source/page provenance and keep alias rows explicit-only.',
    '',
    '## Exact Next Prompt',
    '',
    report.exactNextPrompt,
    '',
  ].join('\n');
}

function main() {
  const approvedReopen = readJson(inputPaths.approvedReopen);
  const approvedRevisionReview = readJson(inputPaths.approvedRevisionReview);
  const targetIndex = buildDatasetTargetIndex();
  const deferred = [];

  const reopenedDraftCandidates = approvedReopen
    .map((record) => {
      const guard = exactTargetGuard(record, targetIndex);
      const guardedRecord = { ...record, targetGuard: guard.targetChoice };
      const candidate = guard.ok ? buildReopenCandidate(guardedRecord) : null;
      if (!candidate) {
        deferred.push(buildDeferred(
          guardedRecord,
          'reopen_draft',
          guard.reason
            ?? 'Approved for reopen intelligence, but the exact comparator support is still wrong-sense, too narrow, or too thin for a safe draft wording in this pass.',
        ));
      }
      return candidate;
    })
    .filter(Boolean)
    .sort(prioritySort);

  const revisionReviewCandidates = approvedRevisionReview
    .map((record) => {
      const guard = exactTargetGuard(record, targetIndex);
      const guardedRecord = { ...record, targetGuard: guard.targetChoice };
      const candidate = guard.ok ? buildRevisionCandidate(guardedRecord) : null;
      if (!candidate) {
        deferred.push(buildDeferred(
          guardedRecord,
          'revision_review',
          guard.reason
            ?? 'Approved for revision-review intelligence, but no conservative wording change was prepared from the exact Black/Anderson/Osborn support in this pass.',
        ));
      }
      return candidate;
    })
    .filter(Boolean)
    .sort(prioritySort);

  deferred.sort(prioritySort);

  const candidates = [
    ...reopenedDraftCandidates,
    ...revisionReviewCandidates,
  ];
  const strongestFirstReview = candidates
    .filter((candidate) => [
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
      'arrest',
    ].includes(candidate.normalizedTerm))
    .sort(prioritySort);

  const exactNextPrompt = 'Task: Review comparator_draft_revision_candidates_v2.json for boundary-safe wording quality. Approve, revise, or reject each reopened draft and revision-review candidate; keep comparator_draft_revision_deferred_v2.json out of writeback, do not modify the live vocabulary dataset, do not modify vocabulary-boundary.js, and do not modify runtime ontology or concept packets.';

  const report = {
    generatedAt: new Date().toISOString(),
    status: 'DRAFT_REVIEW_PREPARATION_ONLY',
    scope: 'Comparator v2 draft/revision candidate preparation from approved reopen and approved revision-review decisions only',
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
      confirmKeepIncluded: false,
      stillSkipIncluded: false,
    },
    counts: {
      reopenedDraftCandidateCount: reopenedDraftCandidates.length,
      revisionReviewCandidateCount: revisionReviewCandidates.length,
      deferredCount: deferred.length,
      inputApprovedReopenCount: approvedReopen.length,
      inputApprovedRevisionReviewCount: approvedRevisionReview.length,
      exactTargetGuardDeferredCount: deferred.filter((record) => (
        String(record.reason).startsWith('Deferred by upstream exact-target guard:')
      )).length,
      osbornNoisySnippetCandidates: candidates.filter(hasNoisyOsborn).length,
      bySourceBasis: countBy(candidates, 'sourceBasis'),
    },
    strongestFirstReview,
    inputFiles: Object.fromEntries(
      Object.entries(inputPaths).map(([key, filePath]) => [key, toWindowsPath(filePath)]),
    ),
    outputFiles: Object.fromEntries(
      Object.entries(outputPaths).map(([key, filePath]) => [key, toWindowsPath(filePath)]),
    ),
    exactNextPrompt,
    reopened_draft_candidates: reopenedDraftCandidates,
    revision_review_candidates: revisionReviewCandidates,
    deferred,
  };

  writeJson(outputPaths.candidatesJson, report);
  writeJson(outputPaths.deferredJson, deferred);
  fs.writeFileSync(outputPaths.summaryMarkdown, buildSummaryMarkdown(report), 'utf8');

  Object.values(outputPaths).forEach((filePath) => {
    process.stdout.write(`Wrote ${toWindowsPath(filePath)}\n`);
  });
}

main();
