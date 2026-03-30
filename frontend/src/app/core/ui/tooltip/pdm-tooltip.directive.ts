import { DOCUMENT } from '@angular/common';
import {
  Directive,
  ElementRef,
  HostListener,
  Inject,
  Input,
  OnDestroy,
  Renderer2,
} from '@angular/core';

type TooltipPosition = 'top' | 'bottom' | 'left' | 'right';

@Directive({
  selector: '[pdmTooltip]',
  standalone: true,
})
export class PdmTooltipDirective implements OnDestroy {
  private static nextId = 0;

  private tooltipEl: HTMLElement | null = null;
  private showTimeoutId: number | null = null;
  private readonly tooltipId = `pdm-tooltip-${++PdmTooltipDirective.nextId}`;

  @Input('pdmTooltip') text = '';
  @Input() pdmTooltipPosition: TooltipPosition = 'top';

  constructor(
    private readonly el: ElementRef<HTMLElement>,
    private readonly renderer: Renderer2,
    @Inject(DOCUMENT) private readonly document: Document,
  ) {}

  @HostListener('mouseenter')
  protected onMouseEnter(): void {
    this.queueShow();
  }

  @HostListener('mouseleave')
  protected onMouseLeave(): void {
    this.hideTooltip();
  }

  @HostListener('focusin')
  protected onFocusIn(): void {
    this.queueShow();
  }

  @HostListener('focusout')
  protected onFocusOut(): void {
    this.hideTooltip();
  }

  public ngOnDestroy(): void {
    this.clearPendingShow();
    this.destroyTooltip();
  }

  private queueShow(): void {
    if (!this.text.trim() || !this.document.body) {
      return;
    }

    this.clearPendingShow();
    this.showTimeoutId = window.setTimeout(() => {
      this.showTooltip();
    }, 120);
  }

  private showTooltip(): void {
    if (!this.text.trim() || this.tooltipEl || !this.document.body) {
      return;
    }

    const tooltip = this.renderer.createElement('div') as HTMLElement;
    this.tooltipEl = tooltip;

    this.renderer.setAttribute(tooltip, 'id', this.tooltipId);
    this.renderer.setAttribute(tooltip, 'role', 'tooltip');
    this.renderer.addClass(tooltip, 'pdm-tooltip');
    this.renderer.addClass(tooltip, `pdm-tooltip--${this.pdmTooltipPosition}`);
    this.renderer.setProperty(tooltip, 'textContent', this.text);
    this.renderer.appendChild(this.document.body, tooltip);
    this.renderer.setAttribute(this.el.nativeElement, 'aria-describedby', this.tooltipId);

    this.positionTooltip();

    requestAnimationFrame(() => {
      if (this.tooltipEl === tooltip) {
        this.renderer.addClass(tooltip, 'pdm-tooltip--visible');
      }
    });
  }

  private hideTooltip(): void {
    this.clearPendingShow();
    this.destroyTooltip();
  }

  private clearPendingShow(): void {
    if (this.showTimeoutId !== null) {
      window.clearTimeout(this.showTimeoutId);
      this.showTimeoutId = null;
    }
  }

  private destroyTooltip(): void {
    if (!this.tooltipEl || !this.document.body) {
      this.renderer.removeAttribute(this.el.nativeElement, 'aria-describedby');
      return;
    }

    this.renderer.removeChild(this.document.body, this.tooltipEl);
    this.tooltipEl = null;
    this.renderer.removeAttribute(this.el.nativeElement, 'aria-describedby');
  }

  private positionTooltip(): void {
    if (!this.tooltipEl) {
      return;
    }

    const hostRect = this.el.nativeElement.getBoundingClientRect();
    const tooltipRect = this.tooltipEl.getBoundingClientRect();
    const gap = 8;
    const margin = 12;
    let top = 0;
    let left = 0;

    switch (this.pdmTooltipPosition) {
      case 'bottom':
        top = hostRect.bottom + gap;
        left = hostRect.left + (hostRect.width / 2) - (tooltipRect.width / 2);
        break;
      case 'left':
        top = hostRect.top + (hostRect.height / 2) - (tooltipRect.height / 2);
        left = hostRect.left - tooltipRect.width - gap;
        break;
      case 'right':
        top = hostRect.top + (hostRect.height / 2) - (tooltipRect.height / 2);
        left = hostRect.right + gap;
        break;
      case 'top':
      default:
        top = hostRect.top - tooltipRect.height - gap;
        left = hostRect.left + (hostRect.width / 2) - (tooltipRect.width / 2);
        break;
    }

    top = Math.min(
      Math.max(top, margin),
      window.innerHeight - tooltipRect.height - margin,
    );

    left = Math.min(
      Math.max(left, margin),
      window.innerWidth - tooltipRect.width - margin,
    );

    this.renderer.setStyle(this.tooltipEl, 'top', `${top}px`);
    this.renderer.setStyle(this.tooltipEl, 'left', `${left}px`);
  }
}
