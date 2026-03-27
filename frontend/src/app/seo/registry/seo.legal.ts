import type { SeoRegistryFamily } from '../seo.types';

export const seoLegalEntries = {
  'legal.privacy': {
    title: 'Privacy Policy - ChatPDM',
    description: 'Public privacy posture for the ChatPDM beta surface and the route reserved for the formal production policy.',
    canonicalPath: '/privacy',
    includeInSitemap: true,
    sitemapChangeFrequency: 'yearly',
    sitemapPriority: 0.3,
  },
  'legal.terms': {
    title: 'Terms of Use - ChatPDM',
    description: 'Usage terms route for the published ChatPDM surface as the public beta moves toward a broader contract.',
    canonicalPath: '/terms',
    includeInSitemap: true,
    sitemapChangeFrequency: 'yearly',
    sitemapPriority: 0.3,
  },
  'legal.cookies': {
    title: 'Cookie Policy - ChatPDM',
    description: 'Cookie and client-storage policy surface for ChatPDM once those behaviors require a formal public statement.',
    canonicalPath: '/cookies',
    includeInSitemap: true,
    sitemapChangeFrequency: 'yearly',
    sitemapPriority: 0.2,
  },
  'legal.acceptable-use': {
    title: 'Acceptable Use - ChatPDM',
    description: 'ChatPDM acceptable use policy.',
    canonicalPath: '/acceptable-use',
    includeInSitemap: false,
    sitemapChangeFrequency: 'yearly',
    sitemapPriority: 0.2,
  },
  'legal.disclaimer': {
    title: 'Disclaimer - ChatPDM',
    description: 'ChatPDM product disclaimer and usage boundary.',
    canonicalPath: '/disclaimer',
    includeInSitemap: false,
    sitemapChangeFrequency: 'yearly',
    sitemapPriority: 0.2,
  },
} satisfies SeoRegistryFamily;
