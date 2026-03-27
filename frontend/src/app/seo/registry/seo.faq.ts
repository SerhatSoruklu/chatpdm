import type { SeoRegistryFamily } from '../seo.types';

export const seoFaqEntries = {
  'faq.index': {
    title: 'FAQ',
    description: 'Frequently asked questions about ChatPDM.',
    canonicalPath: '/faq',
    includeInSitemap: false,
    sitemapChangeFrequency: 'monthly',
    sitemapPriority: 0.6,
  },
} satisfies SeoRegistryFamily;
