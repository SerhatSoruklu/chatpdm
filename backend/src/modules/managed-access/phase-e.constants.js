'use strict';

const PHASE_E_REVIEW_STATUSES = Object.freeze([
  'queued',
  'under_review',
  'decision_recorded',
]);

const PHASE_E_DECISION_OUTCOMES = Object.freeze([
  'approved',
  'rejected',
  'needs_more_information',
  'pilot_only',
  'private_runtime_candidate',
]);

const PHASE_E_TRUST_TIERS = Object.freeze([
  'pending_review',
  'standard',
  'elevated',
  'pilot_only',
  'private_runtime_candidate',
]);

const PHASE_E_DEPLOYMENT_MODES = Object.freeze([
  'shared_hosted_kernel',
  'dedicated_pm2_app',
  'dedicated_sector_node',
  'future_private_runtime_handoff',
]);

const PHASE_E_ASSIGNMENT_STATUSES = Object.freeze([
  'draft',
  'assigned',
  'superseded',
]);

const PHASE_E_SUBDOMAIN_SOURCES = Object.freeze([
  'derived_from_company_domain',
  'deterministic_collision_suffix',
  'manual_override',
]);

const PHASE_E_RUNTIME_ISOLATION_LEVELS = Object.freeze([
  'shared_process',
  'dedicated_process',
  'dedicated_node',
  'private_runtime_reserved',
]);

const PHASE_E_PROVISIONING_JOB_TYPES = Object.freeze([
  'hosted_runtime_provisioning',
]);

const PHASE_E_PROVISIONING_JOB_STATUSES = Object.freeze([
  'queued',
  'running',
  'failed',
  'succeeded',
  'cancelled',
]);

const PHASE_E_HEALTH_CHECK_RESULTS = Object.freeze([
  'not_run',
  'passing',
  'failing',
]);

const PHASE_E_WORKSPACE_STATUSES = Object.freeze([
  'pending_activation',
  'active',
  'suspended',
  'handoff_pending',
]);

const PHASE_E_PILOT_STATUSES = Object.freeze([
  'pending',
  'active',
  'paused',
  'completed',
]);

const PHASE_E_UPGRADE_PATHS = Object.freeze([
  'shared_hosted_kernel',
  'dedicated_pm2_app_candidate',
  'future_private_runtime_handoff',
]);

const PHASE_E_EVIDENCE_EVENT_TYPES = Object.freeze([
  'review_decision_recorded',
  'deployment_assignment_recorded',
  'provisioning_job_queued',
  'provisioning_job_started',
  'provisioning_job_failed',
  'provisioning_job_succeeded',
  'workspace_activation_recorded',
  'workspace_handoff_recorded',
]);

module.exports = {
  PHASE_E_ASSIGNMENT_STATUSES,
  PHASE_E_DECISION_OUTCOMES,
  PHASE_E_DEPLOYMENT_MODES,
  PHASE_E_EVIDENCE_EVENT_TYPES,
  PHASE_E_HEALTH_CHECK_RESULTS,
  PHASE_E_PILOT_STATUSES,
  PHASE_E_PROVISIONING_JOB_STATUSES,
  PHASE_E_PROVISIONING_JOB_TYPES,
  PHASE_E_REVIEW_STATUSES,
  PHASE_E_RUNTIME_ISOLATION_LEVELS,
  PHASE_E_SUBDOMAIN_SOURCES,
  PHASE_E_TRUST_TIERS,
  PHASE_E_UPGRADE_PATHS,
  PHASE_E_WORKSPACE_STATUSES,
};
