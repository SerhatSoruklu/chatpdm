import type { SeoRegistryFamily } from '../seo.types';

export const seoFaqEntries = {
  'faq.index': {
    title: 'FAQ - ChatPDM',
    description: 'Read concise answers about ChatPDM scope, deterministic behavior, and the limits of the current public beta.',
    canonicalPath: '/faq',
    includeInSitemap: true,
    sitemapChangeFrequency: 'monthly',
    sitemapPriority: 0.6,
  },
} satisfies SeoRegistryFamily;
