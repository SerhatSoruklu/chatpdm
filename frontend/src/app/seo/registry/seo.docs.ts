import type { SeoRegistryFamily } from '../seo.types';

export const seoDocsEntries = {
  'docs.index': {
    title: 'Docs - ChatPDM',
    description: 'Public documentation index for ChatPDM product boundaries, architecture, and authored-system behavior.',
    canonicalPath: '/docs',
    includeInSitemap: false,
    sitemapChangeFrequency: 'weekly',
    sitemapPriority: 0.7,
  },
} satisfies SeoRegistryFamily;
