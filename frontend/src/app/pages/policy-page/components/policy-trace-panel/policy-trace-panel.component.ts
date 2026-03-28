import { CommonModule } from '@angular/common';
import { Component, computed, input } from '@angular/core';

import { splitPolicyInlineCode } from '../../../../policies/policy-inline-code.util';
import type { PolicyClaim } from '../../../../policies/policy-surface.types';

@Component({
  selector: 'app-policy-trace-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './policy-trace-panel.component.html',
  styleUrl: './policy-trace-panel.component.css',
})
export class PolicyTracePanelComponent {
  readonly claim = input.required<PolicyClaim>();

  protected readonly canonicalSegments = computed(() =>
    splitPolicyInlineCode(this.claim().canonicalClaim),
  );
}
