import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { seoApiReferenceEntries } from '../src/app/seo/registry/seo.api-reference.ts';
import { seoCompareEntries } from '../src/app/seo/registry/seo.compare.ts';
import { seoConceptEntries } from '../src/app/seo/registry/seo.concepts.ts';
import { seoDeveloperEntries } from '../src/app/seo/registry/seo.developer.ts';
import { seoDocsEntries } from '../src/app/seo/registry/seo.docs.ts';
import { seoFaqEntries } from '../src/app/seo/registry/seo.faq.ts';
import { seoHandbookEntries } from '../src/app/seo/registry/seo.handbooks.ts';
import { seoLegalEntries } from '../src/app/seo/registry/seo.legal.ts';
import { seoNotFoundEntries } from '../src/app/seo/registry/seo.not-found.ts';
import { seoStaticEntries } from '../src/app/seo/registry/seo.static.ts';
import { SEO_SITE } from '../src/app/seo/seo.site.ts';
import type { SeoPageConfig, SeoSitemapEntry } from '../src/app/seo/seo.types.ts';

const currentDir = dirname(fileURLToPath(import.meta.url));
const publicDir = join(currentDir, '../public');
const sitemapPath = join(publicDir, 'sitemap.xml');
const robotsPath = join(publicDir, 'robots.txt');

mkdirSync(publicDir, { recursive: true });

const sitemapEntries = getSitemapEntries();
const sitemapXml = buildSitemapXml(sitemapEntries);
const robotsTxt = buildRobotsTxt();

writeFileSync(sitemapPath, sitemapXml, 'utf8');
writeFileSync(robotsPath, robotsTxt, 'utf8');

function buildSitemapXml(entries: ReturnType<typeof getSitemapEntries>): string {
  const urls = entries
    .map(
      (entry) => `  <url>
    <loc>${escapeXml(entry.canonicalUrl)}</loc>
    <changefreq>${entry.changeFrequency}</changefreq>
    <priority>${entry.priority.toFixed(1)}</priority>
  </url>`,
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}

function getSitemapEntries(): SeoSitemapEntry[] {
  const registry = {
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
  } satisfies Record<string, SeoPageConfig>;

  return Object.entries(registry)
    .filter(([, entry]) => entry.includeInSitemap === true && entry.canonicalPath)
    .map(([key, entry]) => ({
      key,
      canonicalUrl: new URL(entry.canonicalPath!, SEO_SITE.siteUrl).href,
      changeFrequency: entry.sitemapChangeFrequency ?? 'monthly',
      priority: entry.sitemapPriority ?? 0.5,
    }));
}

function buildRobotsTxt(): string {
  return `User-agent: *
Allow: /

Sitemap: ${new URL('/sitemap.xml', SEO_SITE.siteUrl).href}
`;
}

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}
