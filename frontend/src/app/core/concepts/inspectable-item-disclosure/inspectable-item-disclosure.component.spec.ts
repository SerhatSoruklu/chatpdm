import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import {
  buildInspectableItemDisclosureCoreData,
  buildCoreConceptInspectableItemRows,
  buildRegistryTermInspectableItemRows,
  inspectableItemDisclosureToggleLabel,
  REGISTRY_MEANING_IN_LAW_FALLBACK,
} from './inspectable-item-disclosure.model';

const CORE_CONCEPT_LABELS = [
  'Short definition',
  'Core meaning',
  'Full definition',
] as const;

const REGISTRY_TERM_LABELS = [
  'Meaning in law',
  'Registry interpretation',
  'Why registry-only',
] as const;

function extractTemplateCaseBlock(template: string, caseLabel: 'core_concept' | 'registry_term'): string {
  const startMarker = `@case ('${caseLabel}') {`;
  const startIndex = template.indexOf(startMarker);

  if (startIndex === -1) {
    return '';
  }

  const nextCaseIndex = template.indexOf('@case (', startIndex + startMarker.length);
  return nextCaseIndex === -1
    ? template.slice(startIndex)
    : template.slice(startIndex, nextCaseIndex);
}

describe('InspectableItemDisclosure model', () => {
  it('builds canonical core-concept rows in the locked order', () => {
    expect(buildCoreConceptInspectableItemRows({
      shortDefinition: 'Short definition.',
      coreMeaning: 'Core meaning.',
      fullDefinition: 'Full definition.',
    })).toEqual([
      {
        label: 'Short definition',
        value: 'Short definition.',
      },
      {
        label: 'Core meaning',
        value: 'Core meaning.',
      },
      {
        label: 'Full definition',
        value: 'Full definition.',
      },
    ]);
  });

  it('projects complete core-concept detail into disclosure data and rejects incomplete detail', () => {
    expect(buildInspectableItemDisclosureCoreData({
      shortDefinition: 'Short definition.',
      coreMeaning: 'Core meaning.',
      fullDefinition: 'Full definition.',
    })).toEqual({
      shortDefinition: 'Short definition.',
      coreMeaning: 'Core meaning.',
      fullDefinition: 'Full definition.',
    });

    expect(buildInspectableItemDisclosureCoreData({
      shortDefinition: null,
      coreMeaning: 'Core meaning.',
      fullDefinition: 'Full definition.',
    })).toBeNull();
  });

  it('builds registry-term rows with the authored meaning fallback', () => {
    expect(buildRegistryTermInspectableItemRows({
      meaningInLaw: null,
      registryInterpretation: 'Registry interpretation.',
      whyRegistryOnly: 'Why registry only.',
    })).toEqual([
      {
        label: 'Meaning in law',
        value: REGISTRY_MEANING_IN_LAW_FALLBACK,
      },
      {
        label: 'Registry interpretation',
        value: 'Registry interpretation.',
      },
      {
        label: 'Why registry-only',
        value: 'Why registry only.',
      },
    ]);
  });

  it('keeps core-concept rows free of registry-term labels', () => {
    const rows = buildCoreConceptInspectableItemRows({
      shortDefinition: 'Short definition.',
      coreMeaning: 'Core meaning.',
      fullDefinition: 'Full definition.',
    });

    expect(rows.map((row) => row.label)).toEqual(CORE_CONCEPT_LABELS);
    expect(rows.some((row) => REGISTRY_TERM_LABELS.includes(row.label as (typeof REGISTRY_TERM_LABELS)[number]))).toBe(false);
  });

  it('keeps registry-term rows free of core-concept labels', () => {
    const rows = buildRegistryTermInspectableItemRows({
      meaningInLaw: 'Meaning in law.',
      registryInterpretation: 'Registry interpretation.',
      whyRegistryOnly: 'Why registry only.',
    });

    expect(rows.map((row) => row.label)).toEqual(REGISTRY_TERM_LABELS);
    expect(rows.some((row) => CORE_CONCEPT_LABELS.includes(row.label as (typeof CORE_CONCEPT_LABELS)[number]))).toBe(false);
  });

  it('keeps the toggle label stable across expansion states', () => {
    expect(inspectableItemDisclosureToggleLabel(false)).toBe('View meaning');
    expect(inspectableItemDisclosureToggleLabel(true)).toBe('Hide meaning');
  });
});

describe('InspectableItemDisclosure component template', () => {
  it('switches rendering by item type and stays inline', () => {
    const template = readFileSync(new URL('./inspectable-item-disclosure.component.html', import.meta.url), 'utf8');
    const styles = readFileSync(new URL('./inspectable-item-disclosure.component.css', import.meta.url), 'utf8');
    const coreBlock = extractTemplateCaseBlock(template, 'core_concept');
    const registryBlock = extractTemplateCaseBlock(template, 'registry_term');

    expect(template).toContain('@switch (itemType())');
    expect(template).toContain('Short definition');
    expect(template).toContain('Meaning in law');
    expect(template).toContain('aria-expanded');
    expect(template).toContain('View meaning');
    expect(template).toContain('Hide meaning');
    expect(styles).toContain('.pdm-inspectable-disclosure');
    expect(coreBlock).toContain('Short definition');
    expect(coreBlock).toContain('Core meaning');
    expect(coreBlock).toContain('Full definition');
    expect(coreBlock).not.toContain('Meaning in law');
    expect(coreBlock).not.toContain('Registry interpretation');
    expect(coreBlock).not.toContain('Why registry-only');
    expect(registryBlock).toContain('Meaning in law');
    expect(registryBlock).toContain('Registry interpretation');
    expect(registryBlock).toContain('Why registry-only');
    expect(registryBlock).not.toContain('Short definition');
    expect(registryBlock).not.toContain('Core meaning');
    expect(registryBlock).not.toContain('Full definition');
  });
});
