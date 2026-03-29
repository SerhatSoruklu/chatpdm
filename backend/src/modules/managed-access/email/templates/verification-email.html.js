'use strict';

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderManagedAccessVerificationEmailHtml(context) {
  const verificationLink = escapeHtml(context.verificationLink);
  const institutionName = escapeHtml(context.institutionName);
  const verificationMethodLabel = escapeHtml(context.verificationMethodLabel);
  const verificationExpiryMinutes = escapeHtml(context.verificationExpiryMinutes);

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verify your institution access request for ChatPDM</title>
  </head>
  <body style="margin:0;padding:0;background:#f8fafc;color:#0f172a;font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8fafc;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border:1px solid rgba(148,163,184,0.18);border-radius:24px;overflow:hidden;">
            <tr>
              <td style="padding:32px 28px 20px;">
                <p style="margin:0;color:#2563eb;font-size:12px;line-height:1.4;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;">Managed institutional onboarding</p>
                <h1 style="margin:12px 0 0;font-size:28px;line-height:1.1;font-weight:700;letter-spacing:-0.04em;color:#0f172a;">Verify your institution access request</h1>
                <p style="margin:16px 0 0;font-size:16px;line-height:1.7;color:#475569;">
                  A request was made to verify institutional access for your organization. Use the secure link below to confirm control of this work email domain and continue your managed access request.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:0 28px 20px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid rgba(148,163,184,0.18);border-radius:18px;background:#f8fafc;">
                  <tr>
                    <td style="padding:18px 20px;">
                      <p style="margin:0;color:#64748b;font-size:12px;line-height:1.4;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;">Institution</p>
                      <p style="margin:8px 0 0;font-size:16px;line-height:1.6;color:#0f172a;">${institutionName}</p>
                      <p style="margin:16px 0 0;color:#64748b;font-size:12px;line-height:1.4;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;">Verification path</p>
                      <p style="margin:8px 0 0;font-size:16px;line-height:1.6;color:#0f172a;">${verificationMethodLabel}</p>
                      <p style="margin:16px 0 0;color:#64748b;font-size:12px;line-height:1.4;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;">Expiry</p>
                      <p style="margin:8px 0 0;font-size:16px;line-height:1.6;color:#0f172a;">${verificationExpiryMinutes} minutes</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:0 28px 20px;">
                <a href="${verificationLink}" style="display:inline-block;padding:14px 22px;border-radius:14px;background:#0f172a;color:#ffffff;font-size:15px;font-weight:600;line-height:1.2;text-decoration:none;">Verify access</a>
              </td>
            </tr>
            <tr>
              <td style="padding:0 28px 28px;">
                <p style="margin:0;font-size:14px;line-height:1.7;color:#475569;">
                  This verification confirms organizational control before trust-bound managed access can move into review.
                </p>
                <p style="margin:16px 0 0;font-size:13px;line-height:1.7;color:#64748b;word-break:break-word;">
                  ${verificationLink}
                </p>
                <p style="margin:16px 0 0;font-size:13px;line-height:1.7;color:#64748b;">
                  If you did not request this verification, no further action is required.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

module.exports = {
  renderManagedAccessVerificationEmailHtml,
};
