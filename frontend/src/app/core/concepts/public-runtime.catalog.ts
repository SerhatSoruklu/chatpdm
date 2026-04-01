import conceptAdmissionState from '../../../../../data/concepts/concept-admission-state.json';

interface ConceptAdmissionStateRecord {
  liveConceptIds: string[];
  visibleOnlyPublicConceptIds: string[];
  rejectedConceptIds: string[];
  detailBackedConceptIds: string[];
}

const ADMISSION_STATE = conceptAdmissionState as ConceptAdmissionStateRecord;

export const LIVE_RUNTIME_CONCEPT_IDS = Object.freeze([
  ...ADMISSION_STATE.liveConceptIds,
]);

export const REVIEW_STATE_VISIBLE_CONCEPT_IDS = Object.freeze<string[]>([]);

export const VISIBLE_ONLY_PUBLIC_CONCEPT_IDS = Object.freeze([
  ...ADMISSION_STATE.visibleOnlyPublicConceptIds,
]);

export const REJECTED_CONCEPT_IDS = Object.freeze([
  ...ADMISSION_STATE.rejectedConceptIds,
]);

export const REVIEWED_CONCEPT_IDS = REVIEW_STATE_VISIBLE_CONCEPT_IDS;

export const DETAIL_BACKED_CONCEPT_IDS = Object.freeze([
  ...ADMISSION_STATE.detailBackedConceptIds,
]);

const LIVE_RUNTIME_CONCEPT_ID_SET = new Set(LIVE_RUNTIME_CONCEPT_IDS);
const VISIBLE_ONLY_PUBLIC_CONCEPT_ID_SET = new Set(VISIBLE_ONLY_PUBLIC_CONCEPT_IDS);
const REJECTED_CONCEPT_ID_SET = new Set(REJECTED_CONCEPT_IDS);
const DETAIL_BACKED_CONCEPT_ID_SET = new Set(DETAIL_BACKED_CONCEPT_IDS);

export function isLiveRuntimeConceptId(conceptId: string): boolean {
  return LIVE_RUNTIME_CONCEPT_ID_SET.has(conceptId);
}

export function isVisibleOnlyPublicConceptId(conceptId: string): boolean {
  return VISIBLE_ONLY_PUBLIC_CONCEPT_ID_SET.has(conceptId);
}

export function isRejectedConceptId(conceptId: string): boolean {
  return REJECTED_CONCEPT_ID_SET.has(conceptId);
}

export function isDetailBackedConceptId(conceptId: string): boolean {
  return DETAIL_BACKED_CONCEPT_ID_SET.has(conceptId);
}

export const RUNTIME_SCOPE_BY_CONCEPT = Object.freeze<Record<string, string>>({
  authority: 'Governance v1',
  power: 'Governance v1',
  legitimacy: 'Governance v1',
  law: 'Governance v1',
  duty: 'Governance v1',
  violation: 'Derived duty-failure surface',
  responsibility: 'Core abstractions v1',
  agreement: 'Interaction v2',
});
