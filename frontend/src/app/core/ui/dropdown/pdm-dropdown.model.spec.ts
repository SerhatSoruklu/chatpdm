import { describe, expect, it } from 'vitest';

import {
  resolvePdmDropdownActiveIndex,
  resolvePdmDropdownNextIndex,
  resolvePdmDropdownSelectedOption,
  type PdmDropdownOption,
} from './pdm-dropdown.model';

const OPTIONS: readonly PdmDropdownOption[] = [
  { value: 12, label: '12' },
  { value: 24, label: '24' },
  { value: 48, label: '48' },
  { value: 96, label: '96', disabled: true },
];

describe('PdmDropdown helpers', () => {
  it('resolves the selected option by value', () => {
    expect(resolvePdmDropdownSelectedOption(OPTIONS, 24)).toEqual({ value: 24, label: '24' });
  });

  it('falls back to the first enabled option when no selected value matches', () => {
    expect(resolvePdmDropdownActiveIndex(OPTIONS, 999)).toBe(0);
  });

  it('keeps keyboard navigation deterministic', () => {
    expect(resolvePdmDropdownNextIndex(0, 'ArrowDown', OPTIONS)).toBe(1);
    expect(resolvePdmDropdownNextIndex(0, 'ArrowUp', OPTIONS)).toBe(2);
    expect(resolvePdmDropdownNextIndex(2, 'Home', OPTIONS)).toBe(0);
    expect(resolvePdmDropdownNextIndex(2, 'End', OPTIONS)).toBe(2);
  });
});
