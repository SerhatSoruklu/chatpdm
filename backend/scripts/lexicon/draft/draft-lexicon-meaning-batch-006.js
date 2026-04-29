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
  osbornAlignment: path.join(multiSourceRoot, 'alignment/osborn_1927.boundary_alignment.ndjson'),
  meaningSources: path.join(repoRoot, 'backend/src/modules/legal-vocabulary/vocabulary-meaning-sources.generated.json'),
});

const outputPaths = Object.freeze({
  draftBatchJson: path.join(draftRoot, 'batch_006_sixth_50_drafts.json'),
  reviewMarkdown: path.join(reportsDirectory, 'batch_006_review.md'),
  skippedJson: path.join(reportsDirectory, 'batch_006_skipped.json'),
  writebackNotAppliedJson: path.join(draftRoot, 'batch_006_writeback_NOT_APPLIED.json'),
});

const batchStartIndex = 250;
const batchSize = 50;
const batchId = 'batch_006_sixth_50';

const draftPlan = Object.freeze({
  seizure: {
    decision: 'draft_ready',
    meaning: 'The act of taking a person or property into legal custody under authority of law.',
    sourceBasis: 'black_only',
    reason: 'Black supports seizure as an officer taking custody under legal authority or process.',
    support: 'Black defines seizure through taking custody or possession under authority of law.',
  },
  acquittal: {
    decision: 'draft_ready',
    meaning: 'A legal discharge from a criminal accusation, or a release from an obligation, liability, or engagement.',
    sourceBasis: 'black_plus_anderson_osborn',
    reason: 'Black supports discharge from obligation and criminal accusation; Anderson and Osborn confirm exact-term criminal discharge context.',
    support: 'Black, Anderson, and Osborn define acquittal through release, discharge, and criminal non-guilt outcomes.',
  },
  appointment: {
    decision: 'draft_ready',
    meaning: 'The exercise of a right or authority to designate or select a person for a use, office, or place of trust.',
    sourceBasis: 'black_plus_anderson',
    reason: 'Black supports chancery designation, and Anderson supports selection or designation for office or trust.',
    support: 'Black and Anderson define appointment through designation, selection, and office or trust placement.',
  },
  article: {
    decision: 'draft_ready',
    meaning: 'A separate and distinct part of an instrument, writing, or connected whole.',
    sourceBasis: 'black_plus_anderson',
    reason: 'Black and Anderson both support article as a distinct part or portion of a writing or whole.',
    support: 'Black and Anderson define article through separated parts of instruments, writings, or connected wholes.',
  },
  knowledge: {
    decision: 'draft_ready',
    meaning: 'A degree of certainty or awareness distinguished from belief by the level of certainty.',
    sourceBasis: 'black_plus_anderson_osborn',
    reason: 'Black and Anderson support the knowledge/belief distinction; Osborn provides exact-term comparator context.',
    support: 'Black and Anderson define knowledge by contrast with belief and certainty.',
  },
  promise: {
    decision: 'draft_ready',
    meaning: 'A verbal or written declaration by which a person binds himself to do or forbear from doing an act.',
    sourceBasis: 'black_plus_anderson_osborn',
    reason: 'Black, Anderson, and Osborn support promise as an expression or declaration binding a person to act or forbear.',
    support: 'Black, Anderson, and Osborn define promise through declared intention or engagement to do or forbear.',
  },
  prosecution: {
    decision: 'draft_ready',
    meaning: 'A criminal action or proceeding instituted and carried on by due course of law.',
    sourceBasis: 'black_plus_osborn',
    reason: 'Black directly supports criminal action or proceeding; Osborn confirms criminal or bankruptcy proceedings as comparator context.',
    support: 'Black and Osborn define prosecution through institution and conduct of legal proceedings.',
  },
  ratification: {
    decision: 'draft_ready',
    meaning: 'The confirmation or adoption of a previous act, contract, or transaction.',
    sourceBasis: 'black_plus_osborn',
    reason: 'Black supports confirmation of a previous act; Osborn confirms adoption of a contract or transaction.',
    support: 'Black and Osborn define ratification through confirmation or adoption of prior acts or transactions.',
  },
  separation: {
    decision: 'draft_ready',
    meaning: 'In matrimonial law, cessation of cohabitation between husband and wife by agreement or legal separation.',
    sourceBasis: 'black_plus_anderson_osborn',
    reason: 'Black, Anderson, and Osborn support separation in matrimonial or judicial-separation usage.',
    support: 'Black, Anderson, and Osborn define separation through marital cohabitation cessation or judicial separation.',
    weak: true,
  },
  situs: {
    decision: 'draft_ready',
    meaning: 'The site, position, location, or place where a thing is considered to be for legal purposes.',
    sourceBasis: 'black_only',
    reason: 'Black directly supports situs as site, position, location, and the legal place where a thing is considered.',
    support: 'Black defines situs through location and legal place.',
  },
  theft: {
    decision: 'draft_ready',
    meaning: 'The unlawful and felonious taking of another person\'s movable personal property against the owner\'s will.',
    sourceBasis: 'black_plus_anderson_osborn',
    reason: 'Black directly supports theft as unlawful felonious taking; Anderson and Osborn confirm exact-term larceny context.',
    support: 'Black, Anderson, and Osborn define theft through unlawful or fraudulent taking of personal property.',
  },
  accord: {
    decision: 'draft_ready',
    meaning: 'A satisfaction or agreement accepted between parties in place of an existing claim or promised act.',
    sourceBasis: 'black_plus_anderson',
    reason: 'Black and Anderson support accord as agreed satisfaction or substitute agreement.',
    support: 'Black and Anderson define accord through agreement and satisfaction accepted in lieu of a claim.',
  },
  amendment: {
    decision: 'draft_ready',
    meaning: 'The correction of an error in a legal process, pleading, or proceeding.',
    sourceBasis: 'black_plus_osborn',
    reason: 'Black supports correction of error in process, pleading, or proceeding; Osborn confirms correction of error.',
    support: 'Black and Osborn define amendment through correction of legal error.',
  },
  assent: {
    decision: 'draft_ready',
    meaning: 'Compliance, approval, or a declaration of willingness to do something in response to a request.',
    sourceBasis: 'black_plus_anderson',
    reason: 'Black and Anderson support assent as compliance, approval, agreement, or declared willingness.',
    support: 'Black and Anderson define assent through approval, agreement, compliance, and willingness declared.',
  },
  assignee: {
    decision: 'draft_ready',
    meaning: 'A person to whom an assignment is made or property is transferred.',
    sourceBasis: 'black_plus_anderson_osborn',
    reason: 'Black, Anderson, and Osborn directly support assignee as the person receiving an assignment or transfer.',
    support: 'Black, Anderson, and Osborn define assignee through assignment and transfer to another person.',
  },
  blockade: {
    decision: 'draft_ready',
    meaning: 'In international law, a marine investment or beleaguering of a town, harbor, or seaport to prevent access or communication.',
    sourceBasis: 'black_plus_anderson_osborn',
    reason: 'Black, Anderson, and Osborn support blockade as a naval or marine investment cutting off access or communication.',
    support: 'Black, Anderson, and Osborn define blockade through naval force, harbor or seaport investment, and prevention of access.',
  },
  burglary: {
    decision: 'draft_ready',
    meaning: 'In criminal law, breaking and entering the house of another at night with intent to commit a felony.',
    sourceBasis: 'black_plus_anderson_osborn',
    reason: 'Black, Anderson, and Osborn directly support the historical breaking-and-entering-at-night formulation.',
    support: 'Black, Anderson, and Osborn define burglary through nocturnal house breaking and felonious intent.',
  },
  capture: {
    decision: 'draft_ready',
    meaning: 'A taking or seizure by force, especially the taking or wresting of property in international or maritime law.',
    sourceBasis: 'black_plus_anderson_osborn',
    reason: 'Black supports international-law taking of property; Anderson and Osborn confirm taking or seizure comparator context.',
    support: 'Black, Anderson, and Osborn define capture through taking, seizure, force, and prize or maritime usage.',
    weak: true,
  },
  competency: {
    decision: 'draft_ready',
    meaning: 'In evidence, the presence of qualities, or absence of disabilities, that makes a person legally fit to testify.',
    sourceBasis: 'black_only',
    reason: 'Black support is exact but confined to evidence-law competency.',
    support: 'Black defines competency through evidence-law qualifications and absence of disabling characteristics.',
    weak: true,
  },
  conspiracy: {
    decision: 'draft_ready',
    meaning: 'A combination or agreement of two or more persons to accomplish an unlawful purpose or a lawful purpose by unlawful means.',
    sourceBasis: 'black_plus_anderson_osborn',
    reason: 'Black, Anderson, and Osborn directly support conspiracy as a combination or agreement for unlawful ends or unlawful means.',
    support: 'Black, Anderson, and Osborn define conspiracy through concerted agreement or combination of multiple persons.',
  },
  conviction: {
    decision: 'draft_ready',
    meaning: 'The finding or result of a criminal trial that a person is guilty as charged.',
    sourceBasis: 'black_plus_osborn',
    reason: 'Black supports conviction as a guilty result after criminal trial; Osborn confirms finding a person guilty after trial.',
    support: 'Black and Osborn define conviction through guilt found after trial.',
  },
  crime: {
    decision: 'draft_ready',
    meaning: 'An act or omission in violation of public law and treated as a public wrong subject to punishment.',
    sourceBasis: 'black_plus_anderson_osborn',
    reason: 'Black, Anderson, and Osborn support crime as conduct forbidden or commanded by public law and punishable.',
    support: 'Black, Anderson, and Osborn define crime through public-law violation and punishment.',
  },
  delegation: {
    decision: 'draft_ready',
    meaning: 'A putting into commission or entrusting another with power to act for those who depute him.',
    sourceBasis: 'black_only',
    reason: 'Black directly supports delegation as putting into commission and entrusting another with power to act.',
    support: 'Black defines delegation through deputing, commission, and entrusted power.',
  },
  deprivation: {
    decision: 'draft_ready',
    meaning: 'In English ecclesiastical law, the taking away from a clergyman of a benefice or other spiritual promotion or dignity.',
    sourceBasis: 'black_only',
    reason: 'Black support is exact but historically narrow and ecclesiastical.',
    support: 'Black defines deprivation through taking away ecclesiastical benefice, promotion, or dignity.',
    weak: true,
  },
  domicile: {
    decision: 'draft_ready',
    meaning: 'The place where a person has fixed habitation with the present intention of making a permanent home.',
    sourceBasis: 'black_only',
    reason: 'Black directly supports domicile as fixed habitation with present intention of permanent home.',
    support: 'Black defines domicile through fixed habitation, family, and permanent-home intention.',
  },
  exception: {
    decision: 'draft_ready',
    meaning: 'An objection or exclusion; in practice, a formal objection to the court\'s action during trial.',
    sourceBasis: 'black_plus_anderson_osborn',
    reason: 'Black supports formal trial objections, and Anderson and Osborn add exact-term exclusion or saving-clause context.',
    support: 'Black, Anderson, and Osborn define exception through objection and exclusion.',
  },
  exemption: {
    decision: 'draft_ready',
    meaning: 'Freedom or immunity from a general duty, service, burden, tax, or charge.',
    sourceBasis: 'black_plus_anderson',
    reason: 'Black and Anderson support exemption as freedom from duty, burden, law, or charge.',
    support: 'Black and Anderson define exemption through being excepted, excused, or freed from burdens.',
  },
  occupation: {
    decision: 'draft_ready',
    meaning: 'Possession, control, tenure, or use, especially physical control over land.',
    sourceBasis: 'black_plus_osborn',
    reason: 'Black supports possession, control, tenure, and use; Osborn confirms physical control or possession of land.',
    support: 'Black and Osborn define occupation through possession and physical control.',
  },
  provision: {
    decision: 'skip',
    sourceBasis: 'black_only',
    reason: 'Unsafe boundary: exact Black support concerns commercial funds or ecclesiastical provision, not the queued Law / Rule / Sources clause meaning.',
    support: 'The exact Black snippets do not safely support the rule/source sense implied by the queue row.',
  },
  recklessness: {
    decision: 'draft_ready',
    meaning: 'Rashness, heedlessness, or wanton conduct as a state of mind accompanying an act.',
    sourceBasis: 'black_only',
    reason: 'Black directly supports recklessness as rashness, heedlessness, wanton conduct, and a state of mind.',
    support: 'Black defines recklessness through heedlessness, rashness, wanton conduct, and mental state.',
  },
  remoteness: {
    decision: 'draft_ready',
    meaning: 'Want of close connection between a wrong and an injury as cause and effect.',
    sourceBasis: 'black_plus_osborn',
    reason: 'Black directly supports remoteness as lack of close causal connection; Osborn gives exact-term comparator context.',
    support: 'Black defines remoteness through lack of close connection between wrong and injury.',
  },
  restriction: {
    decision: 'draft_ready',
    meaning: 'In registered land usage, an entry on a register limiting dealings with registered land.',
    sourceBasis: 'black_only',
    reason: 'Black support is exact but confined to English land-transfer registry usage.',
    support: 'Black defines restriction through an entry on a land register with limiting effect.',
    weak: true,
  },
  section: {
    decision: 'draft_ready',
    meaning: 'The smallest distinct and numbered part of a text-book, code, statute, or other juridical writing.',
    sourceBasis: 'black_only',
    reason: 'Black directly supports section as a distinct numbered part of juridical writings.',
    support: 'Black defines section through numbered parts of statutes, codes, and juridical writings.',
  },
  sedition: {
    decision: 'draft_ready',
    meaning: 'An insurrectionary movement tending toward treason but lacking an overt act, including attempts by meetings, speeches, or publications.',
    sourceBasis: 'black_plus_osborn',
    reason: 'Black supports sedition as movement or attempts tending toward treason; Osborn supplies exact-term comparator context.',
    support: 'Black and Osborn define sedition through treason-adjacent public-order attempts by speech, meeting, or publication.',
  },
  undertaking: {
    decision: 'draft_ready',
    meaning: 'A promise, engagement, or stipulation, including a promise made in legal proceedings.',
    sourceBasis: 'black_plus_osborn',
    reason: 'Black supports undertaking as promise, engagement, or stipulation; Osborn confirms legal-proceeding promise context.',
    support: 'Black and Osborn define undertaking through enforceable promises, engagements, or stipulations.',
  },
  abduction: {
    decision: 'draft_ready',
    meaning: 'In criminal law, taking away a wife, child, or ward by fraud, persuasion, or open violence.',
    sourceBasis: 'black_plus_anderson_osborn',
    reason: 'Black, Anderson, and Osborn support abduction as taking away a protected person by fraud, persuasion, or violence.',
    support: 'Black, Anderson, and Osborn define abduction through taking away by fraud, persuasion, or violence.',
  },
  'accord and satisfaction': {
    decision: 'draft_ready',
    meaning: 'An agreement to accept substituted performance or payment, together with the satisfaction that bars the original claim.',
    sourceBasis: 'black_plus_anderson_osborn',
    reason: 'Black provides exact-term support, while Anderson and Osborn clarify the agreement-and-satisfaction structure.',
    support: 'Black, Anderson, and Osborn define accord and satisfaction through agreement plus substituted satisfaction.',
  },
  accord_and_satisfaction: {
    decision: 'skip',
    sourceBasis: 'black_only',
    reason: 'Duplicate alias surface: normalized duplicate of accord and satisfaction; no alias fan-out in draft-only batch.',
    support: 'The human-readable exact row is drafted separately; the underscore surface is skipped to avoid alias fan-out.',
  },
  arraignment: {
    decision: 'draft_ready',
    meaning: 'In criminal practice, calling the defendant to court to answer the accusation contained in the indictment.',
    sourceBasis: 'black_only',
    reason: 'Black directly supports arraignment as calling the defendant to answer an indictment.',
    support: 'Black defines arraignment through calling the accused to answer the accusation.',
  },
  assignor: {
    decision: 'draft_ready',
    meaning: 'A person who makes an assignment or transfers property to another.',
    sourceBasis: 'black_plus_anderson',
    reason: 'Black and Anderson directly support assignor as the transferor or person making an assignment.',
    support: 'Black and Anderson define assignor through assignment and transfer to another.',
  },
  battery: {
    decision: 'draft_ready',
    meaning: 'Any unlawful beating or wrongful physical touching of another person.',
    sourceBasis: 'black_plus_anderson_osborn',
    reason: 'Black, Anderson, and Osborn support battery as unlawful beating or wrongful touching.',
    support: 'Black, Anderson, and Osborn define battery through unlawful beating and physical contact.',
  },
  command: {
    decision: 'draft_ready',
    meaning: 'An order, imperative direction, or behest.',
    sourceBasis: 'black_only',
    reason: 'Black directly supports command as an order, imperative direction, or behest.',
    support: 'Black defines command through order and imperative direction.',
  },
  compromise: {
    decision: 'draft_ready',
    meaning: 'An arrangement, in or out of court, for settling a dispute on terms the parties treat as equitable.',
    sourceBasis: 'black_plus_anderson_osborn',
    reason: 'Black, Anderson, and Osborn support compromise as an agreement or arrangement settling a dispute.',
    support: 'Black, Anderson, and Osborn define compromise through dispute settlement and mutual yielding.',
  },
  compulsion: {
    decision: 'draft_ready',
    meaning: 'Constraint, objective necessity, or forcible inducement to the commission of an act.',
    sourceBasis: 'black_plus_anderson',
    reason: 'Black directly supports compulsion as constraint and forcible inducement; Anderson confirms coercion or duress comparator context.',
    support: 'Black and Anderson define compulsion through constraint, necessity, coercion, or duress.',
  },
  constitution: {
    decision: 'draft_ready',
    meaning: 'In public law, the organic and fundamental law establishing the character and framework of a nation or state government.',
    sourceBasis: 'black_plus_anderson_osborn',
    reason: 'Black and Anderson support organic or fundamental law; Osborn provides exact-term comparator context.',
    support: 'Black, Anderson, and Osborn define constitution through fundamental law and governmental structure.',
  },
  constraint: {
    decision: 'draft_ready',
    meaning: 'A restraint; Black treats constraint as equivalent to restraint.',
    sourceBasis: 'black_only',
    reason: 'Black directly supports constraint by equating it with restraint.',
    support: 'Black defines constraint through equivalence to restraint.',
    weak: true,
  },
  designation: {
    decision: 'draft_ready',
    meaning: 'A description or descriptive expression by which a person or thing is denoted in a will.',
    sourceBasis: 'black_only',
    reason: 'Black support is exact but confined to descriptive expressions in wills.',
    support: 'Black defines designation through the expression by which a person or thing is denoted in a will.',
    weak: true,
  },
  detainer: {
    decision: 'draft_ready',
    meaning: 'The withholding of possession from a person lawfully entitled to land or goods, or the restraint of a person\'s liberty.',
    sourceBasis: 'black_plus_anderson',
    reason: 'Black and Anderson support detainer as withholding, detention, or restraint of property or person.',
    support: 'Black and Anderson define detainer through withholding possession and personal restraint.',
  },
  embargo: {
    decision: 'draft_ready',
    meaning: 'A state proclamation or order, often in time of war or threatened hostilities, prohibiting departure or detaining ships or property.',
    sourceBasis: 'black_plus_osborn',
    reason: 'Black supports state orders prohibiting departure; Osborn confirms provisional seizure or detention by the state.',
    support: 'Black and Osborn define embargo through state prohibition, seizure, or detention of ships or property.',
  },
  escrow: {
    decision: 'draft_ready',
    meaning: 'A writing or deed delivered to a third person to be held until a condition is performed or a contingency occurs.',
    sourceBasis: 'black_plus_anderson_osborn',
    reason: 'Black, Anderson, and Osborn support escrow as a writing or deed held by a third person until condition or contingency.',
    support: 'Black, Anderson, and Osborn define escrow through conditional third-party delivery and holding.',
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
    supportingSnippet: reference.supportingSnippet,
    parseConfidence: reference.parseConfidence,
    sourceQualityTier: reference.sourceQualityTier,
    extractionMode: reference.extractionMode,
    referenceRole,
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

function buildComparatorReferenceMap(filePath) {
  const referencesByTerm = new Map();

  readNdjson(filePath)
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

function comparatorIsRequired(plan, comparatorName) {
  return plan.sourceBasis === `black_plus_${comparatorName}`
    || plan.sourceBasis.startsWith(`black_plus_${comparatorName}_`)
    || plan.sourceBasis.includes(`_${comparatorName}_`)
    || plan.sourceBasis.endsWith(`_${comparatorName}`);
}

function buildDraftRecords() {
  const mainApprovalQueue = readJson(inputPaths.mainApprovalQueue);
  const duplicateTermGroups = readJson(inputPaths.duplicateTermGroups);
  const currentMeaningByTerm = buildCurrentMeaningMap();
  const aliasNotesByTerm = buildAliasNotes(duplicateTermGroups);
  const andersonByTerm = buildComparatorReferenceMap(inputPaths.andersonAlignment);
  const osbornByTerm = buildComparatorReferenceMap(inputPaths.osbornAlignment);
  const batchTerms = mainApprovalQueue.slice(batchStartIndex, batchStartIndex + batchSize);

  return batchTerms.map((termRecord, index) => {
    const normalizedTerm = termRecord.normalizedTerm ?? normalizeForComparison(termRecord.term);
    const currentMeaning = currentMeaningByTerm.get(normalizedTerm) ?? null;
    const plan = draftPlan[termRecord.term] ?? draftPlan[normalizedTerm];
    const blackReferences = compactReferences(termRecord.sourceReferences ?? []);
    const andersonReferences = andersonByTerm.get(normalizedTerm) ?? [];
    const osbornReferences = osbornByTerm.get(normalizedTerm) ?? [];
    const comparatorsUsed = [];
    const requiredComparatorFailures = [];

    if (!plan) {
      requiredComparatorFailures.push('no_safe_draft_plan_authored');
    } else {
      if (comparatorIsRequired(plan, 'anderson')) {
        comparatorsUsed.push('anderson_1889');
        if (andersonReferences.length === 0) {
          requiredComparatorFailures.push('missing_exact_anderson_comparator_support');
        }
      }

      if (comparatorIsRequired(plan, 'osborn')) {
        comparatorsUsed.push('osborn_1927');
        if (osbornReferences.length === 0) {
          requiredComparatorFailures.push('missing_exact_osborn_comparator_support');
        }
      }
    }

    let decision = plan?.decision ?? 'skip';
    let draftReason = plan?.reason ?? 'No safe draft plan was authored for this exact term.';
    let draftMeaningInLaw = plan?.meaning ?? null;

    if (currentMeaning) {
      decision = 'skip';
      draftReason = 'Already-existing meaningInLaw detected; refusal-first draft batch will not modify existing meanings.';
      draftMeaningInLaw = null;
    } else if (blackReferences.length === 0) {
      decision = 'skip';
      draftReason = 'Missing exact Black provenance; refusal-first draft batch requires exact primary-source support.';
      draftMeaningInLaw = null;
    } else if (requiredComparatorFailures.length > 0) {
      decision = 'skip';
      draftReason = `Missing required comparator support: ${requiredComparatorFailures.join(', ')}.`;
      draftMeaningInLaw = null;
    }

    const comparatorUsed = decision === 'draft_ready' && comparatorsUsed.length > 0;

    return {
      batchId,
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
      sourceReferences: blackReferences,
      draftMeaningInLaw,
      draftDecision: decision,
      draftReason,
      shortSupportNote: plan?.support ?? 'Skipped before draft support could be safely established.',
      sourceBasis: plan?.sourceBasis ?? 'none',
      provenancePointers: {
        black: blackReferences,
        anderson: comparatorUsed && comparatorsUsed.includes('anderson_1889')
          ? compactComparatorReferences(andersonReferences, 'comparator_support')
          : [],
        osborn: comparatorUsed && comparatorsUsed.includes('osborn_1927')
          ? compactComparatorReferences(osbornReferences, 'comparator_support')
          : [],
      },
      comparatorUsed,
      comparatorsUsed: comparatorUsed ? comparatorsUsed : [],
      comparatorAvailability: {
        andersonExactReferenceCount: andersonReferences.length,
        osbornExactReferenceCount: osbornReferences.length,
      },
      weakOrHistoricallyNarrow: Boolean(plan?.weak || decision === 'skip'),
      boundaryDisciplineNote: 'Draft only; registry-only meaning/reference layer, no writeback, no runtime ontology admission, no concept packet change, and no alias fan-out.',
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
  const blackPlusOsborn = ready.filter((record) => record.sourceBasis === 'black_plus_osborn');
  const blackPlusBoth = ready.filter((record) => record.sourceBasis === 'black_plus_anderson_osborn');
  const weakRows = records
    .filter((record) => record.weakOrHistoricallyNarrow)
    .map((record) => [record.term, record.draftDecision, record.draftReason]);

  const rows = records.map((record) => [
    record.batchPosition,
    record.approvalQueuePosition,
    record.term,
    record.draftDecision,
    record.sourceBasis,
    record.comparatorsUsed.join(', ') || 'none',
    record.draftMeaningInLaw ?? 'Skipped',
  ]);

  const skipReasonCounts = skipped.reduce((counts, record) => {
    counts.set(record.draftReason, (counts.get(record.draftReason) ?? 0) + 1);
    return counts;
  }, new Map());

  const comparatorRows = ready.map((record) => [
    record.term,
    record.sourceBasis,
    record.comparatorAvailability.andersonExactReferenceCount,
    record.comparatorAvailability.osbornExactReferenceCount,
    record.comparatorsUsed.join(', ') || 'not used',
  ]);

  return [
    '# Batch 006 Meaning Draft Review',
    '',
    'Scope: queue positions 251-300 from `main_approval_queue.json`. These are draft-only boundary meanings. Black remains the primary source; Anderson and Osborn are comparator context only where exact-term support improves precision or confirms scope. This report does not modify the live vocabulary dataset, runtime ontology, concept packets, resolver behavior, aliases, or existing meaning text.',
    '',
    '## Implemented / Partial / Missing / Not Evidenced',
    '',
    '- Implemented: draft-only meaning proposals, skip decisions, source-basis labels, and exact provenance pointers for batch 006.',
    '- Partial: source review uses extracted snippets and comparator alignment outputs, not fresh manual page review.',
    '- Missing: live writeback, final human approval, and source-provenance writeback for any future applied terms.',
    '- Not evidenced: modern jurisdiction-specific completeness, alias fan-out, or runtime concept admission.',
    '',
    '## Counts',
    '',
    `- Records scanned: ${records.length}`,
    `- Draft ready: ${ready.length}`,
    `- Skipped: ${skipped.length}`,
    `- Black only: ${blackOnly.length}`,
    `- Black plus Anderson: ${blackPlusAnderson.length}`,
    `- Black plus Osborn: ${blackPlusOsborn.length}`,
    `- Black plus Anderson and Osborn: ${blackPlusBoth.length}`,
    '',
    '## Draft Review Table',
    '',
    markdownTable(
      ['#', 'Queue #', 'Term', 'Decision', 'Source basis', 'Comparators used', 'Draft meaning'],
      rows,
    ),
    '',
    '## Skipped Terms',
    '',
    skipped.length > 0
      ? markdownTable(['Term', 'Reason'], skipped.map((record) => [record.term, record.draftReason]))
      : 'No terms skipped.',
    '',
    '## Skip Reason Counts',
    '',
    skipReasonCounts.size > 0
      ? markdownTable(['Reason', 'Count'], [...skipReasonCounts.entries()])
      : 'No skip reasons.',
    '',
    '## Comparator Observations',
    '',
    markdownTable(
      ['Term', 'Source basis', 'Anderson exact refs', 'Osborn exact refs', 'Comparator role'],
      comparatorRows,
    ),
    '',
    '## Weakest / Historically Narrow Terms',
    '',
    weakRows.length > 0
      ? markdownTable(['Term', 'Decision', 'Reason'], weakRows)
      : 'No weak or historically narrow terms flagged.',
    '',
    '## Boundary Notes',
    '',
    '- Exact-term only. No alias fan-out was used.',
    '- Black is the primary source for every draft candidate.',
    '- Anderson and Osborn are comparator context only and do not replace Black support.',
    '- Registry-only boundary is preserved; these draft meanings do not admit terms to runtime ontology.',
    '- Writeback was not applied.',
    '',
    '## Recommendation',
    '',
    '- Review batch 006 draft wording before any writeback-preview step.',
    '- Keep `provision` skipped unless exact rule/source sense provenance is found.',
    '- Keep `accord_and_satisfaction` skipped unless an explicit alias policy permits separate underscore-surface authoring.',
    '',
    '## Exact Next Prompt',
    '',
    'Task: Review batch_006_sixth_50_drafts.json for boundary-safe wording quality. Approve, revise, or reject each draft; keep skipped terms out of writeback. Do not modify the live vocabulary dataset, runtime ontology, concept packets, resolver behavior, aliases, or existing meaning text.',
    '',
  ].join('\n');
}

function main() {
  fs.mkdirSync(reportsDirectory, { recursive: true });
  const records = buildDraftRecords();
  const ready = records.filter((record) => record.draftDecision === 'draft_ready');
  const skipped = records.filter((record) => record.draftDecision === 'skip');
  const writebackNotApplied = {
    status: 'NOT_APPLIED',
    batchId,
    mode: 'draft_only',
    writebackExecuted: false,
    escalationAllowed: false,
    writebackAllowed: false,
    candidateCount: ready.length,
    candidateIdentifiers: ready.map((record) => ({
      term: record.term,
      normalizedTerm: record.normalizedTerm,
      approvalQueuePosition: record.approvalQueuePosition,
      sourceBasis: record.sourceBasis,
    })),
    note: 'Explicit dry-run placeholder only. No writeback script was executed and no live vocabulary dataset was modified.',
  };

  writeJson(outputPaths.draftBatchJson, ready);
  writeJson(outputPaths.skippedJson, skipped);
  writeJson(outputPaths.writebackNotAppliedJson, writebackNotApplied);
  fs.writeFileSync(outputPaths.reviewMarkdown, buildReviewMarkdown(records), 'utf8');

  Object.values(outputPaths).forEach((filePath) => {
    process.stdout.write(`Wrote ${toWindowsPath(filePath)}\n`);
  });
  process.stdout.write(`Draft candidates: ${ready.length}\n`);
  process.stdout.write(`Skipped: ${skipped.length}\n`);
}

main();
