import type { SeoRegistryFamily } from '../seo.types';

export const seoDocsEntries = {
  'docs.index': {
    title: 'Docs',
    description: 'ChatPDM documentation index.',
    canonicalPath: '/docs',
    includeInSitemap: false,
    sitemapChangeFrequency: 'weekly',
    sitemapPriority: 0.7,
  },
} satisfies SeoRegistryFamily;
