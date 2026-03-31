import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

interface VisionSectionCard {
  title: string;
  copy: string;
}

interface VisionStage {
  label: string;
  title: string;
  copy: string;
}

@Component({
  selector: 'app-vision-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './vision-page.component.html',
  styleUrl: './vision-page.component.css',
})
export class VisionPageComponent {
  protected readonly instabilitySignals = [
    'Images can be fabricated',
    'Text can be manipulated',
    'Media can be misleading',
    'Meaning often remains unclear even when something looks correct',
  ] as const;

  protected readonly infrastructureTraits = [
    'deterministic',
    'bounded',
    'source-backed',
    'refusal-capable',
    'open source',
    'durable',
  ] as const;

  protected readonly expansionStages: readonly VisionStage[] = [
    {
      label: 'Stage 1',
      title: 'Governance concepts',
      copy: 'Start where ambiguity already breaks institutions, rules, and public reasoning.',
    },
    {
      label: 'Stage 2',
      title: 'Adjacent institutional concepts',
      copy: 'Expand only into nearby structures once concept stability has been proven under pressure.',
    },
    {
      label: 'Stage 3',
      title: 'Other high-stakes domains',
      copy: 'Move into domains such as education, healthcare, and technical systems only after reliability has been earned.',
    },
  ];

  protected readonly futureDomains = [
    'education',
    'healthcare',
    'technical systems',
  ] as const;

  protected readonly continuityCards: readonly VisionSectionCard[] = [
    {
      title: 'Inspectable',
      copy: 'The system must remain readable and auditable by others, not only operable by its original builder.',
    },
    {
      title: 'Extensible',
      copy: 'Future contributors must be able to extend domains without breaking the admission discipline that gives the system value.',
    },
    {
      title: 'Continuous',
      copy: 'MIT licensing matters because the system should outlast its creator and remain maintainable over time.',
    },
  ];
}
