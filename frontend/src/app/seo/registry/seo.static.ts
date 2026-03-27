import type { SeoRegistryFamily } from '../seo.types';

export const seoStaticEntries = {
  'static.home': {
    title: 'Beta',
    description: 'ChatPDM is a deterministic meaning system for source-grounded, wording-sensitive concept resolution.',
    canonicalPath: '/',
    includeInSitemap: true,
    sitemapChangeFrequency: 'weekly',
    sitemapPriority: 1,
    siteNameFirst: true,
    structuredData: {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'ChatPDM',
      url: 'https://chatpdm.com/',
      description:
        'ChatPDM is a deterministic meaning system for source-grounded, wording-sensitive concept resolution.',
    },
  },
  'static.about': {
    title: 'About',
    description: 'About ChatPDM.',
    canonicalPath: '/about',
    includeInSitemap: false,
    sitemapChangeFrequency: 'monthly',
    sitemapPriority: 0.7,
  },
  'static.how-it-works': {
    title: 'How It Works',
    description: 'How ChatPDM handles deterministic concept resolution.',
    canonicalPath: '/how-it-works',
    includeInSitemap: false,
    sitemapChangeFrequency: 'monthly',
    sitemapPriority: 0.7,
  },
  'static.sources': {
    title: 'Sources',
    description: 'ChatPDM reference sources and canonical grounding.',
    canonicalPath: '/sources',
    includeInSitemap: false,
    sitemapChangeFrequency: 'monthly',
    sitemapPriority: 0.5,
  },
  'static.method': {
    title: 'Method',
    description: 'ChatPDM method and authored scope boundaries.',
    canonicalPath: '/method',
    includeInSitemap: false,
    sitemapChangeFrequency: 'monthly',
    sitemapPriority: 0.5,
  },
} satisfies SeoRegistryFamily;
