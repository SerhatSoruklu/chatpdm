import { DOCUMENT } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of, shareReplay, startWith, switchMap, from } from 'rxjs';

import { resolveApiOrigin } from '../api/api-origin';
import { verifyCanonicalSignatureEnvelope } from './canonical-signature.guard';
import type {
  CanonicalSignatureResponse,
  CanonicalSignatureVerificationState,
} from './canonical-signature.types';

export function describeCanonicalSignatureError(error: unknown): string {
  if (error instanceof HttpErrorResponse && error.status === 0) {
    return 'The canonical signature envelope is unavailable. Check that the ChatPDM backend is running on port 4301.';
  }

  return 'The canonical signature could not be verified.';
}

@Injectable({ providedIn: 'root' })
export class CanonicalSignatureService {
  private readonly http = inject(HttpClient);
  private readonly document = inject(DOCUMENT);
  private readonly signatureRequest$ = this.http
    .get<CanonicalSignatureResponse>(`${resolveApiOrigin(this.document)}/api/v1/vision/signature`)
    .pipe(
      switchMap((response) =>
        from(
          verifyCanonicalSignatureEnvelope(
            response.signedEnvelope,
            this.document?.baseURI || 'http://127.0.0.1:4200/',
          ),
        ).pipe(
          map((verification) =>
            verification.verified
              ? ({
                  status: 'verified',
                  signedEnvelope: verification.signedEnvelope,
                } as const)
              : ({
                  status: 'unverified',
                  reason: verification.reason,
                } as const),
          ),
        ),
      ),
      catchError((error: unknown) =>
        of<CanonicalSignatureVerificationState>({
          status: 'unverified',
          reason: describeCanonicalSignatureError(error),
        }),
      ),
      startWith<CanonicalSignatureVerificationState>({
        status: 'verifying',
      }),
      shareReplay({
        bufferSize: 1,
        refCount: false,
      }),
    );

  loadCanonicalSignatureVerification(): Observable<CanonicalSignatureVerificationState> {
    return this.signatureRequest$;
  }
}
