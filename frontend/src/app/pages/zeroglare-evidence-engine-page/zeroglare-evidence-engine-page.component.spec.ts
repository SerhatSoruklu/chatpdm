import '@angular/compiler';

import { describe, expect, it, vi } from 'vitest';

import type { MatDialog } from '@angular/material/dialog';
import { ZeroglareEvidenceEnginePageComponent } from './zeroglare-evidence-engine-page.component';
import { ZeeInfographicDialogComponent } from './zeroglare-evidence-engine-image-dialog.component';

describe('ZeroglareEvidenceEnginePageComponent', () => {
  it('opens the infographic in a Material dialog with bounded data', () => {
    const open = vi.fn();
    const dialog = { open } as unknown as MatDialog;
    const component = new ZeroglareEvidenceEnginePageComponent(dialog);

    component.openInfographicDialog();

    expect(open).toHaveBeenCalledTimes(1);
    expect(open).toHaveBeenCalledWith(
      ZeeInfographicDialogComponent,
      expect.objectContaining({
        width: 'calc(100vw - 32px)',
        maxWidth: '1120px',
        maxHeight: 'calc(100dvh - 32px)',
        autoFocus: false,
        panelClass: 'pdm-zee-image-dialog-panel',
        restoreFocus: true,
        data: expect.objectContaining({
          title: 'ZeroGlare Evidence Engine',
          imagePath: '/assets/zee/44e767cb-bfa1-4f8c-884c-473dfd7eaefd.png',
          imageAlt: 'ZEE infographic showing the six-phase evidence pipeline from frame isolation to bounded output',
        }),
      }),
    );
  });
});
