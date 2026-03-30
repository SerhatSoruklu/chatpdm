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
      title: 'Data retention inspect',
      subtitle: 'lifecycle, storage, expiry, and session-control evidence',
      route: '/inspect/data-retention',
      detail: 'Current inspectable data-retention surface for feedback persistence, browser continuity, and request-bound transport.',
    },
    {
      title: 'Acceptable use inspect',
      subtitle: 'runtime scope, refusal, and feedback boundary evidence',
      route: '/inspect/acceptable-use',
      detail: 'Current inspectable acceptable-use surface for runtime scope, unsupported composition boundaries, and feedback-surface constraints.',
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
  ];
}
