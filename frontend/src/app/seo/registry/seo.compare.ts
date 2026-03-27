import type { SeoPageConfig, SeoRegistryFamily } from '../seo.types';

export interface CompareSeoInput {
  slug: string;
  title: string;
  description: string;
}

export const seoCompareEntries = {
  'compare.detail': {
    title: 'Compare',
    description: 'ChatPDM concept comparison page.',
    canonicalPath: null,
    includeInSitemap: false,
    sitemapChangeFrequency: 'monthly',
    sitemapPriority: 0.7,
  },
} satisfies SeoRegistryFamily;

export function buildCompareSeoEntry(input: CompareSeoInput): SeoPageConfig {
  return {
    title: input.title,
    description: input.description,
    canonicalPath: `/compare/${input.slug}`,
    includeInSitemap: true,
    sitemapChangeFrequency: 'monthly',
    sitemapPriority: 0.7,
    openGraphType: 'article',
  };
}
