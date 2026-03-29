'use strict';

process.env.NODE_ENV = 'test';

const assert = require('node:assert/strict');
const { MongoMemoryServer } = require('mongodb-memory-server');

const app = require('../src/app');
const { connectMongo, disconnectMongo } = require('../src/config/mongoose');
const { MANAGED_ACCESS_STATUSES } = require('../src/modules/managed-access/constants');
const ManagedAccessEvidenceEvent = require('../src/modules/managed-access/managed-access-evidence-event.model');
const ManagedAccessRequest = require('../src/modules/managed-access/managed-access.model');
const {
  clearLastSentManagedAccessMail,
  getLastSentManagedAccessMail,
} = require('../src/modules/managed-access/email/smtp-client');
const {
  resetManagedAccessVerificationProbeAdapters,
  setManagedAccessVerificationProbeAdaptersForTest,
} = require('../src/modules/managed-access/verification-probe.service');

async function requestJson(method, url, payload, headers = {}) {
  const response = await fetch(url, {
    method,
    headers: payload ? {
      'content-type': 'application/json',
      ...headers,
    } : headers,
    body: payload ? JSON.stringify(payload) : undefined,
  });

  return {
    status: response.status,
    body: await response.json(),
  };
}

async function postJson(url, payload) {
  return requestJson('POST', url, payload);
}

async function getJson(url) {
  return requestJson('GET', url, undefined, {
    accept: 'application/json',
  });
}

function extractVerificationTokenFromMail(messageText) {
  const tokenMatch = messageText.match(/token=([a-f0-9]{64})/i);

  assert(tokenMatch, 'managed access verification email did not include a token link.');
  return tokenMatch[1];
}

async function listEvidenceEventTypes(requestId) {
  const rows = await ManagedAccessEvidenceEvent.find({ requestId })
    .sort({ recordedAt: 1, _id: 1 })
    .lean()
    .exec();

  return rows.map((row) => row.eventType);
}

async function main() {
  const mongoServer = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongoServer.getUri();
  await connectMongo(process.env.MONGODB_URI);
  clearLastSentManagedAccessMail();

  const dnsRecordsByHost = new Map();
  const websiteResponsesByUrl = new Map();

  setManagedAccessVerificationProbeAdaptersForTest({
    resolveDnsTxtRecords: async (host) => {
      if (!dnsRecordsByHost.has(host)) {
        const error = new Error(`No TXT record found for ${host}`);
        error.code = 'ENODATA';
        throw error;
      }

      return dnsRecordsByHost.get(host);
    },
    fetchWebsiteText: async (url) => {
      return websiteResponsesByUrl.get(url) || {
        ok: false,
        status: 404,
        text: '',
      };
    },
  });

  const server = app.listen(0);

  await new Promise((resolve) => {
    server.once('listening', resolve);
  });

  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    const emailRequestReceipt = await postJson(`${baseUrl}/api/v1/managed-access/request`, {
      verificationMethod: 'work_email',
      institutionName: 'Northbridge Health',
      companyDomain: 'northbridgehealth.org',
      industry: 'healthcare',
      deploymentPreference: 'hosted_by_chatpdm',
      workEmail: 'risk@northbridgehealth.org',
    });

    assert.equal(emailRequestReceipt.status, 201, 'work email managed access request was not accepted.');
    assert.equal(emailRequestReceipt.body.status, 'verification_email_sent');
    assert.equal(emailRequestReceipt.body.verificationState, 'pending');
    process.stdout.write('PASS managed_access_work_email_request_created\n');

    const lastSentMail = getLastSentManagedAccessMail();
    assert(lastSentMail, 'managed access verification email was not sent.');
    assert.equal(lastSentMail.subject, 'Verify your institution access request for ChatPDM');
    process.stdout.write('PASS managed_access_work_email_verification_email_sent\n');

    const verificationToken = extractVerificationTokenFromMail(lastSentMail.text);
    const verifyReceipt = await getJson(
      `${baseUrl}/api/v1/managed-access/verify-email?token=${verificationToken}`,
    );

    assert.equal(verifyReceipt.status, 200, 'managed access email verification did not succeed.');
    assert.equal(verifyReceipt.body.status, MANAGED_ACCESS_STATUSES.underTrustReview);
    assert.equal(verifyReceipt.body.verificationState, 'verified');
    assert.equal(verifyReceipt.body.trustLevel, 'work_email_verified');
    process.stdout.write('PASS managed_access_work_email_verification_succeeds\n');

    const verifiedEmailRecord = await ManagedAccessRequest.findById(emailRequestReceipt.body.requestId).lean().exec();
    assert(verifiedEmailRecord, 'work email managed access request record was not persisted.');
    assert.equal(verifiedEmailRecord.status, MANAGED_ACCESS_STATUSES.underTrustReview);
    assert.equal(verifiedEmailRecord.verificationTokenHash, null);
    assert.equal(verifiedEmailRecord.verificationState, 'verified');
    assert(verifiedEmailRecord.verifiedAt instanceof Date, 'work email verifiedAt was not stored.');
    process.stdout.write('PASS managed_access_work_email_verified_state_persisted\n');

    const reusedVerificationReceipt = await getJson(
      `${baseUrl}/api/v1/managed-access/verify-email?token=${verificationToken}`,
    );

    assert.equal(
      reusedVerificationReceipt.status,
      400,
      'reused work email verification token should fail cleanly.',
    );
    assert.equal(reusedVerificationReceipt.body.error.code, 'invalid_verification_token');
    process.stdout.write('PASS managed_access_work_email_reused_token_rejected\n');

    clearLastSentManagedAccessMail();

    const dnsRequestReceipt = await postJson(`${baseUrl}/api/v1/managed-access/request`, {
      verificationMethod: 'dns_txt',
      institutionName: 'Standards Guild',
      companyDomain: 'standardsguild.org',
      industry: 'standards_certification',
      deploymentPreference: 'private_runtime_later',
      workEmail: 'policy@standardsguild.org',
    });

    assert.equal(dnsRequestReceipt.status, 201, 'DNS TXT managed access request was not accepted.');
    assert.equal(dnsRequestReceipt.body.status, MANAGED_ACCESS_STATUSES.pendingDnsVerification);
    assert.equal(dnsRequestReceipt.body.challenge.type, 'dns_txt');
    assert.equal(dnsRequestReceipt.body.verificationState, 'pending');
    process.stdout.write('PASS managed_access_dns_challenge_created\n');

    const dnsFirstCheck = await postJson(`${baseUrl}/api/v1/managed-access/verify-dns`, {
      requestId: dnsRequestReceipt.body.requestId,
    });

    assert.equal(dnsFirstCheck.status, 200, 'DNS TXT refresh should return a bounded status receipt.');
    assert.equal(dnsFirstCheck.body.status, MANAGED_ACCESS_STATUSES.pendingDnsVerification);
    assert.equal(dnsFirstCheck.body.verificationState, 'failed');
    assert.equal(dnsFirstCheck.body.challengeFailureReason, 'dns_lookup_unavailable');
    process.stdout.write('PASS managed_access_dns_initial_failure_state\n');

    dnsRecordsByHost.set(
      dnsRequestReceipt.body.challenge.host,
      [[dnsRequestReceipt.body.challenge.value]],
    );

    const dnsVerifiedReceipt = await postJson(`${baseUrl}/api/v1/managed-access/verify-dns`, {
      requestId: dnsRequestReceipt.body.requestId,
    });

    assert.equal(dnsVerifiedReceipt.status, 200, 'DNS TXT verification should succeed after challenge publication.');
    assert.equal(dnsVerifiedReceipt.body.status, MANAGED_ACCESS_STATUSES.underTrustReview);
    assert.equal(dnsVerifiedReceipt.body.verificationState, 'verified');
    assert.equal(dnsVerifiedReceipt.body.trustLevel, 'stronger_organization_proof');

    const verifiedDnsRecord = await ManagedAccessRequest.findById(dnsRequestReceipt.body.requestId).lean().exec();
    assert.equal(verifiedDnsRecord.status, MANAGED_ACCESS_STATUSES.underTrustReview);
    assert.equal(verifiedDnsRecord.verificationState, 'verified');
    assert.equal(verifiedDnsRecord.trustLevel, 'stronger_organization_proof');
    process.stdout.write('PASS managed_access_dns_verified_state_persisted\n');

    const dnsEventTypes = await listEvidenceEventTypes(dnsRequestReceipt.body.requestId);
    assert.deepEqual(
      dnsEventTypes,
      ['request_created', 'dns_challenge_created', 'dns_verification_checked', 'dns_verified'],
      'DNS TXT evidence events must remain append-only and ordered.',
    );
    process.stdout.write('PASS managed_access_dns_evidence_events\n');

    const websiteRequestReceipt = await postJson(`${baseUrl}/api/v1/managed-access/request`, {
      verificationMethod: 'website_file',
      institutionName: 'Accord Legal',
      companyDomain: 'accordlegal.org',
      industry: 'legal',
      deploymentPreference: 'exploring_options',
      workEmail: 'operations@accordlegal.org',
    });

    assert.equal(websiteRequestReceipt.status, 201, 'website file managed access request was not accepted.');
    assert.equal(websiteRequestReceipt.body.status, MANAGED_ACCESS_STATUSES.pendingWebsiteFileVerification);
    assert.equal(websiteRequestReceipt.body.challenge.type, 'website_file');
    assert.equal(websiteRequestReceipt.body.verificationState, 'pending');
    process.stdout.write('PASS managed_access_website_file_challenge_created\n');

    const websiteFirstCheck = await postJson(`${baseUrl}/api/v1/managed-access/verify-website-file`, {
      requestId: websiteRequestReceipt.body.requestId,
    });

    assert.equal(websiteFirstCheck.status, 200, 'website file refresh should return a bounded status receipt.');
    assert.equal(websiteFirstCheck.body.status, MANAGED_ACCESS_STATUSES.pendingWebsiteFileVerification);
    assert.equal(websiteFirstCheck.body.verificationState, 'failed');
    assert.equal(websiteFirstCheck.body.challengeFailureReason, 'website_file_not_found');
    process.stdout.write('PASS managed_access_website_file_initial_failure_state\n');

    websiteResponsesByUrl.set(websiteRequestReceipt.body.challenge.url, {
      ok: true,
      status: 200,
      text: websiteRequestReceipt.body.challenge.content,
    });

    const websiteVerifiedReceipt = await postJson(`${baseUrl}/api/v1/managed-access/verify-website-file`, {
      requestId: websiteRequestReceipt.body.requestId,
    });

    assert.equal(websiteVerifiedReceipt.status, 200, 'website file verification should succeed after file publication.');
    assert.equal(websiteVerifiedReceipt.body.status, MANAGED_ACCESS_STATUSES.underTrustReview);
    assert.equal(websiteVerifiedReceipt.body.verificationState, 'verified');
    assert.equal(websiteVerifiedReceipt.body.trustLevel, 'stronger_organization_proof');

    const verifiedWebsiteRecord = await ManagedAccessRequest.findById(websiteRequestReceipt.body.requestId).lean().exec();
    assert.equal(verifiedWebsiteRecord.status, MANAGED_ACCESS_STATUSES.underTrustReview);
    assert.equal(verifiedWebsiteRecord.verificationState, 'verified');
    assert.equal(verifiedWebsiteRecord.trustLevel, 'stronger_organization_proof');
    process.stdout.write('PASS managed_access_website_file_verified_state_persisted\n');

    const websiteEventTypes = await listEvidenceEventTypes(websiteRequestReceipt.body.requestId);
    assert.deepEqual(
      websiteEventTypes,
      [
        'request_created',
        'website_file_challenge_created',
        'website_file_verification_checked',
        'website_file_verified',
      ],
      'website file evidence events must remain append-only and ordered.',
    );
    process.stdout.write('PASS managed_access_website_file_evidence_events\n');

    const expiringDnsRequestReceipt = await postJson(`${baseUrl}/api/v1/managed-access/request`, {
      verificationMethod: 'dns_txt',
      institutionName: 'Northbank Insurance',
      companyDomain: 'northbankinsurance.org',
      industry: 'insurance',
      deploymentPreference: 'hosted_by_chatpdm',
      workEmail: 'ops@northbankinsurance.org',
    });

    assert.equal(expiringDnsRequestReceipt.status, 201);

    await ManagedAccessRequest.updateOne(
      { _id: expiringDnsRequestReceipt.body.requestId },
      {
        $set: {
          challengeExpiresAt: new Date(Date.now() - 60 * 1000),
        },
      },
    );

    const expiredDnsReceipt = await postJson(`${baseUrl}/api/v1/managed-access/verify-dns`, {
      requestId: expiringDnsRequestReceipt.body.requestId,
    });

    assert.equal(expiredDnsReceipt.status, 200);
    assert.equal(expiredDnsReceipt.body.status, MANAGED_ACCESS_STATUSES.verificationExpired);
    assert.equal(expiredDnsReceipt.body.verificationState, 'expired');

    const expiredDnsRecord = await ManagedAccessRequest.findById(expiringDnsRequestReceipt.body.requestId).lean().exec();
    assert.equal(expiredDnsRecord.status, MANAGED_ACCESS_STATUSES.verificationExpired);
    assert.equal(expiredDnsRecord.verificationState, 'expired');
    process.stdout.write('PASS managed_access_dns_expired_state_persisted\n');
  } finally {
    resetManagedAccessVerificationProbeAdapters();

    await new Promise((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });

    await disconnectMongo();
    await mongoServer.stop();
  }
}

main().catch((error) => {
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exitCode = 1;
});
