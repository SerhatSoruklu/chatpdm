'use strict';

const { Router } = require('express');
const {
  ManagedAccessValidationError,
  buildVerificationResultUrl,
  createManagedAccessRequest,
  verifyManagedAccessDnsRequest,
  verifyManagedAccessEmailToken,
  verifyManagedAccessWebsiteFileRequest,
} = require('./managed-access.service');

const router = Router();

router.get('/', (req, res) => {
  res.json({
    resource: 'managed_access',
    phase: 'phase_d',
    availableOperations: [
      'request_work_email_verification',
      'request_dns_txt_challenge',
      'request_website_file_challenge',
      'verify_work_email_token',
      'verify_dns_txt_challenge',
      'verify_website_file_challenge',
    ],
  });
});

router.post('/request', async (req, res) => {
  try {
    const receipt = await createManagedAccessRequest(req.body);
    res.status(201).json(receipt);
  } catch (error) {
    if (error instanceof ManagedAccessValidationError) {
      res.status(error.statusCode || 400).json({
        error: {
          code: error.code || 'invalid_managed_access_request',
          message: error.message,
        },
      });
      return;
    }

    if (error.statusCode && error.code) {
      res.status(error.statusCode).json({
        error: {
          code: error.code,
          message: error.message,
        },
      });
      return;
    }

    process.stderr.write(
      `[chatpdm-backend] managed access request failed: ${error.stack || error.message}\n`,
    );

    res.status(500).json({
      error: {
        code: 'managed_access_request_failed',
        message: 'The managed access request could not be created.',
      },
    });
  }
});

router.get('/verify-email', async (req, res) => {
  const wantsJson = req.query.format === 'json' || req.accepts(['json', 'html']) === 'json';

  try {
    const verificationReceipt = await verifyManagedAccessEmailToken(req.query.token);

    if (wantsJson) {
      res.json(verificationReceipt);
      return;
    }

    res.redirect(303, buildVerificationResultUrl('success'));
  } catch (error) {
    if (error.code === 'verification_expired') {
      if (wantsJson) {
        res.status(410).json({
          status: 'verification_expired',
          error: {
            code: error.code,
            message: error.message,
          },
        });
        return;
      }

      res.redirect(303, buildVerificationResultUrl('expired'));
      return;
    }

    if (
      error instanceof ManagedAccessValidationError
      || error.code === 'invalid_verification_token'
    ) {
      if (wantsJson) {
        res.status(400).json({
          status: 'invalid_verification_token',
          error: {
            code: error.code || 'invalid_verification_token',
            message: error.message,
          },
        });
        return;
      }

      res.redirect(303, buildVerificationResultUrl('invalid'));
      return;
    }

    process.stderr.write(
      `[chatpdm-backend] managed access verification failed: ${error.stack || error.message}\n`,
    );

    if (wantsJson) {
      res.status(500).json({
        error: {
          code: 'managed_access_verification_failed',
          message: 'The verification link could not be processed.',
        },
      });
      return;
    }

    res.redirect(303, buildVerificationResultUrl('invalid'));
  }
});

router.post('/verify-dns', async (req, res) => {
  try {
    const receipt = await verifyManagedAccessDnsRequest(req.body);
    res.json(receipt);
  } catch (error) {
    if (error instanceof ManagedAccessValidationError || error.statusCode) {
      res.status(error.statusCode || 400).json({
        error: {
          code: error.code || 'invalid_managed_access_request_lookup',
          message: error.message,
        },
      });
      return;
    }

    process.stderr.write(
      `[chatpdm-backend] managed access DNS verification failed: ${error.stack || error.message}\n`,
    );

    res.status(500).json({
      error: {
        code: 'managed_access_dns_verification_failed',
        message: 'DNS TXT verification could not be completed.',
      },
    });
  }
});

router.post('/verify-website-file', async (req, res) => {
  try {
    const receipt = await verifyManagedAccessWebsiteFileRequest(req.body);
    res.json(receipt);
  } catch (error) {
    if (error instanceof ManagedAccessValidationError || error.statusCode) {
      res.status(error.statusCode || 400).json({
        error: {
          code: error.code || 'invalid_managed_access_request_lookup',
          message: error.message,
        },
      });
      return;
    }

    process.stderr.write(
      `[chatpdm-backend] managed access website-file verification failed: ${error.stack || error.message}\n`,
    );

    res.status(500).json({
      error: {
        code: 'managed_access_website_file_verification_failed',
        message: 'Website file verification could not be completed.',
      },
    });
  }
});

module.exports = router;
