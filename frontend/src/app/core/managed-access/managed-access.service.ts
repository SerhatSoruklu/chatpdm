import { DOCUMENT } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { resolveApiOrigin } from '../api/api-origin';
import {
  ManagedAccessRequestLookupPayload,
  ManagedAccessRequestPayload,
  ManagedAccessRequestReceipt,
} from './managed-access.types';

@Injectable({ providedIn: 'root' })
export class ManagedAccessService {
  private readonly http = inject(HttpClient);
  private readonly document = inject(DOCUMENT);

  createRequest(payload: ManagedAccessRequestPayload): Observable<ManagedAccessRequestReceipt> {
    return this.http.post<ManagedAccessRequestReceipt>(
      `${resolveApiOrigin(this.document)}/api/v1/managed-access/request`,
      payload,
    );
  }

  verifyDnsChallenge(payload: ManagedAccessRequestLookupPayload): Observable<ManagedAccessRequestReceipt> {
    return this.http.post<ManagedAccessRequestReceipt>(
      `${resolveApiOrigin(this.document)}/api/v1/managed-access/verify-dns`,
      payload,
    );
  }

  verifyWebsiteFileChallenge(payload: ManagedAccessRequestLookupPayload): Observable<ManagedAccessRequestReceipt> {
    return this.http.post<ManagedAccessRequestReceipt>(
      `${resolveApiOrigin(this.document)}/api/v1/managed-access/verify-website-file`,
      payload,
    );
  }
}
