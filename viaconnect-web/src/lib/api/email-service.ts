// ---------------------------------------------------------------------------
// SendGrid Email Service — ViaConnect
// ---------------------------------------------------------------------------

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY!;
const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL ?? 'hello@viaconnect.app';
const FROM_NAME = process.env.SENDGRID_FROM_NAME ?? 'ViaConnect';

// ---- Branding constants ----------------------------------------------------

const BRAND = {
  navy: '#0B1A2E',
  teal: '#14B8A6',
  orange: '#F97316',
  white: '#FFFFFF',
  lightGray: '#F1F5F9',
  font: "'Inter', Arial, sans-serif",
} as const;

function wrapInLayout(innerHtml: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:${BRAND.lightGray};font-family:${BRAND.font};">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.lightGray};padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:${BRAND.white};border-radius:12px;overflow:hidden;">
        <!-- Header -->
        <tr>
          <td style="background:${BRAND.navy};padding:28px 32px;">
            <span style="color:${BRAND.teal};font-size:24px;font-weight:700;letter-spacing:1px;">ViaConnect</span>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:32px;color:#1E293B;font-size:15px;line-height:1.7;">
            ${innerHtml}
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:${BRAND.navy};padding:20px 32px;text-align:center;">
            <span style="color:#94A3B8;font-size:12px;">&copy; 2026 ViaConnect &middot; ViaConnect Inc. All rights reserved.</span>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim();
}

function heading(text: string): string {
  return `<h2 style="margin:0 0 16px;color:${BRAND.orange};font-size:20px;font-weight:700;">${text}</h2>`;
}

function button(label: string, url: string): string {
  return `<a href="${url}" style="display:inline-block;margin:20px 0;padding:12px 28px;background:${BRAND.teal};color:${BRAND.white};font-weight:600;font-size:14px;border-radius:8px;text-decoration:none;">${label}</a>`;
}

// ---- Core send function ----------------------------------------------------

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  templateId?: string;
  dynamicData?: Record<string, unknown>;
}

export async function sendEmail({
  to,
  subject,
  html,
  templateId,
  dynamicData,
}: SendEmailParams): Promise<boolean> {
  const message: Record<string, unknown> = {
    personalizations: [
      {
        to: [{ email: to }],
        ...(dynamicData ? { dynamic_template_data: dynamicData } : {}),
      },
    ],
    from: { email: FROM_EMAIL, name: FROM_NAME },
    subject,
  };

  if (templateId) {
    message.template_id = templateId;
  } else {
    message.content = [{ type: 'text/html', value: html }];
  }

  try {
    const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    return res.ok || res.status === 202;
  } catch (error) {
    console.error('[email-service] Failed to send email:', error);
    return false;
  }
}

// ---- Template helpers ------------------------------------------------------

export async function sendWelcomeEmail(
  email: string,
  name: string,
): Promise<boolean> {
  const html = wrapInLayout(`
    ${heading('Welcome to ViaConnect!')}
    <p>Hi <strong>${name}</strong>,</p>
    <p>We're thrilled to have you on board. ViaConnect puts your genetics, your protocols, and your wellness journey in one place — powered by the GeneX360 platform.</p>
    <p>Here's what you can do next:</p>
    <ul>
      <li>Order your first GeneX360 genetic panel</li>
      <li>Explore personalized supplement recommendations</li>
      <li>Connect with a certified practitioner</li>
    </ul>
    ${button('Go to Dashboard', 'https://viaconnect.app/dashboard')}
    <p style="color:#64748B;font-size:13px;">If you have any questions, reply to this email or visit our help centre.</p>
  `);

  return sendEmail({ to: email, subject: 'Welcome to ViaConnect!', html });
}

export async function sendPanelOrderedEmail(
  email: string,
  name: string,
  panelType: string,
): Promise<boolean> {
  const html = wrapInLayout(`
    ${heading('Panel Order Confirmed')}
    <p>Hi <strong>${name}</strong>,</p>
    <p>Your <strong>${panelType}</strong> panel has been ordered successfully. Here's what happens next:</p>
    <ol>
      <li>Your collection kit will ship within 2 business days</li>
      <li>Complete the sample collection at home</li>
      <li>Return the kit using the prepaid label</li>
      <li>Results typically arrive within 10–14 business days</li>
    </ol>
    ${button('Track Your Order', 'https://viaconnect.app/dashboard/panels')}
    <p style="color:#64748B;font-size:13px;">Order questions? Contact support@viaconnect.app</p>
  `);

  return sendEmail({
    to: email,
    subject: `Your ${panelType} Panel Has Been Ordered`,
    html,
  });
}

export async function sendResultsReadyEmail(
  email: string,
  name: string,
  panelType: string,
  biomarkerCount: number,
): Promise<boolean> {
  const html = wrapInLayout(`
    ${heading('Your Results Are Ready!')}
    <p>Hi <strong>${name}</strong>,</p>
    <p>Great news — your <strong>${panelType}</strong> results are in. We analysed <strong>${biomarkerCount} biomarkers</strong> to build your personalised genetic profile.</p>
    <p>Your dashboard now includes:</p>
    <ul>
      <li>Personalised supplement recommendations matched to your genetics</li>
      <li>Risk-awareness insights across key pathways</li>
      <li>Dosage guidance calibrated to your metaboliser status</li>
    </ul>
    ${button('View Your Results', 'https://viaconnect.app/dashboard/results')}
  `);

  return sendEmail({
    to: email,
    subject: `Your ${panelType} Results Are Ready`,
    html,
  });
}

export async function sendProtocolReceivedEmail(
  email: string,
  name: string,
  practitionerName: string,
  protocolName: string,
): Promise<boolean> {
  const html = wrapInLayout(`
    ${heading('New Protocol Assigned')}
    <p>Hi <strong>${name}</strong>,</p>
    <p>Your practitioner <strong>${practitionerName}</strong> has assigned you a new protocol:</p>
    <table width="100%" style="margin:16px 0;background:${BRAND.lightGray};border-radius:8px;padding:16px;">
      <tr><td style="padding:12px 16px;">
        <strong style="color:${BRAND.navy};font-size:16px;">${protocolName}</strong>
      </td></tr>
    </table>
    <p>Open the app to review your daily schedule, dosages, and compliance tracking.</p>
    ${button('View Protocol', 'https://viaconnect.app/dashboard/protocols')}
  `);

  return sendEmail({
    to: email,
    subject: `New Protocol: ${protocolName}`,
    html,
  });
}

export async function sendStreakAtRiskEmail(
  email: string,
  name: string,
  streak: number,
  multiplier: number,
): Promise<boolean> {
  const html = wrapInLayout(`
    ${heading('Your Streak Is at Risk!')}
    <p>Hi <strong>${name}</strong>,</p>
    <p>You haven't logged your compliance today. Your current streak is <strong>${streak} days</strong> with a <strong>${multiplier}x</strong> token multiplier — don't let it reset!</p>
    <p>It only takes a minute to log your daily protocol and keep your streak alive.</p>
    ${button('Log Now', 'https://viaconnect.app/dashboard/compliance')}
    <p style="color:#64748B;font-size:13px;">Tip: Enable push notifications so you never miss a reminder.</p>
  `);

  return sendEmail({
    to: email,
    subject: `⏰ ${streak}-Day Streak at Risk — Log Now!`,
    html,
  });
}

export async function sendWeeklyDigestEmail(
  email: string,
  name: string,
  compliance: number,
  streak: number,
  insights: string[],
): Promise<boolean> {
  const insightsList = insights
    .map((i) => `<li>${i}</li>`)
    .join('');

  const html = wrapInLayout(`
    ${heading('Your Weekly Wellness Digest')}
    <p>Hi <strong>${name}</strong>, here's your week in review:</p>
    <table width="100%" style="margin:16px 0;">
      <tr>
        <td style="background:${BRAND.navy};color:${BRAND.white};padding:16px;border-radius:8px 0 0 8px;text-align:center;width:50%;">
          <div style="font-size:28px;font-weight:700;color:${BRAND.teal};">${compliance}%</div>
          <div style="font-size:12px;color:#94A3B8;margin-top:4px;">Compliance</div>
        </td>
        <td style="background:${BRAND.navy};color:${BRAND.white};padding:16px;border-radius:0 8px 8px 0;text-align:center;width:50%;">
          <div style="font-size:28px;font-weight:700;color:${BRAND.orange};">${streak}</div>
          <div style="font-size:12px;color:#94A3B8;margin-top:4px;">Day Streak</div>
        </td>
      </tr>
    </table>
    ${insights.length > 0 ? `<p><strong>Key Insights:</strong></p><ul>${insightsList}</ul>` : ''}
    ${button('Open Dashboard', 'https://viaconnect.app/dashboard')}
  `);

  return sendEmail({
    to: email,
    subject: `Your Weekly Digest — ${compliance}% Compliance`,
    html,
  });
}
