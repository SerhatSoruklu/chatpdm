import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { SITE_SUPPORT_EMAIL } from '../../core/layout/site-navigation.data';

type VerificationResultStatus = 'success' | 'expired' | 'invalid';

interface VerificationResultViewModel {
  status: VerificationResultStatus;
  eyebrow: string;
  title: string;
  lead: string;
  detail: string;
  statusLabel: string;
  statusValue: string;
}

function normalizeStatus(value: string | null): VerificationResultStatus {
  if (value === 'success' || value === 'expired' || value === 'invalid') {
    return value;
  }

  return 'invalid';
}

@Component({
  selector: 'app-managed-access-verification-result',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './managed-access-verification-result.component.html',
  styleUrl: './managed-access-verification-result.component.css',
})
export class ManagedAccessVerificationResultComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly queryParamMap = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });

  protected readonly supportEmail = SITE_SUPPORT_EMAIL;
  protected readonly viewModel = computed<VerificationResultViewModel>(() => {
    const status = normalizeStatus(this.queryParamMap().get('status'));

    switch (status) {
      case 'success':
        return {
          status,
          eyebrow: 'Managed access verification',
          title: 'Work email verified.',
          lead: 'Your institutional access request is now under trust review.',
          detail:
            'The managed access request has moved past work email verification and is now waiting inside the bounded review path.',
          statusLabel: 'Current state',
          statusValue: 'Under trust review',
        };
      case 'expired':
        return {
          status,
          eyebrow: 'Managed access verification',
          title: 'Verification link expired.',
          lead:
            'This verification link can no longer be used to confirm institutional control.',
          detail:
            'Return to the homepage and submit a fresh managed access request if verification is still required.',
          statusLabel: 'Current state',
          statusValue: 'Verification expired',
        };
      default:
        return {
          status: 'invalid',
          eyebrow: 'Managed access verification',
          title: 'Verification link invalid.',
          lead:
            'This verification link is invalid or has already been used.',
          detail:
            'Return to the homepage and create a new managed access request if you still need to continue.',
          statusLabel: 'Current state',
          statusValue: 'Verification invalid',
        };
    }
  });
}
