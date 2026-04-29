'use strict';

const fs = require('node:fs');
const path = require('node:path');

const workspaceRoot = '/mnt/c/Users/coupy/Desktop/vocabulary-reference-lexicons';
const draftRoot = path.join(workspaceRoot, 'vocabulary_reference_lexicons/draft_meanings');
const reviewRoot = path.join(draftRoot, 'review');

const inputPaths = Object.freeze({
  draftBatch: path.join(draftRoot, 'batch_003_third_50_drafts.json'),
  draftReview: path.join(draftRoot, 'reports/batch_003_review.md'),
  skippedReport: path.join(draftRoot, 'reports/batch_003_skipped.json'),
  mainApprovalQueue: path.join(workspaceRoot, 'vocabulary_reference_lexicons/approval_queue/main_approval_queue.json'),
});

const outputPaths = Object.freeze({
  approved: path.join(reviewRoot, 'approved_batch_003.json'),
  revise: path.join(reviewRoot, 'revise_batch_003.json'),
  rejected: path.join(reviewRoot, 'rejected_batch_003.json'),
  decisionsMarkdown: path.join(reviewRoot, 'batch_003_review_decisions.md'),
});

const revisionPlan = Object.freeze({
  trust: {
    revisedMeaningInLaw: 'A legal relationship in which property is held by one person for another person or purpose.',
    reviewReason: 'The draft was sound but "benefit or use" could narrow trust too much; revised wording keeps the property-holding structure without overclaiming.',
    confidence: 'high',
  },
  easement: {
    revisedMeaningInLaw: 'A land-related right to use or benefit from another parcel, or to restrict its use.',
    reviewReason: 'The source support is OCR-noisy but property-specific; revised wording is tighter and avoids implying all easements fit one form.',
    confidence: 'medium',
  },
  servitude: {
    revisedMeaningInLaw: 'In property or civil-law usage, a burden or service attached to property for another estate or person.',
    reviewReason: 'The support mixes predial and personal senses, so the revised wording makes the legal tradition and property scope explicit.',
    confidence: 'medium',
  },
  hypothecation: {
    revisedMeaningInLaw: 'A civil-law-derived pledge or mortgage used as security, generally without transferring possession.',
    reviewReason: 'The draft was accurate but "not necessarily" was weaker than the source-fit security distinction; revised wording is cleaner.',
    confidence: 'medium',
  },
  lease: {
    revisedMeaningInLaw: 'A conveyance or grant of land or tenements for life, for a term of years, or at will, usually for rent or recompense.',
    reviewReason: 'Added "grant" to avoid making every lease sound like a full property conveyance while preserving Black support.',
    confidence: 'high',
  },
  ownership: {
    revisedMeaningInLaw: 'The dominion, title, or proprietary right in a thing or claim.',
    reviewReason: 'The draft was sound; revised wording removes unnecessary alternation and tracks the Black phrasing more closely.',
    confidence: 'high',
  },
  reversion: {
    revisedMeaningInLaw: 'A future interest left by operation of law in a grantor or the grantor\'s heirs after a prior estate ends.',
    reviewReason: 'The draft was source-fit but "residue" is less accessible; revised wording keeps the future-interest structure clear.',
    confidence: 'high',
  },
  homestead: {
    revisedMeaningInLaw: 'A home place or fixed residence, often including the dwelling and adjoining land.',
    reviewReason: 'The draft used "usually," which could overstate scope; revised wording stays descriptive and less universal.',
    confidence: 'high',
  },
  patent: {
    revisedMeaningInLaw: 'A governmental or sovereign grant of a privilege, property, authority, or exclusive right.',
    reviewReason: 'The support includes grants of privilege/property/authority and invention patents; revised wording covers both without over-specializing.',
    confidence: 'medium',
  },
  security: {
    revisedMeaningInLaw: 'Protection, assurance, or indemnification, including something furnished to secure an obligation.',
    reviewReason: 'The draft was source-fit but should not make obligation-security the main sense for every use.',
    confidence: 'medium',
  },
  distribution: {
    revisedMeaningInLaw: 'The apportionment and division of an estate or remaining property under legal authority.',
    reviewReason: 'The source support is estate-practice focused, so revised wording narrows "fund" language.',
    confidence: 'medium',
  },
  heir: {
    revisedMeaningInLaw: 'A person entitled to inherit property or an estate from another.',
    reviewReason: 'The draft included "expected to inherit," which can describe heir apparent rather than heir generally; revised wording is cleaner.',
    confidence: 'high',
  },
  marriage: {
    revisedMeaningInLaw: 'A legally recognized marital union, historically described in Black as the formal act by which spouses take each other in marriage.',
    reviewReason: 'The draft correctly noted historical gendered wording; revised wording avoids repeating that gendered formulation while preserving source caution.',
    confidence: 'medium',
  },
  succession: {
    revisedMeaningInLaw: 'The taking or transmission of property, rights, or legal position from one person or holder to another.',
    reviewReason: 'The source support spans inheritance, estate partition, and corporate continuity; revised wording keeps those senses bounded.',
    confidence: 'medium',
  },
  testament: {
    revisedMeaningInLaw: 'A will or testamentary disposition of property to take effect after death.',
    reviewReason: 'The draft was source-fit; revised wording is shorter and avoids "owner" as a universal frame.',
    confidence: 'high',
  },
  ward: {
    revisedMeaningInLaw: 'A person, especially a minor or protected person, under the care or authority of a guardian.',
    reviewReason: 'The support includes guardianship plus older guard/district senses; revised wording anchors the registry meaning to person-status usage.',
    confidence: 'medium',
  },
});

const historicallyNarrowTerms = new Set([
  'easement',
  'servitude',
  'fee simple',
  'holding',
  'tenure',
  'hypothecation',
  'reversion',
  'occupancy',
  'usufructuary',
  'patent',
  'franchise',
  'premium',
  'distribution',
  'marriage',
  'succession',
  'testament',
  'ward',
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

function baseReviewRecord(record, decision, reviewReason, options = {}) {
  return {
    term: record.term,
    draftMeaningInLaw: record.draftMeaningInLaw,
    reviewDecision: decision,
    reviewReason,
    revisedMeaningInLaw: options.revisedMeaningInLaw ?? null,
    confidence: options.confidence,
    family: record.family,
    bucket: record.bucket,
    riskTier: record.riskTier,
    currentMeaningStatus: record.currentMeaningStatus,
    matchStatus: record.matchStatus,
    sourceReferenceCount: record.sourceReferences.length,
    historicallyNarrow: historicallyNarrowTerms.has(record.normalizedTerm),
    writebackEligible: decision === 'approve' || decision === 'revise',
  };
}

function buildReview() {
  const draftRecords = readJson(inputPaths.draftBatch);
  const skippedRecords = readJson(inputPaths.skippedReport);

  const approved = [];
  const revise = [];
  const rejected = [];

  draftRecords.forEach((record) => {
    if (record.draftDecision === 'skip') {
      return;
    }

    const revision = revisionPlan[record.normalizedTerm];
    if (revision) {
      revise.push(baseReviewRecord(record, 'revise', revision.reviewReason, revision));
      return;
    }

    approved.push(baseReviewRecord(
      record,
      'approve',
      'Short, descriptive, registry-only wording fits the queued Black support without obvious overreach.',
      {
        confidence: historicallyNarrowTerms.has(record.normalizedTerm) ? 'medium' : 'high',
      },
    ));
  });

  skippedRecords.forEach((record) => {
    rejected.push(baseReviewRecord(
      record,
      'reject',
      record.draftReason,
      { confidence: 'high' },
    ));
  });

  approved.sort((left, right) => left.term.localeCompare(right.term));
  revise.sort((left, right) => left.term.localeCompare(right.term));
  rejected.sort((left, right) => left.term.localeCompare(right.term));

  return { approved, revise, rejected };
}

function markdownTable(headers, rows) {
  return [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.join(' | ')} |`),
  ].join('\n');
}

function buildDecisionsMarkdown(review) {
  const approvedRows = review.approved.map((record) => [
    record.term,
    record.confidence,
    record.historicallyNarrow ? 'yes' : 'no',
  ]);
  const reviseRows = review.revise.map((record) => [
    record.term,
    record.confidence,
    record.revisedMeaningInLaw,
  ]);
  const rejectedRows = review.rejected.map((record) => [
    record.term,
    record.reviewReason,
  ]);

  return [
    '# Batch 003 Review Decisions',
    '',
    'Scope: review-only quality pass for batch 003 draft meanings. This report does not modify the live vocabulary dataset, runtime ontology, boundary content, or concept packets.',
    '',
    '## Implemented / Partial / Missing / Not Evidenced',
    '',
    '- Implemented: approve, revise, and reject classifications for batch 003 draft outputs.',
    '- Partial: review is based on queued Black snippets and prior extraction quality, not independent full-page legal review.',
    '- Missing: live writeback, explicit writeback preview, and human approval of revised wording.',
    '- Not evidenced: modern jurisdiction-specific completeness or runtime concept suitability.',
    '',
    '## Counts',
    '',
    `- Approved: ${review.approved.length}`,
    `- Require revision: ${review.revise.length}`,
    `- Rejected: ${review.rejected.length}`,
    '',
    '## Approved',
    '',
    markdownTable(['Term', 'Confidence', 'Historically narrow'], approvedRows),
    '',
    '## Require Revision',
    '',
    markdownTable(['Term', 'Confidence', 'Revised wording'], reviseRows),
    '',
    '## Rejected',
    '',
    markdownTable(['Term', 'Reason'], rejectedRows),
    '',
    '## Historical / Wrong-Sense Caution',
    '',
    '- easement and servitude: property-specific, with OCR noise and mixed civil-law/property senses.',
    '- fee simple, holding, tenure, reversion, and occupancy: historically framed land-law terms.',
    '- hypothecation and usufructuary: civil-law-specific vocabulary.',
    '- patent, franchise, premium, distribution, and royalty: commerce-family terms with narrower historical source senses.',
    '- marriage, succession, testament, inheritance, and ward: status-family terms with historical inheritance or guardianship framing.',
    '- surplusage: rejected because support is pleading-specific while queue family is commerce/allocation.',
    '- usufruct: rejected because the queued snippets are truncated before the definition.',
    '',
    '## Recommendation',
    '',
    '- Batch 004 should remain at 50 until the batch 003 writeback preview validates clean target mappings.',
    '- Black-only still holds for batch 004 drafting, but Bouvier should now be prepared as the next comparator source before scaling beyond 50-term batches.',
    '- Keep rejected terms out of writeback.',
    '',
    '## Exact Next Prompt',
    '',
    'Task: Build a NOT_APPLIED writeback candidate set from approved_batch_003.json and revise_batch_003.json, using revisedMeaningInLaw where present. Do not modify the live vocabulary dataset yet; produce a diff-style preview and validation report for explicit approval.',
    '',
  ].join('\n');
}

function main() {
  fs.mkdirSync(reviewRoot, { recursive: true });
  const review = buildReview();

  writeJson(outputPaths.approved, review.approved);
  writeJson(outputPaths.revise, review.revise);
  writeJson(outputPaths.rejected, review.rejected);
  fs.writeFileSync(outputPaths.decisionsMarkdown, buildDecisionsMarkdown(review), 'utf8');

  Object.values(outputPaths).forEach((filePath) => {
    process.stdout.write(`Wrote ${toWindowsPath(filePath)}\n`);
  });
}

main();
