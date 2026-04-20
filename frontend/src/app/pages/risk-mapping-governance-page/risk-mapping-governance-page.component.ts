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
  protected readonly rootEndpoint: string;
  protected readonly resolveEndpoint: string;
  protected readonly explainEndpoint: string;
  protected readonly auditEndpoint: string;
  protected readonly governanceEndpoint: string;
  protected readonly diffEndpoint: string;
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
    this.rootEndpoint = `${this.apiOrigin}/api/v1/risk-mapping`;
    this.resolveEndpoint = `${this.apiOrigin}/api/v1/risk-mapping/resolve`;
    this.explainEndpoint = `${this.apiOrigin}/api/v1/risk-mapping/explain`;
    this.auditEndpoint = `${this.apiOrigin}/api/v1/risk-mapping/audit`;
    this.governanceEndpoint = `${this.apiOrigin}/api/v1/risk-mapping/governance`;
    this.diffEndpoint = `${this.apiOrigin}/api/v1/risk-mapping/diff`;
    this.nodesEndpoint = `${this.apiOrigin}/api/v1/risk-mapping/registries/nodes`;
    this.threatsEndpoint = `${this.apiOrigin}/api/v1/risk-mapping/registries/threats`;
    this.compatibilityEndpoint = `${this.apiOrigin}/api/v1/risk-mapping/registries/compatibility`;
    this.falsifiersEndpoint = `${this.apiOrigin}/api/v1/risk-mapping/registries/falsifiers`;
    this.auditSurfaceCards = [
      {
        title: 'Operation index',
        copy: 'Shows the live RMG operation set and confirms the public surface is active.',
        href: this.rootEndpoint,
        label: '/api/v1/risk-mapping',
      },
      {
        title: 'Resolve contract',
        copy: 'Frozen structural output for admitted, narrowed, or refused queries.',
        href: this.resolveEndpoint,
        label: '/api/v1/risk-mapping/resolve',
      },
      {
        title: 'Explanation surface',
        copy: 'Bounded explanation that mirrors resolve without narrative drift.',
        href: this.explainEndpoint,
        label: '/api/v1/risk-mapping/explain',
      },
      {
        title: 'Audit report',
        copy: 'Input, output, explanation, confidence, provenance, and invariants in one bounded record.',
        href: this.auditEndpoint,
        label: '/api/v1/risk-mapping/audit',
      },
      {
        title: 'Governance report',
        copy: 'Release admission, registry hash, validation, replay, and compatibility checks.',
        href: this.governanceEndpoint,
        label: '/api/v1/risk-mapping/governance',
      },
      {
        title: 'Diff report',
        copy: 'Release-to-release change record for governed updates.',
        href: this.diffEndpoint,
        label: '/api/v1/risk-mapping/diff',
      },
    ] as const;
    this.apiSurfaceLinks = [
      {
        title: 'Nodes registry',
        copy: 'Inspection-ready node registry.',
        href: this.nodesEndpoint,
        label: '/api/v1/risk-mapping/registries/nodes',
      },
      {
        title: 'Threats registry',
        copy: 'Inspection-ready threat registry.',
        href: this.threatsEndpoint,
        label: '/api/v1/risk-mapping/registries/threats',
      },
      {
        title: 'Compatibility registry',
        copy: 'Inspection-ready compatibility registry.',
        href: this.compatibilityEndpoint,
        label: '/api/v1/risk-mapping/registries/compatibility',
      },
      {
        title: 'Falsifiers registry',
        copy: 'Inspection-ready falsifier registry.',
        href: this.falsifiersEndpoint,
        label: '/api/v1/risk-mapping/registries/falsifiers',
      },
    ] as const;
  }

  protected readonly whatItIsCards: readonly GuaranteeCard[] = [
    {
      title: 'Deterministic',
      copy: 'Same authored input and the same authored artifacts produce the same structural output.',
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
      copy: 'Every admitted, narrowed, or refused result can be traced through explanation, audit, and governed proof surfaces.',
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
      copy: 'A query is normalized into a bounded shape before resolution begins.',
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
      copy: 'The resolve output stays compact while explanation and audit surfaces stay inspectable.',
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
      title: 'Governed proof',
      copy: 'Every result can be replayed, inspected, and traced through governed artifacts.',
    },
  ] as const;

  protected readonly exampleBullets = [
    'Broad framing is classified and narrowed at the boundary.',
    'Only direct supported structural paths are emitted.',
    'Unsupported bridges remain explicit and block unsupported expansion.',
    'Bounded support confidence is a support class, not a likelihood.',
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
