import { inject } from '@angular/core';
import type { ResolveFn } from '@angular/router';
import { catchError, map, of } from 'rxjs';

import {
  describeVocabularyBoundaryError,
  VocabularyBoundaryService,
} from './vocabulary-boundary.service';
import type { VocabularyBoundaryResolvedState } from './vocabulary-boundary.types';

export const vocabularyBoundaryResolver: ResolveFn<VocabularyBoundaryResolvedState> = () => {
  const vocabularyBoundary = inject(VocabularyBoundaryService);

  return vocabularyBoundary.loadVocabularyBoundary().pipe(
    map((data) => ({
      status: 'ready',
      data,
    }) satisfies VocabularyBoundaryResolvedState),
    catchError((error: unknown) => of({
      status: 'error',
      data: null,
      errorMessage: describeVocabularyBoundaryError(error),
    } satisfies VocabularyBoundaryResolvedState)),
  );
};
