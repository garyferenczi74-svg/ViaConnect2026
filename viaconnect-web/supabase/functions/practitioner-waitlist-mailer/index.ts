// =============================================================================
// practitioner-waitlist-mailer Edge Function
// =============================================================================
// Consumes the practitioner_email_queue and sends nurture emails via Supabase
// built-in SMTP / Auth admin endpoints. No SendGrid. No third-party providers.
// Per the project standing rule, all transactional email goes through Supabase.
//
// Trigger: pg_cron POSTs every 5 minutes (added in a later migration once
// Phase 1 lands). Idempotent: each (waitlist_id, step) row is processed at
// most once-on-success, with attempts tracked for retries.
// =============================================================================

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// SMTP configuration. These are the same env vars Supabase Auth uses for its
// transactional emails. Configure them in the Supabase dashboard under
// Authentication > Email > SMTP Settings, OR set them as Edge Function
// secrets via `supabase secrets set SMTP_HOST=...`. No third-party SaaS
// provider is involved.
const SMTP_HOST = Deno.env.get('SMTP_HOST') ?? '';
const SMTP_PORT = Number(Deno.env.get('SMTP_PORT') ?? '587');
const SMTP_USER = Deno.env.get('SMTP_USER') ?? '';
const SMTP_PASS = Deno.env.get('SMTP_PASS') ?? '';
const SMTP_FROM = Deno.env.get('SMTP_FROM') ?? 'no-reply@viacurawellness.com';
const SMTP_FROM_NAME = Deno.env.get('SMTP_FROM_NAME') ?? 'ViaCura';

function admin(): SupabaseClient {
  return createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'authorization, content-type',
    },
  });
}

interface QueueRow {
  id: string;
  waitlist_id: string;
  step: number;
  attempts: number;
}

interface WaitlistRow {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  practice_name: string;
  credential_type: string;
  unsubscribed: boolean | null;
}

const STEP_SUBJECTS: Record<number, string> = {
  1: 'Welcome to the ViaCura practitioner waitlist',
  2: 'A look at the precision wellness platform we are building',
  3: 'This week at ViaCura',
  4: 'Cohort 1 selection coming soon',
  5: 'Cohort 1 selection closing in 9 days',
  6: 'Your Cohort 1 status',
};

function renderEmail(step: number, w: WaitlistRow): { subject: string; text: string; html: string } {
  const greeting = `Dear ${w.first_name},`;
  const subject = STEP_SUBJECTS[step] ?? 'ViaCura update';
  const closing =
    'Sincerely,\nThe ViaCura founding team\nFarmCeutica Wellness LLC';

  let body = '';
  switch (step) {
    case 1:
      body = `Thank you for joining the ViaCura practitioner waitlist. We received your application for ${w.practice_name}.\n\nHere is what to expect over the next 30 days:\n  Day 3: a closer look at the platform\n  Day 14: Cohort 1 selection notice\n  Day 28: founding cohort invitations\n\nWe will be in touch.`;
      break;
    case 2:
      body = `As promised, here is a closer look at the ViaCura precision wellness platform: pharmaceutical-grade infrastructure, GeneX360 genetic integration, and a dispensary built on FarmCeutica Wellness products at wholesale to your practice.`;
      break;
    case 3:
      body = `A short note on what we shipped at ViaCura this week, and how it shapes the practitioner experience for ${w.practice_name}.`;
      break;
    case 4:
      body = `Cohort 1 selection opens soon. Twenty-five founding practitioners will be invited to onboard with concierge support and direct founder engagement.`;
      break;
    case 5:
      body = `Final call: Cohort 1 selection closes in 9 days. If your application is among the strongest fits, you will receive an invitation by the end of next week.`;
      break;
    case 6:
      body = `A status update on your Cohort 1 application. Please open the linked page in your account to view the details.`;
      break;
    default:
      body = `Thank you for your interest in ViaCura.`;
  }

  const text = `${greeting}\n\n${body}\n\n${closing}\n`;
  const html =
    `<p>${greeting.replace(/\n/g, '<br/>')}</p>` +
    `<p>${body.replace(/\n/g, '<br/>')}</p>` +
    `<p>${closing.replace(/\n/g, '<br/>')}</p>`;
  return { subject, text, html };
}

async function sendViaSupabaseSmtp(params: {
  to: string;
  subject: string;
  text: string;
  html: string;
}): Promise<void> {
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    throw new Error(
      'SMTP not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASS, SMTP_FROM via supabase secrets set, mirroring the project SMTP credentials used by Supabase Auth.',
    );
  }

  const client = new SMTPClient({
    connection: {
      hostname: SMTP_HOST,
      port: SMTP_PORT,
      tls: SMTP_PORT === 465,
      auth: { username: SMTP_USER, password: SMTP_PASS },
    },
  });

  try {
    await client.send({
      from: `${SMTP_FROM_NAME} <${SMTP_FROM}>`,
      to: params.to,
      subject: params.subject,
      content: params.text,
      html: params.html,
    });
  } finally {
    try { await client.close(); } catch { /* ignore close errors */ }
  }
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { status: 200 });

  const db = admin();
  const startedAt = Date.now();

  // Pull up to 50 due rows.
  const { data: due, error } = await db
    .from('practitioner_email_queue')
    .select('id, waitlist_id, step, attempts')
    .eq('status', 'pending')
    .lte('scheduled_for', new Date().toISOString())
    .order('scheduled_for', { ascending: true })
    .limit(50);

  if (error) return json({ status: 'failed', error: error.message }, 500);
  const rows = (due ?? []) as QueueRow[];

  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const row of rows) {
    // Mark sending (advisory lock — best effort under read-committed)
    await db.from('practitioner_email_queue')
      .update({ status: 'sending', attempts: row.attempts + 1, updated_at: new Date().toISOString() })
      .eq('id', row.id);

    const { data: waitlist } = await db
      .from('practitioner_waitlist')
      .select('id, email, first_name, last_name, practice_name, credential_type, unsubscribed')
      .eq('id', row.waitlist_id)
      .maybeSingle();

    const w = waitlist as WaitlistRow | null;
    if (!w) {
      await db.from('practitioner_email_queue')
        .update({ status: 'failed', last_error: 'waitlist row missing', updated_at: new Date().toISOString() })
        .eq('id', row.id);
      failed++;
      continue;
    }

    if (w.unsubscribed) {
      await db.from('practitioner_email_queue')
        .update({ status: 'skipped', updated_at: new Date().toISOString() })
        .eq('id', row.id);
      skipped++;
      continue;
    }

    const rendered = renderEmail(row.step, w);
    try {
      await sendViaSupabaseSmtp({
        to: w.email,
        subject: rendered.subject,
        text: rendered.text,
        html: rendered.html,
      });
      await db.from('practitioner_email_queue')
        .update({ status: 'sent', sent_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('id', row.id);
      await db.from('practitioner_waitlist')
        .update({ last_email_sent_at: new Date().toISOString(), email_sequence_step: row.step, updated_at: new Date().toISOString() })
        .eq('id', w.id);
      sent++;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'send failed';
      await db.from('practitioner_email_queue')
        .update({
          status: row.attempts + 1 >= 5 ? 'failed' : 'pending',
          last_error: msg,
          updated_at: new Date().toISOString(),
        })
        .eq('id', row.id);
      failed++;
    }
  }

  return json({
    status: 'ok',
    durationMs: Date.now() - startedAt,
    processed: rows.length,
    sent,
    failed,
    skipped,
  });
});
