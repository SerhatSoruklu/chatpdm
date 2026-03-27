import { seoApiReferenceEntries } from './registry/seo.api-reference';
import { seoCompareEntries } from './registry/seo.compare';
import { seoConceptEntries } from './registry/seo.concepts';
import { seoDeveloperEntries } from './registry/seo.developer';
import { seoDocsEntries } from './registry/seo.docs';
import { seoFaqEntries } from './registry/seo.faq';
import { seoHandbookEntries } from './registry/seo.handbooks';
import { seoLegalEntries } from './registry/seo.legal';
import { seoNotFoundEntries } from './registry/seo.not-found';
import { seoStaticEntries } from './registry/seo.static';
import { SEO_SITE } from './seo.site';
import type { SeoPageConfig, SeoSitemapEntry } from './seo.types';

export const SEO_REGISTRY = {
  ...seoStaticEntries,
  ...seoLegalEntries,
  ...seoFaqEntries,
  ...seoDocsEntries,
  ...seoDeveloperEntries,
  ...seoHandbookEntries,
  ...seoApiReferenceEntries,
  ...seoConceptEntries,
  ...seoCompareEntries,
  ...seoNotFoundEntries,
} as const satisfies Record<string, SeoPageConfig>;

assertSeoRegistryPolicy(SEO_REGISTRY as Record<string, SeoPageConfig>);

export type SeoRegistryKey = keyof typeof SEO_REGISTRY;

export const SEO_DEFAULT_KEY: SeoRegistryKey = 'static.home';
export const SEO_NOT_FOUND_KEY: SeoRegistryKey = 'not-found.default';

export function seoRouteData(seoKey: SeoRegistryKey): { seoKey: SeoRegistryKey } {
  return { seoKey };
}

export function getSeoEntry(seoKey: string | null | undefined): SeoPageConfig | null {
  if (!seoKey || !(seoKey in SEO_REGISTRY)) {
    return null;
  }

  return SEO_REGISTRY[seoKey as SeoRegistryKey];
}

export function buildSeoTitle(page: SeoPageConfig): string {
  return page.title;
}

export function resolveCanonicalUrl(canonicalPath: string | null): string | null {
  if (!canonicalPath) {
    return null;
  }

  return new URL(canonicalPath, SEO_SITE.siteUrl).href;
}

export function getSitemapEntries(): SeoSitemapEntry[] {
  const entries = Object.entries(SEO_REGISTRY as Record<string, SeoPageConfig>);

  return entries
    .filter(([, entry]) => entry.includeInSitemap === true && entry.canonicalPath)
    .map(([key, entry]) => ({
      key,
      canonicalUrl: resolveCanonicalUrl(entry.canonicalPath)!,
      changeFrequency: entry.sitemapChangeFrequency ?? 'monthly',
      priority: entry.sitemapPriority ?? 0.5,
    }));
}

function assertSeoRegistryPolicy(registry: Record<string, SeoPageConfig>): void {
  for (const [key, entry] of Object.entries(registry)) {
    assertSeoTitle(key, entry.title);
    assertSeoDescription(key, entry.description);
    assertCanonicalPath(key, entry.canonicalPath);
  }
}

function assertSeoTitle(key: string, title: string): void {
  if (!title.trim()) {
    throw new Error(`SEO title is empty for registry entry: ${key}`);
  }

  if (title.length > 60) {
    throw new Error(`SEO title exceeds 60 characters for registry entry: ${key}`);
  }

  if (title.includes('|')) {
    throw new Error(`SEO title may not use "|" for registry entry: ${key}`);
  }
}

function assertSeoDescription(key: string, description: string): void {
  if (!description.trim()) {
    throw new Error(`SEO description is empty for registry entry: ${key}`);
  }

  if (description.length > 160) {
    throw new Error(`SEO description exceeds 160 characters for registry entry: ${key}`);
  }
}

function assertCanonicalPath(key: string, canonicalPath: string | null): void {
  if (canonicalPath === null) {
    return;
  }

  if (!canonicalPath.startsWith('/')) {
    throw new Error(`Canonical path must start with "/" for registry entry: ${key}`);
  }

  if (canonicalPath.includes('#')) {
    throw new Error(`Canonical path may not contain "#" for registry entry: ${key}`);
  }
}
