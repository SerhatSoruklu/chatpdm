import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';

const SESSION_STORAGE_KEY = 'chatpdm-beta-session-id';

type SecureRandomSource = Partial<Pick<Crypto, 'getRandomValues' | 'randomUUID'>>;

function formatUuid(bytes: Uint8Array): string {
  const normalized = Uint8Array.from(bytes);

  normalized[6] = (normalized[6] & 0x0f) | 0x40;
  normalized[8] = (normalized[8] & 0x3f) | 0x80;

  const hex = Array.from(normalized, (byte) => byte.toString(16).padStart(2, '0')).join('');

  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join('-');
}

export function createSecureSessionId(cryptoSource?: SecureRandomSource): string {
  const generated = cryptoSource?.randomUUID?.();

  if (generated) {
    return `chatpdm-${generated}`;
  }

  if (cryptoSource?.getRandomValues) {
    const bytes = new Uint8Array(16);
    cryptoSource.getRandomValues(bytes);
    return `chatpdm-${formatUuid(bytes)}`;
  }

  throw new Error('Secure crypto APIs are unavailable.');
}

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
    return createSecureSessionId(defaultView?.crypto ?? globalThis.crypto);
  }
}
