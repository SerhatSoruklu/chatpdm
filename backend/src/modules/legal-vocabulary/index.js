'use strict';

const {
  datasetPath,
  EXPLICIT_CLASSIFICATION_OVERRIDES,
  HEADER_TO_CLASSIFICATION,
  loadLegalVocabularyRegistry,
} = require('./recognition-registry-loader');
const {
  recognizeLegalVocabulary,
} = require('./recognizer');

module.exports = {
  datasetPath,
  EXPLICIT_CLASSIFICATION_OVERRIDES,
  HEADER_TO_CLASSIFICATION,
  loadLegalVocabularyRegistry,
  recognizeLegalVocabulary,
};
