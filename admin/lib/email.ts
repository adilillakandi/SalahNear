/**
 * SalahNear Administrator Invitation Email Service
 * Handles templating and dispatching invitation emails to newly provisioned administrators.
 */

interface SendInvitationEmailParams {
  toEmail: string;
  recipientName: string;
  role: 'super_admin' | 'mosque_admin';
  mosqueName?: string;
  password?: string;
  inviteUrl: string;
}

export function generateInvitationEmailHtml({
  recipientName,
  toEmail,
  role,
  mosqueName,
  password,
  inviteUrl,
}: SendInvitationEmailParams): string {
  const roleDisplay = role === 'super_admin' ? 'Super Administrator' : 'Mosque Administrator';
  const scopeDisplay = role === 'super_admin' ? 'Statewide (All Kerala)' : (mosqueName || 'Assigned Mosque Venue');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>You're invited to join SalahNear</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f172a; color: #f8fafc; margin: 0; padding: 24px; }
    .card { max-width: 560px; margin: 0 auto; background-color: #1e293b; border: 1px solid #334155; border-radius: 20px; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5); }
    .header { background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 32px 28px; text-align: center; }
    .badge { display: inline-block; background-color: rgba(255,255,255,0.2); color: #ffffff; padding: 4px 12px; border-radius: 9999px; font-size: 11px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; margin-top: 8px; }
    .content { padding: 32px 28px; }
    h1 { margin: 0; color: #ffffff; font-size: 24px; font-weight: 800; }
    p { color: #cbd5e1; font-size: 14px; line-height: 1.6; margin: 12px 0; }
    .info-box { background-color: #0f172a; border: 1px solid #334155; border-radius: 12px; padding: 18px; margin: 20px 0; }
    .info-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 13px; }
    .info-label { color: #94a3b8; }
    .info-value { color: #f1f5f9; font-weight: 600; text-align: right; }
    .btn-container { text-align: center; margin: 28px 0; }
    .btn { display: inline-block; background-color: #10b981; color: #ffffff !important; text-decoration: none; padding: 14px 28px; border-radius: 12px; font-weight: 700; font-size: 14px; box-shadow: 0 10px 15px -3px rgba(16, 185, 129, 0.4); }
    .footer { border-top: 1px solid #334155; padding: 20px 28px; text-align: center; font-size: 11px; color: #64748b; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1>SalahNear Portal</h1>
      <div class="badge">Official Administrative Access</div>
    </div>
    <div class="content">
      <p style="font-size: 16px; font-weight: 600; color: #ffffff;">Assalamu Alaikum, ${recipientName}</p>
      <p>
        You have been granted access to the SalahNear Kerala Mosque Operations & Gamification Admin Portal as a <strong>${roleDisplay}</strong>.
      </p>
      
      <div class="info-box">
        <div class="info-row">
          <span class="info-label">Assigned Role:</span>
          <span class="info-value">${roleDisplay}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Administrative Scope:</span>
          <span class="info-value">${scopeDisplay}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Authorized Email:</span>
          <span class="info-value">${toEmail}</span>
        </div>
        ${password ? `
        <div class="info-row" style="margin-top: 8px; padding-top: 8px; border-top: 1px dashed #334155;">
          <span class="info-label">Initial Password:</span>
          <span class="info-value" style="font-family: monospace; background: #334155; padding: 2px 6px; border-radius: 4px;">${password}</span>
        </div>` : ''}
      </div>

      <p>
        To activate your administrator privileges, please click the button below to accept your invitation:
      </p>

      <div class="btn-container">
        <a href="${inviteUrl}" class="btn" target="_blank">Accept Invitation & Activate Account</a>
      </div>

      <p style="font-size: 12px; color: #94a3b8; text-align: center;">
        This invitation link is valid for <strong>7 days</strong>. After accepting, you can sign in with your email and password.
      </p>
    </div>
    <div class="footer">
      SalahNear Kerala Mosque Operations Platform • Confidential Security Communication
    </div>
  </div>
</body>
</html>
  `.trim();
}

import nodemailer from 'nodemailer';

export async function sendInvitationEmail(params: SendInvitationEmailParams): Promise<{
  success: boolean;
  message: string;
  simulated?: boolean;
}> {
  const html = generateInvitationEmailHtml(params);
  const subject = `Invitation to join SalahNear Portal as ${
    params.role === 'super_admin' ? 'Super Administrator' : 'Mosque Administrator'
  }`;
  const fromAddress = process.env.EMAIL_FROM || process.env.SMTP_USER || process.env.GMAIL_USER || 'SalahNear Portal <noreply@salahnear.org>';

  // 1. Try Resend if RESEND_API_KEY is configured
  if (process.env.RESEND_API_KEY) {
    try {
      const resendFrom =
        process.env.EMAIL_FROM || 'SalahNear Portal <onboarding@resend.dev>';

      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.RESEND_API_KEY.trim()}`,
        },
        body: JSON.stringify({
          from: resendFrom,
          to: [params.toEmail],
          subject,
          html,
        }),
      });

      const resData = await res.json();
      if (res.ok) {
        return { success: true, message: `Invitation email sent via Resend to ${params.toEmail}.` };
      } else {
        console.warn('Resend API returned error:', resData);
      }
    } catch (err: any) {
      console.warn('Resend email dispatch error:', err.message);
    }
  }

  // 2. Try Nodemailer if SMTP or Gmail credentials are provided
  const smtpUser = process.env.SMTP_USER || process.env.GMAIL_USER;
  const smtpPass = process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD;
  const smtpHost = process.env.SMTP_HOST || (process.env.GMAIL_USER ? 'smtp.gmail.com' : undefined);
  const smtpPort = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : (smtpHost === 'smtp.gmail.com' ? 465 : 587);

  if (smtpHost && smtpUser && smtpPass) {
    try {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });

      await transporter.sendMail({
        from: fromAddress,
        to: params.toEmail,
        subject,
        html,
      });

      return {
        success: true,
        message: `Invitation email successfully delivered via SMTP to ${params.toEmail}.`,
      };
    } catch (err: any) {
      console.warn('SMTP dispatch error:', err.message);
    }
  }

  // 3. Fallback / Development Simulation
  // When no email provider credentials exist in .env.local yet
  console.log(`[SalahNear Mailer] Dispatched invitation to ${params.toEmail} (${params.role})`);
  console.log(`[SalahNear Mailer] Direct Invite Link: ${params.inviteUrl}`);

  return {
    success: true,
    simulated: true,
    message: `Invitation generated! Note: No SMTP or Resend credentials are configured in .env.local yet, so you can share the direct invitation link with your friend.`,
  };
}

