import type { PolicyClaimLifecycle } from '../src/app/policies/policy-surface.types.ts';

export interface PolicyLifecycleTraceRow {
  policyFile: string;
  section: string;
  policySentence: string;
  claimClass: string;
  notes: string;
}

const FEEDBACK_EVENT_STORAGE_SECTION_PREFIX = 'Data Storage — Feedback event fields';
const BROWSER_SESSION_STORAGE_SECTION = 'Data Storage — Browser local storage';
const DATA_RETENTION_POLICY_FILE = 'data-retention.md';

const FEEDBACK_EVENT_STORAGE_LIFECYCLE: PolicyClaimLifecycle = {
  lifecycleClass: 'short_lived',
  ttlDays: 30,
  retentionReason:
    'Declared short-lived retention window for feedback event review and contract calibration.',
  deletionTrigger: 'ttl_expiry',
  enforcementStatus: 'declared_only',
  storageForm: 'plaintext',
  controls: {
    exportBy: 'sessionId',
    deleteBy: 'sessionId',
    auditTrail: 'whitelist_only_operational_metadata',
  },
};

const BROWSER_SESSION_STORAGE_LIFECYCLE: PolicyClaimLifecycle = {
  lifecycleClass: 'session_bound',
  retentionReason: 'Declared browser-scoped session continuity for the feedback flow.',
  deletionTrigger: 'browser_clear',
  enforcementStatus: 'declared_only',
  storageForm: 'plaintext',
};

const INTERNAL_TRANSPORT_LIFECYCLE: PolicyClaimLifecycle = {
  lifecycleClass: 'transport_only',
  retentionReason: 'Declared request-bound SSR transport within the product boundary.',
  deletionTrigger: 'request_complete',
  enforcementStatus: 'declared_only',
};

const NOT_APPLICABLE_LIFECYCLE: PolicyClaimLifecycle = {
  lifecycleClass: 'not_applicable',
  deletionTrigger: 'not_stored',
  enforcementStatus: 'declared_only',
};

export function resolvePolicyClaimLifecycle(row: PolicyLifecycleTraceRow): PolicyClaimLifecycle {
  if (row.claimClass === 'stores') {
    return resolveStoresLifecycle(row);
  }

  if (hasInternalTransportNote(row)) {
    return INTERNAL_TRANSPORT_LIFECYCLE;
  }

  return NOT_APPLICABLE_LIFECYCLE;
}

export function validatePolicyClaimLifecycle(
  row: PolicyLifecycleTraceRow,
  lifecycle: PolicyClaimLifecycle,
): void {
  const errors: string[] = [];

  if (lifecycle.enforcementStatus !== 'declared_only') {
    errors.push(
      `Policy claim lifecycle must remain declared_only in F.1: ${describePolicyTraceRow(row)}`,
    );
  }

  switch (lifecycle.lifecycleClass) {
    case 'short_lived':
      if (!Number.isInteger(lifecycle.ttlDays) || lifecycle.ttlDays <= 0) {
        errors.push(`short_lived lifecycle requires ttlDays: ${describePolicyTraceRow(row)}`);
      }

      if (lifecycle.deletionTrigger !== 'ttl_expiry') {
        errors.push(
          `short_lived lifecycle must use ttl_expiry deletionTrigger: ${describePolicyTraceRow(row)}`,
        );
      }

      if (!lifecycle.retentionReason) {
        errors.push(`short_lived lifecycle requires retentionReason: ${describePolicyTraceRow(row)}`);
      }

      if (!lifecycle.storageForm) {
        errors.push(`short_lived lifecycle requires storageForm: ${describePolicyTraceRow(row)}`);
      }

      validateFeedbackSessionControls(row, lifecycle, errors);
      break;

    case 'session_bound':
      if (lifecycle.ttlDays !== undefined) {
        errors.push(`session_bound lifecycle must omit ttlDays: ${describePolicyTraceRow(row)}`);
      }

      if (lifecycle.deletionTrigger !== 'browser_clear') {
        errors.push(
          `session_bound lifecycle must use browser_clear deletionTrigger: ${describePolicyTraceRow(row)}`,
        );
      }

      if (!lifecycle.retentionReason) {
        errors.push(`session_bound lifecycle requires retentionReason: ${describePolicyTraceRow(row)}`);
      }

      if (!lifecycle.storageForm) {
        errors.push(`session_bound lifecycle requires storageForm: ${describePolicyTraceRow(row)}`);
      }

      if (lifecycle.controls !== undefined) {
        errors.push(`session_bound lifecycle must omit controls: ${describePolicyTraceRow(row)}`);
      }
      break;

    case 'transport_only':
      if (lifecycle.ttlDays !== undefined) {
        errors.push(`transport_only lifecycle must omit ttlDays: ${describePolicyTraceRow(row)}`);
      }

      if (lifecycle.deletionTrigger !== 'request_complete') {
        errors.push(
          `transport_only lifecycle must use request_complete deletionTrigger: ${describePolicyTraceRow(row)}`,
        );
      }

      if (!lifecycle.retentionReason) {
        errors.push(`transport_only lifecycle requires retentionReason: ${describePolicyTraceRow(row)}`);
      }

      if (lifecycle.controls !== undefined) {
        errors.push(`transport_only lifecycle must omit controls: ${describePolicyTraceRow(row)}`);
      }
      break;

    case 'persistent':
      if (lifecycle.ttlDays !== undefined) {
        errors.push(`persistent lifecycle must omit ttlDays: ${describePolicyTraceRow(row)}`);
      }

      if (lifecycle.deletionTrigger !== 'manual_delete') {
        errors.push(
          `persistent lifecycle must use manual_delete deletionTrigger: ${describePolicyTraceRow(row)}`,
        );
      }

      if (!lifecycle.retentionReason) {
        errors.push(`persistent lifecycle requires retentionReason: ${describePolicyTraceRow(row)}`);
      }

      if (!lifecycle.storageForm) {
        errors.push(`persistent lifecycle requires storageForm: ${describePolicyTraceRow(row)}`);
      }

      if (lifecycle.controls !== undefined) {
        errors.push(`persistent lifecycle must omit controls: ${describePolicyTraceRow(row)}`);
      }
      break;

    case 'not_applicable':
      if (lifecycle.ttlDays !== undefined) {
        errors.push(`not_applicable lifecycle must omit ttlDays: ${describePolicyTraceRow(row)}`);
      }

      if (lifecycle.deletionTrigger !== 'not_stored') {
        errors.push(
          `not_applicable lifecycle must use not_stored deletionTrigger: ${describePolicyTraceRow(row)}`,
        );
      }

      if (lifecycle.storageForm !== undefined) {
        errors.push(`not_applicable lifecycle must omit storageForm: ${describePolicyTraceRow(row)}`);
      }

      if (lifecycle.controls !== undefined) {
        errors.push(`not_applicable lifecycle must omit controls: ${describePolicyTraceRow(row)}`);
      }
      break;
  }

  if (row.claimClass === 'stores') {
    if (
      lifecycle.lifecycleClass !== 'short_lived'
      && lifecycle.lifecycleClass !== 'session_bound'
      && lifecycle.lifecycleClass !== 'persistent'
    ) {
      errors.push(
        `stores claim lifecycle must be storage-oriented: ${describePolicyTraceRow(row)}`,
      );
    }

    if (lifecycle.storageForm !== 'plaintext' && lifecycle.storageForm !== 'sha256') {
      errors.push(`stores claim lifecycle must declare storageForm: ${describePolicyTraceRow(row)}`);
    }
  } else if (hasInternalTransportNote(row)) {
    if (lifecycle.lifecycleClass !== 'transport_only') {
      errors.push(
        `internal SSR transport claim must resolve to transport_only lifecycle: ${describePolicyTraceRow(row)}`,
      );
    }

    if (lifecycle.storageForm !== undefined) {
      errors.push(`transport_only lifecycle must omit storageForm: ${describePolicyTraceRow(row)}`);
    }
  } else if (lifecycle.lifecycleClass !== 'not_applicable') {
    errors.push(
      `non-storage claim without internal transport note must resolve to not_applicable lifecycle: ${describePolicyTraceRow(row)}`,
    );
  } else if (lifecycle.storageForm !== undefined) {
    errors.push(
      `non-storage claim without internal transport note must omit storageForm: ${describePolicyTraceRow(row)}`,
    );
  } else if (lifecycle.controls !== undefined) {
    errors.push(
      `non-storage claim without internal transport note must omit controls: ${describePolicyTraceRow(row)}`,
    );
  }

  if (errors.length > 0) {
    throw new Error(errors.join('\n'));
  }
}

function resolveStoresLifecycle(row: PolicyLifecycleTraceRow): PolicyClaimLifecycle {
  // Current rendered storage claims are limited to feedback event documents and
  // browser-local session storage. Any new stores claim must be mapped here
  // explicitly so the generator fails closed instead of inventing semantics.
  if (isFeedbackEventStoresClaim(row)) {
    if (storesHashedFeedbackQueryField(row.policySentence)) {
      return {
        ...FEEDBACK_EVENT_STORAGE_LIFECYCLE,
        storageForm: 'sha256',
      };
    }

    return FEEDBACK_EVENT_STORAGE_LIFECYCLE;
  }

  if (isBrowserSessionStorageClaim(row)) {
    return BROWSER_SESSION_STORAGE_LIFECYCLE;
  }

  throw new Error(`Missing lifecycle metadata for stores claim: ${describePolicyTraceRow(row)}`);
}

function isFeedbackEventStoresClaim(row: PolicyLifecycleTraceRow): boolean {
  if (
    row.policyFile === 'privacy.md'
    && row.section.startsWith(FEEDBACK_EVENT_STORAGE_SECTION_PREFIX)
  ) {
    return true;
  }

  if (row.policyFile !== DATA_RETENTION_POLICY_FILE) {
    return false;
  }

  return /stores `[^`]+` in feedback event documents/.test(row.policySentence);
}

function isBrowserSessionStorageClaim(row: PolicyLifecycleTraceRow): boolean {
  if (row.policyFile === 'privacy.md' && row.section === BROWSER_SESSION_STORAGE_SECTION) {
    return true;
  }

  if (row.policyFile !== DATA_RETENTION_POLICY_FILE) {
    return false;
  }

  return row.policySentence.includes('browser local storage');
}

function storesHashedFeedbackQueryField(policySentence: string): boolean {
  return policySentence.includes('`rawQuery`') || policySentence.includes('`normalizedQuery`');
}

function hasInternalTransportNote(row: PolicyLifecycleTraceRow): boolean {
  return row.notes.toLowerCase().includes('internal ssr transport only');
}

function describePolicyTraceRow(row: PolicyLifecycleTraceRow): string {
  return `${row.policyFile} :: ${row.section} :: ${row.policySentence}`;
}

function validateFeedbackSessionControls(
  row: PolicyLifecycleTraceRow,
  lifecycle: PolicyClaimLifecycle,
  errors: string[],
): void {
  if (!isFeedbackEventStoresRow(row)) {
    if (lifecycle.controls !== undefined) {
      errors.push(
        `non-feedback stores claim must omit controls: ${describePolicyTraceRow(row)}`,
      );
    }

    return;
  }

  if (!lifecycle.controls) {
    errors.push(`feedback-event stores claim requires controls: ${describePolicyTraceRow(row)}`);
    return;
  }

  if (lifecycle.controls.exportBy !== 'sessionId') {
    errors.push(
      `feedback-event stores claim must declare exportBy sessionId: ${describePolicyTraceRow(row)}`,
    );
  }

  if (lifecycle.controls.deleteBy !== 'sessionId') {
    errors.push(
      `feedback-event stores claim must declare deleteBy sessionId: ${describePolicyTraceRow(row)}`,
    );
  }

  if (lifecycle.controls.auditTrail !== 'whitelist_only_operational_metadata') {
    errors.push(
      `feedback-event stores claim must declare whitelist-only audit trail controls: ${describePolicyTraceRow(row)}`,
    );
  }
}

function isFeedbackEventStoresRow(row: PolicyLifecycleTraceRow): boolean {
  return row.claimClass === 'stores' && isFeedbackEventStoresClaim(row);
}
