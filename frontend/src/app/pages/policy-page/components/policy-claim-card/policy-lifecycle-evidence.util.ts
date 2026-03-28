import type {
  PolicyClaim,
  PolicyClaimDeletionTrigger,
  PolicyClaimLifecycle,
  PolicyClaimLifecycleClass,
  PolicyClaimStorageForm,
} from '../../../../policies/policy-surface.types';

export interface PolicyLifecycleEvidenceItem {
  label: string;
  value: string;
}

export interface PolicyLifecycleEvidence {
  evidenceLabel: string;
  title: string;
  items: readonly PolicyLifecycleEvidenceItem[];
}

const TRACEABILITY_LABEL = 'TRACEABILITY SNAPSHOT — NOT RUNTIME ASSURANCE';

export function getPolicyLifecycleEvidence(claim: PolicyClaim): PolicyLifecycleEvidence | null {
  const lifecycle = claim.lifecycle;

  if (lifecycle.lifecycleClass === 'not_applicable') {
    return null;
  }

  const items: PolicyLifecycleEvidenceItem[] = [
    {
      label: 'Lifecycle',
      value: formatLifecycleClass(lifecycle.lifecycleClass),
    },
    {
      label: 'Deletion trigger',
      value: formatDeletionTrigger(lifecycle.deletionTrigger),
    },
  ];

  if (lifecycle.ttlDays !== undefined) {
    items.push({
      label: 'Retention window',
      value: `${lifecycle.ttlDays} days`,
    });
  }

  if (lifecycle.storageForm) {
    items.push({
      label: 'Stored form',
      value: formatStorageForm(lifecycle.storageForm),
    });
  }

  if (lifecycle.controls?.exportBy === 'sessionId' && lifecycle.controls?.deleteBy === 'sessionId') {
    items.push({
      label: 'Feedback controls',
      value: 'export and delete by sessionId',
    });
  }

  if (lifecycle.controls?.auditTrail === 'whitelist_only_operational_metadata') {
    items.push({
      label: 'Audit trail',
      value: 'whitelist-only operational metadata',
    });
  }

  return {
    evidenceLabel: TRACEABILITY_LABEL,
    title: getPolicyLifecycleEvidenceTitle(lifecycle),
    items,
  };
}

function getPolicyLifecycleEvidenceTitle(lifecycle: PolicyClaimLifecycle): string {
  switch (lifecycle.lifecycleClass) {
    case 'short_lived':
      return 'Lifecycle evidence';
    case 'session_bound':
      return 'Browser storage evidence';
    case 'transport_only':
      return 'Transport evidence';
    case 'persistent':
      return 'Lifecycle evidence';
    case 'not_applicable':
      return 'Lifecycle evidence';
  }
}

function formatLifecycleClass(value: PolicyClaimLifecycleClass): string {
  switch (value) {
    case 'short_lived':
      return 'short-lived storage';
    case 'session_bound':
      return 'session-bound browser storage';
    case 'transport_only':
      return 'request-bound internal transport';
    case 'persistent':
      return 'persistent storage';
    case 'not_applicable':
      return 'not applicable';
  }
}

function formatDeletionTrigger(value: PolicyClaimDeletionTrigger): string {
  switch (value) {
    case 'ttl_expiry':
      return 'TTL expiry';
    case 'browser_clear':
      return 'browser clear';
    case 'request_complete':
      return 'request complete';
    case 'manual_delete':
      return 'manual delete';
    case 'not_stored':
      return 'not stored';
  }
}

function formatStorageForm(value: PolicyClaimStorageForm): string {
  switch (value) {
    case 'plaintext':
      return 'plaintext';
    case 'sha256':
      return 'sha256 digest only';
  }
}
