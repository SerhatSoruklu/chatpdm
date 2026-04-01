import type {
  ResolveProductResponse,
  VocabularyClassificationResult,
} from '../concept-resolver.types';

export const VOCABULARY_PANEL_WARNING_TEXT = 'Not a core concept. Not used for system reasoning.';

export function vocabularyClassificationLabel(
  classification: VocabularyClassificationResult['classification'],
): string {
  switch (classification) {
    case 'legal_term':
      return 'Legal vocabulary';
    case 'informal_term':
      return 'Informal vocabulary';
    case 'ambiguous_term':
      return 'Ambiguous vocabulary';
    default:
      return 'Vocabulary';
  }
}

export function extractVocabularyPanelData(
  response: ResolveProductResponse | null | undefined,
): VocabularyClassificationResult | null {
  if (!response || !('vocabulary' in response)) {
    return null;
  }

  const vocabulary = response.vocabulary;
  return vocabulary.matched === true && vocabulary.systemFlags.isCoreConcept === false
    ? vocabulary
    : null;
}
