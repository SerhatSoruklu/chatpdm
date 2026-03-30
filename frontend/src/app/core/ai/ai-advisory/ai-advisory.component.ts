import { CommonModule } from '@angular/common';
import { AfterViewInit, ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';

@Component({
  selector: 'app-ai-advisory',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ai-advisory.component.html',
  styleUrl: './ai-advisory.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AiAdvisoryComponent implements AfterViewInit {
  readonly conceptTitle = input.required<string>();
  readonly shortDefinition = input.required<string>();
  readonly coreMeaning = input.required<string>();
  readonly disabled = input(false);

  readonly advisoryViewed = output<void>();
  readonly advisoryFollowed = output<void>();
  readonly canonicalUsed = output<void>();

  protected readonly interactionState = signal<'idle' | 'ai_followed' | 'canonical_used'>('idle');
  protected readonly advisoryLead = computed(() =>
    `Use this panel as a secondary reading layer for ${this.conceptTitle()}. The canonical response above remains authoritative.`,
  );
  protected readonly advisoryGuidance = computed(() => {
    const firstSentence = this.coreMeaning()
      .split('. ')
      .map((segment) => segment.trim())
      .filter(Boolean)[0];

    return firstSentence
      ? `${firstSentence.replace(/\.*$/, '.')} Keep the authored scope, governance state, and relations unchanged.`
      : 'Keep the authored scope, governance state, and relations unchanged.';
  });
  protected readonly interactionMessage = computed(() => {
    switch (this.interactionState()) {
      case 'ai_followed':
        return 'Advisory reading noted. The canonical response above remains the system truth.';
      case 'canonical_used':
        return 'Canonical response confirmed. The advisory layer stays secondary.';
      default:
        return 'AI content here is assistive only and never changes canonical meaning.';
    }
  });

  ngAfterViewInit(): void {
    queueMicrotask(() => {
      this.advisoryViewed.emit();
    });
  }

  protected followAdvisory(): void {
    this.interactionState.set('ai_followed');
    this.advisoryFollowed.emit();
  }

  protected useCanonical(): void {
    this.interactionState.set('canonical_used');
    this.canonicalUsed.emit();
  }
}
