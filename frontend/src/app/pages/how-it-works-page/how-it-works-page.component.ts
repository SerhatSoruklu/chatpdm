import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

type OutputStateKind = 'valid' | 'partial' | 'degraded' | 'refused';

interface PipelineStage {
  label: string;
  title: string;
  copy: string;
  bullets: readonly string[];
}

interface OutputStateCard {
  kind: OutputStateKind;
  title: string;
  copy: string;
}

interface LifecycleStage {
  label: string;
  title: string;
  copy: string;
}

@Component({
  selector: 'app-how-it-works-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './how-it-works-page.component.html',
  styleUrl: './how-it-works-page.component.css',
})
export class HowItWorksPageComponent {
  protected readonly flowStages = [
    'Query',
    'Validation',
    'Resolution',
    'Output',
  ] as const;

  protected readonly pipelineStages: readonly PipelineStage[] = [
    {
      label: '01',
      title: 'Structure Gatekeeper',
      copy: 'Validates syntax, query shape, and supported input format before the system does anything else.',
      bullets: [
        'rejects malformed input early',
        'keeps unsupported forms from entering resolution',
      ],
    },
    {
      label: '02',
      title: 'Semantic Gatekeeper',
      copy: 'Checks meaning alignment and domain scope before a concept can proceed.',
      bullets: [
        'tests whether the query belongs to the admitted domain',
        'refuses meaning mismatch instead of smoothing it over',
      ],
    },
    {
      label: '03',
      title: 'Profile Gatekeeper',
      copy: 'Ensures the standard, simplified, and formal profiles remain structurally valid without changing meaning.',
      bullets: [
        'keeps register forms aligned',
        'does not broaden or repair meaning',
      ],
    },
    {
      label: '04',
      title: 'Resolution Engine',
      copy: 'Maps surviving input to canonical anchors inside the admitted concept boundary.',
      bullets: [
        'resolves to canonical sources only',
        'stays bounded to admitted scope',
      ],
    },
    {
      label: '05',
      title: 'Register Generator',
      copy: 'Produces the exposed standard, simplified, and formal outputs from the same admitted concept.',
      bullets: [
        'standard',
        'simplified',
        'formal',
      ],
    },
    {
      label: '06',
      title: 'Equivalence Validator',
      copy: 'Checks that all exposed outputs preserve the same meaning across registers.',
      bullets: [
        'no semantic drift across representations',
        'no register-level contradiction',
      ],
    },
  ];

  protected readonly outputStates: readonly OutputStateCard[] = [
    {
      kind: 'valid',
      title: 'Valid',
      copy: 'An admitted concept resolves cleanly with stable output.',
    },
    {
      kind: 'partial',
      title: 'Partial',
      copy: 'Some structure passes, but the full target surface cannot be returned safely.',
    },
    {
      kind: 'degraded',
      title: 'Degraded',
      copy: 'A bounded output exists, but higher-fidelity structure is withheld or unavailable.',
    },
    {
      kind: 'refused',
      title: 'Refused',
      copy: 'The system cannot validate the request and does not pretend otherwise.',
    },
  ];

  protected readonly refusalConditions = [
    'out of scope',
    'semantic mismatch',
    'missing anchor',
  ] as const;

  protected readonly refusalExample = `{
  "reason": "missing_anchor",
  "failedLayer": "resolution_engine",
  "details": "No canonical anchor exists for this query."
}`;

  protected readonly lifecycleStages: readonly LifecycleStage[] = [
    {
      label: 'Blocked',
      title: 'Rejected before admission',
      copy: 'The concept fails structural checks and does not proceed.',
    },
    {
      label: 'Phase 1',
      title: 'Structural validation',
      copy: 'Invariant, boundary, and non-collapse are pressure-tested.',
    },
    {
      label: 'Phase 2',
      title: 'Stability lock',
      copy: 'Definitions are constrained until meaning remains stable across registers.',
    },
    {
      label: 'Runtime',
      title: 'Live admission',
      copy: 'Only admitted concepts are queryable in the public system.',
    },
  ];

  protected outputStateSymbol(kind: OutputStateKind): string {
    switch (kind) {
      case 'valid':
        return 'CHECK';
      case 'partial':
      case 'degraded':
        return 'WARN';
      case 'refused':
        return 'STOP';
      default:
        return 'STATE';
    }
  }
}
