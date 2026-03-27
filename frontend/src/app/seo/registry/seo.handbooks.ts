import type { SeoRegistryFamily } from '../seo.types';

export const seoHandbookEntries = {
  'handbooks.index': {
    title: 'Handbooks',
    description: 'ChatPDM handbooks and longform guidance.',
    canonicalPath: '/handbooks',
    includeInSitemap: false,
    sitemapChangeFrequency: 'monthly',
    sitemapPriority: 0.5,
  },
} satisfies SeoRegistryFamily;
