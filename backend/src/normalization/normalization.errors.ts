import type { NormalizationRefusalCode } from './normalization.types.ts';

const NORMALIZATION_REFUSAL_MESSAGES: Record<NormalizationRefusalCode, string> = Object.freeze({
  NORMALIZATION_TOO_DEEP: 'Normalization depth exceeded the locked limit.',
  NORMALIZATION_TOO_LARGE: 'Normalization exceeded the locked size limit.',
  NORMALIZATION_INVALID_ENCODING: 'Normalization encountered malformed target encoding.',
  NORMALIZATION_AMBIGUOUS: 'Normalization found multiple valid transform paths.',
  NORMALIZATION_NON_TEXT_OUTPUT: 'Normalization produced non-text output.',
  NORMALIZATION_POLICY_BLOCKED: 'Normalization transform is blocked by policy.',
});

function createNormalizationRefusal(
  code: NormalizationRefusalCode,
  details: Record<string, unknown> = {},
) {
  return Object.freeze({
    ok: false as const,
    code,
    message: NORMALIZATION_REFUSAL_MESSAGES[code],
    details: Object.freeze({ ...details }),
  });
}

module.exports = {
  NORMALIZATION_REFUSAL_MESSAGES,
  createNormalizationRefusal,
};
