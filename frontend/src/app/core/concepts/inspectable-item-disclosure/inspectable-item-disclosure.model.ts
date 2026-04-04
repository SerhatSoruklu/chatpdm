export type InspectableItemType = 'core_concept' | 'registry_term';

export interface InspectableItemDisclosureCoreData {
  readonly shortDefinition: string;
  readonly coreMeaning: string;
  readonly fullDefinition: string;
}

export interface InspectableItemDisclosureCoreSource {
  readonly shortDefinition: string | null;
  readonly coreMeaning: string | null;
  readonly fullDefinition: string | null;
}

export interface InspectableItemDisclosureRegistryData {
  readonly meaningInLaw: string | null;
  readonly registryInterpretation: string;
  readonly whyRegistryOnly: string;
}

export type InspectableItemDisclosureData =
  | InspectableItemDisclosureCoreData
  | InspectableItemDisclosureRegistryData;

export interface InspectableItemDisclosureRow {
  readonly label: string;
  readonly value: string;
}

export const REGISTRY_MEANING_IN_LAW_FALLBACK =
  'No term-specific meaning in law has been authored yet.';

export function buildInspectableItemDisclosureCoreData(
  semanticData: InspectableItemDisclosureCoreSource,
): InspectableItemDisclosureCoreData | null {
  if (
    !semanticData.shortDefinition
    || !semanticData.coreMeaning
    || !semanticData.fullDefinition
  ) {
    return null;
  }

  return {
    shortDefinition: semanticData.shortDefinition,
    coreMeaning: semanticData.coreMeaning,
    fullDefinition: semanticData.fullDefinition,
  };
}

export function isCoreConceptInspectableItemData(
  semanticData: InspectableItemDisclosureData,
): semanticData is InspectableItemDisclosureCoreData {
  return 'shortDefinition' in semanticData;
}

export function isRegistryTermInspectableItemData(
  semanticData: InspectableItemDisclosureData,
): semanticData is InspectableItemDisclosureRegistryData {
  return 'meaningInLaw' in semanticData;
}

export function buildCoreConceptInspectableItemRows(
  semanticData: InspectableItemDisclosureCoreData,
): readonly InspectableItemDisclosureRow[] {
  return [
    {
      label: 'Short definition',
      value: semanticData.shortDefinition,
    },
    {
      label: 'Core meaning',
      value: semanticData.coreMeaning,
    },
    {
      label: 'Full definition',
      value: semanticData.fullDefinition,
    },
  ];
}

export function buildRegistryTermInspectableItemRows(
  semanticData: InspectableItemDisclosureRegistryData,
): readonly InspectableItemDisclosureRow[] {
  return [
    {
      label: 'Meaning in law',
      value: semanticData.meaningInLaw && semanticData.meaningInLaw.length > 0
        ? semanticData.meaningInLaw
        : REGISTRY_MEANING_IN_LAW_FALLBACK,
    },
    {
      label: 'Registry interpretation',
      value: semanticData.registryInterpretation,
    },
    {
      label: 'Why registry-only',
      value: semanticData.whyRegistryOnly,
    },
  ];
}

export function inspectableItemDisclosureToggleLabel(isExpanded: boolean): string {
  return isExpanded ? 'Hide meaning' : 'View meaning';
}
