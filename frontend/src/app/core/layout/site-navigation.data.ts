export interface SiteNavItem {
  readonly label: string;
  readonly route: string;
  readonly exact?: boolean;
}

export const SITE_PRIMARY_NAV_ITEMS: readonly SiteNavItem[] = [
  { label: 'Home', route: '/', exact: true },
  { label: 'Runtime', route: '/runtime' },
  { label: 'About', route: '/about' },
  { label: 'Vision', route: '/vision' },
  { label: 'How it works', route: '/how-it-works' },
  { label: 'FAQ', route: '/faq' },
  { label: 'Docs', route: '/docs' },
  { label: 'API', route: '/api', exact: true },
  { label: 'Contact', route: '/contact' },
];

export const SITE_CONTACT_EMAIL = 'contact@chatpdm.com';
export const SITE_HELLO_EMAIL = 'hello@chatpdm.com';
export const SITE_INFO_EMAIL = 'info@chatpdm.com';
export const SITE_SUPPORT_EMAIL = 'support@chatpdm.com';
export const SITE_LEGAL_EMAIL = 'legal@chatpdm.com';
export const SITE_POLICY_EMAIL = 'policy@chatpdm.com';
export const SITE_SECURITY_EMAIL = 'security@chatpdm.com';
