import type { SeoRegistryFamily } from '../seo.types';

export const seoNotFoundEntries = {
  'not-found.default': {
    title: 'Not Found - ChatPDM',
    description: 'The requested ChatPDM page could not be found.',
    canonicalPath: null,
    robots: 'noindex, nofollow',
    includeInSitemap: false,
    responseStatus: 404,
  },
} satisfies SeoRegistryFamily;
