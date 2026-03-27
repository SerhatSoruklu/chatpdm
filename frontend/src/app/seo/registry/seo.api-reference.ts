import type { SeoRegistryFamily } from '../seo.types';

export const seoApiReferenceEntries = {
  'api.index': {
    title: 'API Reference - ChatPDM',
    description: 'Reference index for the ChatPDM API surface, including resolver behavior, endpoint scope, and response contracts.',
    canonicalPath: '/api',
    includeInSitemap: false,
    sitemapChangeFrequency: 'monthly',
    sitemapPriority: 0.5,
  },
} satisfies SeoRegistryFamily;
