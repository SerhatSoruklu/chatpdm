import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import type {
  ResolveProductResponse,
  VocabularyClassificationResult,
} from '../concept-resolver.types';
import {
  extractVocabularyPanelData,
  vocabularyClassificationLabel,
  VOCABULARY_PANEL_WARNING_TEXT,
} from './vocabulary-panel.model';

@Component({
  selector: 'app-vocabulary-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './vocabulary-panel.component.html',
  styleUrl: './vocabulary-panel.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VocabularyPanelComponent {
  readonly response = input<ResolveProductResponse | null | undefined>(undefined);

  protected readonly vocabulary = computed(() => extractVocabularyPanelData(this.response()));
  protected readonly shouldRender = computed(() => this.vocabulary() !== null);
  protected readonly warningText = VOCABULARY_PANEL_WARNING_TEXT;

  protected classificationLabel(
    classification: VocabularyClassificationResult['classification'],
  ): string {
    return vocabularyClassificationLabel(classification);
  }
}
