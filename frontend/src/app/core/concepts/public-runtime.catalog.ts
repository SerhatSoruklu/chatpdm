export const LIVE_RUNTIME_CONCEPT_IDS = Object.freeze([
  'authority',
  'power',
  'legitimacy',
  'duty',
  'responsibility',
]);

export const REVIEWED_CONCEPT_IDS = Object.freeze([
  'law',
]);

export const DETAIL_BACKED_CONCEPT_IDS = Object.freeze([
  'law',
]);

export const RUNTIME_SCOPE_BY_CONCEPT = Object.freeze<Record<string, string>>({
  authority: 'Governance v1',
  power: 'Governance v1',
  legitimacy: 'Governance v1',
  duty: 'Governance v1',
  responsibility: 'Core abstractions v1',
});
