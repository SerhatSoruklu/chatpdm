import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  QueryList,
  ViewChildren,
  computed,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';

import { POLICY_SURFACE_DATA } from '../../policies/policy-surface.data';
import { buildTermsPageViewModel } from './terms-page.view-model';

export interface TermsPageSectionMetric {
  id: string;
  top: number;
}

export function resolveActiveTermsPageSectionId(
  sectionMetrics: readonly TermsPageSectionMetric[],
  activationOffset: number,
): string {
  if (!sectionMetrics.length) {
    return '';
  }

  let activeSectionId = sectionMetrics[0]!.id;

  for (const metric of sectionMetrics) {
    if (metric.top <= activationOffset) {
      activeSectionId = metric.id;
      continue;
    }

    break;
  }

  return activeSectionId;
}

export function resolveActiveTermsPageSectionIdFromHash(
  sectionIds: readonly string[],
  hash: string,
): string {
  if (!hash || !hash.startsWith('#')) {
    return '';
  }

  let candidateId = '';

  try {
    candidateId = decodeURIComponent(hash.slice(1));
  } catch {
    return '';
  }

  return sectionIds.includes(candidateId) ? candidateId : '';
}

@Component({
  selector: 'app-terms-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './terms-page.component.html',
  styleUrl: './terms-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TermsPageComponent implements AfterViewInit, OnDestroy {
  protected readonly viewModel = computed(() => buildTermsPageViewModel(POLICY_SURFACE_DATA.terms));
  protected readonly activeSectionId = signal(this.viewModel().sectionOrder[0]?.id ?? 'overview');

  @ViewChildren('apiSection', { read: ElementRef })
  private readonly apiSections?: QueryList<ElementRef<HTMLElement>>;

  private readonly activationOffset = 120;
  private scrollSpyObserver?: IntersectionObserver;
  private scrollSpyFrameId: number | null = null;

  ngAfterViewInit(): void {
    this.activeSectionId.set(this.viewModel().sectionOrder[0]?.id ?? 'overview');

    if (typeof IntersectionObserver === 'undefined') {
      return;
    }

    const sections = this.getObservedSections();
    if (!sections.length) {
      return;
    }

    this.scrollSpyObserver = new IntersectionObserver(
      () => {
        this.scheduleActiveSectionSync();
      },
      {
        root: null,
        rootMargin: '-120px 0px -60% 0px',
        threshold: [0],
      },
    );

    for (const section of sections) {
      this.scrollSpyObserver.observe(section);
    }

    this.syncActiveSectionFromHash();
    this.scheduleActiveSectionSync();
  }

  ngOnDestroy(): void {
    this.scrollSpyObserver?.disconnect();
    this.scrollSpyObserver = undefined;
    this.cancelScheduledActiveSectionSync();
  }

  @HostListener('window:scroll')
  protected onWindowScroll(): void {
    this.scheduleActiveSectionSync();
  }

  @HostListener('window:resize')
  protected onWindowResize(): void {
    this.scheduleActiveSectionSync();
  }

  @HostListener('window:hashchange')
  protected onWindowHashChange(): void {
    this.syncActiveSectionFromHash();
    this.scheduleActiveSectionSync();
  }

  private getObservedSections(): readonly HTMLElement[] {
    return this.apiSections?.toArray().map((section) => section.nativeElement) ?? [];
  }

  private scheduleActiveSectionSync(): void {
    if (typeof requestAnimationFrame === 'undefined') {
      this.syncActiveSection();
      return;
    }

    if (this.scrollSpyFrameId !== null) {
      cancelAnimationFrame(this.scrollSpyFrameId);
    }

    this.scrollSpyFrameId = requestAnimationFrame(() => {
      this.scrollSpyFrameId = null;
      this.syncActiveSection();
    });
  }

  private cancelScheduledActiveSectionSync(): void {
    if (this.scrollSpyFrameId === null || typeof cancelAnimationFrame === 'undefined') {
      return;
    }

    cancelAnimationFrame(this.scrollSpyFrameId);
    this.scrollSpyFrameId = null;
  }

  private syncActiveSectionFromHash(): void {
    const nextActiveSectionId = resolveActiveTermsPageSectionIdFromHash(
      this.viewModel().sectionOrder.map((section) => section.id),
      typeof window !== 'undefined' ? window.location.hash : '',
    );

    if (nextActiveSectionId) {
      this.activeSectionId.set(nextActiveSectionId);
    }
  }

  private syncActiveSection(): void {
    const sections = this.getObservedSections();
    if (!sections.length) {
      return;
    }

    const nextActiveSectionId = resolveActiveTermsPageSectionId(
      sections.map((section) => ({
        id: section.id,
        top: section.getBoundingClientRect().top,
      })),
      this.activationOffset,
    );

    if (nextActiveSectionId) {
      this.activeSectionId.set(nextActiveSectionId);
    }
  }
}
