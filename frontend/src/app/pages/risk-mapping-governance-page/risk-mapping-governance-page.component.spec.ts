import '@angular/compiler';

import { describe, expect, it, vi } from 'vitest';

import type { MatDialog } from '@angular/material/dialog';
import { RMG_DIAGRAM_ALT, RMG_DIAGRAM_PATH, RMG_ROUTE_PATH } from './risk-mapping-governance-page.constants';
import { RiskMappingGovernancePageComponent } from './risk-mapping-governance-page.component';
import { RiskMappingGovernanceImageDialogComponent } from './risk-mapping-governance-image-dialog.component';

describe('RiskMappingGovernancePageComponent', () => {
  it('opens the RMG diagram in a Material dialog with bounded data', () => {
    const open = vi.fn();
    const dialog = { open } as unknown as MatDialog;
    const component = new RiskMappingGovernancePageComponent(dialog, undefined);

    component.openDiagramDialog();

    expect(open).toHaveBeenCalledTimes(1);
    expect(open).toHaveBeenCalledWith(
      RiskMappingGovernanceImageDialogComponent,
      expect.objectContaining({
        width: 'calc(100vw - 32px)',
        maxWidth: '1120px',
        maxHeight: 'calc(100dvh - 32px)',
        autoFocus: false,
        panelClass: 'pdm-rmg-image-dialog-panel',
        restoreFocus: true,
        data: expect.objectContaining({
          title: 'Risk Mapping Governance (RMG)',
          imagePath: RMG_DIAGRAM_PATH,
          imageAlt: RMG_DIAGRAM_ALT,
          caption: expect.stringContaining('visual anchor'),
        }),
      }),
    );
    expect(component['pageRoute']).toBe(RMG_ROUTE_PATH);
  });
});
