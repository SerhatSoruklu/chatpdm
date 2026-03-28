import { CommonModule } from '@angular/common';
import { Component, input } from '@angular/core';

import type { PolicyClaim } from '../../../../policies/policy-surface.types';
import { PolicyClaimCardComponent } from '../policy-claim-card/policy-claim-card.component';

@Component({
  selector: 'app-policy-claim-list',
  standalone: true,
  imports: [CommonModule, PolicyClaimCardComponent],
  templateUrl: './policy-claim-list.component.html',
  styleUrl: './policy-claim-list.component.css',
})
export class PolicyClaimListComponent {
  readonly claims = input<readonly PolicyClaim[]>([]);
}
