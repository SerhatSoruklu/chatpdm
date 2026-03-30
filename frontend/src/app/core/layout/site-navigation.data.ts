export interface SiteNavItem {
  readonly label: string;
  readonly route: string;
  readonly exact?: boolean;
}

export const SITE_PRIMARY_NAV_ITEMS: readonly SiteNavItem[] = [
  { label: 'Home', route: '/', exact: true },
  { label: 'About', route: '/about' },
  { label: 'How it works', route: '/how-it-works' },
  { label: 'FAQ', route: '/faq' },
  { label: 'Docs', route: '/docs' },
  { label: 'Developers', route: '/developers' },
  { label: 'API', route: '/api', exact: true },
  { label: 'Contact', route: '/contact' },
];

export const SITE_SUPPORT_EMAIL = 'contact@chatpdm.com';
