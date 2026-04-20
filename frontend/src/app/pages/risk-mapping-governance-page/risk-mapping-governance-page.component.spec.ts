import '@angular/compiler';

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it, vi } from 'vitest';

import type { MatDialog } from '@angular/material/dialog';
import { RMG_DIAGRAM_ALT, RMG_DIAGRAM_CAPTION, RMG_DIAGRAM_PATH, RMG_ROUTE_PATH } from './risk-mapping-governance-page.constants';
import { RiskMappingGovernancePageComponent } from './risk-mapping-governance-page.component';
import { RiskMappingGovernanceImageDialogComponent } from './risk-mapping-governance-image-dialog.component';

const TEMPLATE_PATH = fileURLToPath(new URL('./risk-mapping-governance-page.component.html', import.meta.url));

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

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
          caption: expect.stringContaining('Execution flow'),
        }),
      }),
    );
    expect(component['pageRoute']).toBe(RMG_ROUTE_PATH);
  });

  it('locks the hardened public copy and proof surfaces in source', () => {
    const template = normalizeWhitespace(readFileSync(TEMPLATE_PATH, 'utf8'));

    for (const phrase of [
      'Boundary / contract / governed proof',
      'A deterministic boundary for admitting, narrowing, or refusing scenario queries under authored evidence, registries, and explicit domain rules.',
      'RMG does not predict outcomes. It emits supported structural paths, explicit unsupported bridges, and bounded support confidence.',
      'View governed proof',
      'Review execution gate',
      'Execution posture',
      'Bounded support confidence, not prediction.',
      'Boundary claims',
      'What RMG admits / what RMG refuses',
      'Execution gate',
      'How RMG executes',
      'Structured example',
      'Structured query, structural output',
      'Resolve contract',
      'Locked resolve contract',
      'The excerpt below is the frozen backend output for a structured query. It is a contract, not an example answer.',
      'Governed proof',
      'Governed proof surface',
      'RMG refuses unsupported claims and only emits structurally supported outputs under authored evidence and explicit constraints.',
    ]) {
      expect(template).toContain(normalizeWhitespace(phrase));
    }

    for (const phrase of [
      'trust layer',
      'Transparency / trust / architecture',
      'Explore how it works',
      'example query',
      'example resolve output',
      'Why this system is auditable',
      'question becomes',
      'RMG does not claim to know what will happen.',
      'A trust layer for bounded risk mapping.',
    ]) {
      expect(template).not.toContain(normalizeWhitespace(phrase));
    }
  });

  it('exposes the real proof surfaces in component state', () => {
    const open = vi.fn();
    const dialog = { open } as unknown as MatDialog;
    const component = new RiskMappingGovernancePageComponent(dialog, undefined);

    expect(component['diagramCaption']).toBe('Execution flow for the locked RMG boundary.');
    expect(component['diagramCaptionDetail']).toBe('Open it in a dialog to inspect the contract flow.');
    expect(component['diagramAltText']).toBe(
      'RMG execution flow showing admissibility, registries, direct supported paths, explicit unsupported bridges, and audit output',
    );

    expect(
      component['auditSurfaceCards'].map((card) => ({
        title: card.title,
        href: card.href,
        label: card.label,
      })),
    ).toEqual([
      {
        title: 'Operation index',
        href: 'http://127.0.0.1:4301/api/v1/risk-mapping',
        label: '/api/v1/risk-mapping',
      },
      {
        title: 'Resolve contract',
        href: 'http://127.0.0.1:4301/api/v1/risk-mapping/resolve',
        label: '/api/v1/risk-mapping/resolve',
      },
      {
        title: 'Explanation surface',
        href: 'http://127.0.0.1:4301/api/v1/risk-mapping/explain',
        label: '/api/v1/risk-mapping/explain',
      },
      {
        title: 'Audit report',
        href: 'http://127.0.0.1:4301/api/v1/risk-mapping/audit',
        label: '/api/v1/risk-mapping/audit',
      },
      {
        title: 'Governance report',
        href: 'http://127.0.0.1:4301/api/v1/risk-mapping/governance',
        label: '/api/v1/risk-mapping/governance',
      },
      {
        title: 'Diff report',
        href: 'http://127.0.0.1:4301/api/v1/risk-mapping/diff',
        label: '/api/v1/risk-mapping/diff',
      },
    ]);

    expect(
      component['apiSurfaceLinks'].map((endpoint) => ({
        title: endpoint.title,
        href: endpoint.href,
        label: endpoint.label,
      })),
    ).toEqual([
      {
        title: 'Nodes registry',
        href: 'http://127.0.0.1:4301/api/v1/risk-mapping/registries/nodes',
        label: '/api/v1/risk-mapping/registries/nodes',
      },
      {
        title: 'Threats registry',
        href: 'http://127.0.0.1:4301/api/v1/risk-mapping/registries/threats',
        label: '/api/v1/risk-mapping/registries/threats',
      },
      {
        title: 'Compatibility registry',
        href: 'http://127.0.0.1:4301/api/v1/risk-mapping/registries/compatibility',
        label: '/api/v1/risk-mapping/registries/compatibility',
      },
      {
        title: 'Falsifiers registry',
        href: 'http://127.0.0.1:4301/api/v1/risk-mapping/registries/falsifiers',
        label: '/api/v1/risk-mapping/registries/falsifiers',
      },
    ]);
  });
});
