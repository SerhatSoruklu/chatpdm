'use strict';

const MANAGED_ACCESS_VERIFICATION_METHODS = Object.freeze([
  'work_email',
  'dns_txt',
  'website_file',
]);

const MANAGED_ACCESS_INDUSTRIES = Object.freeze([
  'banking_financial_services',
  'healthcare',
  'legal',
  'insurance',
  'education',
  'standards_certification',
  'government_public_sector',
  'enterprise_policy_compliance',
  'other',
]);

const MANAGED_ACCESS_DEPLOYMENT_PREFERENCES = Object.freeze([
  'hosted_by_chatpdm',
  'private_runtime_later',
  'exploring_options',
]);

const MANAGED_ACCESS_VERIFICATION_STATES = Object.freeze([
  'pending',
  'verified',
  'failed',
  'expired',
]);

const MANAGED_ACCESS_STATUSES = Object.freeze({
  pendingEmailVerification: 'pending_email_verification',
  pendingDnsVerification: 'pending_dns_verification',
  pendingWebsiteFileVerification: 'pending_website_file_verification',
  underTrustReview: 'under_trust_review',
  verificationExpired: 'verification_expired',
});

const MANAGED_ACCESS_TRUST_LEVELS = Object.freeze([
  'managed_access_pending',
  'work_email_verified',
  'stronger_organization_proof',
]);

const MANAGED_ACCESS_EVIDENCE_EVENT_TYPES = Object.freeze([
  'request_created',
  'email_verification_sent',
  'email_verified',
  'email_verification_expired',
  'dns_challenge_created',
  'dns_verification_checked',
  'dns_verified',
  'dns_verification_expired',
  'website_file_challenge_created',
  'website_file_verification_checked',
  'website_file_verified',
  'website_file_verification_expired',
]);

module.exports = {
  MANAGED_ACCESS_DEPLOYMENT_PREFERENCES,
  MANAGED_ACCESS_EVIDENCE_EVENT_TYPES,
  MANAGED_ACCESS_INDUSTRIES,
  MANAGED_ACCESS_STATUSES,
  MANAGED_ACCESS_TRUST_LEVELS,
  MANAGED_ACCESS_VERIFICATION_METHODS,
  MANAGED_ACCESS_VERIFICATION_STATES,
};
