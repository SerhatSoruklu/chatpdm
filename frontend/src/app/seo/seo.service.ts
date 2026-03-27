import { DOCUMENT } from '@angular/common';
import { APP_INITIALIZER, Injectable, RESPONSE_INIT, inject, makeEnvironmentProviders } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import {
  SEO_DEFAULT_KEY,
  SEO_NOT_FOUND_KEY,
  buildSeoTitle,
  getSeoEntry,
  resolveCanonicalUrl,
} from './seo.registry';
import { SEO_SITE } from './seo.site';
import type { SeoPageConfig, SeoStructuredData } from './seo.types';

@Injectable({
  providedIn: 'root',
})
export class SeoService {
  private readonly router = inject(Router);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly document = inject(DOCUMENT);
  private readonly responseInit = inject(RESPONSE_INIT, { optional: true });
  private started = false;

  start(): void {
    if (this.started) {
      return;
    }

    this.started = true;
    this.applyCurrentRouteSeo();

    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(() => this.applyCurrentRouteSeo());
  }

  private applyCurrentRouteSeo(): void {
    const page = this.resolveSeoPage();
    const title = buildSeoTitle(page);
    const canonicalUrl = resolveCanonicalUrl(page.canonicalPath);

    this.title.setTitle(title);
    this.meta.updateTag({ name: 'description', content: page.description });
    this.meta.updateTag({ name: 'robots', content: page.robots ?? 'index, follow' });
    this.meta.updateTag({ name: 'author', content: SEO_SITE.author });
    this.meta.updateTag({ name: 'twitter:card', content: page.twitterCard ?? SEO_SITE.defaultTwitterCard });
    this.meta.updateTag({ name: 'twitter:title', content: title });
    this.meta.updateTag({ name: 'twitter:description', content: page.description });
    this.meta.updateTag({ name: 'twitter:image', content: this.resolveOgImageUrl() });
    this.meta.updateTag({ property: 'og:title', content: title });
    this.meta.updateTag({ property: 'og:description', content: page.description });
    this.meta.updateTag({ property: 'og:type', content: page.openGraphType ?? 'website' });
    this.meta.updateTag({ property: 'og:site_name', content: SEO_SITE.siteName });
    this.meta.updateTag({ property: 'og:locale', content: SEO_SITE.locale });
    this.meta.updateTag({ property: 'og:image', content: this.resolveOgImageUrl() });
    this.meta.updateTag({ property: 'og:image:type', content: SEO_SITE.defaultOgImageType });
    this.meta.updateTag({ property: 'og:image:width', content: SEO_SITE.defaultOgImageWidth });
    this.meta.updateTag({ property: 'og:image:height', content: SEO_SITE.defaultOgImageHeight });

    this.updateCanonicalAndOgUrl(canonicalUrl);
    this.updateStructuredData(page.structuredData);

    if (this.responseInit) {
      this.responseInit.status = page.responseStatus ?? 200;
    }
  }

  private resolveSeoPage(): SeoPageConfig {
    const snapshot = this.getDeepestSnapshot();
    const seoKey = typeof snapshot.data['seoKey'] === 'string' ? snapshot.data['seoKey'] : null;

    return getSeoEntry(seoKey) ?? getSeoEntry(SEO_DEFAULT_KEY) ?? getSeoEntry(SEO_NOT_FOUND_KEY)!;
  }

  private getDeepestSnapshot() {
    let snapshot = this.router.routerState.snapshot.root;

    while (snapshot.firstChild) {
      snapshot = snapshot.firstChild;
    }

    return snapshot;
  }

  private updateCanonicalAndOgUrl(canonicalUrl: string | null): void {
    if (!canonicalUrl) {
      this.meta.removeTag("property='og:url'");
      this.removeCanonicalLink();
      return;
    }

    let link = this.document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');

    if (!link) {
      link = this.document.createElement('link');
      link.setAttribute('rel', 'canonical');
      this.document.head.appendChild(link);
    }

    link.setAttribute('href', canonicalUrl);
    this.meta.updateTag({ property: 'og:url', content: canonicalUrl });
  }

  private removeCanonicalLink(): void {
    const link = this.document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    link?.remove();
  }

  private updateStructuredData(data: SeoStructuredData | SeoStructuredData[] | undefined): void {
    this.document.head
      .querySelectorAll<HTMLScriptElement>('script[data-chatpdm-seo-structured-data="true"]')
      .forEach((node) => node.remove());

    if (!data) {
      return;
    }

    const entries = Array.isArray(data) ? data : [data];

    entries.forEach((entry, index) => {
      const script = this.document.createElement('script');
      script.type = 'application/ld+json';
      script.setAttribute('data-chatpdm-seo-structured-data', 'true');
      script.id = `chatpdm-seo-structured-data-${index}`;
      script.text = JSON.stringify(entry);
      this.document.head.appendChild(script);
    });
  }

  private resolveOgImageUrl(): string {
    return new URL(SEO_SITE.defaultOgImagePath, SEO_SITE.siteUrl).href;
  }
}

export function provideSeoMetadata() {
  return makeEnvironmentProviders([
    {
      provide: APP_INITIALIZER,
      multi: true,
      deps: [SeoService],
      useFactory: (seoService: SeoService) => () => seoService.start(),
    },
  ]);
}
