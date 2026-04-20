import '@angular/compiler';

import { createEnvironmentInjector, runInInjectionContext } from '@angular/core';
import { describe, expect, it } from 'vitest';

import { LegalValidatorWorkbenchService } from '../../core/legal-validator/legal-validator-workbench.service';
import {
  LEGAL_VALIDATOR_WORKBENCH_ROUTE_PATH,
  LEGAL_VALIDATOR_WORKBENCH_SEO_KEY,
} from './legal-validator-workbench-page.constants';
import { LegalValidatorWorkbenchPageComponent } from './legal-validator-workbench-page.component';

function createComponent(validationRunId = ''): LegalValidatorWorkbenchPageComponent {
  const injector = createEnvironmentInjector([
    {
      provide: LegalValidatorWorkbenchService,
      useValue: {
        apiOrigin: 'http://127.0.0.1:4301',
      },
    },
  ]);

  const component = runInInjectionContext(injector, () => new LegalValidatorWorkbenchPageComponent());
  injector.destroy();
  component['draft'].validationRunId = validationRunId;

  return component;
}

describe('LegalValidatorWorkbenchPageComponent', () => {
  it('binds the workbench route and export surface to the live backend origin', () => {
    const component = createComponent('validation-run-123');

    expect(component['pageRoute']).toBe(LEGAL_VALIDATOR_WORKBENCH_ROUTE_PATH);
    expect(LEGAL_VALIDATOR_WORKBENCH_SEO_KEY).toBe('static.legal-validator-workbench');
    expect(component['canLoadReport']()).toBe(true);
    expect(component['canLoadExport']()).toBe(true);
    expect(component['exportHref']()).toBe(
      'http://127.0.0.1:4301/api/v1/legal-validator/runs/validation-run-123/export',
    );
  });

  it('keeps the report/export gates closed without a validation run id', () => {
    const component = createComponent();

    expect(component['canLoadReport']()).toBe(false);
    expect(component['canLoadExport']()).toBe(false);
    expect(component['exportHref']()).toBeNull();
  });
});
