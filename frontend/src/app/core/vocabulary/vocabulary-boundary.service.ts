import { DOCUMENT } from '@angular/common';
import { HttpErrorResponse, HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, shareReplay } from 'rxjs';

import { resolveApiOrigin } from '../api/api-origin';
import type { VocabularyBoundaryResponse } from './vocabulary-boundary.types';

export function describeVocabularyBoundaryError(error: unknown): string {
  if (error instanceof HttpErrorResponse && error.status === 0) {
    return 'The vocabulary boundary is unavailable. Check that the ChatPDM backend is running on port 4301.';
  }

  return 'The vocabulary boundary could not be loaded from the public API.';
}

@Injectable({ providedIn: 'root' })
export class VocabularyBoundaryService {
  private readonly http = inject(HttpClient);
  private readonly document = inject(DOCUMENT);
  private readonly vocabularyBoundaryRequest$ = this.http
    .get<VocabularyBoundaryResponse>(`${resolveApiOrigin(this.document)}/api/v1/vocabulary`)
    .pipe(
      shareReplay({
        bufferSize: 1,
        refCount: false,
      }),
    );

  loadVocabularyBoundary(): Observable<VocabularyBoundaryResponse> {
    return this.vocabularyBoundaryRequest$;
  }
}
