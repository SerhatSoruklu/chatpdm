import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

interface AboutLifecycleStage {
  label: string;
  title: string;
  copy: string;
}

interface AboutDifferenceBlock {
  title: string;
  copy: string;
}

@Component({
  selector: 'app-about-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './about-page.component.html',
  styleUrl: './about-page.component.css',
})
export class AboutPageComponent {
  protected readonly philosophyPoints = [
    'Concepts are tested, not explained',
    'No synonym collapse',
    'No ambiguity tolerance',
    'Refusal is valid output',
  ] as const;

  protected readonly differenceBlocks: readonly AboutDifferenceBlock[] = [
    {
      title: 'Not a dictionary',
      copy: 'It does not accept a concept because it sounds familiar or conventional.',
    },
    {
      title: 'Not a chatbot',
      copy: 'It does not generate responses outside the admitted concept boundary.',
    },
    {
      title: 'Not a knowledge base',
      copy: 'It does not collect loose facts without enforcing concept boundaries.',
    },
    {
      title: 'Validation system for authored concepts',
      copy: 'Concepts must survive structural distinction before they are admitted to runtime.',
    },
  ];

  protected readonly lifecycleStages: readonly AboutLifecycleStage[] = [
    {
      label: 'Blocked',
      title: 'Rejected before admission',
      copy: 'The concept fails structural tests and does not proceed.',
    },
    {
      label: 'Phase 1',
      title: 'Structural validation',
      copy: 'Invariant, boundary, and non-collapse checks are structurally verified.',
    },
    {
      label: 'Phase 2',
      title: 'Stability and boundary lock',
      copy: 'Definitions are tightened until the registers stay aligned across versions.',
    },
    {
      label: 'Runtime',
      title: 'Live admission',
      copy: 'Only admitted concepts become queryable in the public system.',
    },
  ];

  protected readonly currentDomainConcepts = [
    'authority',
    'power',
    'legitimacy',
    'duty',
    'law',
  ] as const;

  protected readonly futureDomainAreas = [
    'education',
    'healthcare',
    'systems design',
  ] as const;
}
