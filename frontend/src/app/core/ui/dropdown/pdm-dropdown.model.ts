export type PdmDropdownValue = string | number;

export interface PdmDropdownOption {
  readonly value: PdmDropdownValue;
  readonly label: string;
  readonly description?: string | null;
  readonly disabled?: boolean;
}

export function resolvePdmDropdownSelectedOption(
  options: readonly PdmDropdownOption[],
  selectedValue: PdmDropdownValue | null | undefined,
): PdmDropdownOption | null {
  if (selectedValue === null || selectedValue === undefined) {
    return null;
  }

  return options.find((option) => option.value === selectedValue) ?? null;
}

export function resolvePdmDropdownActiveIndex(
  options: readonly PdmDropdownOption[],
  selectedValue: PdmDropdownValue | null | undefined,
): number {
  if (options.length === 0) {
    return -1;
  }

  const selectedIndex = options.findIndex((option) => option.value === selectedValue);
  if (selectedIndex >= 0) {
    return selectedIndex;
  }

  const firstEnabledIndex = options.findIndex((option) => !option.disabled);
  return firstEnabledIndex >= 0 ? firstEnabledIndex : 0;
}

export function resolvePdmDropdownNextIndex(
  currentIndex: number,
  key: string,
  options: readonly PdmDropdownOption[],
): number {
  if (options.length === 0) {
    return -1;
  }

  const safeIndex = Number.isInteger(currentIndex) && currentIndex >= 0
    ? currentIndex
    : 0;

  switch (key) {
    case 'ArrowDown':
      for (let offset = 1; offset <= options.length; offset += 1) {
        const index = (safeIndex + offset) % options.length;
        if (!options[index]?.disabled) {
          return index;
        }
      }
      return safeIndex;
    case 'ArrowUp':
      for (let offset = 1; offset <= options.length; offset += 1) {
        const index = (safeIndex - offset + options.length) % options.length;
        if (!options[index]?.disabled) {
          return index;
        }
      }
      return safeIndex;
    case 'Home':
      {
        const firstEnabledIndex = options.findIndex((option) => !option.disabled);
        return firstEnabledIndex >= 0 ? firstEnabledIndex : safeIndex;
      }
    case 'End':
      for (let index = options.length - 1; index >= 0; index -= 1) {
        if (!options[index]?.disabled) {
          return index;
        }
      }
      return safeIndex;
    default:
      return safeIndex;
  }
}
