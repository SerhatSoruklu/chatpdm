'use strict';

const {
  EMPTY_NORMALIZED_QUERY,
} = require('./constants');
const { extractCanonicalId, findLeadingFillerPhrase, normalizeQuery } = require('./normalizer');

const COMPARISON_KEYWORDS = Object.freeze([
  ' vs ',
  ' versus ',
  ' or ',
  ' same as ',
]);

const RELATION_KEYWORDS = Object.freeze([
  ' without ',
  ' with no ',
  ' under ',
  ' over ',
  ' against ',
  ' between ',
]);

const ROLE_PREFIXES = Object.freeze([
  'who has ',
  'who holds ',
  'who governs ',
  'who decides ',
  'who ',
]);

const NON_SUBTYPE_PREFIXES = Object.freeze([
  'what happens ',
  'why ',
  'how ',
  'when ',
  'where ',
  'which ',
  'can ',
  'could ',
  'should ',
  'would ',
  'is ',
  'are ',
  'was ',
  'were ',
  'do ',
  'does ',
  'did ',
  'tell me ',
  'explain ',
  'show me ',
  'give me ',
]);

function escapePattern(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function uniqueStrings(values) {
  return [...new Set(values)];
}

function buildTermEntries(concepts) {
  const entries = [];

  for (const concept of concepts) {
    const terms = new Set([
      normalizeQuery(concept.conceptId),
      normalizeQuery(concept.title),
      ...concept.normalizedAliases.map((alias) => normalizeQuery(alias)),
    ]);

    for (const term of terms) {
      if (term !== EMPTY_NORMALIZED_QUERY && term.trim() !== '') {
        entries.push({
          conceptId: concept.conceptId,
          term,
        });
      }
    }
  }

  return entries.sort((left, right) => right.term.length - left.term.length);
}

function detectMentionedConcepts(normalizedQuery, termEntries) {
  const conceptMatches = new Map();

  for (const entry of termEntries) {
    const pattern = new RegExp(`(^| )${escapePattern(entry.term)}( |$)`);
    const match = pattern.exec(normalizedQuery);

    if (match) {
      const position = match.index + match[1].length;
      const existingPosition = conceptMatches.get(entry.conceptId);

      if (existingPosition === undefined || position < existingPosition) {
        conceptMatches.set(entry.conceptId, position);
      }
    }
  }

  return [...conceptMatches.entries()]
    .sort((left, right) => left[1] - right[1] || left[0].localeCompare(right[0]))
    .map(([conceptId]) => conceptId);
}

function buildAmbiguityInterpretation(match) {
  return {
    interpretationType: 'ambiguous_selection',
    concepts: match.candidates.map((candidate) => candidate.conceptId),
    message: 'This query matches multiple authored concepts and requires an explicit choice.',
  };
}

function buildComparisonInterpretation(concepts) {
  return {
    interpretationType: 'comparison_not_supported',
    concepts,
    message: 'This query is a comparison between concepts. Comparison output is only available for authored, allowlisted pairs in the current runtime.',
  };
}

function buildRelationInterpretation(concepts, relationTerm) {
  return {
    interpretationType: 'relation_not_supported',
    concepts,
    relationTerm,
    message: 'This query expresses a relationship between concepts. The current system does not evaluate inter-concept relations yet.',
  };
}

function buildRoleInterpretation(baseConcept, actorTerm = 'who') {
  return {
    interpretationType: 'role_or_actor_not_supported',
    baseConcept,
    actorTerm,
    message: 'This query refers to actors or holders of a concept. The current system defines concepts, not instances or actors.',
  };
}

function buildUnsupportedInterpretation(concepts = []) {
  const interpretation = {
    interpretationType: 'unsupported_complex',
    message: 'This query does not match a supported concept query form in the current runtime.',
  };

  if (Array.isArray(concepts) && concepts.length > 0) {
    interpretation.concepts = concepts;
  }

  return interpretation;
}

function buildInvalidQueryInterpretation() {
  return {
    interpretationType: 'invalid_query',
    message: 'No recognizable concept or supported query structure was detected.',
  };
}

function buildCanonicalLookupNotFoundInterpretation(targetConceptId) {
  if (targetConceptId === '') {
    return {
      interpretationType: 'canonical_lookup_not_found',
      message: 'This query uses direct canonical lookup, but no authored concept ID was provided.',
    };
  }

  return {
    interpretationType: 'canonical_lookup_not_found',
    targetConceptId,
    message: `This query uses direct canonical lookup, but no authored concept exists for "${targetConceptId}".`,
  };
}

function buildExactConceptNotFoundInterpretation(targetConceptId) {
  if (targetConceptId === '') {
    return {
      interpretationType: 'exact_concept_not_found',
      message: 'This query points to a concept lookup, but no authored canonical concept was identified.',
    };
  }

  return {
    interpretationType: 'exact_concept_not_found',
    targetConceptId,
    message: `No authored canonical concept exists for "${targetConceptId}".`,
  };
}

function canonicalizeRawQuery(rawQuery) {
  return rawQuery.trim().toLowerCase().replace(/\s+/g, ' ');
}

function isSingleToken(normalizedQuery) {
  return !normalizedQuery.includes(' ');
}

function uniqueCharacterCount(value) {
  return new Set(value).size;
}

function hasRecognizableQueryPrefix(rawQuery) {
  return (
    findLeadingFillerPhrase(rawQuery) !== null
    || NON_SUBTYPE_PREFIXES.some((prefix) => rawQuery.startsWith(prefix))
    || ROLE_PREFIXES.some((prefix) => rawQuery.startsWith(prefix))
  );
}

function looksLikeContinuousNoise(token) {
  if (!/^[a-z]+$/.test(token) || token.length < 10) {
    return false;
  }

  const uniqueChars = uniqueCharacterCount(token);
  const hasNoVowels = !/[aeiouy]/.test(token);
  const hasRepeatedRun = /(.)\1{4,}/.test(token);

  if (hasNoVowels && uniqueChars <= 4) {
    return true;
  }

  if (hasRepeatedRun && uniqueChars <= 3) {
    return true;
  }

  return uniqueChars <= 2;
}

function isClearlyInvalidQuery(rawQuery, normalizedQuery, mentionedConcepts) {
  if (normalizedQuery === EMPTY_NORMALIZED_QUERY) {
    return true;
  }

  if (mentionedConcepts.length > 0) {
    return false;
  }

  const canonicalizedRawQuery = canonicalizeRawQuery(rawQuery);
  if (
    hasRecognizableQueryPrefix(canonicalizedRawQuery)
    || COMPARISON_KEYWORDS.some((keyword) => normalizedQuery.includes(keyword))
    || RELATION_KEYWORDS.some((keyword) => normalizedQuery.includes(keyword))
  ) {
    return false;
  }

  if (!isSingleToken(normalizedQuery)) {
    return false;
  }

  return looksLikeContinuousNoise(normalizedQuery);
}

function isExactConceptLookupCandidate(rawQuery, normalizedQuery) {
  if (normalizedQuery === EMPTY_NORMALIZED_QUERY) {
    return false;
  }

  const canonicalizedRawQuery = canonicalizeRawQuery(rawQuery);
  if (findLeadingFillerPhrase(canonicalizedRawQuery) !== null) {
    return true;
  }

  return /^[a-z]+(?:-[a-z]+)*$/.test(normalizedQuery);
}

function detectComparison(normalizedQuery, mentionedConcepts) {
  const keyword = COMPARISON_KEYWORDS.find((candidate) => normalizedQuery.includes(candidate));
  if (!keyword) {
    return null;
  }

  const segments = normalizedQuery
    .split(keyword)
    .map((segment) => segment.trim())
    .filter((segment) => segment !== '');

  if (segments.length < 2) {
    return null;
  }

  return {
    concepts: mentionedConcepts,
  };
}

function detectRelation(normalizedQuery, mentionedConcepts) {
  if (mentionedConcepts.length < 2) {
    return null;
  }

  const keyword = RELATION_KEYWORDS.find((candidate) => normalizedQuery.includes(candidate));
  if (!keyword) {
    return null;
  }

  return {
    concepts: mentionedConcepts,
    relationTerm: keyword.trim(),
  };
}

function detectRoleOrActor(normalizedQuery, mentionedConcepts) {
  const prefix = ROLE_PREFIXES.find((candidate) => normalizedQuery.startsWith(candidate));
  if (!prefix || mentionedConcepts.length < 1) {
    return null;
  }

  return {
    baseConcept: mentionedConcepts[mentionedConcepts.length - 1],
    actorTerm: prefix.trim(),
  };
}

function classifyQueryShape({ rawQuery, normalizedQuery, concepts, resolveRules, match }) {
  if (typeof rawQuery !== 'string' || rawQuery.length === 0) {
    return {
      queryType: 'invalid_query',
      interpretation: buildInvalidQueryInterpretation(),
    };
  }

  const canonicalId = extractCanonicalId(rawQuery);
  if (canonicalId !== null) {
    return {
      queryType: 'canonical_id_query',
      interpretation: match.type === 'no_exact_match'
        ? buildCanonicalLookupNotFoundInterpretation(canonicalId)
        : null,
    };
  }

  if (match.type === 'ambiguous_match') {
    return {
      queryType: 'ambiguity_query',
      interpretation: buildAmbiguityInterpretation(match),
    };
  }

  if (match.type === 'concept_match') {
    return {
      queryType: 'exact_concept_query',
      interpretation: null,
    };
  }

  const termEntries = buildTermEntries(concepts);
  const mentionedConcepts = detectMentionedConcepts(normalizedQuery, termEntries);

  if (isClearlyInvalidQuery(rawQuery, normalizedQuery, mentionedConcepts)) {
    return {
      queryType: 'invalid_query',
      interpretation: buildInvalidQueryInterpretation(),
    };
  }

  const roleQuery = detectRoleOrActor(normalizedQuery, mentionedConcepts);
  if (roleQuery) {
    return {
      queryType: 'role_or_actor_query',
      interpretation: buildRoleInterpretation(roleQuery.baseConcept, roleQuery.actorTerm),
    };
  }

  const comparisonQuery = detectComparison(normalizedQuery, mentionedConcepts);
  if (comparisonQuery) {
    return {
      queryType: 'comparison_query',
      interpretation: buildComparisonInterpretation(comparisonQuery.concepts),
    };
  }

  const relationQuery = detectRelation(normalizedQuery, mentionedConcepts);
  if (relationQuery) {
    return {
      queryType: 'relation_query',
      interpretation: buildRelationInterpretation(relationQuery.concepts, relationQuery.relationTerm),
    };
  }

  if (isExactConceptLookupCandidate(rawQuery, normalizedQuery)) {
    return {
      queryType: 'exact_concept_query',
      interpretation: buildExactConceptNotFoundInterpretation(normalizedQuery),
    };
  }

  if (normalizedQuery === EMPTY_NORMALIZED_QUERY) {
    return {
      queryType: 'unsupported_complex_query',
      interpretation: buildUnsupportedInterpretation(),
    };
  }

  return {
    queryType: 'unsupported_complex_query',
    interpretation: buildUnsupportedInterpretation(mentionedConcepts),
  };
}

module.exports = {
  classifyQueryShape,
};
