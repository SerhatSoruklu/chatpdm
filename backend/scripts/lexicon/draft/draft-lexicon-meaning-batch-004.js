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
  draftBatchJson: path.join(draftRoot, 'batch_004_fourth_50_drafts.json'),
  reviewMarkdown: path.join(reportsDirectory, 'batch_004_review.md'),
  skippedJson: path.join(reportsDirectory, 'batch_004_skipped.json'),
  writebackNotAppliedJson: path.join(draftRoot, 'batch_004_writeback_NOT_APPLIED.json'),
});

const batchStartIndex = 150;
const batchSize = 50;

const draftPlan = Object.freeze({
  lineage: {
    decision: 'draft_ready',
    meaning: 'Ancestry or line of descent, ascending or descending.',
    sourceBasis: 'black_only',
    reason: 'Black directly supports lineage as race, progeny, or family ascending or descending.',
    support: 'Black references define lineage through race, progeny, family, and ascent or descent.',
  },
  patrimony: {
    decision: 'draft_ready',
    meaning: 'An estate or property right inherited from a father or other ancestor.',
    sourceBasis: 'black_plus_anderson',
    reason: 'Black and Anderson both support patrimony as inherited ancestral property.',
    support: 'Black and Anderson describe patrimony as property, right, or estate received from one\'s father or ancestors.',
  },
  successor: {
    decision: 'draft_ready',
    meaning: 'A person who succeeds to the rights, place, or position of another.',
    sourceBasis: 'black_only',
    reason: 'Black directly supports successor as one succeeding to another\'s rights or place.',
    support: 'Black references define successor through succeeding to rights, place, or corporate continuity.',
  },
  will: {
    decision: 'draft_ready',
    meaning: 'A legal expression of a person\'s wishes for the disposition of property after death.',
    sourceBasis: 'black_only',
    reason: 'Black directly supports will as a legal expression of wishes respecting post-death property disposition.',
    support: 'Black references define will through testamentary expression and disposition of property.',
  },
  guardianship: {
    decision: 'draft_ready',
    meaning: 'The office, duty, authority, or legal relation of a guardian toward a ward.',
    sourceBasis: 'black_only',
    reason: 'Black directly supports guardianship as guardian office, duty, authority, and relation to ward.',
    support: 'Black references define guardianship through the office and relation of guardian and ward.',
  },
  intestacy: {
    decision: 'draft_ready',
    meaning: 'The condition of dying without having made a valid will.',
    sourceBasis: 'black_plus_anderson',
    reason: 'Black and Anderson both directly support intestacy as dying without a valid will.',
    support: 'Black and Anderson define intestacy as dying without a valid will or testamentary disposition.',
  },
  legatee: {
    decision: 'draft_ready',
    meaning: 'A person to whom a legacy or testamentary gift is given.',
    sourceBasis: 'black_plus_anderson',
    reason: 'Black and Anderson both support legatee as the recipient of a legacy or gift.',
    support: 'Black and Anderson define legatee as the person to whom a legacy or gift is made.',
  },
  testacy: {
    decision: 'draft_ready',
    meaning: 'The legal condition of leaving a valid will at death.',
    sourceBasis: 'black_plus_anderson',
    reason: 'Black and Anderson both support testacy as the condition of leaving a will, opposite intestacy.',
    support: 'Black and Anderson define testacy as leaving a valid will at death.',
  },
  testator: {
    decision: 'draft_ready',
    meaning: 'A person who makes or has made a testament or will.',
    sourceBasis: 'black_plus_anderson',
    reason: 'Black and Anderson both support testator as a person who makes a will.',
    support: 'Black and Anderson define testator as one who makes or has made a will.',
  },
  redemption: {
    decision: 'draft_ready',
    meaning: 'The act or right of buying back, redeeming, or recovering property, especially by payment of what is due.',
    sourceBasis: 'black_plus_anderson',
    reason: 'Black supports redemption as repurchase and mortgage redemption; Anderson supports repurchase and payment of mortgage debt.',
    support: 'Black and Anderson describe redemption as repurchase, buying back, or recovery on payment.',
  },
  restitution: {
    decision: 'draft_ready',
    meaning: 'Restoration of a thing, right, person, or condition to its former owner, position, or state.',
    sourceBasis: 'black_plus_anderson',
    reason: 'Black support includes restoration by writ or maritime context; Anderson provides broader exact-term restoration support.',
    support: 'Black and Anderson support restitution as restoration or return to a former owner, position, or condition.',
  },
  sentence: {
    decision: 'draft_ready',
    meaning: 'The judgment formally pronounced by a court, especially after conviction in a criminal case.',
    sourceBasis: 'black_plus_anderson',
    reason: 'Black directly supports sentence as formal judgment after conviction; Anderson confirms criminal-court final determination.',
    support: 'Black and Anderson define sentence through formal judicial judgment or final criminal-court determination.',
  },
  relief: {
    decision: 'skip',
    sourceBasis: 'black_only',
    reason: 'The queued Black support is mostly feudal or statute-title usage, while the queued family expects remedial relief.',
    support: 'The available snippets do not safely support a general remedial meaning without importing unsupported modern wording.',
  },
  remedy: {
    decision: 'draft_ready',
    meaning: 'A means provided by law to prevent, enforce, or redress the violation of a right.',
    sourceBasis: 'black_plus_anderson',
    reason: 'Black and Anderson support remedy as the legal means to prevent or redress a wrong or enforce a duty.',
    support: 'Black and Anderson define remedy as a legal means to prevent or redress a violation or wrong.',
  },
  reparation: {
    decision: 'draft_ready',
    meaning: 'Redress or amends for an injury or wrong.',
    sourceBasis: 'black_only',
    reason: 'Black directly supports reparation as redress of an injury and amends for a wrong.',
    support: 'Black references define reparation through redress, injury, and amends.',
  },
  reprieve: {
    decision: 'draft_ready',
    meaning: 'A temporary withdrawal or suspension of execution of a sentence, especially a death sentence.',
    sourceBasis: 'black_plus_anderson',
    reason: 'Black and Anderson support reprieve as withdrawing a sentence for an interval so execution is suspended.',
    support: 'Black and Anderson define reprieve through temporary suspension of execution of a sentence.',
  },
  subrogation: {
    decision: 'draft_ready',
    meaning: 'The substitution of one person or thing for another with respect to rights, claims, or obligations.',
    sourceBasis: 'black_only',
    reason: 'Black directly supports subrogation as substituting one person or thing for another with respect to rights.',
    support: 'Black references define subrogation through substitution in relation to rights or claims.',
  },
  probation: {
    decision: 'skip',
    sourceBasis: 'black_only',
    reason: 'The queued support is mostly proof, evidence, trial, or test usage, while the queued family is remedies/outcomes.',
    support: 'The available snippets do not safely support a remedial or sentencing-outcome meaning for this queue row.',
  },
  punishment: {
    decision: 'draft_ready',
    meaning: 'Pain, penalty, suffering, or confinement inflicted by legal authority for an offense.',
    sourceBasis: 'black_plus_anderson',
    reason: 'Black and Anderson directly support punishment as legally inflicted pain, penalty, or suffering for crime.',
    support: 'Black and Anderson define punishment through penalty or suffering imposed by human law for crime or disobedience.',
  },
  recoupment: {
    decision: 'draft_ready',
    meaning: 'A reduction, discount, or keeping back from a demand because of a connected claim or defense.',
    sourceBasis: 'black_plus_anderson',
    reason: 'Black and Anderson support recoupment as defalcation, reduction, discount, or keeping back from a demand.',
    support: 'Black and Anderson define recoupment through reduction of a demand or keeping back what is claimed due.',
  },
  redress: {
    decision: 'draft_ready',
    meaning: 'Satisfaction, relief, or remedy for an injury sustained.',
    sourceBasis: 'black_plus_anderson',
    reason: 'Black supports redress as receiving satisfaction for injury; Anderson adds setting right, reparation, relief, and remedy.',
    support: 'Black and Anderson define redress through satisfaction for injury, setting right, relief, and remedy.',
  },
  reformation: {
    decision: 'skip',
    sourceBasis: 'black_only',
    reason: 'The queued snippets are cross-reference and uncertain-signification text rather than a usable definition.',
    support: 'The available Black snippets do not provide enough direct definition text for safe drafting.',
  },
  rescission: {
    decision: 'draft_ready',
    meaning: 'The cancellation, annulment, or abrogation of a contract by the parties or by one of them.',
    sourceBasis: 'black_plus_anderson',
    reason: 'Black directly supports rescission as cancellation, annulment, or abrogation of a contract; Anderson provides exact-term context.',
    support: 'Black and Anderson support rescission as cancellation, annulment, or abrogation of a contract.',
  },
  vacatur: {
    decision: 'draft_ready',
    meaning: 'A rule or order by which a proceeding is vacated.',
    sourceBasis: 'black_only',
    reason: 'Black directly supports vacatur as a rule or order by which a proceeding is vacated.',
    support: 'Black references define vacatur through an order or rule vacating a proceeding.',
  },
  officer: {
    decision: 'draft_ready',
    meaning: 'A person lawfully invested with an office or charged by authority with duties or powers.',
    sourceBasis: 'black_only',
    reason: 'Black support describes an officer as an office-holder charged with authority and duties.',
    support: 'Black references define officer through office, authority, and duties conferred by superior power.',
  },
  partnership: {
    decision: 'draft_ready',
    meaning: 'A voluntary association or contract between two or more persons to contribute property, labor, skill, or effects to lawful business for shared profit and loss.',
    sourceBasis: 'black_plus_anderson',
    reason: 'Black directly supports partnership as a voluntary contract for shared commercial contribution and profit; Anderson adds exact-term comparator context.',
    support: 'Black and Anderson support partnership as a voluntary relation or contract for shared business contribution and profit.',
  },
  principal: {
    decision: 'draft_ready',
    meaning: 'Chief, leading, highest in rank or degree, or the source of authority or right.',
    sourceBasis: 'black_only',
    reason: 'Black support directly defines principal as chief, leading, highest, primary, original, or source of authority or right.',
    support: 'Black references define principal through rank, degree, importance, and source of authority.',
  },
  shareholder: {
    decision: 'draft_ready',
    meaning: 'A person who has agreed to become, or is treated as, a member of a corporation by holding shares.',
    sourceBasis: 'black_only',
    reason: 'Black directly supports shareholder as a person who has agreed to become a corporate member through shares.',
    support: 'Black references define shareholder through membership in a corporation by shareholding.',
  },
  suspension: {
    decision: 'draft_ready',
    meaning: 'A temporary stopping of a right, law, power, proceeding, or similar legal operation.',
    sourceBasis: 'black_only',
    reason: 'Black directly supports suspension as a temporary stop of a right, law, or similar legal power.',
    support: 'Black references define suspension through temporary stopping of rights, laws, writs, or powers.',
  },
  publication: {
    decision: 'draft_ready',
    meaning: 'The act of making something public or accessible to public notice, including official publishing of laws or notices.',
    sourceBasis: 'black_only',
    reason: 'Black directly supports publication as making a thing public or accessible and as publishing laws or ordinances.',
    support: 'Black references define publication through making public, public notice, and official publication of laws.',
  },
  uncertainty: {
    decision: 'draft_ready',
    meaning: 'Vagueness, obscurity, or confusion in an instrument that makes it difficult to understand, execute, or apply.',
    sourceBasis: 'black_only',
    reason: 'Black directly supports uncertainty as vagueness or obscurity in an instrument impairing understanding or execution.',
    support: 'Black references define uncertainty through vague, obscure, or confused written instruments.',
  },
  damage: {
    decision: 'draft_ready',
    meaning: 'Loss, injury, or deterioration caused to a person, right, property, or interest.',
    sourceBasis: 'black_plus_anderson',
    reason: 'Black and Anderson support damage as detriment, loss, injury, or deterioration.',
    support: 'Black and Anderson define damage through loss, injury, deterioration, or deprivation.',
  },
  fraud: {
    decision: 'draft_ready',
    meaning: 'A deceitful practice or willful device used with intent to deprive another of a right or cause injury.',
    sourceBasis: 'black_plus_anderson',
    reason: 'Black and Anderson support fraud as deceit, artifice, or willful device intended to injure or deprive another of rights.',
    support: 'Black and Anderson define fraud through deceitful practice, cheating, circumvention, and intent to injure or deceive.',
  },
  nuisance: {
    decision: 'draft_ready',
    meaning: 'An unlawful act, condition, or use that works hurt, inconvenience, or damage to another person or to the public.',
    sourceBasis: 'black_plus_anderson',
    reason: 'Black and Anderson support nuisance as unlawful annoyance, hurt, inconvenience, or damage to another or the public.',
    support: 'Black and Anderson define nuisance through unlawful hurt, inconvenience, annoyance, or damage.',
  },
  trespass: {
    decision: 'draft_ready',
    meaning: 'A wrongful act or misfeasance by which one person injures another person, property, or rights.',
    sourceBasis: 'black_plus_anderson',
    reason: 'Black supports trespass as misfeasance or wrongful act injuring another; Anderson adds exact-term comparator context.',
    support: 'Black and Anderson support trespass as wrongful invasion or injury to another person, property, or rights.',
  },
  default: {
    decision: 'draft_ready',
    meaning: 'An omission or failure to fulfill a legal duty, observe a promise, discharge an obligation, or appear as required.',
    sourceBasis: 'black_plus_anderson',
    reason: 'Black and Anderson support default as omission, nonperformance, or failure to do what ought to be done.',
    support: 'Black and Anderson define default through omission, failure of duty, and nonperformance.',
  },
  dereliction: {
    decision: 'skip',
    sourceBasis: 'black_only',
    reason: 'The queued support is mostly land uncovered by receding water or abandoned property, not the failure/breach sense implied by the queued family.',
    support: 'The available snippets present property and civil-law senses that are too likely to misfit this failure/noncompliance row.',
  },
  failure: {
    decision: 'draft_ready',
    meaning: 'A deficiency, lack, omission, neglect of duty, or unsuccessful attempt measured by a legal standard.',
    sourceBasis: 'black_only',
    reason: 'Black supports failure as neglect of duty, deficiency, or unsuccessful attempt.',
    support: 'Black references define failure through deficiency, want, neglect, or unsuccessful legal sufficiency.',
  },
  injury: {
    decision: 'draft_ready',
    meaning: 'A wrong or damage done to another person, right, reputation, or property.',
    sourceBasis: 'black_plus_anderson',
    reason: 'Black and Anderson both support injury as wrong or damage to person, rights, reputation, or property.',
    support: 'Black and Anderson define injury through wrong, damage, violation of right, and harm to person or property.',
  },
  deceit: {
    decision: 'draft_ready',
    meaning: 'A fraudulent misrepresentation, artifice, or device used to deceive or trick another.',
    sourceBasis: 'black_only',
    reason: 'Black directly supports deceit as fraudulent misrepresentation, artifice, or device used to deceive.',
    support: 'Black references define deceit through fraudulent misrepresentation, artifice, and deception.',
  },
  intrusion: {
    decision: 'draft_ready',
    meaning: 'An injury by ouster or entry by a stranger into a freehold after a prior estate ends and before the next estate takes effect.',
    sourceBasis: 'black_plus_anderson',
    reason: 'Black and Anderson support intrusion as a property injury by ouster or stranger entry into a freehold.',
    support: 'Black and Anderson define intrusion through ouster, amotion of possession, and stranger entry into a freehold.',
  },
  misrepresentation: {
    decision: 'draft_ready',
    meaning: 'A false representation or statement of fact that misleads another, especially to that person\'s injury.',
    sourceBasis: 'black_plus_anderson',
    reason: 'Black support is brief, and Anderson adds exact-term support for a false statement misleading another to injury.',
    support: 'Black and Anderson support misrepresentation as a false statement or representation misleading another.',
  },
  perjury: {
    decision: 'draft_ready',
    meaning: 'A willful false assertion under oath or as evidence in a judicial proceeding on a matter of fact, belief, or knowledge.',
    sourceBasis: 'black_only',
    reason: 'Black directly supports perjury as willful assertion in judicial evidence concerning fact, belief, or knowledge.',
    support: 'Black references define perjury through willful false assertion in a judicial proceeding.',
  },
  conversion: {
    decision: 'skip',
    sourceBasis: 'black_only',
    reason: 'The queued Black support is equity conversion of property form, not the failure/breach or tort sense implied by this row.',
    support: 'The available snippets support property transformation rather than a safe noncompliance meaning.',
  },
  delict: {
    decision: 'draft_ready',
    meaning: 'In civil-law usage, a wrong, injury, offense, or violation of public or private duty.',
    sourceBasis: 'black_only',
    reason: 'Black directly supports delict as a civil-law wrong, injury, offense, or violation of duty.',
    support: 'Black references define delict through wrong, injury, offense, and violation of public or private duty.',
  },
  infringement: {
    decision: 'draft_ready',
    meaning: 'A breaking, encroachment, trespass, or violation of a law, regulation, contract, or right.',
    sourceBasis: 'black_plus_anderson',
    reason: 'Black and Anderson support infringement as breaking, encroachment, trespass, or violation.',
    support: 'Black and Anderson define infringement through breaking, violation, trespass, or invasion of a right.',
  },
  interference: {
    decision: 'draft_ready',
    meaning: 'In patent-law usage, a collision between rights claimed or granted.',
    sourceBasis: 'black_only',
    reason: 'Black support is narrow but direct for patent-law interference as collision between claimed or granted rights.',
    support: 'Black references define interference in patent law as a collision between rights claimed or granted.',
    weak: true,
  },
  malfeasance: {
    decision: 'draft_ready',
    meaning: 'The wrongful or unjust doing of an act that the actor has no right to perform.',
    sourceBasis: 'black_plus_anderson',
    reason: 'Black and Anderson directly support malfeasance as wrongful or unlawful doing of an act.',
    support: 'Black and Anderson define malfeasance through wrongful or unlawful doing of an act.',
  },
  misconduct: {
    decision: 'draft_ready',
    meaning: 'Unlawful or improper conduct, especially conduct prejudicing legal rights or the proper administration of justice.',
    sourceBasis: 'black_plus_anderson',
    reason: 'Black supports misconduct in administration of justice; Anderson adds exact-term support for misconduct in office and wrongful performance.',
    support: 'Black and Anderson support misconduct as unlawful or wrongful conduct affecting office, justice, or legal rights.',
  },
  misfeasance: {
    decision: 'draft_ready',
    meaning: 'The improper performance of a lawful act, or a misdeed or trespass.',
    sourceBasis: 'black_plus_anderson',
    reason: 'Black and Anderson support misfeasance as improper performance of an act that may lawfully be done.',
    support: 'Black and Anderson define misfeasance through misdeed, trespass, and improper performance of a lawful act.',
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
      throw new Error(`Batch 004 cannot requeue already-authored term: ${termRecord.term}`);
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
      batchId: 'batch_004_fourth_50',
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
    '# Batch 004 Meaning Draft Review',
    '',
    'Scope: queue positions 151-200 from `main_approval_queue.json`. These are draft-only boundary meanings. Black remains the primary lane; Anderson is used only where exact-term comparator support materially improves precision or safety. This report does not modify the live vocabulary dataset, runtime ontology, concept packets, or existing meaning text.',
    '',
    '## Implemented / Partial / Missing / Not Evidenced',
    '',
    '- Implemented: draft-only meaning proposals, skip decisions, source-basis labels, and exact provenance pointers for batch 004.',
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
    '- Batch 005 should remain at 50 until batch 004 review and writeback preview pass.',
    '- Keep Anderson as comparator support, not a replacement authoring lane.',
    '- Review skipped terms before requeueing them; do not infer modern meanings from wrong-sense snippets.',
    '',
    '## Exact Next Prompt',
    '',
    'Task: Review batch_004_fourth_50_drafts.json for boundary-safe wording quality. Approve, revise, or reject each draft; keep skipped terms out of writeback. Do not modify the live vocabulary dataset, runtime ontology, concept packets, or existing meaning text.',
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
      source: 'batch_004_fourth_50_drafts',
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
