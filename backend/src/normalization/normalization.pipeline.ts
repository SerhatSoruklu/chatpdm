/// <reference path="../vocabulary/commonjs-globals.d.ts" />

import type {
  NormalizationAuditStep,
  NormalizationBoundaryMetrics,
  NormalizationNormalizedResult,
  NormalizationRefusalCode,
  NormalizationUnchangedResult,
  NormalizationRefusedResult,
  NormalizationResult,
  NormalizationTransformFailure,
  NormalizationTransformResult,
  NormalizationTransformSuccess,
} from './normalization.types.ts';

const {
  MAX_EXPANSION_RATIO,
  MAX_INPUT_BYTES,
  MAX_OUTPUT_BYTES,
  MAX_TRANSFORM_DEPTH,
} = require('./normalization.constants.ts');
const {
  createNormalizationRefusal,
} = require('./normalization.errors.ts');
const {
  createNormalizationAuditTrail,
  createNormalizationStep,
  byteLength,
} = require('./normalization.audit.ts');
const {
  recordNormalizationMetrics,
  recordNormalizationDurationMs,
} = require('./normalization.metrics.ts');
const {
  detectSurfaceCleanup,
  detectUnicodeNfc,
  detectPercentDecode,
  detectBase64Decode,
  detectHexDecode,
  detectReverseThenBase64Decode,
  detectReverseThenHexDecode,
} = require('./normalization.detectors.ts');
const {
  applySurfaceCleanup,
  applyUnicodeNfc,
  applyPercentDecode,
  applyBase64Decode,
  applyHexDecode,
  applyReverseThenBase64Decode,
  applyReverseThenHexDecode,
} = require('./normalization.transforms.ts');

function assertStringInput(value: unknown, label: string): asserts value is string {
  if (typeof value !== 'string') {
    throw new TypeError(`${label} must be a string.`);
  }
}

function collectAppliedTransformKinds(
  steps: readonly NormalizationAuditStep[],
): readonly NormalizationAuditStep['transform'][] {
  return Object.freeze(
    steps
      .filter((step) => step.applied)
      .map((step) => step.transform),
  );
}

function computeBoundaryMetrics({
  rawText,
  canonicalText,
  steps,
}: {
  rawText: string;
  canonicalText: string | null;
  steps: readonly NormalizationAuditStep[];
}): NormalizationBoundaryMetrics {
  const inputBytes = byteLength(rawText);
  const outputBytes = canonicalText === null ? null : byteLength(canonicalText);
  const expansionRatio = outputBytes === null
    ? null
    : (inputBytes === 0
      ? 0
      : outputBytes / inputBytes);
  const appliedTransformKinds = collectAppliedTransformKinds(steps);

  return {
    inputBytes,
    outputBytes,
    expansionRatio,
    changed: canonicalText === null
      ? steps.some((step) => step.applied && step.changed)
      : canonicalText !== rawText,
    appliedTransformKinds,
  };
}

function finalizeNormalizationResult<T extends NormalizationResult>(result: T): T {
  recordNormalizationMetrics(result);
  return result;
}

function buildRefusedResult({
  rawText,
  depthUsed,
  steps,
  refusalCode,
}: {
  rawText: string;
  depthUsed: number;
  steps: readonly NormalizationAuditStep[];
  refusalCode: NormalizationRefusalCode;
}): NormalizationRefusedResult {
  const refusal = createNormalizationRefusal(refusalCode);
  const boundaryMetrics = computeBoundaryMetrics({
    rawText,
    canonicalText: null,
    steps,
  });

  return finalizeNormalizationResult(Object.freeze({
    status: 'refused' as const,
    rawText,
    canonicalText: null,
    rawBytes: byteLength(rawText),
    canonicalBytes: null,
    depthUsed,
    ...boundaryMetrics,
    refusalCode: refusal.code,
    refusalMessage: refusal.message,
    audit: createNormalizationAuditTrail({
      rawText,
      canonicalText: null,
      depthUsed,
      steps,
    }),
  }) as NormalizationRefusedResult);
}

function buildNormalizedResult({
  rawText,
  canonicalText,
  depthUsed,
  steps,
}: {
  rawText: string;
  canonicalText: string;
  depthUsed: number;
  steps: readonly NormalizationAuditStep[];
}): NormalizationNormalizedResult {
  const boundaryMetrics = computeBoundaryMetrics({
    rawText,
    canonicalText,
    steps,
  });
  const rawBytes = byteLength(rawText);
  const canonicalBytes = byteLength(canonicalText);

  return finalizeNormalizationResult(Object.freeze({
    status: 'normalized' as const,
    rawText,
    canonicalText,
    rawBytes,
    canonicalBytes,
    depthUsed,
    ...boundaryMetrics,
    audit: createNormalizationAuditTrail({
      rawText,
      canonicalText,
      depthUsed,
      steps,
    }),
  }) as NormalizationNormalizedResult);
}

function buildUnchangedResult({
  rawText,
  canonicalText,
  depthUsed,
  steps,
}: {
  rawText: string;
  canonicalText: string;
  depthUsed: number;
  steps: readonly NormalizationAuditStep[];
}): NormalizationUnchangedResult {
  const boundaryMetrics = computeBoundaryMetrics({
    rawText,
    canonicalText,
    steps,
  });
  const rawBytes = byteLength(rawText);
  const canonicalBytes = byteLength(canonicalText);

  return finalizeNormalizationResult(Object.freeze({
    status: 'unchanged' as const,
    rawText,
    canonicalText,
    rawBytes,
    canonicalBytes,
    depthUsed,
    ...boundaryMetrics,
    audit: createNormalizationAuditTrail({
      rawText,
      canonicalText,
      depthUsed,
      steps,
    }),
  }) as NormalizationUnchangedResult);
}

function isWithinOutputBounds(rawBytes: number, outputText: string): boolean {
  const outputBytes = byteLength(outputText);

  if (outputBytes > MAX_OUTPUT_BYTES) {
    return false;
  }

  if (rawBytes === 0) {
    return outputBytes === 0;
  }

  return (outputBytes / rawBytes) <= MAX_EXPANSION_RATIO;
}

function coerceTransformResult(
  result: NormalizationTransformResult,
): NormalizationTransformSuccess | NormalizationTransformFailure {
  return result;
}

function isTransformSuccess(result: NormalizationTransformResult): result is NormalizationTransformSuccess {
  return result.ok === true;
}

function isTransformFailure(result: NormalizationTransformResult): result is NormalizationTransformFailure {
  return result.ok === false;
}

function normalizeChatPdmInput(rawText: string): NormalizationResult {
  assertStringInput(rawText, 'rawText');

  const startedAt = process.hrtime.bigint();

  try {

  const rawBytes = byteLength(rawText);

  if (rawBytes > MAX_INPUT_BYTES) {
    return buildRefusedResult({
      rawText,
      depthUsed: 0,
      steps: [],
      refusalCode: 'NORMALIZATION_TOO_LARGE',
    });
  }

  let currentText = rawText;
  let depthUsed = 0;
  const steps: NormalizationAuditStep[] = [];

  while (true) {
    const currentCandidateCount = [
      detectSurfaceCleanup(currentText),
      detectUnicodeNfc(currentText),
      detectPercentDecode(currentText),
      detectBase64Decode(currentText),
      detectHexDecode(currentText),
      detectReverseThenBase64Decode(currentText),
      detectReverseThenHexDecode(currentText),
    ].filter((d) => d.state === 'candidate').length;

    if (depthUsed >= MAX_TRANSFORM_DEPTH) {
      if (currentCandidateCount > 0) {
        return buildRefusedResult({
          rawText,
          depthUsed,
          steps,
          refusalCode: 'NORMALIZATION_TOO_DEEP',
        });
      }

      if (depthUsed > 0) {
        return buildNormalizedResult({
          rawText,
          canonicalText: currentText,
          depthUsed,
          steps,
        });
      }

      return buildUnchangedResult({
        rawText,
        canonicalText: currentText,
        depthUsed,
        steps,
      });
    }

    const surfaceCleanup = detectSurfaceCleanup(currentText);
    if (surfaceCleanup.state === 'candidate') {
      const result = coerceTransformResult(applySurfaceCleanup(currentText));

      if (!isTransformSuccess(result)) {
        return buildRefusedResult({
          rawText,
          depthUsed,
          steps: [
            ...steps,
            createNormalizationStep({
              stepIndex: steps.length + 1,
              transform: surfaceCleanup.transform,
              attempted: true,
              applied: false,
              changed: false,
              inputText: currentText,
              outputText: '',
              refusalCode: result.code,
            }),
          ],
          refusalCode: result.code,
        });
      }

      if (result.text !== currentText) {
        if (!isWithinOutputBounds(rawBytes, result.text)) {
          return buildRefusedResult({
            rawText,
            depthUsed,
            steps,
            refusalCode: 'NORMALIZATION_TOO_LARGE',
          });
        }

        steps.push(createNormalizationStep({
          stepIndex: steps.length + 1,
          transform: surfaceCleanup.transform,
          attempted: true,
          applied: true,
          changed: true,
          inputText: currentText,
          outputText: result.text,
        }));
        currentText = result.text;
        depthUsed += 1;
        continue;
      }
    }

    const unicodeNfc = detectUnicodeNfc(currentText);
    if (unicodeNfc.state === 'candidate') {
      const result = coerceTransformResult(applyUnicodeNfc(currentText));

      if (!isTransformSuccess(result)) {
        return buildRefusedResult({
          rawText,
          depthUsed,
          steps: [
            ...steps,
            createNormalizationStep({
              stepIndex: steps.length + 1,
              transform: unicodeNfc.transform,
              attempted: true,
              applied: false,
              changed: false,
              inputText: currentText,
              outputText: '',
              refusalCode: result.code,
            }),
          ],
          refusalCode: result.code,
        });
      }

      if (result.text !== currentText) {
        if (!isWithinOutputBounds(rawBytes, result.text)) {
          return buildRefusedResult({
            rawText,
            depthUsed,
            steps,
            refusalCode: 'NORMALIZATION_TOO_LARGE',
          });
        }

        steps.push(createNormalizationStep({
          stepIndex: steps.length + 1,
          transform: unicodeNfc.transform,
          attempted: true,
          applied: true,
          changed: true,
          inputText: currentText,
          outputText: result.text,
        }));
        currentText = result.text;
        depthUsed += 1;
        continue;
      }
    }

    const percentDecode = detectPercentDecode(currentText);
    if (percentDecode.state === 'candidate') {
      const result = coerceTransformResult(applyPercentDecode(currentText));

      if (!isTransformSuccess(result)) {
        steps.push(createNormalizationStep({
          stepIndex: steps.length + 1,
          transform: percentDecode.transform,
          attempted: true,
          applied: false,
          changed: false,
          inputText: currentText,
          outputText: '',
          refusalCode: result.code,
        }));

        return buildRefusedResult({
          rawText,
          depthUsed,
          steps,
          refusalCode: result.code,
        });
      }

      if (result.text !== currentText) {
        if (!isWithinOutputBounds(rawBytes, result.text)) {
          return buildRefusedResult({
            rawText,
            depthUsed,
            steps,
            refusalCode: 'NORMALIZATION_TOO_LARGE',
          });
        }

        steps.push(createNormalizationStep({
          stepIndex: steps.length + 1,
          transform: percentDecode.transform,
          attempted: true,
          applied: true,
          changed: true,
          inputText: currentText,
          outputText: result.text,
        }));
        currentText = result.text;
        depthUsed += 1;
        continue;
      }
    }

    const decoderAttempts = [
      {
        detection: detectBase64Decode(currentText),
        transform: applyBase64Decode,
      },
      {
        detection: detectHexDecode(currentText),
        transform: applyHexDecode,
      },
      {
        detection: detectReverseThenBase64Decode(currentText),
        transform: applyReverseThenBase64Decode,
      },
      {
        detection: detectReverseThenHexDecode(currentText),
        transform: applyReverseThenHexDecode,
      },
    ].filter(({ detection }) => detection.state === 'candidate');

    const successfulDecodes: Array<{
      transform: NormalizationAuditStep['transform'];
      text: string;
    }> = [];
    const failedDecodes: Array<{
      transform: NormalizationAuditStep['transform'];
      code: NormalizationTransformFailure['code'];
    }> = [];

    for (const attempt of decoderAttempts) {
      const result = coerceTransformResult(attempt.transform(currentText));

      if (isTransformSuccess(result)) {
        if (result.text !== currentText) {
          if (!isWithinOutputBounds(rawBytes, result.text)) {
            return buildRefusedResult({
              rawText,
              depthUsed,
              steps,
              refusalCode: 'NORMALIZATION_TOO_LARGE',
            });
          }

          successfulDecodes.push({
            transform: attempt.detection.transform,
            text: result.text,
          });
        }

        continue;
      }

      if (isTransformFailure(result)) {
        failedDecodes.push({
          transform: attempt.detection.transform,
          code: result.code,
        });
      }
    }

    if (successfulDecodes.length === 0) {
      if (failedDecodes.length > 0) {
        const refusalCode = failedDecodes[0].code;

        steps.push(createNormalizationStep({
          stepIndex: steps.length + 1,
          transform: failedDecodes[0].transform,
          attempted: true,
          applied: false,
          changed: false,
          inputText: currentText,
          outputText: '',
          refusalCode,
        }));

        return buildRefusedResult({
          rawText,
          depthUsed,
          steps,
          refusalCode,
        });
      }

      if (depthUsed > 0) {
        return buildNormalizedResult({
          rawText,
          canonicalText: currentText,
          depthUsed,
          steps,
        });
      }

      return buildUnchangedResult({
        rawText,
        canonicalText: currentText,
        depthUsed,
        steps,
      });
    }

    const firstSuccessfulText = successfulDecodes[0].text;
    const divergentSuccess = successfulDecodes.some((attempt) => attempt.text !== firstSuccessfulText);

    if (divergentSuccess) {
      for (const successfulDecode of successfulDecodes) {
        steps.push(createNormalizationStep({
          stepIndex: steps.length + 1,
          transform: successfulDecode.transform,
          attempted: true,
          applied: false,
          changed: true,
          inputText: currentText,
          outputText: successfulDecode.text,
        }));
      }

      return buildRefusedResult({
        rawText,
        depthUsed,
        steps,
        refusalCode: 'NORMALIZATION_AMBIGUOUS',
      });
    }

    const chosenDecode = successfulDecodes[0];

    steps.push(createNormalizationStep({
      stepIndex: steps.length + 1,
      transform: chosenDecode.transform,
      attempted: true,
      applied: true,
      changed: true,
      inputText: currentText,
      outputText: chosenDecode.text,
    }));

    currentText = chosenDecode.text;
    depthUsed += 1;
  }
  } finally {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    recordNormalizationDurationMs(durationMs);
  }
}

module.exports = {
  normalizeChatPdmInput,
  runNormalizationPipeline: normalizeChatPdmInput,
  MAX_TRANSFORM_DEPTH,
  MAX_INPUT_BYTES,
  MAX_OUTPUT_BYTES,
  MAX_EXPANSION_RATIO,
};
