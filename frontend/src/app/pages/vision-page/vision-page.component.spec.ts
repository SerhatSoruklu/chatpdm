import '@angular/compiler';

import { describe, expect, it, vi } from 'vitest';

import type { MatDialog } from '@angular/material/dialog';
import { VisionPageComponent } from './vision-page.component';
import { VisionPageImageDialogComponent } from './vision-page-image-dialog.component';

describe('VisionPageComponent', () => {
  it('opens the hero image in a Material dialog with bounded data', () => {
    const open = vi.fn();
    const dialog = { open } as unknown as MatDialog;
    const component = new VisionPageComponent(dialog);

    component.openHeroImageDialog();

    expect(open).toHaveBeenCalledTimes(1);
    expect(open).toHaveBeenCalledWith(
      VisionPageImageDialogComponent,
      expect.objectContaining({
        width: 'calc(100vw - 24px)',
        maxWidth: '1240px',
        maxHeight: 'calc(100dvh - 24px)',
        autoFocus: false,
        panelClass: 'pdm-vision-image-dialog-panel',
        restoreFocus: true,
        data: expect.objectContaining({
          title: 'Refused vision page',
          imagePath: '/assets/vision/refused-vision-page.png',
          imageAlt: 'Refused vision page reference image showing the ChatPDM vision hero strip',
          caption: 'Open the full image in a dialog.',
        }),
      }),
    );
  });
});
