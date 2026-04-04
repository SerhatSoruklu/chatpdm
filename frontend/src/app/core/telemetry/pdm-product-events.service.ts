import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';

import {
  dispatchPdmProductTelemetryEvent,
  type PdmProductTelemetryEventName,
  type PdmProductTelemetryPayload,
} from './pdm-product-events.model';

@Injectable({
  providedIn: 'root',
})
export class PdmProductEventsService {
  private readonly document = inject(DOCUMENT);

  track<Name extends PdmProductTelemetryEventName>(
    eventName: Name,
    payload: PdmProductTelemetryPayload<Name>,
  ): void {
    dispatchPdmProductTelemetryEvent(
      this.document.defaultView as Parameters<typeof dispatchPdmProductTelemetryEvent>[0],
      eventName,
      payload,
    );
  }
}
