import type { SeoRegistryFamily } from '../seo.types';

export const seoHandbookEntries = {
  'handbooks.index': {
    title: 'Handbooks - ChatPDM',
    description: 'Longform operational and authoring guidance for the public ChatPDM system and its deterministic product surface.',
    canonicalPath: '/handbooks',
    includeInSitemap: false,
    sitemapChangeFrequency: 'monthly',
    sitemapPriority: 0.5,
  },
} satisfies SeoRegistryFamily;
