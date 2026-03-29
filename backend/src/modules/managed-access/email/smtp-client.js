'use strict';

const nodemailer = require('nodemailer');
const managedAccessMailConfig = require('../config/managed-access-mail.config');

let cachedTransport = null;
let lastSentMail = null;

function isTestTransportMode() {
  return process.env.NODE_ENV === 'test';
}

function createTransport() {
  if (isTestTransportMode()) {
    return nodemailer.createTransport({
      jsonTransport: true,
    });
  }

  if (!managedAccessMailConfig.auth.user || !managedAccessMailConfig.auth.pass) {
    const error = new Error('SMTP credentials are not configured for managed access verification.');
    error.code = 'smtp_unconfigured';
    throw error;
  }

  return nodemailer.createTransport({
    host: managedAccessMailConfig.host,
    port: managedAccessMailConfig.port,
    secure: managedAccessMailConfig.secure,
    requireTLS: managedAccessMailConfig.requireTLS,
    connectionTimeout: managedAccessMailConfig.connectTimeoutMs,
    socketTimeout: managedAccessMailConfig.socketTimeoutMs,
    auth: {
      user: managedAccessMailConfig.auth.user,
      pass: managedAccessMailConfig.auth.pass,
    },
  });
}

function getTransport() {
  if (!cachedTransport) {
    cachedTransport = createTransport();
  }

  return cachedTransport;
}

async function sendManagedAccessMail(message) {
  const info = await getTransport().sendMail(message);

  lastSentMail = {
    to: message.to,
    subject: message.subject,
    text: message.text,
    html: message.html,
    messageId: info.messageId || null,
  };

  return info;
}

function getLastSentManagedAccessMail() {
  return lastSentMail;
}

function clearLastSentManagedAccessMail() {
  lastSentMail = null;
}

module.exports = {
  clearLastSentManagedAccessMail,
  getLastSentManagedAccessMail,
  sendManagedAccessMail,
};
