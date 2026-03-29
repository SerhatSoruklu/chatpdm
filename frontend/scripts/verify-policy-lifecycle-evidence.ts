import assert from 'node:assert/strict';

import { POLICY_SURFACE_DATA } from '../src/app/policies/policy-surface.data.ts';
import { getPolicyLifecycleEvidence } from '../src/app/pages/policy-page/components/policy-claim-card/policy-lifecycle-evidence.util.ts';

function main(): void {
  const shortLivedFeedbackClaim = findClaim('privacy', 'privacy-2');
  const shortLivedEvidence = getPolicyLifecycleEvidence(shortLivedFeedbackClaim);

  assert.ok(shortLivedEvidence, 'Expected lifecycle evidence for feedback-event stores claim privacy-2.');
  assert.equal(
    shortLivedEvidence.evidenceLabel,
    'TRACEABILITY SNAPSHOT — NOT RUNTIME ASSURANCE',
    'Feedback claim evidence must keep the explicit traceability-only label.',
  );
  assert.equal(shortLivedEvidence.title, 'Lifecycle evidence');
  assert.deepEqual(
    shortLivedEvidence.items,
    [
      { label: 'Lifecycle', value: 'short-lived storage' },
      { label: 'Deletion trigger', value: 'TTL expiry' },
      { label: 'Retention window', value: '30 days' },
      { label: 'Stored form', value: 'sha256 digest only' },
      { label: 'Feedback controls', value: 'export and delete by sessionId' },
      { label: 'Audit trail', value: 'whitelist-only operational metadata' },
    ],
    'Feedback lifecycle evidence must render the live generated short-lived controls.',
  );

  const transportClaim = findClaim('cookies', 'cookies-1');
  const transportEvidence = getPolicyLifecycleEvidence(transportClaim);

  assert.ok(transportEvidence, 'Expected lifecycle evidence for internal SSR transport claim cookies-1.');
  assert.equal(transportEvidence.title, 'Transport evidence');
  assert.deepEqual(
    transportEvidence.items,
    [
      { label: 'Lifecycle', value: 'request-bound internal transport' },
      { label: 'Deletion trigger', value: 'request complete' },
    ],
    'Transport claims must stay request-bound and must not show storage or feedback controls.',
  );

  const dataRetentionFeedbackClaim = findClaim('data-retention', 'data-retention-4');
  const dataRetentionEvidence = getPolicyLifecycleEvidence(dataRetentionFeedbackClaim);

  assert.ok(
    dataRetentionEvidence,
    'Expected lifecycle evidence for feedback-event stores claim data-retention-4.',
  );
  assert.equal(dataRetentionEvidence.title, 'Lifecycle evidence');
  assert.deepEqual(
    dataRetentionEvidence.items,
    [
      { label: 'Lifecycle', value: 'short-lived storage' },
      { label: 'Deletion trigger', value: 'TTL expiry' },
      { label: 'Retention window', value: '30 days' },
      { label: 'Stored form', value: 'sha256 digest only' },
      { label: 'Feedback controls', value: 'export and delete by sessionId' },
      { label: 'Audit trail', value: 'whitelist-only operational metadata' },
    ],
    'Data-retention feedback lifecycle evidence must stay aligned with the live short-lived contract.',
  );

  const nonLifecycleClaim = findClaim('terms', 'terms-1');
  const nonLifecycleEvidence = getPolicyLifecycleEvidence(nonLifecycleClaim);

  assert.equal(
    nonLifecycleEvidence,
    null,
    'Non-storage claims without lifecycle relevance must not render lifecycle evidence blocks.',
  );

  console.log('PASS policy_lifecycle_evidence');
}

function findClaim(
  surfaceKey: keyof typeof POLICY_SURFACE_DATA,
  claimId: string,
) {
  const claim = POLICY_SURFACE_DATA[surfaceKey].claims.find((entry) => entry.id === claimId);

  assert.ok(claim, `Missing claim ${claimId} in generated policy surface ${surfaceKey}.`);

  return claim;
}

main();
