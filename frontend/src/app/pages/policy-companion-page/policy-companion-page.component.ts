import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { POLICY_COMPANION_DATA } from '../../policies/policy-companion.data';
import type {
  PolicyCompanionCard,
  PolicyCompanionKey,
  PolicyCompanionLane,
  PolicyCompanionSection,
  PolicyCompanionStep,
  PolicyCompanionTrace,
} from '../../policies/policy-companion.types';

@Component({
  selector: 'app-policy-companion-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './policy-companion-page.component.html',
  styleUrl: './policy-companion-page.component.css',
})
export class PolicyCompanionPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly routeData = toSignal(this.route.data, {
    initialValue: this.route.snapshot.data,
  });

  protected readonly surface = computed(() => {
    const companionKey = this.routeData()['policyCompanionKey'] as PolicyCompanionKey;
    return POLICY_COMPANION_DATA[companionKey];
  });

  protected sectionCards(section: PolicyCompanionSection): readonly PolicyCompanionCard[] {
    return section.kind === 'cards' ? section.cards : [];
  }

  protected usesThreeColumnCards(section: PolicyCompanionSection): boolean {
    return section.kind === 'cards' && section.columns === 3;
  }

  protected sectionLanes(section: PolicyCompanionSection): readonly PolicyCompanionLane[] {
    return section.kind === 'lanes' ? section.lanes : [];
  }

  protected sectionSteps(section: PolicyCompanionSection): readonly PolicyCompanionStep[] {
    return section.kind === 'timeline' ? section.steps : [];
  }

  protected sectionTraces(section: PolicyCompanionSection): readonly PolicyCompanionTrace[] {
    return section.kind === 'traces' ? section.traces : [];
  }
}
