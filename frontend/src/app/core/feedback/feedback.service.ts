import { DOCUMENT } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { resolveApiOrigin } from '../api/api-origin';
import { FeedbackReceipt, FeedbackSubmissionPayload } from './feedback.types';
import { FeedbackSessionService } from './feedback-session.service';

@Injectable({ providedIn: 'root' })
export class FeedbackService {
  private readonly http = inject(HttpClient);
  private readonly document = inject(DOCUMENT);
  private readonly feedbackSession = inject(FeedbackSessionService);

  submit(payload: FeedbackSubmissionPayload): Observable<FeedbackReceipt> {
    const sessionId = this.feedbackSession.getSessionId();

    return this.http.post<FeedbackReceipt>(`${resolveApiOrigin(this.document)}/api/v1/feedback`, {
      ...payload,
      sessionId,
    });
  }
}
