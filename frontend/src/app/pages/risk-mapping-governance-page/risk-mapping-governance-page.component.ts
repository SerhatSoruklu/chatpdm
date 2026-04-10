import { CommonModule, DOCUMENT } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { resolveApiOrigin } from '../../core/api/api-origin';
import {
  RMG_DIAGRAM_ALT,
  RMG_DIAGRAM_CAPTION,
  RMG_DIAGRAM_CAPTION_DETAIL,
  RMG_DIAGRAM_EXPAND_LABEL,
  RMG_DIAGRAM_PATH,
  RMG_PAGE_TITLE,
  RMG_ROUTE_PATH,
} from './risk-mapping-governance-page.constants';
import { RiskMappingGovernanceImageDialogComponent } from './risk-mapping-governance-image-dialog.component';

interface GuaranteeCard {
  title: string;
  copy: string;
}

interface WorkflowStep {
  step: string;
  title: string;
  copy: string;
}

interface AuditLinkCard {
  title: string;
  copy: string;
  href: string;
  label: string;
}

@Component({
  selector: 'app-risk-mapping-governance-page',
  standalone: true,
  imports: [CommonModule, RouterLink, MatDialogModule],
  templateUrl: './risk-mapping-governance-page.component.html',
  styleUrl: './risk-mapping-governance-page.component.css',
})
export class RiskMappingGovernancePageComponent {
  protected readonly pageTitle = RMG_PAGE_TITLE;
  protected readonly diagramPath = RMG_DIAGRAM_PATH;
  protected readonly diagramAltText = RMG_DIAGRAM_ALT;
  protected readonly diagramExpandLabel = RMG_DIAGRAM_EXPAND_LABEL;
  protected readonly diagramCaption = RMG_DIAGRAM_CAPTION;
  protected readonly diagramCaptionDetail = RMG_DIAGRAM_CAPTION_DETAIL;
  protected readonly apiOrigin: string;
  protected readonly pageRoute = RMG_ROUTE_PATH;
  protected readonly explainEndpoint: string;
  protected readonly auditEndpoint: string;
  protected readonly nodesEndpoint: string;
  protected readonly threatsEndpoint: string;
  protected readonly compatibilityEndpoint: string;
  protected readonly falsifiersEndpoint: string;
  protected readonly auditSurfaceCards: readonly AuditLinkCard[];
  protected readonly apiSurfaceLinks: readonly AuditLinkCard[];

  constructor(
    private readonly dialog: MatDialog,
    @Inject(DOCUMENT) private readonly document: Document | null | undefined,
  ) {
    this.apiOrigin = resolveApiOrigin(document);
    this.explainEndpoint = `${this.apiOrigin}/api/v1/risk-mapping/explain`;
    this.auditEndpoint = `${this.apiOrigin}/api/v1/risk-mapping/audit`;
    this.nodesEndpoint = `${this.apiOrigin}/api/v1/risk-mapping/registries/nodes`;
    this.threatsEndpoint = `${this.apiOrigin}/api/v1/risk-mapping/registries/threats`;
    this.compatibilityEndpoint = `${this.apiOrigin}/api/v1/risk-mapping/registries/compatibility`;
    this.falsifiersEndpoint = `${this.apiOrigin}/api/v1/risk-mapping/registries/falsifiers`;
    this.auditSurfaceCards = [
      {
        title: 'Explanation surface',
        copy: 'A bounded structural explanation that mirrors the resolve decision without adding narrative drift.',
        href: this.explainEndpoint,
        label: '/api/v1/risk-mapping/explain',
      },
      {
        title: 'Audit report',
        copy: 'A provenance-backed audit surface that bundles input, output, explanation, and invariants.',
        href: this.auditEndpoint,
        label: '/api/v1/risk-mapping/audit',
      },
      {
        title: 'Registry views',
        copy: 'Deterministic registry read models for nodes, threats, compatibility, and falsifiers.',
        href: this.nodesEndpoint,
        label: '/api/v1/risk-mapping/registries/*',
      },
      {
        title: 'Governed releases',
        copy: 'Versioned releases, diffs, freeze validation, and replay checks keep change control explicit.',
        href: this.auditEndpoint,
        label: 'Governance + replay surfaces',
      },
    ] as const;
    this.apiSurfaceLinks = [
      {
        title: 'Nodes',
        copy: 'Inspection-ready node registry.',
        href: this.nodesEndpoint,
        label: '/api/v1/risk-mapping/registries/nodes',
      },
      {
        title: 'Threats',
        copy: 'Inspection-ready threat registry.',
        href: this.threatsEndpoint,
        label: '/api/v1/risk-mapping/registries/threats',
      },
      {
        title: 'Compatibility',
        copy: 'Inspection-ready compatibility registry.',
        href: this.compatibilityEndpoint,
        label: '/api/v1/risk-mapping/registries/compatibility',
      },
      {
        title: 'Falsifiers',
        copy: 'Inspection-ready falsifier registry.',
        href: this.falsifiersEndpoint,
        label: '/api/v1/risk-mapping/registries/falsifiers',
      },
    ] as const;
  }

  protected readonly whatItIsCards: readonly GuaranteeCard[] = [
    {
      title: 'Deterministic',
      copy: 'Same input and same authored artifacts produce the same result.',
    },
    {
      title: 'Bounded',
      copy: 'The system only operates inside defined domains, scopes, and compatibility rules.',
    },
    {
      title: 'Evidence-backed',
      copy: 'Support is admitted only when authored evidence and compatibility are present.',
    },
    {
      title: 'Inspectable',
      copy: 'Every admitted, narrowed, or refused result can be traced through explanation and audit surfaces.',
    },
    {
      title: 'Governed',
      copy: 'Changes are versioned, validated, diffed, and frozen before they become active.',
    },
  ] as const;

  protected readonly whatItIsNotCards: readonly GuaranteeCard[] = [
    {
      title: 'Not a forecasting engine',
      copy: 'RMG does not forecast outcomes or claim future certainty.',
    },
    {
      title: 'Not a probability engine',
      copy: 'Bounded confidence is support strength, not statistical likelihood.',
    },
    {
      title: 'Not a narrative generator',
      copy: 'It emits compact structural outputs, not freeform stories.',
    },
    {
      title: 'Not open-world reasoning',
      copy: 'Unsupported links remain blocked instead of being invented.',
    },
    {
      title: 'Not hidden inference',
      copy: 'Every result must stay traceable to authored evidence and explicit rules.',
    },
  ] as const;

  protected readonly workflowSteps: readonly WorkflowStep[] = [
    {
      step: '01',
      title: 'Input and normalization',
      copy: 'A query is normalized into a bounded shape before it can enter resolution.',
    },
    {
      step: '02',
      title: 'Admissibility checks',
      copy: 'The system checks whether the requested scope is supported by authored boundaries.',
    },
    {
      step: '03',
      title: 'Evidence and registries',
      copy: 'Domain manifests, registries, and evidence packs provide the only allowed support surface.',
    },
    {
      step: '04',
      title: 'Supported structural mapping',
      copy: 'Only direct supported structural paths are emitted inside admitted scope.',
    },
    {
      step: '05',
      title: 'Output, explanation, and audit',
      copy: 'The final resolve output stays compact while explanation and audit surfaces stay inspectable.',
    },
  ] as const;

  protected readonly guarantees: readonly GuaranteeCard[] = [
    {
      title: 'Deterministic risk mapping',
      copy: 'The same authored inputs always produce the same structural output.',
    },
    {
      title: 'Evidence-backed risk analysis',
      copy: 'No support enters the result unless the authored system can justify it.',
    },
    {
      title: 'Supported structural paths',
      copy: 'Paths are direct, bounded, and explicit rather than inferred from open-ended context.',
    },
    {
      title: 'Auditable risk analysis',
      copy: 'Every result can be replayed, inspected, and traced through governed artifacts.',
    },
  ] as const;

  protected readonly exampleBullets = [
    'Broad framing is checked at the boundary.',
    'Supported structural paths are mapped only where evidence exists.',
    'Unsupported bridges remain explicit.',
    'Bounded support confidence does not mean prediction.',
  ] as const;

  openDiagramDialog(): void {
    this.dialog.open(RiskMappingGovernanceImageDialogComponent, {
      width: 'calc(100vw - 32px)',
      maxWidth: '1120px',
      maxHeight: 'calc(100dvh - 32px)',
      autoFocus: false,
      panelClass: 'pdm-rmg-image-dialog-panel',
      restoreFocus: true,
      data: {
        title: this.pageTitle,
        imagePath: this.diagramPath,
        imageAlt: this.diagramAltText,
        caption: `${this.diagramCaption} ${this.diagramCaptionDetail}`,
      },
    });
  }
}
