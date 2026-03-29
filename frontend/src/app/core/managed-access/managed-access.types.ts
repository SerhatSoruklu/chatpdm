export type ManagedAccessVerificationMethodId = 'work_email' | 'dns_txt' | 'website_file';

export type ManagedAccessIndustryOptionId =
  | 'banking_financial_services'
  | 'healthcare'
  | 'legal'
  | 'insurance'
  | 'education'
  | 'standards_certification'
  | 'government_public_sector'
  | 'enterprise_policy_compliance'
  | 'other';

export type ManagedAccessDeploymentPreferenceId =
  | 'hosted_by_chatpdm'
  | 'private_runtime_later'
  | 'exploring_options';

export type ManagedAccessVerificationState = 'pending' | 'verified' | 'failed' | 'expired';

export type ManagedAccessTrustLevel =
  | 'managed_access_pending'
  | 'work_email_verified'
  | 'stronger_organization_proof';

export type ManagedAccessLifecycleStatus =
  | 'verification_email_sent'
  | 'pending_dns_verification'
  | 'pending_website_file_verification'
  | 'under_trust_review'
  | 'verification_expired';

export interface ManagedAccessRequestPayload {
  verificationMethod: ManagedAccessVerificationMethodId;
  institutionName: string;
  companyDomain: string;
  industry: ManagedAccessIndustryOptionId;
  deploymentPreference: ManagedAccessDeploymentPreferenceId;
  workEmail: string;
}

export interface ManagedAccessRequestLookupPayload {
  requestId: string;
}

export interface ManagedAccessDnsTxtChallenge {
  type: 'dns_txt';
  host: string;
  value: string;
  expiresAt: string | null;
  instructions: string;
}

export interface ManagedAccessWebsiteFileChallenge {
  type: 'website_file';
  fileName: string;
  filePath: string;
  url: string;
  content: string;
  expiresAt: string | null;
  instructions: string;
}

export type ManagedAccessChallenge =
  | ManagedAccessDnsTxtChallenge
  | ManagedAccessWebsiteFileChallenge;

export interface ManagedAccessRequestReceipt {
  requestId: string;
  verificationMethod: ManagedAccessVerificationMethodId;
  status: ManagedAccessLifecycleStatus;
  verificationState: ManagedAccessVerificationState;
  trustLevel: ManagedAccessTrustLevel;
  institutionName: string;
  companyDomain: string;
  industry: ManagedAccessIndustryOptionId;
  deploymentPreference: ManagedAccessDeploymentPreferenceId;
  workEmail: string;
  createdAt: string | null;
  verifiedAt: string | null;
  challengeLastCheckedAt: string | null;
  challengeFailureReason: string | null;
  verificationTokenExpiresAt?: string | null;
  challenge?: ManagedAccessChallenge;
  message: string;
}
