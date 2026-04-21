import '@angular/compiler';

import { createEnvironmentInjector, runInInjectionContext } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { describe, expect, it } from 'vitest';
import { of } from 'rxjs';

import { AiTrackingService } from '../../core/ai/ai-tracking.service';
import { ConceptResolverService } from '../../core/concepts/concept-resolver.service';
import { FeedbackService } from '../../core/feedback/feedback.service';
import { LandingPageComponent } from './landing-page.component';

function createComponent(): LandingPageComponent {
  const injector = createEnvironmentInjector([
    {
      provide: ActivatedRoute,
      useValue: {
        data: of({}),
        snapshot: { data: {} },
      },
    },
    {
      provide: ConceptResolverService,
      useValue: {},
    },
    {
      provide: AiTrackingService,
      useValue: {},
    },
    {
      provide: FeedbackService,
      useValue: {},
    },
  ]);

  const component = runInInjectionContext(injector, () => new LandingPageComponent());
  injector.destroy();

  return component;
}

describe('LandingPageComponent', () => {
  it('switches walkthrough cards between plain language and technical details', () => {
    const component = createComponent();

    expect(component['walkthroughModeOptions'].map((option) => option.label)).toEqual([
      'Plain language',
      'Technical details',
    ]);

    expect(component['walkthroughCards']()).toHaveLength(6);
    expect(component['walkthroughCards']()[0].view.title).toBe('What is being processed?');
    expect(component['walkthroughCards']()[0].view.resultLine).toBe('Captures the input');

    component['setWalkthroughMode']('technical');

    expect(component['walkthroughCards']()[0].view.title).toBe('Input capture');
    expect(component['walkthroughCards']()[0].view.resultLine).toBe('Exact input boundary');
    expect(component['walkthroughCards']()[5].view.pipelineStage).toBe('analysis / refusal');
  });
});
