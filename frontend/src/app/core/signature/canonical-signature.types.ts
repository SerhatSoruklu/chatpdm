export interface CanonicalSignatureContext {
  page: string;
  section: string;
  scope: string;
}

export interface CanonicalSignatureEnvelope {
  signatureImagePath: string;
  signatureImageHash: string;
  context: CanonicalSignatureContext;
  issuedAt: string;
  payloadHash: string;
  expiresAt?: string;
}

export interface CanonicalSignatureSignature {
  alg: string;
  kid: string;
  value: string;
}

export interface CanonicalSignedEnvelope {
  envelope: CanonicalSignatureEnvelope;
  signature: CanonicalSignatureSignature;
}

export interface CanonicalSignatureResponse {
  resource: string;
  status: string;
  signedEnvelope: CanonicalSignedEnvelope;
}

export type CanonicalSignatureVerificationState =
  | { status: 'verifying' }
  | { status: 'verified'; signedEnvelope: CanonicalSignedEnvelope }
  | { status: 'unverified'; reason: string };
