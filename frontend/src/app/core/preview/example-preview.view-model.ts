import type {
  ComparisonAxis,
  ComparisonAxisStatement,
  ComparisonAxisValue,
  ComparisonResponse,
  NoExactMatchResponse,
  ResolveProductResponse,
} from '../concepts/concept-resolver.types';

export const SEEDED_COMPARISON_QUERY = 'authority vs power';
export const SEEDED_REFUSAL_QUERY = 'authority vs charisma';
export const PREVIEW_TRACE_CHIPS = ['comparison mode', 'deterministic runtime', 'bounded scope'] as const;

export interface ComparisonPreview {
  query: string;
  conceptA: string;
  conceptB: string;
  conceptADefinition: string;
  conceptBDefinition: string;
  traceChips: readonly string[];
  boundaryStatement: string | null;
}

export interface RefusalPreview {
  query: string;
  message: string;
}

export interface SeededPreviewIssue {
  seedLabel: 'comparison seed' | 'refusal seed';
  message: string;
  details: readonly string[];
}

export type SeededPreviewOutcome<T> =
  | { kind: 'ready'; preview: T }
  | { kind: 'issue'; issue: SeededPreviewIssue };

export type ExamplePreviewState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | {
      status: 'ready';
      comparison: ComparisonPreview;
      refusal: RefusalPreview;
      comparisonIssue: null;
      refusalIssue: null;
    }
  | {
      status: 'partial';
      comparison: ComparisonPreview | null;
      refusal: RefusalPreview | null;
      comparisonIssue: SeededPreviewIssue | null;
      refusalIssue: SeededPreviewIssue | null;
    };

export function buildExamplePreviewState(
  comparison: SeededPreviewOutcome<ComparisonPreview>,
  refusal: SeededPreviewOutcome<RefusalPreview>,
): ExamplePreviewState {
  if (comparison.kind === 'ready' && refusal.kind === 'ready') {
    return {
      status: 'ready',
      comparison: comparison.preview,
      refusal: refusal.preview,
      comparisonIssue: null,
      refusalIssue: null,
    };
  }

  return {
    status: 'partial',
    comparison: comparison.kind === 'ready' ? comparison.preview : null,
    refusal: refusal.kind === 'ready' ? refusal.preview : null,
    comparisonIssue: comparison.kind === 'issue' ? comparison.issue : null,
    refusalIssue: refusal.kind === 'issue' ? refusal.issue : null,
  };
}

export function classifyComparisonSeedResponse(
  response: ResolveProductResponse,
): SeededPreviewOutcome<ComparisonPreview> {
  if (response.type !== 'comparison') {
    return {
      kind: 'issue',
      issue: {
        seedLabel: 'comparison seed',
        message: 'Seeded comparison query is unavailable from the live resolver.',
        details: responseDetails(response),
      },
    };
  }

  return {
    kind: 'ready',
    preview: buildComparisonPreview(response),
  };
}

export function classifyRefusalSeedResponse(
  response: ResolveProductResponse,
): SeededPreviewOutcome<RefusalPreview> {
  if (response.type !== 'no_exact_match' || response.queryType !== 'comparison_query') {
    return {
      kind: 'issue',
      issue: {
        seedLabel: 'refusal seed',
        message: 'Seeded refusal query is unavailable from the live resolver.',
        details: responseDetails(response),
      },
    };
  }

  return {
    kind: 'ready',
    preview: buildRefusalPreview(response),
  };
}

export function buildComparisonPreview(response: ComparisonResponse): ComparisonPreview {
  const coreNatureAxis = findValueAxis(response.comparison.axes, 'core_nature')
    ?? findFirstValueAxis(response.comparison.axes);
  const boundaryStatement = findStatementAxis(response.comparison.axes, 'not_equivalent')?.statement
    ?? null;

  return {
    query: response.query,
    conceptA: response.comparison.conceptA,
    conceptB: response.comparison.conceptB,
    conceptADefinition: coreNatureAxis?.A ?? 'Resolved meaning unavailable.',
    conceptBDefinition: coreNatureAxis?.B ?? 'Resolved meaning unavailable.',
    traceChips: PREVIEW_TRACE_CHIPS,
    boundaryStatement,
  };
}

export function buildRefusalPreview(response: NoExactMatchResponse): RefusalPreview {
  return {
    query: response.query,
    message: response.interpretation?.message?.trim() || response.message,
  };
}

function responseDetails(response: ResolveProductResponse): string[] {
  const details: string[] = [response.type];

  if ('queryType' in response && response.queryType) {
    details.push(response.queryType);
  }

  if (response.type === 'no_exact_match') {
    details.push(response.interpretation?.interpretationType ?? 'unclassified_refusal');
  }

  return details;
}

function findValueAxis(
  axes: ComparisonAxis[],
  axisName: string,
): ComparisonAxisValue | null {
  for (const axis of axes) {
    if (axis.axis === axisName && isValueAxis(axis)) {
      return axis;
    }
  }

  return null;
}

function findFirstValueAxis(axes: ComparisonAxis[]): ComparisonAxisValue | null {
  for (const axis of axes) {
    if (isValueAxis(axis)) {
      return axis;
    }
  }

  return null;
}

function findStatementAxis(
  axes: ComparisonAxis[],
  axisName: string,
): ComparisonAxisStatement | null {
  for (const axis of axes) {
    if (axis.axis === axisName && isStatementAxis(axis)) {
      return axis;
    }
  }

  return null;
}

function isValueAxis(axis: ComparisonAxis): axis is ComparisonAxisValue {
  return 'A' in axis && 'B' in axis;
}

function isStatementAxis(axis: ComparisonAxis): axis is ComparisonAxisStatement {
  return 'statement' in axis;
}
