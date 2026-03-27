export interface SeoStructuredData {
  '@context': 'https://schema.org';
  '@type': string;
  [key: string]: unknown;
}

export interface SeoPageConfig {
  title: string;
  description: string;
  canonicalPath: string | null;
  robots?: string;
  includeInSitemap?: boolean;
  sitemapChangeFrequency?: 'daily' | 'weekly' | 'monthly' | 'yearly';
  sitemapPriority?: number;
  responseStatus?: number;
  openGraphType?: 'website' | 'article';
  twitterCard?: 'summary' | 'summary_large_image';
  siteNameFirst?: boolean;
  structuredData?: SeoStructuredData | SeoStructuredData[];
}

export type SeoRegistryFamily = Record<string, SeoPageConfig>;

export interface SeoSiteConfig {
  siteName: string;
  siteUrl: string;
  locale: string;
  author: string;
  defaultOgImagePath: string;
  defaultOgImageType: string;
  defaultOgImageWidth: string;
  defaultOgImageHeight: string;
  defaultTwitterCard: 'summary' | 'summary_large_image';
}

export interface SeoSitemapEntry {
  key: string;
  canonicalUrl: string;
  changeFrequency: NonNullable<SeoPageConfig['sitemapChangeFrequency']>;
  priority: NonNullable<SeoPageConfig['sitemapPriority']>;
}
