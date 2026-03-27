import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';

const SESSION_STORAGE_KEY = 'chatpdm-beta-session-id';

@Injectable({ providedIn: 'root' })
export class FeedbackSessionService {
  private readonly document = inject(DOCUMENT);
  private cachedSessionId: string | null = null;

  getSessionId(): string | null {
    if (this.cachedSessionId) {
      return this.cachedSessionId;
    }

    const storage = this.document?.defaultView?.localStorage;

    if (!storage) {
      return null;
    }

    try {
      const existingSessionId = storage.getItem(SESSION_STORAGE_KEY);

      if (existingSessionId) {
        this.cachedSessionId = existingSessionId;
        return existingSessionId;
      }

      const generatedSessionId = this.generateSessionId();
      storage.setItem(SESSION_STORAGE_KEY, generatedSessionId);
      this.cachedSessionId = generatedSessionId;
      return generatedSessionId;
    } catch {
      return null;
    }
  }

  private generateSessionId(): string {
    const defaultView = this.document?.defaultView;
    const generated = defaultView?.crypto?.randomUUID?.();

    if (generated) {
      return generated;
    }

    return `chatpdm-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }
}

