import type { SeoRegistryFamily } from '../seo.types';

export const seoStaticEntries = {
  'static.home': {
    title: 'ChatPDM | Deterministic, Source-Bounded Concept Resolution',
    description:
      'ChatPDM resolves authored concepts through a deterministic, source-bounded runtime with explicit ambiguity handling, refusal behavior, and inspectable limits.',
    canonicalPath: '/',
    includeInSitemap: true,
    sitemapChangeFrequency: 'weekly',
    sitemapPriority: 1,
    structuredData: {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'ChatPDM',
      url: 'https://chatpdm.com/',
      description:
        'ChatPDM resolves authored concepts through a deterministic, source-bounded runtime with explicit ambiguity handling, refusal behavior, and inspectable limits.',
    },
  },
  'static.about': {
    title: 'About ChatPDM - Deterministic Meaning System',
    description: 'Read the product boundary, deterministic posture, and authored-scope model behind the public ChatPDM system.',
    canonicalPath: '/about',
    includeInSitemap: true,
    sitemapChangeFrequency: 'monthly',
    sitemapPriority: 0.7,
  },
  'static.how-it-works': {
    title: 'How ChatPDM Works - Predefined Deterministic Meaning',
    description: 'See how ChatPDM normalizes queries, resolves authored concepts, and refuses unsupported compositions honestly.',
    canonicalPath: '/how-it-works',
    includeInSitemap: true,
    sitemapChangeFrequency: 'monthly',
    sitemapPriority: 0.7,
  },
  'static.contact': {
    title: 'Contact - ChatPDM',
    description: 'Follow the public contact route for product, research, and implementation questions as the ChatPDM beta expands.',
    canonicalPath: '/contact',
    includeInSitemap: true,
    sitemapChangeFrequency: 'monthly',
    sitemapPriority: 0.4,
  },
  'static.sources': {
    title: 'Sources - ChatPDM',
    description: 'ChatPDM reference sources and canonical grounding.',
    canonicalPath: '/sources',
    includeInSitemap: false,
    sitemapChangeFrequency: 'monthly',
    sitemapPriority: 0.5,
  },
  'static.method': {
    title: 'Method - ChatPDM',
    description: 'ChatPDM method and authored scope boundaries.',
    canonicalPath: '/method',
    includeInSitemap: false,
    sitemapChangeFrequency: 'monthly',
    sitemapPriority: 0.5,
  },
} satisfies SeoRegistryFamily;
