'use strict';

const fs = require('node:fs');
const path = require('node:path');

const {
  LIVE_CONCEPT_IDS,
  REJECTED_CONCEPT_IDS,
  VISIBLE_ONLY_PUBLIC_CONCEPT_IDS,
} = require('../concepts/admission-state');
const {
  REGISTRY_TERM_ITEM_TYPE,
  getRegistryInterpretationFallback,
  getWhyRegistryOnlyFallback,
} = require('../inspectable-item-contract');
const {
  loadLegalVocabularyRegistry,
} = require('./recognition-registry-loader');

const conceptsDirectoryPath = path.resolve(__dirname, '../../../../data/concepts');
const meaningSourcesPath = path.resolve(__dirname, './vocabulary-meaning-sources.generated.json');
const SOURCE_ATTESTED_REGISTRY_INTERPRETATION =
  'Source-attested legal vocabulary entry. Used for inspection and reference only.';
const SOURCE_ATTESTED_WHY_REGISTRY_ONLY =
  'Not admitted to runtime ontology because this entry has not been normalized into a bounded structural concept.';
let cachedConceptPacketIndex = null;
let cachedMeaningSourcesByTerm = null;

function isPublishedConceptPacketRecord(record) {
  return Boolean(
    record
    && typeof record === 'object'
    && !Array.isArray(record)
    && typeof record.concept === 'string'
    && record.concept.trim() !== ''
    && Number.isInteger(record.version)
    && typeof record.state === 'string'
    && record.state.trim() !== '',
  );
}

function loadPublishedConceptPacketCount() {
  const entries = fs.readdirSync(conceptsDirectoryPath, { withFileTypes: true });

  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
    .map((entry) => path.join(conceptsDirectoryPath, entry.name))
    .reduce((count, filePath) => {
      const record = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      return count + (isPublishedConceptPacketRecord(record) ? 1 : 0);
    }, 0);
}

function loadConceptPacketIndex() {
  if (cachedConceptPacketIndex) {
    return cachedConceptPacketIndex;
  }

  const entries = fs.readdirSync(conceptsDirectoryPath, { withFileTypes: true });
  const packets = new Map();

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.json')) {
      continue;
    }

    const filePath = path.join(conceptsDirectoryPath, entry.name);

    try {
      const record = JSON.parse(fs.readFileSync(filePath, 'utf8'));

      if (isPublishedConceptPacketRecord(record)) {
        packets.set(record.concept, record);
      }
    } catch {
      continue;
    }
  }

  cachedConceptPacketIndex = packets;
  return cachedConceptPacketIndex;
}

function formatTitleCase(value) {
  return value
    .split(' ')
    .map((word) => {
      if (word === '/' || word.length === 0) {
        return word;
      }

      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

function formatFamilyLabel(rawFamily) {
  return rawFamily
    .split(' / ')
    .map((segment) => formatTitleCase(segment.trim()))
    .join(' / ');
}

function formatClassificationLabel(classification) {
  return formatTitleCase(classification.replaceAll('_', ' '));
}

function firstSentence(value) {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return '';
  }

  const sentenceEnd = trimmed.search(/[.!?]\s/);
  if (sentenceEnd === -1) {
    return trimmed;
  }

  return trimmed.slice(0, sentenceEnd + 1).trim();
}

function isMeaningSourceRecord(record) {
  return Boolean(
    record
    && typeof record === 'object'
    && !Array.isArray(record)
    && typeof record.sourceId === 'string'
    && record.sourceId.trim() !== ''
    && typeof record.sourceTitle === 'string'
    && record.sourceTitle.trim() !== ''
    && Number.isInteger(record.year)
    && Number.isInteger(record.page)
    && typeof record.supportNote === 'string'
    && record.supportNote.trim() !== ''
    && typeof record.referenceRole === 'string'
    && record.referenceRole.trim() !== '',
  );
}

function freezeMeaningSource(record) {
  return Object.freeze({
    sourceId: record.sourceId,
    sourceTitle: record.sourceTitle,
    year: record.year,
    page: record.page,
    lineNumber: Number.isInteger(record.lineNumber) ? record.lineNumber : null,
    headword: typeof record.headword === 'string' && record.headword.trim() !== '' ? record.headword : null,
    supportNote: record.supportNote,
    snippetDisplay: typeof record.snippetDisplay === 'string' ? record.snippetDisplay : null,
    referenceRole: record.referenceRole,
  });
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function collapseBrokenWhitespace(value) {
  return String(value ?? '')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/([A-Za-z])-\s+([a-z])/g, '$1$2')
    .replace(/"\s+/g, '"')
    .replace(/\s+"/g, ' "')
    .replace(/\s+([,.;:!?])/g, '$1')
    .trim();
}

function removeInternalSupportPrefixes(value) {
  const cleaned = collapseBrokenWhitespace(value);
  const patterns = [
    /^(?:Anderson|Black|Osborn)\s+(?:comparator support|support retained)\s+for\s+[^:]{1,80}:\s*/i,
    /^Comparator-reviewed\s+source\s+support\s+for\s+[^.]{1,80}\.?\s*/i,
    /^Batch\s+\d+\s+[^:]{1,120}:\s*/i,
    /^Review(?:ed)?\s+(?:queue|candidate)\s+[^:]{1,120}:\s*/i,
    /^Extraction\s+[^:]{1,120}:\s*/i,
  ];

  for (const pattern of patterns) {
    const withoutPrefix = cleaned.replace(pattern, '').trim();
    if (withoutPrefix !== cleaned) {
      return {
        value: withoutPrefix,
        removedPrefix: true,
      };
    }
  }

  return {
    value: cleaned,
    removedPrefix: false,
  };
}

function stripRepeatedHeadwordNoise(value, term) {
  const normalized = collapseBrokenWhitespace(value);
  const uppercaseTerm = term.toUpperCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();

  if (!uppercaseTerm) {
    return normalized;
  }

  const headwordPattern = escapeRegExp(uppercaseTerm).replace(/\\ /g, '\\s+');
  const repeatedHeadwordPattern = new RegExp(
    `^(?:${headwordPattern})(?:\\s+\\d{1,4})?(?:\\s+(?:${headwordPattern})){1,4}[.:]?\\s*`,
    'i',
  );
  const leadingHeadwordPattern = new RegExp(`^(?:${headwordPattern})[.:]?\\s+`, 'i');

  return normalized
    .replace(repeatedHeadwordPattern, '')
    .replace(leadingHeadwordPattern, '')
    .trim();
}

function containsNoisyExtractionText(value) {
  const noisyPatterns = [
    /[\^�]/,
    /'{2}|"{2}/,
    /\b(?:tlie|hkes|bamages|ripaeian|oblivlon|per\s+on|re\s+pect|ttl|gen-\s*erally)\b/i,
    /\b[A-Za-z]{1,2}\s+[A-Za-z]{1,2}\s+[A-Za-z]{1,2}\b/,
    /\b[A-Za-z]+-\s+[A-Za-z]+\b/,
    /\s[.,;:!?]{2,}/,
  ];

  return noisyPatterns.some((pattern) => pattern.test(value));
}

function hasRepeatedHeadwordPrefix(value, term) {
  const uppercaseTerm = term.toUpperCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();

  if (!uppercaseTerm) {
    return false;
  }

  const headwordPattern = escapeRegExp(uppercaseTerm).replace(/\\ /g, '\\s+');
  return new RegExp(`^(?:${headwordPattern})(?:\\s+\\d{1,4})?(?:\\s+(?:${headwordPattern})){1,4}\\b`, 'i').test(value);
}

function snippetDisplayValue(value) {
  const firstSentenceEnd = value.search(/[.!?]\s/);
  const compacted = firstSentenceEnd === -1 ? value : value.slice(0, firstSentenceEnd + 1);

  if (compacted.length <= 180) {
    return compacted;
  }

  return `${compacted.slice(0, 177).trim()}...`;
}

function shouldExposeSnippet(value, term) {
  const cleaned = collapseBrokenWhitespace(value);

  return Boolean(
    cleaned.length >= 40
    && cleaned.length <= 320
    && /^[A-Z0-9"']/.test(cleaned)
    && !containsNoisyExtractionText(cleaned)
    && !hasRepeatedHeadwordPrefix(cleaned, term)
  );
}

function sourceCitationDisplay(source) {
  if (source.sourceId === 'anderson_1889') {
    return `Anderson's Law Dictionary (${source.year})`;
  }

  if (source.sourceId === 'osborn_1927' || source.sourceTitle === 'A Concise Law Dictionary') {
    return `Osborn, A Concise Law Dictionary (${source.year})`;
  }

  if (source.sourceId === 'blacks_1910') {
    return `Black's Law Dictionary, 2nd ed. (${source.year})`;
  }

  if (source.sourceId.startsWith('black_') || source.sourceTitle === 'A Dictionary of Law') {
    return `Black, A Dictionary of Law (${source.year})`;
  }

  return source.year ? `${source.sourceTitle} (${source.year})` : source.sourceTitle;
}

function pageDisplay(source) {
  const parts = [`p. ${source.page}`];

  if (Number.isInteger(source.lineNumber)) {
    parts.push(`line ${source.lineNumber}`);
  }

  if (source.headword) {
    parts.push(`headword "${source.headword}"`);
  }

  return parts.join(', ');
}

function sourceReferenceLabel(term) {
  return `Provides exact-term support for "${term}".`;
}

function isGenericReferenceNote(value) {
  return /^(?:Anderson|Black|Lexicon)\s+reference\s+for\s+the\s+displayed\s+legal\s+meaning\.$/i.test(value);
}

function quoteSupportedTerm(verb, term, tail) {
  return `${verb} "${term}" ${tail.trim()}`;
}

function sourceSpecificSupportNote(term, value) {
  const replacements = [
    [/^(?:Black|Anderson|Osborn|Lexicon)\s+references?\s+define\s+(.+?)\s+(as|through|in|with|to)\s+(.+)$/i, 'Defines'],
    [/^(?:Black|Anderson|Osborn|Lexicon)\s+references?\s+describe\s+(.+?)\s+(as|through|in|with|to)\s+(.+)$/i, 'Describes'],
    [/^(?:Black|Anderson|Osborn|Lexicon)\s+references?\s+directly\s+support\s+(.+?)\s+(as|through|in|with|to)\s+(.+)$/i, 'Directly supports'],
    [/^(?:Black|Anderson|Osborn|Lexicon)\s+references?\s+support\s+(.+?)\s+(as|through|in|with|to)\s+(.+)$/i, 'Supports'],
    [/^(?:Black|Anderson|Osborn|Lexicon)\s+references?\s+connect\s+(.+?)\s+(to|with)\s+(.+)$/i, 'Connects'],
    [/^(?:Black|Anderson|Osborn|Lexicon)\s+references?\s+identify\s+(.+?)\s+(as|through|in|with|to)\s+(.+)$/i, 'Identifies'],
    [/^(?:Black|Anderson|Osborn|Lexicon)\s+references?\s+frame\s+(.+?)\s+(as|through|in|with|to)\s+(.+)$/i, 'Frames'],
    [/^(?:Black|Anderson|Osborn|Lexicon)\s+references?\s+provide\s+(.+)$/i, 'Provides'],
  ];

  for (const [pattern, verb] of replacements) {
    const match = pattern.exec(value);
    if (!match) {
      continue;
    }

    if (match.length >= 4) {
      return quoteSupportedTerm(verb, term, `${match[2]} ${match[3]}`);
    }

    return quoteSupportedTerm(verb, term, match[1]);
  }

  return value;
}

function shouldUseCleanedSupportNote(value) {
  return Boolean(
    value.length >= 24
    && value.length <= 180
    && !containsNoisyExtractionText(value)
    && !isGenericReferenceNote(value)
    && !/\b(?:comparator|batch|review queue|review candidate|extraction pipeline|support retained)\b/i.test(value)
  );
}

function sanitizeLexiconSnippet(source, term) {
  const withoutPrefix = removeInternalSupportPrefixes(source.supportNote);
  const stripped = stripRepeatedHeadwordNoise(withoutPrefix.value, term);
  const cleaned = collapseBrokenWhitespace(stripped);
  const explicitSnippet = collapseBrokenWhitespace(source.snippetDisplay);

  if (explicitSnippet && shouldExposeSnippet(explicitSnippet, term)) {
    return {
      snippetDisplay: snippetDisplayValue(explicitSnippet),
      showSnippet: true,
      qualityFlag: 'clean',
    };
  }

  // Stored support notes may contain extraction snippets. They are evidence, not user-facing snippet copy.
  return {
    snippetDisplay: null,
    showSnippet: false,
    qualityFlag: (
      containsNoisyExtractionText(withoutPrefix.value)
      || hasRepeatedHeadwordPrefix(withoutPrefix.value, term)
      || (withoutPrefix.removedPrefix && !shouldExposeSnippet(cleaned, term))
    )
      ? 'suppressed_noisy'
      : 'suppressed',
  };
}

function buildSupportNoteDisplay(source, term) {
  const withoutPrefix = removeInternalSupportPrefixes(source.supportNote);
  const cleaned = collapseBrokenWhitespace(withoutPrefix.value);

  if (!withoutPrefix.removedPrefix && shouldUseCleanedSupportNote(cleaned)) {
    return sourceSpecificSupportNote(term, cleaned);
  }

  return sourceReferenceLabel(term);
}

// User-facing provenance must always be presentation-safe. Raw extraction text is backend evidence, not UI copy.
function formatMeaningSourceForDisplay(source, term) {
  const snippet = sanitizeLexiconSnippet(source, term);

  return Object.freeze({
    sourceId: source.sourceId,
    sourceTitle: source.sourceTitle,
    year: source.year,
    page: source.page,
    lineNumber: source.lineNumber,
    headword: source.headword,
    citationDisplay: sourceCitationDisplay(source),
    pageDisplay: pageDisplay(source),
    supportNoteDisplay: buildSupportNoteDisplay(source, term),
    snippetDisplay: snippet.snippetDisplay,
    showSnippet: snippet.showSnippet,
    qualityFlag: snippet.qualityFlag,
    referenceRole: source.referenceRole,
  });
}

function formatMeaningSourcesForDisplay(sources, term) {
  return Object.freeze(sources.map((source) => formatMeaningSourceForDisplay(source, term)));
}

function loadMeaningSourcesIndex() {
  if (cachedMeaningSourcesByTerm) {
    return cachedMeaningSourcesByTerm;
  }

  const sourcesByTerm = new Map();

  if (!fs.existsSync(meaningSourcesPath)) {
    cachedMeaningSourcesByTerm = sourcesByTerm;
    return cachedMeaningSourcesByTerm;
  }

  const payload = JSON.parse(fs.readFileSync(meaningSourcesPath, 'utf8'));
  const termSources = payload?.terms ?? {};

  Object.entries(termSources).forEach(([term, sources]) => {
    if (typeof term !== 'string' || !Array.isArray(sources)) {
      return;
    }

    const validSources = sources
      .filter((source) => isMeaningSourceRecord(source))
      .map((source) => freezeMeaningSource(source));

    sourcesByTerm.set(term, Object.freeze(validSources));
  });

  cachedMeaningSourcesByTerm = sourcesByTerm;
  return cachedMeaningSourcesByTerm;
}

function getMeaningSourcesForTerm(term) {
  const sources = loadMeaningSourcesIndex().get(term) ?? Object.freeze([]);
  return formatMeaningSourcesForDisplay(sources, term);
}

const TERM_SEMANTIC_OVERRIDES = Object.freeze({
  'ab initio': Object.freeze({
    meaningInLaw: 'From the beginning; in law, treated as starting at the outset.',
  }),
  abandonment: Object.freeze({
    meaningInLaw: 'Intentional relinquishment or surrender of a right, claim, interest, or property.',
  }),
  account: Object.freeze({
    meaningInLaw: 'A detailed statement of mutual demands, debts, credits, or financial dealings between parties.',
  }),
  accounting: Object.freeze({
    meaningInLaw: 'The making and rendering of an account, voluntarily or by order of a court.',
  }),
  adjudication: Object.freeze({
    meaningInLaw: 'A judicial determination or order deciding a legal matter.',
  }),
  administrator: Object.freeze({
    meaningInLaw: 'A person authorized to administer the estate of a deceased person.',
  }),
  affidavit: Object.freeze({
    meaningInLaw: 'A written statement of facts sworn or affirmed before an authorized officer.',
  }),
  alienation: Object.freeze({
    meaningInLaw: 'The transfer of property or possession, especially of real property, from one person to another.',
  }),
  allocation: Object.freeze({
    meaningInLaw: 'The appropriation of a fund or allowance to particular persons or purposes.',
  }),
  amnesty: Object.freeze({
    meaningInLaw: 'A governmental act forgiving or overlooking past offenses, especially in public or international-law contexts.',
  }),
  ancestor: Object.freeze({
    meaningInLaw: 'A lineal ascendant or predecessor in a direct line of descent.',
  }),
  appeal: Object.freeze({
    meaningInLaw: 'A proceeding by which a party brings a decision before a higher court or tribunal for review or correction.',
  }),
  apportionment: Object.freeze({
    meaningInLaw: 'Division or assignment of a subject matter into proportionate shares.',
  }),
  appurtenance: Object.freeze({
    meaningInLaw: 'A right, thing, or incident connected with the use or enjoyment of a principal thing.',
  }),
  attestation: Object.freeze({
    meaningInLaw: 'The act of witnessing the execution of a written instrument and subscribing as a witness.',
  }),
  authentication: Object.freeze({
    meaningInLaw: 'Official or legal attestation that a copy, record, act, or other matter is genuine or duly done.',
  }),
  audit: Object.freeze({
    meaningInLaw: 'An official examination of accounts, vouchers, or financial records.',
  }),
  bailee: Object.freeze({
    meaningInLaw: 'A person to whom possession of goods or personal property is entrusted under a bailment.',
  }),
  bailment: Object.freeze({
    meaningInLaw: 'Delivery of personal property to another for custody, service, or another particular purpose, usually with a duty to return or account for it.',
  }),
  bailor: Object.freeze({
    meaningInLaw: 'A person who delivers personal property to another under a bailment.',
  }),
  beneficiary: Object.freeze({
    meaningInLaw: 'A person for whose benefit a trust or similar legal arrangement is created.',
  }),
  bequest: Object.freeze({
    meaningInLaw: 'A gift of personal property by will, or the clause or thing so given.',
  }),
  betterment: Object.freeze({
    meaningInLaw: 'An improvement made to real property or an estate.',
  }),
  bond: Object.freeze({
    meaningInLaw: 'A sealed or formal obligation by which a person binds themselves to pay money or perform a condition.',
  }),
  cassation: Object.freeze({
    meaningInLaw: 'In French-law usage, quashing or annulment of a lower-court judgment.',
  }),
  chattel: Object.freeze({
    meaningInLaw: 'An item of personal property, especially movable property as distinct from land.',
  }),
  citizenship: Object.freeze({
    meaningInLaw: 'The legal status of being a citizen.',
  }),
  cohabitation: Object.freeze({
    meaningInLaw: 'Living together in a way that may have legal significance, especially as evidence bearing on marriage.',
  }),
  compensation: Object.freeze({
    meaningInLaw: 'Payment or redress given to make amends for loss, injury, or damage.',
  }),
  complaint: Object.freeze({
    meaningInLaw: 'An initial pleading by which a plaintiff starts a civil action and states the claim.',
  }),
  contribution: Object.freeze({
    meaningInLaw: 'The sharing of a loss, liability, or payment among persons responsible for it.',
  }),
  conveyance: Object.freeze({
    meaningInLaw: 'An act or instrument by which a right or property interest is transferred.',
  }),
  credit: Object.freeze({
    meaningInLaw: 'The ability to obtain money, goods, or financial accommodation on the expectation of later payment.',
  }),
  creditor: Object.freeze({
    meaningInLaw: 'A person to whom a debt or obligation is owed.',
  }),
  custody: Object.freeze({
    meaningInLaw: 'Care, keeping, or control of a person, thing, or property.',
  }),
  damages: Object.freeze({
    meaningInLaw: 'Money recoverable in court as compensation or indemnity for loss, injury, or detriment.',
  }),
  debenture: Object.freeze({
    meaningInLaw: 'A written instrument, often under seal, issued as security for a loan or acknowledging a debt.',
  }),

  deposition: Object.freeze({
    meaningInLaw: 'A statement or testimony given under oath outside open court and recorded for use in a proceeding.',
  }),
  divorce: Object.freeze({
    meaningInLaw: 'A court-ordered legal separation or dissolution of the marriage relationship.',
  }),
  dowry: Object.freeze({
    meaningInLaw: 'Historically, property a woman brought to her husband in marriage, often described as a portion.',
  }),
  emancipation: Object.freeze({
    meaningInLaw: 'The legal act of freeing a person from another\'s control or legal disability.',
  }),
  employment: Object.freeze({
    meaningInLaw: 'Occupation, service, or a position involving business or work.',
  }),
  evidence: Object.freeze({
    meaningInLaw: 'Information, testimony, documents, or other material used in legal proceedings to prove or disprove a fact.',
  }),
  executor: Object.freeze({
    meaningInLaw: 'A person appointed by a will to carry out its directions and administer the testator\'s estate.',
  }),
  filiation: Object.freeze({
    meaningInLaw: 'The legal relation of a child to a parent, including formal attribution of parentage.',
  }),
  garnishment: Object.freeze({
    meaningInLaw: 'A legal process by which a third party holding another person\'s money or property is warned or required to answer or retain it.',
  }),
  guardian: Object.freeze({
    meaningInLaw: 'A person with the legal right and duty to protect or manage another person or that person\'s property.',
  }),
  indemnity: Object.freeze({
    meaningInLaw: 'Compensation for loss, or an undertaking to make good a loss that may be sustained.',
  }),
  injunction: Object.freeze({
    meaningInLaw: 'A court order requiring a party to do, or refrain from doing, a specified act.',
  }),
  levy: Object.freeze({
    meaningInLaw: 'A seizure or collection made under legal authority, especially to satisfy an execution.',
  }),
  penalty: Object.freeze({
    meaningInLaw: 'A monetary sum or other sanction imposed for failure to perform an obligation or for violating a rule.',
  }),
  agency: Object.freeze({
    meaningInLaw: 'A relationship in which one person is authorized to manage or transact an affair for another.',
  }),
  agent: Object.freeze({
    meaningInLaw: 'A person authorized or employed to act on behalf of another in a business, legal, or other affair.',
  }),
  association: Object.freeze({
    meaningInLaw: 'A group of persons joined together for a special purpose, business, or designated affair.',
  }),
  'best evidence': Object.freeze({
    meaningInLaw: 'Primary or original evidence, distinguished from secondary or substitute evidence.',
  }),
  best_evidence: Object.freeze({
    meaningInLaw: 'Primary or original evidence, distinguished from secondary or substitute evidence.',
  }),
  board: Object.freeze({
    meaningInLaw: 'An official or organizational body of persons authorized to manage, supervise, or administer a matter.',
  }),
  boycott: Object.freeze({
    meaningInLaw: 'A concerted refusal or effort to deal with a person or business, historically discussed in law as business-interference conduct.',
  }),
  'burden of proof': Object.freeze({
    meaningInLaw: 'The necessity or duty of affirmatively proving a fact or issue.',
  }),
  burden_of_proof: Object.freeze({
    meaningInLaw: 'The necessity or duty of affirmatively proving a fact or issue.',
  }),
  burden: Object.freeze({
    meaningInLaw: 'A charge, obligation, duty, or disadvantage borne by a person or thing.',
  }),
  breach: Object.freeze({
    meaningInLaw: 'The breaking or violating of a law, right, or duty, either by commission or omission.',
  }),
  certainty: Object.freeze({
    meaningInLaw: 'Distinctness, clearness, or particularity in a legal statement, especially in pleading.',
  }),
  commitment: Object.freeze({
    meaningInLaw: 'In practice, the warrant or mittimus by which a court or magistrate directs an officer to take a person to prison.',
  }),
  committee: Object.freeze({
    meaningInLaw: 'A body of persons to whom consideration or management of a matter is committed or referred.',
  }),
  company: Object.freeze({
    meaningInLaw: 'An association of persons united for a common business, commercial, or other object.',
  }),
  corporation: Object.freeze({
    meaningInLaw: 'A legal entity created or recognized under law, commonly organized under a distinct name.',
  }),
  credibility: Object.freeze({
    meaningInLaw: 'Worthiness of belief, especially the quality that makes a witness or statement believable.',
  }),
  exhibit: Object.freeze({
    meaningInLaw: 'A document or thing produced, identified, and shown as evidence in a proceeding.',
  }),
  foreclosure: Object.freeze({
    meaningInLaw: 'A proceeding or decree that cuts off the mortgagor\'s right to redeem mortgaged property.',
  }),
  governor: Object.freeze({
    meaningInLaw: 'A chief executive or chief civil officer of a state, territory, colony, province, or similar political unit.',
  }),
  hearing: Object.freeze({
    meaningInLaw: 'A court proceeding or stage at which the court hears argument or matter submitted by the parties.',
  }),
  hearsay: Object.freeze({
    meaningInLaw: 'Testimony in which a witness relates what others said or reported, rather than personal knowledge.',
  }),
  inference: Object.freeze({
    meaningInLaw: 'A conclusion or proposition drawn by reasoning from another fact or proposition.',
  }),
  inspection: Object.freeze({
    meaningInLaw: 'An examination or viewing of a person, thing, or matter under legal process or authority.',
  }),
  insufficiency: Object.freeze({
    meaningInLaw: 'In pleading, legal inadequacy such as an answer that fails to respond sufficiently to material allegations.',
  }),
  interpleader: Object.freeze({
    meaningInLaw: 'A procedure used when multiple persons claim the same property or fund held by a third party who claims no interest in it.',
  }),
  intervention: Object.freeze({
    meaningInLaw: 'A proceeding by which a nonparty becomes a party to a pending suit on that person\'s own motion.',
  }),
  joinder: Object.freeze({
    meaningInLaw: 'The joining together of parties, claims, issues, or other procedural elements in a legal proceeding.',
  }),
  materiality: Object.freeze({
    meaningInLaw: 'The quality of having legal significance or relevance to an issue.',
  }),
  misjoinder: Object.freeze({
    meaningInLaw: 'The improper joining of parties, claims, or proceedings in a suit.',
  }),
  mortgage: Object.freeze({
    meaningInLaw: 'A conveyance or security interest in property given to secure payment of a debt or obligation.',
  }),
  motion: Object.freeze({
    meaningInLaw: 'An application to a court by a party or counsel seeking a rule, order, or other action.',
  }),
  notice: Object.freeze({
    meaningInLaw: 'Knowledge, information, or legally sufficient communication of a fact or state of affairs.',
  }),
  notoriety: Object.freeze({
    meaningInLaw: 'The state of being generally or widely known.',
  }),
  petition: Object.freeze({
    meaningInLaw: 'A written application or request presented to an authority for the exercise of its power.',
  }),
  pleading: Object.freeze({
    meaningInLaw: 'The formal system or practice by which parties state claims, defenses, and issues in a legal proceeding.',
  }),
  possession: Object.freeze({
    meaningInLaw: 'Physical detention, custody, or control of property with an accompanying intent, right, or claim to hold it.',
  }),
  preponderance: Object.freeze({
    meaningInLaw: 'Superiority of weight or greater persuasive force, especially in weighing evidence.',
  }),
  presumption: Object.freeze({
    meaningInLaw: 'An inference or legal assumption drawn from law or fact until displaced where proof permits.',
  }),
  probation: Object.freeze({
    meaningInLaw: 'In criminal procedure, conditional release or discharge of an offender subject to recognizance, good behavior, or other legal terms.',
  }),

  process: Object.freeze({
    meaningInLaw: 'A writ or other court proceeding used to compel appearance, action, or response in a legal cause.',
  }),
  rejoinder: Object.freeze({
    meaningInLaw: 'In common-law pleading, a defendant\'s answer to the plaintiff\'s replication.',
  }),
  reply: Object.freeze({
    meaningInLaw: 'A plaintiff\'s or petitioner\'s answer to the defendant\'s case or response.',
  }),
  review: Object.freeze({
    meaningInLaw: 'A reconsideration or reexamination of a matter for correction, revision, or reversal.',
  }),
  submission: Object.freeze({
    meaningInLaw: 'The placing of a dispute, question, or matter before another for decision, especially by agreement to arbitration.',
  }),
  surplusage: Object.freeze({
    meaningInLaw: 'Excess, residue, or unnecessary matter, including matter treated as extraneous in a legal instrument or record.',
  }),
  testimony: Object.freeze({
    meaningInLaw: 'Evidence given by a witness under oath or affirmation.',
  }),
  title: Object.freeze({
    meaningInLaw: 'A lawful basis, right, or document establishing a claim to property.',
  }),
  transcript: Object.freeze({
    meaningInLaw: 'An official copy of court proceedings or records.',
  }),
  trial: Object.freeze({
    meaningInLaw: 'The examination and decision of a matter of law or fact by a competent court or tribunal.',
  }),
  witness: Object.freeze({
    meaningInLaw: 'A person who gives evidence in a proceeding, has knowledge of an event, or attests a legal instrument.',
  }),
  debt: Object.freeze({
    meaningInLaw: 'A sum of money or liquidated demand that is due or owing.',
  }),
  debtor: Object.freeze({
    meaningInLaw: 'A person who owes a debt.',
  }),
  distribution: Object.freeze({
    meaningInLaw: 'The division and apportionment of an estate or property among persons entitled to it.',
  }),
  easement: Object.freeze({
    meaningInLaw: 'A servitude or right enjoyed over another person\'s land, such as a right of way or other use.',
  }),
  'fee simple': Object.freeze({
    meaningInLaw: 'An absolute and unqualified estate of inheritance in land.',
  }),
  fee_simple: Object.freeze({
    meaningInLaw: 'An absolute and unqualified freehold estate of inheritance.',
  }),
  franchise: Object.freeze({
    meaningInLaw: 'A special liberty, privilege, or authority conferred by the sovereign or government.',
  }),
  fund: Object.freeze({
    meaningInLaw: 'A sum of money or capital set apart or available for a particular purpose, debt, or claim.',
  }),
  heir: Object.freeze({
    meaningInLaw: 'A person on whom an estate or property right descends by law immediately on another\'s death.',
  }),
  holding: Object.freeze({
    meaningInLaw: 'In land usage, a piece of land held under a lease or similar tenancy.',
  }),
  homestead: Object.freeze({
    meaningInLaw: 'A home place or fixed residence, often including the dwelling and adjoining land.',
  }),
  hypothecation: Object.freeze({
    meaningInLaw: 'A pledge or mortgage of property as security for a debt, generally without transferring possession.',
  }),
  inheritance: Object.freeze({
    meaningInLaw: 'An estate or property interest descending to an heir.',
  }),
  lease: Object.freeze({
    meaningInLaw: 'A conveyance or grant of possession of property for a term, often in return for rent or other recompense.',
  }),
  leasehold: Object.freeze({
    meaningInLaw: 'An estate in real property held under a lease, commonly for a fixed term of years.',
  }),
  lessee: Object.freeze({
    meaningInLaw: 'A person to whom a lease is made and who holds an estate by virtue of it.',
  }),
  lessor: Object.freeze({
    meaningInLaw: 'A person who grants a lease.',
  }),
  license: Object.freeze({
    meaningInLaw: 'Permission from a competent authority to do an act that would otherwise lack authorization.',
  }),
  licensor: Object.freeze({
    meaningInLaw: 'A person who gives or grants a license.',
  }),
  lien: Object.freeze({
    meaningInLaw: 'A creditor\'s qualified right or charge over specific property as security for a debt or obligation.',
  }),
  marriage: Object.freeze({
    meaningInLaw: 'A legally recognized marital relation founded on consent and treated as a civil status or contract.',
  }),
  mortgagor: Object.freeze({
    meaningInLaw: 'A person who gives or grants a mortgage.',
  }),
  occupancy: Object.freeze({
    meaningInLaw: 'Possession, actual control, or occupation of property or premises.',
  }),
  ownership: Object.freeze({
    meaningInLaw: 'The right to exclusive enjoyment, possession, or dominion over a thing.',
  }),
  patent: Object.freeze({
    meaningInLaw: 'A governmental or sovereign grant of a privilege, property, authority, or exclusive right.',
  }),
  patentee: Object.freeze({
    meaningInLaw: 'A person to whom a patent has been granted.',
  }),
  payment: Object.freeze({
    meaningInLaw: 'Performance or discharge of a debt, duty, promise, or obligation, often by delivery of money.',
  }),
  pardon: Object.freeze({
    meaningInLaw: 'An act of legal forgiveness or grace releasing a person from punishment for an offense.',
  }),
  pledge: Object.freeze({
    meaningInLaw: 'A bailment of goods to a creditor as security for a debt or engagement.',
  }),
  pledgee: Object.freeze({
    meaningInLaw: 'The party to whom goods are delivered or pledged as security.',
  }),
  pledgor: Object.freeze({
    meaningInLaw: 'The party who delivers goods in pledge.',
  }),
  premium: Object.freeze({
    meaningInLaw: 'A reward, recompense, price, or sum paid or payable, including as consideration for insurance.',
  }),
  price: Object.freeze({
    meaningInLaw: 'The consideration, usually money, given for the purchase of a thing.',
  }),
  rate: Object.freeze({
    meaningInLaw: 'A proportional or relative value, measure, degree, or standard by which quantity or value is adjusted.',
  }),
  remainder: Object.freeze({
    meaningInLaw: 'A future estate that takes effect after the end of a prior particular estate.',
  }),
  reversion: Object.freeze({
    meaningInLaw: 'A future interest remaining in a grantor or the grantor\'s heirs after a prior estate ends.',
  }),
  royalty: Object.freeze({
    meaningInLaw: 'A prerogative or superior right, and in property or commercial usage a payment due for use of a mine, patent, publication, or similar right.',
  }),
  security: Object.freeze({
    meaningInLaw: 'A surety, assurance, indemnity, or instrument furnished to secure payment, performance, or another obligation.',
  }),
  servitude: Object.freeze({
    meaningInLaw: 'In property or civil-law usage, a burden or easement attached to property for another estate or person.',
  }),
  succession: Object.freeze({
    meaningInLaw: 'The transmission or taking of property, rights, duties, or legal position from one person to another.',
  }),
  taxation: Object.freeze({
    meaningInLaw: 'The imposition and levying of a tax or enforced pecuniary contribution.',
  }),
  tenure: Object.freeze({
    meaningInLaw: 'The manner or system by which land or an estate is held, historically of a superior.',
  }),
  testament: Object.freeze({
    meaningInLaw: 'A will or testamentary disposition directing the disposition of property after death.',
  }),
  transfer: Object.freeze({
    meaningInLaw: 'The passing or conveyance of a right, property, or interest from one person to another.',
  }),
  transferee: Object.freeze({
    meaningInLaw: 'A person to whom a transfer is made.',
  }),
  trust: Object.freeze({
    meaningInLaw: 'A legal relationship in which property is held by one person for another person or purpose.',
  }),
  trustee: Object.freeze({
    meaningInLaw: 'A person appointed or required to execute a trust or hold property for trust purposes.',
  }),
  usufructuary: Object.freeze({
    meaningInLaw: 'In civil-law usage, a person who has the right to enjoy property in which they do not own the property itself.',
  }),
  ward: Object.freeze({
    meaningInLaw: 'A person, commonly a minor or protected person, who is under another\'s guardianship, care, or legal protection.',
  }),
  damage: Object.freeze({
    meaningInLaw: 'Loss, injury, or deterioration caused to a person, right, property, or interest.',
  }),
  deceit: Object.freeze({
    meaningInLaw: 'A fraudulent misrepresentation, device, or artifice by which one person misleads another to that person\'s injury.',
  }),
  default: Object.freeze({
    meaningInLaw: 'Failure to appear, pay, perform, or do what a legal duty requires.',
  }),
  delict: Object.freeze({
    meaningInLaw: 'In civil-law usage, a wrong, injury, offense, or violation of public or private duty.',
  }),
  failure: Object.freeze({
    meaningInLaw: 'A deficiency, lack, omission, neglect of duty, or unsuccessful attempt.',
  }),
  fraud: Object.freeze({
    meaningInLaw: 'Intentional deceit, false representation, or other dishonest practice used to obtain an advantage or injure another.',
  }),
  guardianship: Object.freeze({
    meaningInLaw: 'The office, duty, authority, or legal relation of a guardian toward a ward.',
  }),
  infringement: Object.freeze({
    meaningInLaw: 'A breaking, encroachment, trespass, or violation of a law, regulation, contract, or right.',
  }),
  injury: Object.freeze({
    meaningInLaw: 'A wrong or damage done to another person, right, reputation, or property.',
  }),
  interference: Object.freeze({
    meaningInLaw: 'In patent-law usage, a collision between rights claimed or granted.',
  }),
  intestacy: Object.freeze({
    meaningInLaw: 'The condition of dying without having made a valid will.',
  }),
  intrusion: Object.freeze({
    meaningInLaw: 'In property law, an entry by a stranger into a freehold after a prior estate ends and before the next estate takes effect.',
  }),
  legatee: Object.freeze({
    meaningInLaw: 'A person to whom a legacy or testamentary gift is given.',
  }),
  lineage: Object.freeze({
    meaningInLaw: 'Ancestry or line of descent, ascending or descending.',
  }),
  malfeasance: Object.freeze({
    meaningInLaw: 'The wrongful or unjust doing of an act that the actor has no right to perform.',
  }),
  misconduct: Object.freeze({
    meaningInLaw: 'Unlawful or improper conduct, especially conduct prejudicing legal rights or the proper administration of justice.',
  }),
  misfeasance: Object.freeze({
    meaningInLaw: 'The improper performance of a lawful act, or a misdeed or trespass.',
  }),
  misrepresentation: Object.freeze({
    meaningInLaw: 'A false statement of fact that misleads another, especially where material to legal rights or injury.',
  }),
  nuisance: Object.freeze({
    meaningInLaw: 'An unlawful act, condition, or use that works hurt, inconvenience, or damage to another person or to the public.',
  }),
  officer: Object.freeze({
    meaningInLaw: 'A person lawfully invested with an office or charged by authority with duties or powers.',
  }),
  partnership: Object.freeze({
    meaningInLaw: 'A voluntary contract between two or more persons to contribute property, labor, skill, or effects to lawful business for shared profit and loss.',
  }),
  patrimony: Object.freeze({
    meaningInLaw: 'An estate or property right inherited from a father or other ancestor.',
  }),
  perjury: Object.freeze({
    meaningInLaw: 'A willful false assertion under oath or as evidence in a judicial proceeding on a matter of fact, belief, or knowledge.',
  }),
  principal: Object.freeze({
    meaningInLaw: 'Chief, leading, highest in rank or degree, or the source of authority or right.',
  }),
  publication: Object.freeze({
    meaningInLaw: 'The act of making something public or accessible to public notice, including official publishing of laws or notices.',
  }),
  punishment: Object.freeze({
    meaningInLaw: 'Pain, penalty, suffering, or confinement inflicted by legal authority for an offense.',
  }),
  recoupment: Object.freeze({
    meaningInLaw: 'A reduction, discount, or keeping back from a demand because of a connected claim or defense.',
  }),
  redemption: Object.freeze({
    meaningInLaw: 'The act or right of buying back or recovering property by payment or performance, especially by paying a mortgage debt.',
  }),
  redress: Object.freeze({
    meaningInLaw: 'Satisfaction, relief, or remedy for an injury sustained.',
  }),
  remedy: Object.freeze({
    meaningInLaw: 'A means provided by law to prevent, enforce, or redress the violation of a right.',
  }),
  reparation: Object.freeze({
    meaningInLaw: 'Redress or amends for an injury or wrong.',
  }),
  reprieve: Object.freeze({
    meaningInLaw: 'A temporary suspension of the execution of a sentence.',
  }),
  rescission: Object.freeze({
    meaningInLaw: 'The abrogation, cancellation, or revocation of a contract or transaction.',
  }),
  restitution: Object.freeze({
    meaningInLaw: 'Restoration of a person, thing, right, or condition to its former owner, position, or state.',
  }),
  sentence: Object.freeze({
    meaningInLaw: 'The judgment formally pronounced by a court, especially after conviction in a criminal case.',
  }),
  shareholder: Object.freeze({
    meaningInLaw: 'A person who holds shares in a corporation or has agreed to become a member by taking shares.',
  }),
  subrogation: Object.freeze({
    meaningInLaw: 'The substitution of one person or thing for another with respect to rights, claims, or obligations.',
  }),
  successor: Object.freeze({
    meaningInLaw: 'A person who succeeds to the rights, place, or position of another.',
  }),
  suspension: Object.freeze({
    meaningInLaw: 'A temporary stopping of a right, law, power, proceeding, or similar legal operation.',
  }),
  testacy: Object.freeze({
    meaningInLaw: 'The legal condition of leaving a valid will at death.',
  }),
  testator: Object.freeze({
    meaningInLaw: 'A person who makes or has made a testament or will.',
  }),
  trespass: Object.freeze({
    meaningInLaw: 'A wrongful act or misfeasance by which one person injures another person, property, or rights.',
  }),
  uncertainty: Object.freeze({
    meaningInLaw: 'Vagueness, obscurity, or confusion in an instrument that makes it difficult to understand, execute, or apply.',
  }),
  vacatur: Object.freeze({
    meaningInLaw: 'A rule or order by which a proceeding is vacated.',
  }),
  acceptance: Object.freeze({
    meaningInLaw: 'The taking or receiving of something with approval, assent, or intent to retain.',
  }),
  alibi: Object.freeze({
    meaningInLaw: 'In criminal law, presence elsewhere or in another place when the alleged act occurred.',
  }),
  arrest: Object.freeze({
    meaningInLaw: 'The deprivation of a person\'s liberty under lawful authority.',
  }),
  assault: Object.freeze({
    meaningInLaw: 'An unlawful attempt or offer, with force or violence, to inflict bodily hurt on another.',
  }),
  assembly: Object.freeze({
    meaningInLaw: 'A meeting, gathering, or body of persons assembled, including a legislative body in some states.',
  }),
  assignment: Object.freeze({
    meaningInLaw: 'The transfer of a right, interest, property, or claim from one person to another.',
  }),
  charter: Object.freeze({
    meaningInLaw: 'An instrument or grant from sovereign authority conferring rights, franchises, or powers.',
  }),
  citizen: Object.freeze({
    meaningInLaw: 'A member of a political or jural community who possesses civil rights and privileges under its law.',
  }),
  code: Object.freeze({
    meaningInLaw: 'A collection, compendium, or systematized statement of laws or procedure enacted as positive law.',
  }),
  condition: Object.freeze({
    meaningInLaw: 'A provision, qualification, event, or circumstance on which an estate, right, duty, or legal effect depends.',
  }),
  condonation: Object.freeze({
    meaningInLaw: 'Conditional forgiveness or remission of a matrimonial offense, with knowledge, treating the marriage as continuing.',
  }),
  consideration: Object.freeze({
    meaningInLaw: 'The inducement, benefit, detriment, loss, or responsibility that supports a promise or contract.',
  }),
  custom: Object.freeze({
    meaningInLaw: 'A long-established usage or practice that has acquired the force of law.',
  }),
  dictum: Object.freeze({
    meaningInLaw: 'A statement, remark, observation, or judicial opinion expressed in a case.',
  }),
  duress: Object.freeze({
    meaningInLaw: 'Unlawful constraint that forces a person to do an act against that person\'s will.',
  }),
  election: Object.freeze({
    meaningInLaw: 'A legal choice or selection between persons, rights, remedies, or courses of action.',
  }),
  elector: Object.freeze({
    meaningInLaw: 'A qualified voter or person who has the right to vote in the choice of an officer.',
  }),
  excuse: Object.freeze({
    meaningInLaw: 'A reason alleged for doing or not doing a thing, or for relief or exemption from duty or obligation.',
  }),
  exoneration: Object.freeze({
    meaningInLaw: 'The removal of a burden, charge, duty, or liability from a person or estate.',
  }),
  force: Object.freeze({
    meaningInLaw: 'Power in action, compulsion, or strength directed to an end.',
  }),
  forum: Object.freeze({
    meaningInLaw: 'A court, judicial tribunal, place of jurisdiction, or place where redress is sought.',
  }),
  imprisonment: Object.freeze({
    meaningInLaw: 'The confinement or restraint of a person\'s liberty or power of locomotion.',
  }),
  indictment: Object.freeze({
    meaningInLaw: 'A written accusation of crime found and presented by a grand jury to a court.',
  }),
  insanity: Object.freeze({
    meaningInLaw: 'Unsoundness or disorder of mind arising from disease or defect and affecting mental faculties.',
  }),
  instrument: Object.freeze({
    meaningInLaw: 'A written, formal, or legal document, such as a contract, deed, will, bond, or writ.',
  }),
  judiciary: Object.freeze({
    meaningInLaw: 'The branch or system of government invested with judicial power and related to courts of justice.',
  }),
  justification: Object.freeze({
    meaningInLaw: 'A showing or allegation of sufficient legal reason why an act complained of was lawful.',
  }),
  legislator: Object.freeze({
    meaningInLaw: 'A lawmaker or member of a legislative body.',
  }),
  liberty: Object.freeze({
    meaningInLaw: 'Freedom or exemption from restraint, servitude, imprisonment, or extraneous control.',
  }),
  minority: Object.freeze({
    meaningInLaw: 'The state or condition of being a minor; infancy.',
  }),
  mistake: Object.freeze({
    meaningInLaw: 'An unintentional act, omission, or error arising from ignorance, surprise, imposition, or misplaced confidence.',
  }),
  mitigation: Object.freeze({
    meaningInLaw: 'Alleviation, abatement, or reduction in the severity or amount of a penalty, punishment, or damages.',
  }),
  necessity: Object.freeze({
    meaningInLaw: 'A controlling force, irresistible compulsion, or constraint that may excuse an otherwise wrongful act.',
  }),
  negligence: Object.freeze({
    meaningInLaw: 'Failure to do what a reasonable and prudent person would do, or doing what such a person would not do, under the circumstances.',
  }),
  nonfeasance: Object.freeze({
    meaningInLaw: 'The neglect or failure to do an act that a person ought to do.',
  }),
  obstruction: Object.freeze({
    meaningInLaw: 'In property usage, an obstruction is an injury or impediment affecting an incorporeal hereditament or similar legal right.',
  }),
  ordinance: Object.freeze({
    meaningInLaw: 'A rule established by authority, including a permanent rule of action or municipal enactment.',
  }),
  policy: Object.freeze({
    meaningInLaw: 'The general principles or purpose by which government, legislation, or a rule of law is guided.',
  }),
  precedent: Object.freeze({
    meaningInLaw: 'An adjudged case or court decision used as an example or authority for a later similar case.',
  }),
  privilege: Object.freeze({
    meaningInLaw: 'A peculiar benefit, advantage, right, exemption, or immunity enjoyed by a person, body, or class.',
  }),
  provocation: Object.freeze({
    meaningInLaw: 'The act of inciting another to do a particular deed.',
  }),
  release: Object.freeze({
    meaningInLaw: 'An act or instrument by which a claim, right, interest, restraint, liability, or confinement is discharged or surrendered.',
  }),
  restraint: Object.freeze({
    meaningInLaw: 'Confinement, abridgment, limitation, or prohibition of action.',
  }),
  sanctuary: Object.freeze({
    meaningInLaw: 'In old law, a privileged or consecrated place of asylum where ordinary process could not be executed.',
  }),
  sovereignty: Object.freeze({
    meaningInLaw: 'Supreme political authority or power governing a body politic or state.',
  }),
  treason: Object.freeze({
    meaningInLaw: 'Breach of allegiance or an offense against the government or sovereign to whom allegiance is owed.',
  }),
  treaty: Object.freeze({
    meaningInLaw: 'An agreement between two or more independent states.',
  }),
  warranty: Object.freeze({
    meaningInLaw: 'A guaranty, assurance, covenant, or stipulation concerning title, quality, quantity, fact, or performance.',
  }),
  will: Object.freeze({
    meaningInLaw: 'A legal declaration of a person\'s wishes for the disposition of property after death.',
  }),
  "abduction": Object.freeze({
    meaningInLaw: "In criminal law, taking away a wife, child, or ward by fraud, persuasion, or open violence.",
  }),
  "accord": Object.freeze({
    meaningInLaw: "A satisfaction agreed upon between the party injuring and the party injured which, when performed, bars the claim.",
  }),
  "accord and satisfaction": Object.freeze({
    meaningInLaw: "An agreement to accept substituted performance or payment, together with the satisfaction that extinguishes or bars the original claim.",
  }),
  "acquittal": Object.freeze({
    meaningInLaw: "In criminal practice, the legal discharge of an accused person from a criminal accusation by verdict or judgment.",
  }),
  "amendment": Object.freeze({
    meaningInLaw: "The correction of an error in a legal process, pleading, or proceeding.",
  }),
  "appointment": Object.freeze({
    meaningInLaw: "The exercise of a right to designate the person or persons who are to take a use, or the selection or designation of a person for an office or place of trust.",
  }),
  "arraignment": Object.freeze({
    meaningInLaw: "In criminal practice, calling the defendant to court to answer the accusation contained in the indictment.",
  }),
  "article": Object.freeze({
    meaningInLaw: "A separate and distinct part of an instrument, writing, or connected whole.",
  }),
  "assent": Object.freeze({
    meaningInLaw: "Compliance, approval, or a declaration of willingness to do something in response to a request.",
  }),
  "assignee": Object.freeze({
    meaningInLaw: "A person to whom an assignment is made or property is transferred.",
  }),
  "assignor": Object.freeze({
    meaningInLaw: "A person who makes an assignment or transfers property to another.",
  }),
  "battery": Object.freeze({
    meaningInLaw: "Any unlawful beating or wrongful physical touching of another person.",
  }),
  "blockade": Object.freeze({
    meaningInLaw: "In international law, a marine investment or beleaguering of a town, harbor, or seaport to prevent access or communication.",
  }),
  "burglary": Object.freeze({
    meaningInLaw: "In criminal law, breaking and entering the house of another at night with intent to commit a felony.",
  }),
  "capture": Object.freeze({
    meaningInLaw: "In international or maritime-law usage, the taking or wresting of property by force, including belligerent or prize-related taking.",
  }),
  "command": Object.freeze({
    meaningInLaw: "An order, imperative direction, or behest.",
  }),
  "competency": Object.freeze({
    meaningInLaw: "In evidence, the presence of qualities, or absence of disabilities, that makes a person legally fit to testify.",
  }),
  "compromise": Object.freeze({
    meaningInLaw: "An arrangement, in or out of court, for settling a dispute on terms the parties treat as equitable.",
  }),
  "compulsion": Object.freeze({
    meaningInLaw: "Constraint, objective necessity, or forcible inducement to the commission of an act.",
  }),
  "conspiracy": Object.freeze({
    meaningInLaw: "A combination or agreement of two or more persons to accomplish an unlawful purpose or a lawful purpose by unlawful means.",
  }),
  "constitution": Object.freeze({
    meaningInLaw: "In public law, the organic and fundamental law establishing the character and framework of a nation or state government.",
  }),
  "constraint": Object.freeze({
    meaningInLaw: "A restraint.",
  }),
  "conviction": Object.freeze({
    meaningInLaw: "The finding or result of a criminal trial that a person is guilty as charged.",
  }),
  "crime": Object.freeze({
    meaningInLaw: "An act or omission in violation of public law and treated as a public wrong subject to punishment.",
  }),
  "delegation": Object.freeze({
    meaningInLaw: "A putting into commission or entrusting another with power to act for those who depute him.",
  }),
  "deprivation": Object.freeze({
    meaningInLaw: "In English ecclesiastical law, the taking away from a clergyman of a benefice or other spiritual promotion or dignity.",
  }),
  "designation": Object.freeze({
    meaningInLaw: "In will usage, a description or descriptive expression by which a person or thing is denoted.",
  }),
  "detainer": Object.freeze({
    meaningInLaw: "The withholding of possession from a person lawfully entitled to land or goods, or the restraint of a person's liberty.",
  }),
  "domicile": Object.freeze({
    meaningInLaw: "The place where a person has fixed habitation with the present intention of making a permanent home.",
  }),
  "embargo": Object.freeze({
    meaningInLaw: "A proclamation or order of state, usually in time of war or threatened hostilities, prohibiting the departure or detaining ships or property.",
  }),
  "escrow": Object.freeze({
    meaningInLaw: "A writing or deed delivered to a third person to be held until a condition is performed or a contingency occurs.",
  }),
  "exception": Object.freeze({
    meaningInLaw: "In practice, a formal objection to the court's action during trial, including refusal of a request or overruling of an objection.",
  }),
  "exemption": Object.freeze({
    meaningInLaw: "Freedom or immunity from a general duty, service, burden, tax, or charge.",
  }),
  "knowledge": Object.freeze({
    meaningInLaw: "A state distinguished from belief by the degree of certainty.",
  }),
  "occupation": Object.freeze({
    meaningInLaw: "Possession, control, tenure, or use, especially physical control over land.",
  }),
  "promise": Object.freeze({
    meaningInLaw: "A verbal or written declaration by which a person binds himself to do or forbear from doing an act.",
  }),
  "prosecution": Object.freeze({
    meaningInLaw: "A criminal action or proceeding instituted and carried on by due course of law.",
  }),
  "ratification": Object.freeze({
    meaningInLaw: "The confirmation or adoption of a previous act, contract, or transaction.",
  }),
  "recklessness": Object.freeze({
    meaningInLaw: "Rashness, heedlessness, or wanton conduct as a state of mind accompanying an act.",
  }),
  "remoteness": Object.freeze({
    meaningInLaw: "Want of close connection between a wrong and an injury as cause and effect.",
  }),
  "restriction": Object.freeze({
    meaningInLaw: "In registered land usage, an entry on a register limiting dealings with registered land.",
  }),
  "section": Object.freeze({
    meaningInLaw: "The smallest distinct and numbered part of a text-book, code, statute, or other juridical writing.",
  }),
  "sedition": Object.freeze({
    meaningInLaw: "An insurrectionary movement tending toward treason but lacking an overt act, including attempts by meetings, speeches, or publications to disturb public order.",
  }),
  "seizure": Object.freeze({
    meaningInLaw: "The act of taking a person or property into legal custody under authority of law.",
  }),
  "separation": Object.freeze({
    meaningInLaw: "In matrimonial law, cessation of cohabitation between husband and wife by agreement or legal separation.",
  }),
  "situs": Object.freeze({
    meaningInLaw: "The site, position, location, or place where a thing is considered to be for legal purposes.",
  }),
  "theft": Object.freeze({
    meaningInLaw: "The unlawful and felonious taking of another person's movable personal property against the owner's will.",
  }),
  "undertaking": Object.freeze({
    meaningInLaw: "A promise, engagement, or stipulation, including a promise made in legal proceedings.",
  }),
  "expulsion": Object.freeze({
    meaningInLaw: "A putting or driving out, including depriving a member of a corporation, legislative body, assembly, society, or company of membership.",
  }),
  "felony": Object.freeze({
    meaningInLaw: "In criminal law, an offense of high grade historically associated with forfeiture and distinguished from misdemeanors by severity.",
  }),
  "guarantee": Object.freeze({
    meaningInLaw: "A collateral undertaking to answer for another person's debt, default, or miscarriage, or the person to whom such guaranty is made.",
  }),
  "guarantor": Object.freeze({
    meaningInLaw: "A person who makes a guaranty or undertakes collaterally to answer for another's debt, default, or miscarriage.",
  }),
  "immunity": Object.freeze({
    meaningInLaw: "An exemption from serving in an office or performing duties that the law generally requires of citizens.",
  }),
  "impossibility": Object.freeze({
    meaningInLaw: "That which, in the constitution and course of nature or of law, no person can do or perform.",
  }),
  "independence": Object.freeze({
    meaningInLaw: "The state or condition of being free from dependence, subjection, or control.",
  }),
  "inducement": Object.freeze({
    meaningInLaw: "In contracts, the benefit or advantage that leads a promisor to enter an obligation.",
  }),
  "inherent power": Object.freeze({
    meaningInLaw: "An authority possessed without being derived from another; a right, ability, or faculty of acting without receiving it from another source.",
  }),
  "instigation": Object.freeze({
    meaningInLaw: "Incitation or urging; the act by which one person incites another to do something, especially to commit an offense.",
  }),
  "intent": Object.freeze({
    meaningInLaw: "In criminal law and evidence, purpose, formulated design, or resolve to do or forbear from an act.",
  }),
  "legality": Object.freeze({
    meaningInLaw: "Lawfulness.",
  }),
  "mandate": Object.freeze({
    meaningInLaw: "In practice, a judicial command or precept from a court or judicial officer directing an officer to enforce a judgment or perform an act.",
  }),
  "maxim": Object.freeze({
    meaningInLaw: "An established principle or proposition, especially a principle of law generally received as just and consonant with reason.",
  }),
  "misdemeanor": Object.freeze({
    meaningInLaw: "In criminal law, a general name for criminal offenses of a lower grade than felony and punishable by indictment or statutory process.",
  }),
  "novation": Object.freeze({
    meaningInLaw: "The substitution of a new debt or obligation for an existing one, extinguishing the old obligation.",
  }),
  "obscenity": Object.freeze({
    meaningInLaw: "The character or quality of being obscene, including conduct tending to corrupt public morals by indecency or lewdness.",
  }),
  "offer": Object.freeze({
    meaningInLaw: "A proposal to do a thing or to make a contract.",
  }),
  "oppression": Object.freeze({
    meaningInLaw: "The misdemeanor committed by a public officer who, under color of office, wrongfully abuses authority.",
  }),
  "option": Object.freeze({
    meaningInLaw: "In English ecclesiastical law, the customary prerogative of an archbishop or bishop to select a dignity or benefice in the gift of a suffragan bishop.",
  }),
  "parole": Object.freeze({
    meaningInLaw: "In military law, a promise by a prisoner of war released from custody that he will not again take up arms against the captor during the war unless exchanged.",
  }),
  "regulation": Object.freeze({
    meaningInLaw: "The act of regulating, or a rule or order prescribed for management or government.",
  }),
  "residence": Object.freeze({
    meaningInLaw: "Living or dwelling in a certain place permanently or for a considerable time; the place where a person makes a home or dwells.",
  }),
  "retaliation": Object.freeze({
    meaningInLaw: "The lex talionis; retaliation in kind.",
  }),
  "search": Object.freeze({
    meaningInLaw: "In international law, the right of warships to visit and search merchant vessels during war to discover enemy property or contraband.",
  }),
  "stipulation": Object.freeze({
    meaningInLaw: "A material article in an agreement, or in practice an engagement or undertaking made in judicial proceedings.",
  }),
  "suretyship": Object.freeze({
    meaningInLaw: "The contract by which one person obligates himself as surety for another.",
  }),
  "tribunal": Object.freeze({
    meaningInLaw: "The seat of a judge, or the place where justice is administered; a judicial court or forum.",
  }),
  "waiver": Object.freeze({
    meaningInLaw: "The renunciation, repudiation, abandonment, or surrender of a claim, right, privilege, or opportunity.",
  }),
  "abjuration": Object.freeze({
    meaningInLaw: "One of the steps in the process of naturalizing an alien.",
  }),
  "abrogation": Object.freeze({
    meaningInLaw: "The annulment or repeal of a law by constitutional authority.",
  }),
  "abuse": Object.freeze({
    meaningInLaw: "Improper or excessive use of a thing, or use contrary to the natural or legal rules for its use.",
  }),
  "ademption": Object.freeze({
    meaningInLaw: "The revocation, recalling, or cancellation of a legacy implied by the testator's acts during life.",
  }),
  "administration": Object.freeze({
    meaningInLaw: "The management and settlement of the estate of an intestate or of a testator.",
  }),
  "adoption": Object.freeze({
    meaningInLaw: "The act of taking another person's child into one's own family and treating the child as one's own.",
  }),
  "alteration": Object.freeze({
    meaningInLaw: "A variation or making different of an instrument, act, or legal matter.",
  }),
  "ambiguity": Object.freeze({
    meaningInLaw: "Doubtfulness or uncertainty of meaning in an expression used in a written instrument.",
  }),
  "annexation": Object.freeze({
    meaningInLaw: "The act of attaching, adding, joining, or uniting one thing to another, especially a subordinate thing to a principal thing.",
  }),
  "appearance": Object.freeze({
    meaningInLaw: "In practice, a coming into court as a party to a suit.",
  }),
  "arrears": Object.freeze({
    meaningInLaw: "Money unpaid at the due time, such as rent behind or the remainder due after partial payment.",
  }),
  "auction": Object.freeze({
    meaningInLaw: "A public sale of land or goods at public outcry to the highest bidder.",
  }),
  "borrower": Object.freeze({
    meaningInLaw: "A person to whom money or other property is loaned at that person's request.",
  }),
  "brokerage": Object.freeze({
    meaningInLaw: "The wages, commissions, business, or occupation of a broker.",
  }),
  "buyer": Object.freeze({
    meaningInLaw: "A person who buys; a purchaser, especially of chattels.",
  }),
  "capacity": Object.freeze({
    meaningInLaw: "Legal ability to acquire rights, transfer rights, or assume duties.",
  }),
  "circuit": Object.freeze({
    meaningInLaw: "A territorial division appointed for a judge to visit for trial of causes or administration of justice.",
  }),
  "client": Object.freeze({
    meaningInLaw: "A person who employs or retains an attorney or counsellor to appear for him in court.",
  }),
  "collusion": Object.freeze({
    meaningInLaw: "A deceitful agreement between persons for an improper purpose, such as defrauding a third party of a right.",
  }),
  "commutation": Object.freeze({
    meaningInLaw: "In criminal law, change or substitution.",
  }),
  "confrontation": Object.freeze({
    meaningInLaw: "In criminal law, setting a witness face to face with the prisoner so the prisoner may object to the witness.",
  }),
  "contingency": Object.freeze({
    meaningInLaw: "An event that may or may not happen; a doubtful or uncertain future event.",
  }),
  "covenant": Object.freeze({
    meaningInLaw: "In practice, a common-law form of action ex contractu for damages for breach of a covenant or contract under seal.",
  }),
  "dealings": Object.freeze({
    meaningInLaw: "Transactions in the course of trade or business.",
  }),
  "decision": Object.freeze({
    meaningInLaw: "In practice, a judgment or decree pronounced by a court in settlement of a controversy.",
  }),
  "deduction": Object.freeze({
    meaningInLaw: "In succession, a portion or thing an heir has a right to take from the mass before partition.",
  }),
  "defamation": Object.freeze({
    meaningInLaw: "The taking away from a person's reputation by injurious words or publication.",
  }),
  "defeasance": Object.freeze({
    meaningInLaw: "An instrument or condition that defeats the force or operation of another deed, estate, or obligation.",
  }),
  "defendant": Object.freeze({
    meaningInLaw: "The party against whom relief or recovery is sought in an action or suit.",
  }),
  "definition": Object.freeze({
    meaningInLaw: "A description of a thing by its properties; an explanation of the meaning of a word or term.",
  }),
  "deportation": Object.freeze({
    meaningInLaw: "Banishment to a foreign country, attended with confiscation of property and deprivation of civil rights.",
  }),
  "descent": Object.freeze({
    meaningInLaw: "The legal rules by which inheritances are regulated.",
  }),
  "desuetude": Object.freeze({
    meaningInLaw: "Disuse; cessation or discontinuance of use.",
  }),
  "detention": Object.freeze({
    meaningInLaw: "The act of keeping back or withholding a person or thing, either accidentally or by design.",
  }),
  "diagnosis": Object.freeze({
    meaningInLaw: "A medical term meaning discovery of the source of a patient's illness.",
  }),
  "disaffirmance": Object.freeze({
    meaningInLaw: "The repudiation or refusal to affirm a former transaction.",
  }),
  "discovery": Object.freeze({
    meaningInLaw: "The ascertainment of what was previously unknown, or the disclosure or coming to light of what was hidden.",
  }),
  "disorder": Object.freeze({
    meaningInLaw: "Turbulent or riotous behavior, or immoral or indecent conduct.",
  }),
  "donation": Object.freeze({
    meaningInLaw: "In ecclesiastical law, a mode of acquiring a benefice by deed.",
  }),
  "drawee": Object.freeze({
    meaningInLaw: "A person to whom a bill of exchange is addressed and who is requested to pay it.",
  }),
  "drawer": Object.freeze({
    meaningInLaw: "The person who makes a bill of exchange and addresses it to the drawee.",
  }),
  "enjoyment": Object.freeze({
    meaningInLaw: "The exercise, possession, and fruition of a right, privilege, or incorporeal hereditament.",
  }),
  "equality": Object.freeze({
    meaningInLaw: "The condition of possessing the same rights, privileges, and immunities, and being subject to the same duties.",
  }),
  "exaction": Object.freeze({
    meaningInLaw: "The wrongful act of an officer or other person in compelling payment of a fee.",
  }),
  "extinguishment": Object.freeze({
    meaningInLaw: "The destruction or cancellation of a right, power, contract, or estate.",
  }),
  "form": Object.freeze({
    meaningInLaw: "A model or skeleton of an instrument to be used in a judicial proceeding, containing the necessary matters and technical terms.",
  }),
  "franking": Object.freeze({
    meaningInLaw: "The privilege of sending certain matter through the public mails without payment of postage.",
  }),
  "freehold": Object.freeze({
    meaningInLaw: "An estate in land or other real property of uncertain duration, lasting at least for life or in inheritance.",
  }),
  "furtherance": Object.freeze({
    meaningInLaw: "In criminal law, furthering, helping forward, promotion, or advancement of a criminal project or conspiracy.",
  }),
  "grantee": Object.freeze({
    meaningInLaw: "The person to whom a grant is made.",
  }),
  "grantor": Object.freeze({
    meaningInLaw: "The person by whom a grant is made.",
  }),
  "gratification": Object.freeze({
    meaningInLaw: "A gratuity or reward for services or benefits, given voluntarily.",
  }),
  "ground": Object.freeze({
    meaningInLaw: "Soil or earth; a portion of the earth's surface appropriated to private use or cultivation.",
  }),
  "hierarchy": Object.freeze({
    meaningInLaw: "Originally, government by a body of priests.",
  }),
  "ignorance": Object.freeze({
    meaningInLaw: "The want or absence of knowledge.",
  }),
  "importunity": Object.freeze({
    meaningInLaw: "Pressing solicitation; urgent request for a claim or favor urged with troublesome frequency.",
  }),
  "incapacity": Object.freeze({
    meaningInLaw: "Want of capacity, power, or legal ability to take, dispose, or act.",
  }),
  "incumbrance": Object.freeze({
    meaningInLaw: "A right or interest in land held by a third person that diminishes the land's value but is consistent with passage of the fee.",
  }),
  "inhibition": Object.freeze({
    meaningInLaw: "In ecclesiastical practice, a writ from a superior ecclesiastical court forbidding an inferior judge to proceed further in a cause.",
  }),
  "institution": Object.freeze({
    meaningInLaw: "The commencement or inauguration of anything.",
  }),
  "interpretation": Object.freeze({
    meaningInLaw: "The discovery and representation of the true meaning of signs used to convey ideas.",
  }),
  "jurat": Object.freeze({
    meaningInLaw: "The clause at the foot of an affidavit stating when, where, and before whom the affidavit was sworn.",
  }),
  "jurisprudence": Object.freeze({
    meaningInLaw: "The philosophy of law, or the science treating the principles of positive law and legal relations.",
  }),
  "kidnapping": Object.freeze({
    meaningInLaw: "In criminal law, the forcible abduction or carrying away of a person from that person's own country into another.",
  }),
  "landlord": Object.freeze({
    meaningInLaw: "A person of whom lands or tenements are held.",
  }),
  "liability": Object.freeze({
    meaningInLaw: "The state of being bound or obliged in law or justice to do, pay, or make good something.",
  }),
  "licensee": Object.freeze({
    meaningInLaw: "A person to whom a license has been granted.",
  }),
  "litigant": Object.freeze({
    meaningInLaw: "A party to a lawsuit; a person engaged in litigation.",
  }),
  "maintenance": Object.freeze({
    meaningInLaw: "Sustenance, support, or assistance.",
  }),
  "merits": Object.freeze({
    meaningInLaw: "In practice, matter of substance in law, as distinguished from matter of mere form.",
  }),
  "misapplication": Object.freeze({
    meaningInLaw: "Improper, illegal, wrongful, or corrupt use or application of funds, property, or authority.",
  }),
  "mortgagee": Object.freeze({
    meaningInLaw: "The person who takes or receives a mortgage.",
  }),
  "motive": Object.freeze({
    meaningInLaw: "The inducement, cause, or reason why an act is done.",
  }),
  "neglect": Object.freeze({
    meaningInLaw: "Omission or failure to do something that one is bound to do.",
  }),
  "negotiability": Object.freeze({
    meaningInLaw: "In mercantile law, the quality of being transferable by negotiation.",
  }),
  "negotiation": Object.freeze({
    meaningInLaw: "Deliberation, discussion, or conference upon the terms of a proposed agreement.",
  }),
  "nominee": Object.freeze({
    meaningInLaw: "A person who has been nominated or proposed for an office.",
  }),
  "nonsuit": Object.freeze({
    meaningInLaw: "Failure by a plaintiff to follow up or continue prosecution of a suit.",
  }),
  "pact": Object.freeze({
    meaningInLaw: "A bargain, compact, or agreement.",
  }),
  "petitioner": Object.freeze({
    meaningInLaw: "One who presents a petition to a court, officer, or legislative body.",
  }),
  "preservation": Object.freeze({
    meaningInLaw: "Keeping safe from harm, injury, destruction, or decay.",
  }),
  "priority": Object.freeze({
    meaningInLaw: "A legal preference or precedence.",
  }),
  "privation": Object.freeze({
    meaningInLaw: "A taking away or withdrawing.",
  }),
  "probability": Object.freeze({
    meaningInLaw: "Likelihood; appearance of truth; verisimilitude.",
  }),
  "procedure": Object.freeze({
    meaningInLaw: "In legal practice, the method pointed out by law for apprehension, trial, or prosecution.",
  }),
  "purchaser": Object.freeze({
    meaningInLaw: "A person who acquires real property by a mode other than descent.",
  }),
  "ratio": Object.freeze({
    meaningInLaw: "A rate, proportion, or degree.",
  }),
  "recognition": Object.freeze({
    meaningInLaw: "Ratification; confirmation; an acknowledgment that something done by another person in one's name had one's authority.",
  }),
  "reference": Object.freeze({
    meaningInLaw: "In contract, an agreement to submit a controversy to chosen referees or arbitrators.",
  }),
  "relinquishment": Object.freeze({
    meaningInLaw: "In practice, a forsaking, abandonment, or giving up of a right or claim.",
  }),
  "renewal": Object.freeze({
    meaningInLaw: "The act of renewing or reviving.",
  }),
  "renunciation": Object.freeze({
    meaningInLaw: "The act of giving up a right.",
  }),
  "resignation": Object.freeze({
    meaningInLaw: "The act by which an officer renounces further exercise of an office and returns it to the appointing authority.",
  }),
  "resolution": Object.freeze({
    meaningInLaw: "The determination or decision of a deliberative or legislative body regarding its opinion or intention.",
  }),
  "role": Object.freeze({
    meaningInLaw: "In French mercantile law, the list of a ship's crew; a muster roll.",
  }),
  "satisfaction": Object.freeze({
    meaningInLaw: "The act of satisfying a party by paying what is due.",
  }),
  "seal": Object.freeze({
    meaningInLaw: "An impression made upon wax, wafer, or another substance capable of being impressed.",
  }),
  "settlor": Object.freeze({
    meaningInLaw: "The grantor or donor in a deed of settlement or trust arrangement.",
  }),
  "solicitation": Object.freeze({
    meaningInLaw: "Asking, enticing, or urgent request.",
  }),
  "solvency": Object.freeze({
    meaningInLaw: "Ability to pay; present ability to pay one's debts.",
  }),
  "specification": Object.freeze({
    meaningInLaw: "In patent law and building contracts, a detailed statement of the elements involved.",
  }),
  "statute": Object.freeze({
    meaningInLaw: "An act of the legislature; a particular law enacted and established by the legislative department of government.",
  }),
  "stockholder": Object.freeze({
    meaningInLaw: "A person who owns shares of stock in a corporation or joint-stock company.",
  }),
  "sublease": Object.freeze({
    meaningInLaw: "A lease by a tenant to another person of part of the premises held by him; an under-lease.",
  }),
  "substance": Object.freeze({
    meaningInLaw: "The essence or material and essential part of a thing, as distinguished from form.",
  }),
  "suffrage": Object.freeze({
    meaningInLaw: "A vote; the act of voting; the right or privilege of casting a vote at public elections.",
  }),
  "surety": Object.freeze({
    meaningInLaw: "A person who, at another's request and for that person's benefit, becomes responsible for another's performance.",
  }),
  "survivorship": Object.freeze({
    meaningInLaw: "The living of one of two or more persons after the death of the other or others.",
  }),
  "suspicion": Object.freeze({
    meaningInLaw: "The act of suspecting, or the state of being suspected; distrust or doubt, generally of something ill.",
  }),
  "tenancy": Object.freeze({
    meaningInLaw: "A holding or occupancy of land or tenements by a tenant.",
  }),
  "tenant": Object.freeze({
    meaningInLaw: "A person who holds or possesses lands or tenements by a right or title.",
  }),
  "tender": Object.freeze({
    meaningInLaw: "An offer of money; the act of producing and offering money to a person holding a claim or demand.",
  }),
  "territoriality": Object.freeze({
    meaningInLaw: "Connection with, or limitation with reference to, a particular country or territory.",
  }),
  "trustor": Object.freeze({
    meaningInLaw: "A person who creates, donates, or founds a trust.",
  }),
  "usury": Object.freeze({
    meaningInLaw: "In old English law, interest of money; increase or reward for the loan or use of money.",
  }),
  "verdict": Object.freeze({
    meaningInLaw: "In practice, the formal and unanimous decision or finding of a jury sworn for the trial of a cause.",
  }),
  "vicinage": Object.freeze({
    meaningInLaw: "Neighborhood; near dwelling; vicinity.",
  }),
});

function getTermSemanticOverride(term) {
  return TERM_SEMANTIC_OVERRIDES[term] ?? null;
}

// Compatibility residue remains intentionally narrow.
// - shortMeaning: keep as the compact registry-card summary and search helper.
// - definition: remove_later; legacy compatibility/search text only.
// - boundaryNote: alias to the older boundary-note surface, retained only for compatibility/search.
function buildRegistryOnlyEntry(term, family, classification) {
  const familyLabel = formatFamilyLabel(family);
  const classificationLabel = formatClassificationLabel(classification);
  const semanticOverride = getTermSemanticOverride(term);
  const meaningSources = semanticOverride?.meaningInLaw ? getMeaningSourcesForTerm(term) : Object.freeze([]);

  return {
    itemType: REGISTRY_TERM_ITEM_TYPE,
    term,
    family,
    familyLabel,
    classification,
    classificationLabel,
    sourceStatus: 'registry_only',
    sourceStatusLabel: 'Registry-only',
    meaningInLaw: semanticOverride?.meaningInLaw ?? null,
    meaningSources,
    registryInterpretation: semanticOverride?.meaningInLaw
      ? SOURCE_ATTESTED_REGISTRY_INTERPRETATION
      : getRegistryInterpretationFallback(classification),
    whyRegistryOnly: semanticOverride?.meaningInLaw
      ? SOURCE_ATTESTED_WHY_REGISTRY_ONLY
      : getWhyRegistryOnlyFallback('registry_only'),
    shortMeaning: `${familyLabel} registry term.`,
    definition: `Registry-only term in the ${familyLabel} family. No published concept packet is available for this entry.`,
    example: null,
    nearMiss: null,
    nonGoal: 'This surface does not invent a canonical definition for registry-only rows.',
    boundaryNote: `Registry term classified as ${classificationLabel.toLowerCase()}.`,
    relatedTerms: [],
  };
}

function getPacketBoundaryNote(packet) {
  const primaryNote = packet?.coreMeaning ?? packet?.shortDefinition ?? '';
  if (primaryNote.trim().length > 0) {
    return primaryNote.trim();
  }

  const comparisonKeys = packet?.comparison ? Object.keys(packet.comparison) : [];
  const firstComparison = comparisonKeys.length > 0 ? packet.comparison[comparisonKeys[0]] : null;
  const axisStatement = firstComparison?.axes?.find((axis) => typeof axis?.statement === 'string')?.statement;
  return typeof axisStatement === 'string' ? axisStatement : '';
}

function getPacketExample(packet) {
  if (!packet || typeof packet !== 'object') {
    return null;
  }

  const boundaryProofValues = packet.boundaryProofs ? Object.values(packet.boundaryProofs) : [];
  for (const proof of boundaryProofValues) {
    if (proof && typeof proof.validSeparationExample === 'string' && proof.validSeparationExample.trim() !== '') {
      return proof.validSeparationExample.trim();
    }
    if (proof && typeof proof.boundaryStatement === 'string' && proof.boundaryStatement.trim() !== '') {
      return proof.boundaryStatement.trim();
    }
  }

  if (packet.reviewMetadata?.contrast_prompts?.length > 0) {
    return packet.reviewMetadata.contrast_prompts[0];
  }

  const comparisonKeys = packet.comparison ? Object.keys(packet.comparison) : [];
  for (const key of comparisonKeys) {
    const comparison = packet.comparison[key];
    const statement = comparison?.axes?.find((axis) => typeof axis?.statement === 'string')?.statement;
    if (typeof statement === 'string' && statement.trim() !== '') {
      return statement.trim();
    }
  }

  return null;
}

function getPacketNearMiss(packet) {
  if (packet?.reviewMetadata?.contrast_prompts?.length > 0) {
    return packet.reviewMetadata.contrast_prompts[0];
  }

  const comparisonKeys = packet?.comparison ? Object.keys(packet.comparison) : [];
  for (const key of comparisonKeys) {
    const comparison = packet.comparison[key];
    const statement = comparison?.axes?.find((axis) => typeof axis?.statement === 'string')?.statement;
    if (typeof statement === 'string' && statement.trim() !== '') {
      return statement.trim();
    }
  }

  return null;
}

function getPacketNonGoal(packet) {
  const excluded = packet?.canonical?.excludes;
  if (Array.isArray(excluded) && excluded.length > 0) {
    return `Does not mean: ${excluded.join('; ')}.`;
  }

  const whatItIsNot = packet?.reviewMetadata?.what_it_is_not;
  if (Array.isArray(whatItIsNot) && whatItIsNot.length > 0) {
    return `Does not mean: ${whatItIsNot.join('; ')}.`;
  }

  return null;
}

function getPacketRelatedTerms(packet) {
  const relatedTerms = new Set();

  if (Array.isArray(packet?.relatedConcepts)) {
    for (const entry of packet.relatedConcepts) {
      if (entry && typeof entry.conceptId === 'string') {
        relatedTerms.add(entry.conceptId);
      }
    }
  }

  if (Array.isArray(packet?.reviewMetadata?.related_concepts)) {
    for (const related of packet.reviewMetadata.related_concepts) {
      if (typeof related === 'string' && related.trim() !== '') {
        relatedTerms.add(related.trim());
      }
    }
  }

  if (packet?.boundaryProofs && typeof packet.boundaryProofs === 'object') {
    for (const related of Object.keys(packet.boundaryProofs)) {
      relatedTerms.add(related);
    }
  }

  return [...relatedTerms];
}

function buildPacketBackedEntry(term, family, classification, packet) {
  const familyLabel = formatFamilyLabel(family);
  const classificationLabel = formatClassificationLabel(classification);
  const semanticOverride = getTermSemanticOverride(term);
  const shortMeaning = packet.shortDefinition ?? firstSentence(packet.coreMeaning ?? packet.fullDefinition ?? '');
  const boundaryNote = getPacketBoundaryNote(packet);
  const example = getPacketExample(packet);
  const nearMiss = getPacketNearMiss(packet);
  const nonGoal = getPacketNonGoal(packet);
  const relatedTerms = getPacketRelatedTerms(packet);
  const meaningInLaw = semanticOverride?.meaningInLaw ?? shortMeaning ?? null;
  const meaningSources = meaningInLaw ? getMeaningSourcesForTerm(term) : Object.freeze([]);

  return {
    itemType: REGISTRY_TERM_ITEM_TYPE,
    term,
    family,
    familyLabel,
    classification,
    classificationLabel,
    sourceStatus: 'packet_backed',
    sourceStatusLabel: 'Packet-backed',
    meaningInLaw,
    meaningSources,
    registryInterpretation: getRegistryInterpretationFallback(classification),
    whyRegistryOnly: getWhyRegistryOnlyFallback('packet_backed'),
    shortMeaning: shortMeaning || `${familyLabel} concept packet.`,
    definition: packet.fullDefinition ?? packet.coreMeaning ?? packet.shortDefinition ?? `${familyLabel} concept packet.`,
    example,
    nearMiss,
    nonGoal,
    boundaryNote: boundaryNote || null,
    relatedTerms,
  };
}

function buildVocabularyBoundaryEntry(term, record) {
  const conceptPackets = loadConceptPacketIndex();
  const packet = conceptPackets.get(term) ?? null;

  if (packet) {
    return buildPacketBackedEntry(term, record.family, record.classification, packet);
  }

  return buildRegistryOnlyEntry(term, record.family, record.classification);
}

function buildVocabularyBoundaryResponse() {
  const registry = loadLegalVocabularyRegistry();
  const terms = Array.from(registry.recordsByTerm.keys()).sort((left, right) => (
    left.localeCompare(right)
  ));
  const entries = terms.map((term) => buildVocabularyBoundaryEntry(term, registry.recordsByTerm.get(term)));

  return {
    total: registry.totalTerms,
    terms,
    entries,
    buckets: registry.countsByClassification,
    surfaceCounts: {
      publishedConceptPackets: loadPublishedConceptPacketCount(),
      liveRuntimeConcepts: LIVE_CONCEPT_IDS.length,
      visibleOnlyConcepts: VISIBLE_ONLY_PUBLIC_CONCEPT_IDS.length,
      rejectedConcepts: REJECTED_CONCEPT_IDS.length,
    },
  };
}

module.exports = {
  buildVocabularyBoundaryResponse,
  loadPublishedConceptPacketCount,
};
