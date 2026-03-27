import type { SeoRegistryFamily } from '../seo.types';

export const seoApiReferenceEntries = {
  'api.index': {
    title: 'API Reference',
    description: 'ChatPDM API reference and endpoint documentation.',
    canonicalPath: '/api',
    includeInSitemap: false,
    sitemapChangeFrequency: 'monthly',
    sitemapPriority: 0.5,
  },
} satisfies SeoRegistryFamily;
