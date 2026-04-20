import '@angular/compiler';

import { describe, expect, it, vi } from 'vitest';
import { of } from 'rxjs';

import type { MatDialog } from '@angular/material/dialog';
import { VisionPageComponent } from './vision-page.component';
import { VisionPageImageDialogComponent } from './vision-page-image-dialog.component';

describe('VisionPageComponent', () => {
  it('requests canonical signature verification on construction', () => {
    const loadCanonicalSignatureVerification = vi.fn().mockReturnValue(of({
      status: 'verifying',
    }));
    const component = new VisionPageComponent(
      { open: vi.fn() } as unknown as MatDialog,
      { loadCanonicalSignatureVerification } as any,
    );

    expect(loadCanonicalSignatureVerification).toHaveBeenCalledTimes(1);
    expect((component as any).signatureVerification$).toBeDefined();
  });

  it('opens the hero image in a Material dialog with bounded data', () => {
    const open = vi.fn();
    const dialog = { open } as unknown as MatDialog;
    const loadCanonicalSignatureVerification = vi.fn().mockReturnValue(of({ status: 'verifying' }));
    const component = new VisionPageComponent(dialog, {
      loadCanonicalSignatureVerification,
    } as any);

    component.openHeroImageDialog();

    expect(open).toHaveBeenCalledTimes(1);
    expect(open).toHaveBeenCalledWith(
      VisionPageImageDialogComponent,
      expect.objectContaining({
        width: 'calc(100vw - 24px)',
        maxWidth: '1240px',
        maxHeight: 'calc(100dvh - 24px)',
        ariaLabel: 'Refused vision page',
        panelClass: 'pdm-vision-image-dialog-panel',
        restoreFocus: true,
        data: expect.objectContaining({
          title: 'Refused vision page',
          imagePath: '/assets/vision/refused-vision-page.webp?v=20260420-1',
          imageAlt: 'Refused vision page reference image showing the ChatPDM vision hero strip',
          caption: 'Inspect the validation pipeline.',
          description:
            'This diagram shows ChatPDM as a bounded sequence: input, normalization, classification, validation, and refusal or allowance. It frames the runtime as disciplined execution, not a generic editorial visual.',
          width: 676,
          height: 1024,
        }),
      }),
    );
  });

  it('opens a Why this matters now image in a Material dialog with descriptive data', () => {
    const open = vi.fn();
    const dialog = { open } as unknown as MatDialog;
    const loadCanonicalSignatureVerification = vi.fn().mockReturnValue(of({ status: 'verifying' }));
    const component = new VisionPageComponent(dialog, {
      loadCanonicalSignatureVerification,
    } as any);
    const card = (component as any).whyThisMattersNowCards[0];

    (component as any).openWhyThisMattersNowDialog(card);

    expect(open).toHaveBeenCalledTimes(1);
    expect(open).toHaveBeenCalledWith(
      VisionPageImageDialogComponent,
      expect.objectContaining({
        width: 'calc(100vw - 24px)',
        maxWidth: '1240px',
        maxHeight: 'calc(100dvh - 24px)',
        ariaLabel: 'Images can be fabricated',
        panelClass: 'pdm-vision-image-dialog-panel',
        restoreFocus: true,
        data: expect.objectContaining({
          title: 'Images can be fabricated',
          imagePath: '/assets/vision/why-this-matters/vision-fabricated-image-87f8d2c79d.webp',
          imageAlt: 'Symbolic vision card for fabricated imagery in ChatPDM',
          caption: 'Synthetic image frame',
          description:
            'A believable image can still be synthetic. The surface may look real while the underlying scene was generated, altered, or never existed.',
          width: 1402,
          height: 1122,
        }),
      }),
    );
  });
});
