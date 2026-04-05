import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';

import {
  buildCoreConceptInspectableItemRows,
  buildRegistryTermInspectableItemRows,
  inspectableItemDisclosureToggleLabel,
  isCoreConceptInspectableItemData,
  isRegistryTermInspectableItemData,
  type InspectableItemDisclosureData,
  type InspectableItemDisclosureRow,
  type InspectableItemType,
} from './inspectable-item-disclosure.model';

let inspectableItemDisclosureSequence = 0;

@Component({
  selector: 'app-inspectable-item-disclosure',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './inspectable-item-disclosure.component.html',
  styleUrl: './inspectable-item-disclosure.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InspectableItemDisclosureComponent {
  readonly itemType = input.required<InspectableItemType>();
  readonly semanticData = input.required<InspectableItemDisclosureData>();

  protected readonly isExpanded = signal(false);
  protected readonly contentId = `pdm-inspectable-item-disclosure-${++inspectableItemDisclosureSequence}`;
  protected readonly toggleLabel = computed(() => inspectableItemDisclosureToggleLabel(this.isExpanded()));
  protected readonly coreRows = computed<readonly InspectableItemDisclosureRow[]>(() => {
    const semanticData = this.semanticData();

    if (isCoreConceptInspectableItemData(semanticData)) {
      return buildCoreConceptInspectableItemRows(semanticData);
    }

    return [];
  });
  protected readonly registryRows = computed<readonly InspectableItemDisclosureRow[]>(() => {
    const semanticData = this.semanticData();

    if (isRegistryTermInspectableItemData(semanticData)) {
      return buildRegistryTermInspectableItemRows(semanticData);
    }

    return [];
  });

  protected toggleDisclosure(): void {
    this.isExpanded.update((current) => !current);
  }
}
