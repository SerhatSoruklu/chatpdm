import { DOCUMENT } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { resolveApiOrigin } from '../api/api-origin';
import { FeedbackSessionService } from '../feedback/feedback-session.service';

export type AiTrackingEventType = 'AI_VIEWED' | 'AI_FOLLOWED' | 'CANONICAL_USED';

export interface AiTrackingEventPayload {
  eventType: AiTrackingEventType;
  surface: string;
  conceptId?: string | null;
  query?: string | null;
  details?: Record<string, string> | null;
}

interface AiTrackingReceipt {
  status: 'recorded';
  eventId: string;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class AiTrackingService {
  private readonly http = inject(HttpClient);
  private readonly document = inject(DOCUMENT);
  private readonly feedbackSession = inject(FeedbackSessionService);

  track(payload: AiTrackingEventPayload): void {
    const sessionId = this.feedbackSession.getSessionId();

    void firstValueFrom(
      this.http.post<AiTrackingReceipt>(`${resolveApiOrigin(this.document)}/api/ai-events`, {
        ...payload,
        sessionId,
      }),
    ).catch(() => undefined);
  }
}
