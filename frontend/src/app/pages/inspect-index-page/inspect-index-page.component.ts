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
      title: 'Privacy Policy Inspect',
      subtitle: 'storage, lifecycle, and feedback-event evidence',
      route: '/inspect/privacy',
      detail: 'Current inspectable privacy behavior surface with traceability and lifecycle evidence.',
    },
    {
      title: 'Data Retention / Data Usage Inspect',
      subtitle: 'lifecycle, storage, expiry, and session-bound control evidence',
      route: '/inspect/data-retention',
      detail: 'Current inspectable data-retention surface for feedback persistence, browser session continuity, and request-bound internal SSR transport.',
    },
    {
      title: 'Acceptable Use Inspect',
      subtitle: 'runtime scope, refusal, and feedback boundary evidence',
      route: '/inspect/acceptable-use',
      detail: 'Current inspectable acceptable-use surface for runtime scope, refused query forms, and feedback-surface constraints.',
    },
    {
      title: 'Cookie Policy Inspect',
      subtitle: 'browser and SSR cookie transport evidence',
      route: '/inspect/cookies',
      detail: 'Current inspectable cookie surface for SSR transport and browser-facing cookie behavior.',
    },
    {
      title: 'Terms of Service Inspect',
      subtitle: 'runtime operations, field rules, and refusal boundaries',
      route: '/inspect/terms',
      detail: 'Current inspectable terms surface for runtime operations, field rules, and refusal boundaries.',
    },
  ];
}
