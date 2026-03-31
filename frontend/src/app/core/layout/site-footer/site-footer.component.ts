import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ChatPdmLogoComponent } from '../../brand/chatpdm-logo/chatpdm-logo.component';
import { SITE_CONTACT_EMAIL } from '../site-navigation.data';

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
  imports: [RouterLink, ChatPdmLogoComponent],
  templateUrl: './site-footer.component.html',
  styleUrl: './site-footer.component.css',
})
export class SiteFooterComponent {
  protected readonly contactEmail = SITE_CONTACT_EMAIL;
  protected readonly footerColumns: FooterColumn[] = [
    {
      title: 'Runtime',
      links: [
        { label: 'Query runtime', route: '/runtime', fragment: 'runtime-query' },
        { label: 'Live concepts', route: '/live-concepts' },
        { label: 'Controlled comparisons', route: '/controlled-comparisons' },
        { label: 'Refusal behavior', route: '/runtime', fragment: 'runtime-refusal' },
      ],
    },
    {
      title: 'System',
      links: [
        { label: 'What ChatPDM is', route: '/what-is-chatpdm' },
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
        { label: 'Data Retention / Data Usage', route: '/data-retention' },
        { label: 'Acceptable Use', route: '/acceptable-use' },
        { label: 'Cookie Policy', route: '/cookies' },
        { label: 'Terms of Service', route: '/terms' },
      ],
    },
  ];
}
