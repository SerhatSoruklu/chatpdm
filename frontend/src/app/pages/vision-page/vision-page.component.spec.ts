import '@angular/compiler';

import { describe, expect, it, vi } from 'vitest';
import { of } from 'rxjs';

import type { MatDialog } from '@angular/material/dialog';
import { VisionPageComponent } from './vision-page.component';
import { VisionPageImageDialogComponent } from './vision-page-image-dialog.component';
import type { CanonicalSignatureService } from '../../core/signature/canonical-signature.service';

type VisionImageCardLike = {
  title: string;
  caption: string;
  description: string;
  imagePath: string;
  imageAlt: string;
  width: number;
  height: number;
  wide: boolean;
};

type VisionPageComponentInternals = VisionPageComponent & {
  signatureVerification$: unknown;
  whyThisMattersNowCards: readonly VisionImageCardLike[];
  openWhyThisMattersNowDialog(card: VisionImageCardLike): void;
};

type CanonicalSignatureServiceMock = Pick<
  CanonicalSignatureService,
  'loadCanonicalSignatureVerification'
>;

describe('VisionPageComponent', () => {
  it('requests canonical signature verification on construction', () => {
    const loadCanonicalSignatureVerification = vi.fn().mockReturnValue(of({
      status: 'verifying',
    }));
    const canonicalSignatureService: CanonicalSignatureServiceMock = {
      loadCanonicalSignatureVerification,
    };
    const component = new VisionPageComponent(
      { open: vi.fn() } as unknown as MatDialog,
      canonicalSignatureService,
    );
    const componentInternals = component as VisionPageComponentInternals;

    expect(loadCanonicalSignatureVerification).toHaveBeenCalledTimes(1);
    expect(componentInternals.signatureVerification$).toBeDefined();
  });

  it('opens the hero image in a Material dialog with bounded data', () => {
    const open = vi.fn();
    const dialog = { open } as unknown as MatDialog;
    const loadCanonicalSignatureVerification = vi.fn().mockReturnValue(of({ status: 'verifying' }));
    const canonicalSignatureService: CanonicalSignatureServiceMock = {
      loadCanonicalSignatureVerification,
    };
    const component = new VisionPageComponent(dialog, {
      ...canonicalSignatureService,
    });

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
    const canonicalSignatureService: CanonicalSignatureServiceMock = {
      loadCanonicalSignatureVerification,
    };
    const component = new VisionPageComponent(dialog, canonicalSignatureService);
    const componentInternals = component as VisionPageComponentInternals;
    const card = componentInternals.whyThisMattersNowCards[0];

    componentInternals.openWhyThisMattersNowDialog(card);

    expect(open).toHaveBeenCalledTimes(1);
    expect(open).toHaveBeenCalledWith(
      VisionPageImageDialogComponent,
      expect.objectContaining({
        width: 'calc(100vw - 24px)',
        maxWidth: '1240px',
        maxHeight: 'calc(100dvh - 24px)',
        ariaLabel: 'Reality can be fabricated',
        panelClass: 'pdm-vision-image-dialog-panel',
        restoreFocus: true,
        data: expect.objectContaining({
          title: 'Reality can be fabricated',
          imagePath: '/assets/vision/why-this-matters/vision-fabricated-image-87f8d2c79d.webp',
          imageAlt: 'Symbolic vision card for fabricated imagery in ChatPDM',
          caption: 'Faces, memories, and moments can be forged in seconds.',
          description:
            'A believable image can still be synthetic. The surface may look real while the underlying scene was generated, altered, or never existed.',
          width: 1402,
          height: 1122,
        }),
      }),
    );
  });
});
