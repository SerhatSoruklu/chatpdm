import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

interface FooterLink {
  label: string;
  route: string;
  fragment?: string;
}

interface FooterColumn {
  title: string;
  tone?: 'default' | 'secondary';
  links: FooterLink[];
}

@Component({
  selector: 'app-site-footer',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './site-footer.component.html',
  styleUrl: './site-footer.component.css',
})
export class SiteFooterComponent {
  protected readonly footerColumns: FooterColumn[] = [
    {
      title: 'Runtime',
      links: [
        { label: 'Query runtime', route: '/', fragment: 'runtime' },
        { label: 'Live concepts', route: '/', fragment: 'scope' },
        { label: 'Controlled comparisons', route: '/', fragment: 'runtime' },
        { label: 'Refusal behavior', route: '/', fragment: 'mechanism' },
      ],
    },
    {
      title: 'System',
      links: [
        { label: 'Scope model', route: '/docs' },
        { label: 'Resolution contract', route: '/api' },
        { label: 'Version policy', route: '/developers' },
        { label: 'Source model', route: '/handbooks' },
      ],
    },
    {
      title: 'Developers',
      links: [
        { label: 'Docs', route: '/docs' },
        { label: 'API', route: '/api' },
        { label: 'Handbooks', route: '/handbooks' },
      ],
    },
    {
      title: 'Legal',
      tone: 'secondary',
      links: [
        { label: 'Privacy Policy', route: '/privacy' },
        { label: 'Cookie Policy', route: '/cookies' },
        { label: 'Terms of Service', route: '/terms' },
      ],
    },
  ];
}
