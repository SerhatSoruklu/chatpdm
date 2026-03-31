import { DOCUMENT } from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { resolveApiOrigin } from '../api/api-origin';
import { ConceptDetailResponse, ResolveProductResponse } from './concept-resolver.types';

@Injectable({ providedIn: 'root' })
export class ConceptResolverService {
  private readonly http = inject(HttpClient);
  private readonly document = inject(DOCUMENT);

  resolve(query: string): Observable<ResolveProductResponse> {
    const params = new HttpParams().set('q', query);

    return this.http.get<ResolveProductResponse>(`${resolveApiOrigin(this.document)}/api/v1/concepts/resolve`, {
      params,
    });
  }

  detail(conceptId: string): Observable<ConceptDetailResponse> {
    return this.http.get<ConceptDetailResponse>(
      `${resolveApiOrigin(this.document)}/api/v1/concepts/${encodeURIComponent(conceptId)}`,
    );
  }
}
