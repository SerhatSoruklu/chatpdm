import '@angular/compiler';

import { describe, expect, it, vi } from 'vitest';

import type { MatDialog } from '@angular/material/dialog';
import {
  MCPP_HERO_IMAGE_ALT,
  MCPP_HERO_IMAGE_BUTTON_LABEL,
  MCPP_HERO_IMAGE_CAPTION,
  MCPP_HERO_IMAGE_DIALOG_CLOSE_LABEL,
  MCPP_HERO_IMAGE_DIALOG_TITLE,
  MCPP_HERO_IMAGE_PATH,
} from './military-constraints-compiler-page.constants';
import { MilitaryConstraintsCompilerImageDialogComponent } from './military-constraints-compiler-image-dialog.component';
import { MilitaryConstraintsCompilerPageComponent } from './military-constraints-compiler-page.component';

describe('MilitaryConstraintsCompilerPageComponent', () => {
  it('opens the hero image in a Material dialog with bounded data', () => {
    const open = vi.fn();
    const dialog = { open } as unknown as MatDialog;
    const component = new MilitaryConstraintsCompilerPageComponent(dialog);

    component.openHeroImageDialog();

    expect(open).toHaveBeenCalledTimes(1);
    expect(open).toHaveBeenCalledWith(
      MilitaryConstraintsCompilerImageDialogComponent,
      expect.objectContaining({
        width: 'calc(100vw - 32px)',
        maxWidth: '1120px',
        maxHeight: 'calc(100dvh - 32px)',
        autoFocus: false,
        panelClass: 'pdm-mcc-image-dialog-panel',
        restoreFocus: true,
        data: expect.objectContaining({
          title: MCPP_HERO_IMAGE_DIALOG_TITLE,
          imagePath: MCPP_HERO_IMAGE_PATH,
          imageAlt: MCPP_HERO_IMAGE_ALT,
          caption: MCPP_HERO_IMAGE_CAPTION,
          closeLabel: MCPP_HERO_IMAGE_DIALOG_CLOSE_LABEL,
        }),
      }),
    );
    expect(component['heroImageButtonLabel']).toBe(MCPP_HERO_IMAGE_BUTTON_LABEL);
    expect(component['heroImageCaption']).toBe(MCPP_HERO_IMAGE_CAPTION);
    expect(component['surfaceTruthCards'].map((entry) => entry.label)).toEqual([
      'Shared INTL baseline',
      'National families',
      'Coalition packs',
      'Overlay families',
      'Planned roadmap',
      'Umbrella labels',
    ]);
    expect(component['whyThisLayerCards'].map((entry) => entry.label)).toEqual([
      'Upstream surfaces',
      'Why they are not enough',
      'This compiler',
    ]);
    expect(component['whyThisLayerNote']).toBe('Recommendation is optional. Admissibility is mandatory.');
    expect(component['executionBoundarySentence']).toBe(
      'This system sits at the execution boundary. No action proceeds without passing this check.',
    );
    expect(component['surfaceTruthCards'][0]).toMatchObject({
      title: 'International baseline packs',
    });
    expect(component['surfaceTruthCards'][5]).toMatchObject({
      copy: 'US_AIR_V1 is an umbrella label only and is not an admitted executable pack.',
    });
  });
});
