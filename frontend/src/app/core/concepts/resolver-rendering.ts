import type { ResolveProductResponse } from './concept-resolver.types';

export type ResolverRenderMode = 'valid' | 'partial' | 'degraded' | 'refused';

export function resolverRenderMode(
  response: Pick<ResolveProductResponse, 'finalState'> | null | undefined,
): ResolverRenderMode | null {
  if (!response) {
    return null;
  }

  switch (response.finalState as string) {
    case 'partial':
      return 'partial';
    case 'degraded':
      return 'degraded';
    case 'refused':
      return 'refused';
    case 'valid':
    default:
      return 'valid';
  }
}

export function resolverExecutionStateLabel(response: ResolveProductResponse): string {
  const mode = resolverRenderMode(response);

  if (mode === 'valid') {
    return 'Executable';
  }

  if (mode === 'partial') {
    return 'Limited';
  }

  if (mode === 'degraded') {
    return 'Degraded';
  }

  switch (response.reason) {
    case 'exposure_boundary':
      return 'Excluded';
    case 'registry_rejection':
      return 'Rejected';
    case 'semantic_ambiguous_match':
      return 'Selection required';
    case 'semantic_no_exact_match':
      switch (response.interpretation?.interpretationType) {
        case 'visible_only_public_concept':
          return 'Not admitted';
        case 'out_of_scope':
          return 'Out-of-scope';
        default:
          return 'Refused';
      }
    case 'intake_invalid_query':
    case 'structure_unsupported_query_type':
    default:
      return 'Refused';
  }
}
