import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

interface InspectSurfaceLink {
  readonly title: string;
  readonly subtitle: string;
  readonly route: string;
  readonly detail: string;
}

@Component({
  selector: 'app-inspect-index-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './inspect-index-page.component.html',
  styleUrl: './inspect-index-page.component.css',
})
export class InspectIndexPageComponent {
  protected readonly surfaces: readonly InspectSurfaceLink[] = [
    {
      title: 'Privacy inspect',
      subtitle: 'storage, lifecycle, and feedback-event evidence',
      route: '/inspect/privacy',
      detail: 'Current inspectable privacy behavior surface with traceability and lifecycle evidence.',
    },
    {
      title: 'Cookie inspect',
      subtitle: 'browser and SSR cookie transport evidence',
      route: '/inspect/cookies',
      detail: 'Current inspectable cookie surface for SSR transport and browser-facing cookie behavior.',
    },
    {
      title: 'Terms inspect',
      subtitle: 'runtime rules and allowed-use boundaries',
      route: '/inspect/terms',
      detail: 'Current inspectable terms surface for modeled behavior and mapped refusal boundaries.',
    },
    {
      title: 'Acceptable use inspect',
      subtitle: 'verification rules, review gates, and non-claims',
      route: '/inspect/acceptable-use',
      detail: 'Current inspectable acceptable-use surface grounded in managed-access verification boundaries and the under_trust_review gate.',
    },
    {
      title: 'Data retention inspect',
      subtitle: 'lifecycle bands, storage classes, and expiry paths',
      route: '/inspect/data-retention',
      detail: 'Current inspectable retention surface grounded in feedback lifecycle handling, TTL expiry, and verification challenge expiry.',
    },
  ];
}
