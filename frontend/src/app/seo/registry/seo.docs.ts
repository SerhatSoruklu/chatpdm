import type { SeoRegistryFamily } from '../seo.types';

export const seoDocsEntries = {
  'docs.scope-model': {
    title: 'Scope Model - ChatPDM',
    description: 'Public scope boundaries, runtime order, and staged capability model for the current ChatPDM system.',
    canonicalPath: '/scope-model',
    includeInSitemap: false,
    sitemapChangeFrequency: 'monthly',
    sitemapPriority: 0.65,
  },
  'docs.index': {
    title: 'Docs - ChatPDM',
    description: 'Public documentation index for ChatPDM product boundaries, architecture, and authored-system behavior.',
    canonicalPath: '/docs',
    includeInSitemap: false,
    sitemapChangeFrequency: 'weekly',
    sitemapPriority: 0.7,
  },
  'docs.resolution-contract': {
    title: 'Resolution Contract - ChatPDM',
    description: 'Semantic runtime result contract for ChatPDM: stable outcome types, refusal behavior, and review-state interaction.',
    canonicalPath: '/resolution-contract',
    includeInSitemap: false,
    sitemapChangeFrequency: 'monthly',
    sitemapPriority: 0.69,
  },
  'docs.version-policy': {
    title: 'Version Policy - ChatPDM',
    description: 'Stability and change law for ChatPDM runtime output: version ownership, change triggers, and replay identity.',
    canonicalPath: '/version-policy',
    includeInSitemap: false,
    sitemapChangeFrequency: 'monthly',
    sitemapPriority: 0.68,
  },
  'docs.source-model': {
    title: 'Source Model - ChatPDM',
    description: 'Source governance for ChatPDM: how source material is admitted, constrained, and used without becoming runtime canon directly.',
    canonicalPath: '/source-model',
    includeInSitemap: false,
    sitemapChangeFrequency: 'monthly',
    sitemapPriority: 0.67,
  },
  'docs.vocabulary-boundary': {
    title: 'Vocabulary Boundary - ChatPDM',
    description: 'Public boundary index for recognized legal vocabulary outside the live ChatPDM runtime ontology.',
    canonicalPath: '/vocabulary',
    includeInSitemap: true,
    sitemapChangeFrequency: 'monthly',
    sitemapPriority: 0.66,
  },
} satisfies SeoRegistryFamily;
