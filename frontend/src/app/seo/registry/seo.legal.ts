import type { SeoRegistryFamily } from '../seo.types';

export const seoLegalEntries = {
  'legal.privacy': {
    title: 'Privacy',
    description: 'ChatPDM privacy policy.',
    canonicalPath: '/privacy',
    includeInSitemap: false,
    sitemapChangeFrequency: 'yearly',
    sitemapPriority: 0.3,
  },
  'legal.terms': {
    title: 'Terms',
    description: 'ChatPDM terms of use.',
    canonicalPath: '/terms',
    includeInSitemap: false,
    sitemapChangeFrequency: 'yearly',
    sitemapPriority: 0.3,
  },
  'legal.cookies': {
    title: 'Cookies',
    description: 'ChatPDM cookie policy.',
    canonicalPath: '/cookies',
    includeInSitemap: false,
    sitemapChangeFrequency: 'yearly',
    sitemapPriority: 0.2,
  },
  'legal.acceptable-use': {
    title: 'Acceptable Use',
    description: 'ChatPDM acceptable use policy.',
    canonicalPath: '/acceptable-use',
    includeInSitemap: false,
    sitemapChangeFrequency: 'yearly',
    sitemapPriority: 0.2,
  },
  'legal.disclaimer': {
    title: 'Disclaimer',
    description: 'ChatPDM product disclaimer and usage boundary.',
    canonicalPath: '/disclaimer',
    includeInSitemap: false,
    sitemapChangeFrequency: 'yearly',
    sitemapPriority: 0.2,
  },
} satisfies SeoRegistryFamily;
