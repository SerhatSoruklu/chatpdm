export type ReadingLensMode = 'standard' | 'simplified' | 'formal';

export interface ReadingLensOption {
  mode: ReadingLensMode;
  label: string;
}

// Mirror of the 12.8C.0 release gate values for UI use.
export const READING_LENS_TRUST_COPY = 'Same canonical meaning. Different reading register.';
export const READING_LENS_FALLBACK_COPY =
  'Additional reading registers are not available on this concept surface. The canonical meaning below remains the active surface.';
export const CANONICAL_VISUAL_ANCHOR_HASH_LENGTH = 12;
export const READING_LENS_OPTIONS: ReadingLensOption[] = [
  { mode: 'standard', label: 'Standard' },
  { mode: 'simplified', label: 'Simplified' },
  { mode: 'formal', label: 'Formal' },
];
