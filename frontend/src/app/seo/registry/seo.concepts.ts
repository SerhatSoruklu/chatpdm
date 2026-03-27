import type { SeoPageConfig, SeoRegistryFamily } from '../seo.types';

export interface ConceptSeoInput {
  slug: string;
  title: string;
  description: string;
}

export const seoConceptEntries = {
  'concepts.detail': {
    title: 'Concept - ChatPDM',
    description: 'Canonical ChatPDM concept page.',
    canonicalPath: null,
    includeInSitemap: false,
    sitemapChangeFrequency: 'monthly',
    sitemapPriority: 0.8,
  },
} satisfies SeoRegistryFamily;

export function buildConceptSeoEntry(input: ConceptSeoInput): SeoPageConfig {
  return {
    title: input.title,
    description: input.description,
    canonicalPath: `/concepts/${input.slug}`,
    includeInSitemap: true,
    sitemapChangeFrequency: 'monthly',
    sitemapPriority: 0.8,
    openGraphType: 'article',
  };
}
