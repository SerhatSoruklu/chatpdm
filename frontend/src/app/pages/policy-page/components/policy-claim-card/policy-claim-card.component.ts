import { CommonModule } from '@angular/common';
import { Component, computed, input, output } from '@angular/core';

import {
  formatPolicyClaimClass,
  splitPolicyInlineCode,
} from '../../../../policies/policy-inline-code.util';
import type { PolicyClaim } from '../../../../policies/policy-surface.types';
import { getPolicyLifecycleEvidence } from './policy-lifecycle-evidence.util';
import { PolicyTracePanelComponent } from '../policy-trace-panel/policy-trace-panel.component';

@Component({
  selector: 'app-policy-claim-card',
  standalone: true,
  imports: [CommonModule, PolicyTracePanelComponent],
  templateUrl: './policy-claim-card.component.html',
  styleUrl: './policy-claim-card.component.css',
})
export class PolicyClaimCardComponent {
  readonly claim = input.required<PolicyClaim>();
  readonly selected = input(false);
  readonly inspectRequested = output<string>();

  protected readonly sentenceSegments = computed(() =>
    splitPolicyInlineCode(this.claim().policySentence),
  );
  protected readonly lifecycleEvidence = computed(() => getPolicyLifecycleEvidence(this.claim()));
  protected readonly statusLabel = computed(() => this.claim().status.replaceAll('_', ' '));
  protected readonly traceCount = computed(() => this.claim().traces.length);

  protected toggleInspect(): void {
    this.inspectRequested.emit(this.selected() ? '' : this.claim().id);
  }

  protected claimClassName(): string {
    return this.claim().claimClass.replaceAll('_', '-');
  }

  protected claimClassLabel(): string {
    return formatPolicyClaimClass(this.claim().claimClass);
  }
}
