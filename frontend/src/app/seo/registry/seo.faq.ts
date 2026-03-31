import type { SeoRegistryFamily } from '../seo.types';

export const seoFaqEntries = {
  'faq.index': {
    title: 'FAQ - ChatPDM',
    description: 'Read concise answers about ChatPDM scope, deterministic behavior, and why it is not Product Data Management software.',
    canonicalPath: '/faq',
    includeInSitemap: true,
    sitemapChangeFrequency: 'monthly',
    sitemapPriority: 0.6,
  },
} satisfies SeoRegistryFamily;
