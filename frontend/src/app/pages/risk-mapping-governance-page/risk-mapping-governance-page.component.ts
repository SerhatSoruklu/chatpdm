import { CommonModule, DOCUMENT } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { resolveApiOrigin } from '../../core/api/api-origin';

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
  imports: [CommonModule, RouterLink],
  templateUrl: './risk-mapping-governance-page.component.html',
  styleUrl: './risk-mapping-governance-page.component.css',
})
export class RiskMappingGovernancePageComponent {
  private readonly document = inject(DOCUMENT);

  protected readonly diagramPath = '/assets/rmg/8c3d46e2-6f74-456b-afb3-cc0cd299b8a9.png';
  protected readonly diagramAltText = 'Diagram showing how Risk Mapping Governance turns a question into a bounded, evidence-backed structural risk map through admissibility, registries, mapping, explicit gaps, and audit output.';
  protected readonly apiOrigin = resolveApiOrigin(this.document);
  protected readonly pageRoute = '/risk-mapping-governance';
  protected readonly explainEndpoint = `${this.apiOrigin}/api/v1/risk-mapping/explain`;
  protected readonly auditEndpoint = `${this.apiOrigin}/api/v1/risk-mapping/audit`;
  protected readonly nodesEndpoint = `${this.apiOrigin}/api/v1/risk-mapping/registries/nodes`;
  protected readonly threatsEndpoint = `${this.apiOrigin}/api/v1/risk-mapping/registries/threats`;
  protected readonly compatibilityEndpoint = `${this.apiOrigin}/api/v1/risk-mapping/registries/compatibility`;
  protected readonly falsifiersEndpoint = `${this.apiOrigin}/api/v1/risk-mapping/registries/falsifiers`;

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

  protected readonly auditSurfaceCards: readonly AuditLinkCard[] = [
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

  protected readonly apiSurfaceLinks: readonly AuditLinkCard[] = [
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
