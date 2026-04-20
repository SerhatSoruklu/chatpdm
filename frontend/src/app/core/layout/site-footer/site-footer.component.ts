import {
  AfterViewInit,
  Component,
  ElementRef,
  computed,
  OnDestroy,
  OnInit,
  signal,
  ViewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { ChatPdmLogoComponent } from '../../brand/chatpdm-logo/chatpdm-logo.component';
import { PdmTooltipDirective } from '../../ui/tooltip/pdm-tooltip.directive';
import { SITE_CONTACT_EMAIL } from '../site-navigation.data';
import { MCPP_ROUTE_PATH } from '../../../pages/military-constraints-compiler-page/military-constraints-compiler-page.constants';
import { ZEE_ROUTE_PATH } from '../../../pages/zeroglare-evidence-engine-page/zeroglare-evidence-engine-page.constants';

const COUPYN_PROFILE_URL = 'https://coupyn.com';
const COUPYN_PROFILE_LABEL = 'Visit Coupyn';
const ORCID_PROFILE_URL = 'https://orcid.org/0009-0006-8963-5986';
const ORCID_ICON_PATH = '/assets/orcid/ORCIDserhat_soruklu.png';
const ORCID_PROFILE_LABEL = 'Open Serhat Soruklu ORCID profile';

interface FooterLink {
  label: string;
  route: string;
  fragment?: string;
  featured?: boolean;
}

interface FooterColumn {
  title: string;
  tone?: 'default' | 'secondary';
  links: FooterLink[];
}

interface FooterPreviewExample {
  input: string;
  outcome: string;
  reason?: string;
}

type FooterPreviewPhase = 'idle' | 'typing' | 'reveal' | 'hold' | 'deleting';

@Component({
  selector: 'app-site-footer',
  standalone: true,
  imports: [RouterLink, ChatPdmLogoComponent, PdmTooltipDirective],
  templateUrl: './site-footer.component.html',
  styleUrl: './site-footer.component.css',
})
export class SiteFooterComponent implements AfterViewInit, OnInit, OnDestroy {
  @ViewChild('previewCard') private previewCard?: ElementRef<HTMLElement>;
  private readonly isBrowser = typeof window !== 'undefined';

  protected readonly contactEmail = SITE_CONTACT_EMAIL;
  protected readonly coupynProfileUrl = COUPYN_PROFILE_URL;
  protected readonly coupynProfileLabel = COUPYN_PROFILE_LABEL;
  protected readonly orcidProfileUrl = ORCID_PROFILE_URL;
  protected readonly orcidIconPath = ORCID_ICON_PATH;
  protected readonly orcidProfileLabel = ORCID_PROFILE_LABEL;
  protected readonly footerColumns: FooterColumn[] = [
    {
      title: 'System',
      links: [
        { label: 'What ChatPDM is', route: '/what-is-chatpdm' },
        { label: 'Reasoning structure', route: '/reasoning-structure' },
        { label: 'Risk Mapping Governance', route: '/risk-mapping-governance' },
        { label: 'Vocabulary Boundary', route: '/vocabulary' },
        { label: 'Zeroglare', route: '/zeroglare' },
        { label: 'Evidence Engine (ZEE)', route: ZEE_ROUTE_PATH },
        { label: 'Military Constraints Compiler', route: MCPP_ROUTE_PATH, featured: true },
        { label: 'Docs', route: '/docs' },
        { label: 'API', route: '/api' },
        { label: 'Handbooks', route: '/handbooks' },
      ],
    },
    {
      title: 'Runtime',
      links: [
        { label: 'Query runtime', route: '/runtime', fragment: 'runtime-query' },
        { label: 'Live concepts', route: '/live-concepts' },
        { label: 'Analyst Workbench', route: '/inspect/legal-validator', featured: true },
        { label: 'Controlled comparisons', route: '/controlled-comparisons' },
        { label: 'Refusal behavior', route: '/runtime', fragment: 'runtime-refusal' },
        { label: 'Resolution contract', route: '/resolution-contract' },
        { label: 'Version policy', route: '/version-policy' },
        { label: 'Source model', route: '/source-model' },
        { label: 'Scope model', route: '/scope-model' },
      ],
    },
    {
      title: 'Legal',
      tone: 'secondary',
      links: [
        { label: 'Privacy Policy', route: '/privacy' },
        { label: 'Data Retention / Data Usage', route: '/data-retention' },
        { label: 'Acceptable Use', route: '/acceptable-use' },
        { label: 'Cookie Policy', route: '/cookies' },
        { label: 'Terms of Service', route: '/terms' },
      ],
    },
  ];

  protected readonly contactLinks: FooterLink[] = [
    { label: 'contact@chatpdm.com', route: `mailto:${SITE_CONTACT_EMAIL}` },
  ];

  protected readonly orcidLink: FooterLink = {
    label: 'ORCID',
    route: ORCID_PROFILE_URL,
  };

  protected readonly footerIntroBullets = [
    'Checks whether terms are defined.',
    'Checks whether claims have support.',
    'Checks whether contradictions exist.',
  ] as const;

  protected readonly footerBuiltByLabel = 'Built by Serhat Soruklu, founder of';
  protected readonly footerBuiltByLinkLabel = 'Coupyn';
  protected readonly footerIntroSummary =
    'ChatPDM validates reasoning like a compiler validates code.';
  protected readonly footerIntroTitle =
    'Deterministic concept resolution inside a bounded runtime.';
  protected readonly footerPreviewExamples: FooterPreviewExample[] = [
    {
      input: 'Company policy overrides statutory law in all cases.',
      outcome: 'Invalid',
      reason: 'Contradicts defined legal hierarchy.',
    },
    {
      input: 'authority vs power',
      outcome: 'Resolved within scope',
    },
    {
      input: 'authority vs charisma',
      outcome: 'Refused',
      reason: 'Pair not allowlisted in runtime.',
    },
    {
      input: 'A claim with no evidence support.',
      outcome: 'Refused',
      reason: 'Missing required evidence support.',
    },
    {
      input: 'Define a term not in the vocabulary boundary.',
      outcome: 'Refused',
      reason: 'Term not allowlisted in vocabulary boundary.',
    },
  ];
  protected readonly activePreviewIndex = signal(0);
  protected readonly prefersReducedMotion = signal(false);
  protected readonly previewPhase = signal<FooterPreviewPhase>('idle');
  protected readonly displayedInput = signal('');
  protected readonly showOutcome = signal(false);
  protected readonly showReason = signal(false);
  protected readonly activePreview = computed<FooterPreviewExample>(() => {
    return this.footerPreviewExamples[this.activePreviewIndex()] ?? this.footerPreviewExamples[0]!;
  });

  protected readonly systemFooterColumn = this.footerColumns[0]!;
  protected readonly runtimeFooterColumn = this.footerColumns[1]!;
  protected readonly legalFooterColumn = this.footerColumns[2]!;
  protected readonly systemRuntimeColumns = [
    this.systemFooterColumn,
    this.runtimeFooterColumn,
  ] as const;

  private previewIntervalId: number | undefined;
  private previewObserver?: IntersectionObserver;
  private previewStarted = false;
  private previewTimers: number[] = [];
  private previewScrollHandler?: () => void;

  ngOnInit(): void {
    this.displayStaticPreview();

    if (!this.isBrowser) {
      return;
    }

    this.prefersReducedMotion.set(
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
    );
    if (this.prefersReducedMotion()) {
      return;
    }

    if ('IntersectionObserver' in window) {
      this.previewObserver = new IntersectionObserver(
        (entries) => {
          if (this.previewStarted) {
            return;
          }
          if (entries.some((entry) => entry.isIntersecting)) {
            this.startPreviewOnce();
          }
        },
        { threshold: 0.2 }
      );
    }
  }

  ngAfterViewInit(): void {
    if (!this.isBrowser || this.prefersReducedMotion() || !this.previewCard) {
      return;
    }
    this.previewScrollHandler = () => this.maybeStartPreview();
    window.addEventListener('scroll', this.previewScrollHandler, { passive: true });
    window.addEventListener('resize', this.previewScrollHandler);
    if (this.previewObserver) {
      this.previewObserver.observe(this.previewCard.nativeElement);
    }
    this.maybeStartPreview();
  }

  ngOnDestroy(): void {
    if (!this.isBrowser) {
      return;
    }
    this.clearPreviewTimers();
    if (this.previewIntervalId) {
      window.clearInterval(this.previewIntervalId);
    }
    this.previewObserver?.disconnect();
    if (this.previewScrollHandler) {
      window.removeEventListener('scroll', this.previewScrollHandler);
      window.removeEventListener('resize', this.previewScrollHandler);
    }
  }

  private displayStaticPreview(): void {
    if (this.footerPreviewExamples.length === 0) {
      return;
    }
    this.displayedInput.set(this.activePreview().input);
    this.showOutcome.set(true);
    this.showReason.set(Boolean(this.activePreview().reason));
    this.previewPhase.set('idle');
  }

  private startPreviewLoop(): void {
    if (this.footerPreviewExamples.length === 0) {
      return;
    }
    this.runPreviewCycle();
  }

  private maybeStartPreview(): void {
    if (!this.isBrowser || this.previewStarted || !this.previewCard) {
      return;
    }
    const rect = this.previewCard.nativeElement.getBoundingClientRect();
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
    const isVisible = rect.top < viewportHeight * 0.9 && rect.bottom > viewportHeight * 0.1;
    if (isVisible) {
      this.startPreviewOnce();
    }
  }

  private startPreviewOnce(): void {
    if (this.previewStarted) {
      return;
    }
    this.previewStarted = true;
    this.previewObserver?.disconnect();
    if (this.previewScrollHandler) {
      window.removeEventListener('scroll', this.previewScrollHandler);
      window.removeEventListener('resize', this.previewScrollHandler);
    }
    this.startPreviewLoop();
  }

  private runPreviewCycle(): void {
    this.clearPreviewTimers();
    this.previewPhase.set('typing');
    this.showOutcome.set(false);
    this.showReason.set(false);

    const targetText = this.activePreview().input;
    let cursor = targetText.length > 0 ? 1 : 0;
    this.displayedInput.set(targetText.slice(0, cursor));
    const typingInterval = window.setInterval(() => {
      cursor += 1;
      this.displayedInput.set(targetText.slice(0, cursor));
      if (cursor >= targetText.length) {
        window.clearInterval(typingInterval);
        this.transitionToReveal();
      }
    }, 35);
    this.previewIntervalId = typingInterval;
    this.previewTimers.push(typingInterval);
  }

  private transitionToReveal(): void {
    this.previewPhase.set('reveal');
    this.showOutcome.set(true);
    this.showReason.set(Boolean(this.activePreview().reason));
    const holdTimer = window.setTimeout(() => {
      this.previewPhase.set('hold');
      this.transitionToDelete();
    }, 1500);
    this.previewTimers.push(holdTimer);
  }

  private transitionToDelete(): void {
    const deleteDelay = window.setTimeout(() => {
      this.previewPhase.set('deleting');
      let cursor = this.displayedInput().length;
      const deletingInterval = window.setInterval(() => {
        cursor -= 1;
        this.displayedInput.set(this.displayedInput().slice(0, Math.max(cursor, 0)));
        if (cursor <= 0) {
          window.clearInterval(deletingInterval);
          this.advancePreview();
        }
      }, 24);
      this.previewIntervalId = deletingInterval;
      this.previewTimers.push(deletingInterval);
    }, 900);
    this.previewTimers.push(deleteDelay);
  }

  private advancePreview(): void {
    this.activePreviewIndex.update(
      (currentIndex) => (currentIndex + 1) % this.footerPreviewExamples.length
    );
    this.runPreviewCycle();
  }

  private clearPreviewTimers(): void {
    if (!this.isBrowser) {
      return;
    }
    this.previewTimers.forEach((timerId) => {
      window.clearTimeout(timerId);
      window.clearInterval(timerId);
    });
    this.previewTimers = [];
    if (this.previewIntervalId) {
      window.clearInterval(this.previewIntervalId);
    }
  }

}
