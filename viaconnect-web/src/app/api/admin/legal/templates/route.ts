// Prompt #104 Phase 3: Template library list + new-version create.
//
// GET  /api/admin/legal/templates?family=&status=
//   -> rows ordered by family then version desc
// POST /api/admin/legal/templates
//   { template_family, version, applicable_buckets, required_merge_fields,
//     markdown_body, status?, applicable_jurisdictions?, notes? }
//   -> creates a NEW VERSION row (templates are append-only via the
//      UNIQUE (family, version) constraint).

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { writeLegalAudit } from '@/lib/legalAudit/operationsAuditLog';
import { validateRequiredFieldsCovered } from '@/lib/legal/templates/mergeFieldResolver';
import { TEMPLATE_FAMILIES, type TemplateFamily, type LegalCaseBucket, LEGAL_CASE_BUCKETS } from '@/lib/legal/types';
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';

export const runtime = 'nodejs';

const LEGAL_OPS_ROLES = new Set(['admin', 'compliance_officer', 'legal_ops']);
const FAMILY_SET = new Set<string>(TEMPLATE_FAMILIES);
const BUCKET_SET = new Set<string>(LEGAL_CASE_BUCKETS);

interface ProfileLite { role: string }

async function requireLegalOps(supabase: ReturnType<typeof createClient>) {
  const { data: { user } } = await withTimeout(supabase.auth.getUser(), 5000, 'api.admin.legal.templates.auth');
  if (!user) return { ok: false as const, response: NextResponse.json({ error: 'Authentication required' }, { status: 401 }) };
  const sb = supabase as unknown as { from: (t: string) => { select: (s: string) => { eq: (k: string, v: string) => { maybeSingle: () => Promise<{ data: ProfileLite | null }> } } } };
  const { data: profile } = await sb.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (!profile || !LEGAL_OPS_ROLES.has(profile.role)) {
    return { ok: false as const, response: NextResponse.json({ error: 'Legal-ops access required' }, { status: 403 }) };
  }
  return { ok: true as const, user_id: user.id, role: profile.role };
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = createClient();
    const ctx = await requireLegalOps(supabase);
    if (!ctx.ok) return ctx.response;

    const url = new URL(request.url);
    const family = url.searchParams.get('family');
    const status = url.searchParams.get('status');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;
    let q = sb.from('legal_templates_library')
      .select('template_id, template_family, version, applicable_buckets, applicable_jurisdictions, required_merge_fields, status, last_counsel_review_at, last_counsel_reviewer, created_at')
      .order('template_family', { ascending: true })
      .order('version', { ascending: false });
    if (family) q = q.eq('template_family', family);
    if (status) q = q.eq('status', status);

    const { data, error } = await q;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ rows: data ?? [] });
  } catch (err) {
    if (isTimeoutError(err)) {
      safeLog.warn('api.admin.legal.templates', 'GET timeout', { error: err });
      return NextResponse.json({ error: 'Request timed out.' }, { status: 503 });
    }
    safeLog.error('api.admin.legal.templates', 'unexpected error', { error: err });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = createClient();
    const ctx = await requireLegalOps(supabase);
    if (!ctx.ok) return ctx.response;

    const body = (await request.json().catch(() => null)) ?? {};
    const family: string | null = typeof body.template_family === 'string' && FAMILY_SET.has(body.template_family) ? body.template_family : null;
    const version: string | null = typeof body.version === 'string' && body.version.length >= 4 ? body.version : null;
    const buckets: ReadonlyArray<string> = Array.isArray(body.applicable_buckets) ? body.applicable_buckets : [];
    const requiredFields: ReadonlyArray<string> = Array.isArray(body.required_merge_fields) ? body.required_merge_fields : [];
    const markdownBody: string | null = typeof body.markdown_body === 'string' && body.markdown_body.length >= 50 ? body.markdown_body : null;
    const status: string = typeof body.status === 'string' ? body.status : 'draft';

    if (!family) return NextResponse.json({ error: 'template_family required (valid enum value)' }, { status: 400 });
    if (!version) return NextResponse.json({ error: 'version required (>= 4 chars)' }, { status: 400 });
    if (!markdownBody) return NextResponse.json({ error: 'markdown_body required (>= 50 chars)' }, { status: 400 });
    if (buckets.length === 0 || !buckets.every((b) => BUCKET_SET.has(b))) {
      return NextResponse.json({ error: 'applicable_buckets must list one or more valid legal_case_bucket values' }, { status: 400 });
    }

    // Hard-stop: declared required_merge_fields must match what {{...}}
    // appears in the body. Mismatch is a template-quality bug we want to
    // surface at INSERT time, not when an admin later tries to send a
    // letter with missing fields.
    const fieldsCheck = validateRequiredFieldsCovered({
      required_merge_fields: requiredFields,
      template_body: markdownBody,
    });
    if (!fieldsCheck.ok) {
      return NextResponse.json({
        error: 'Required merge fields do not match {{placeholders}} in body',
        declared_but_missing_in_body: fieldsCheck.declared_but_missing_in_body,
        in_body_but_undeclared: fieldsCheck.in_body_but_undeclared,
      }, { status: 400 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;
    const { data: created, error } = await sb
      .from('legal_templates_library')
      .insert({
        template_family: family as TemplateFamily,
        version,
        applicable_buckets: buckets as ReadonlyArray<LegalCaseBucket>,
        applicable_jurisdictions: Array.isArray(body.applicable_jurisdictions) ? body.applicable_jurisdictions : [],
        required_merge_fields: requiredFields,
        markdown_body: markdownBody,
        status,
        notes: typeof body.notes === 'string' ? body.notes : null,
      })
      .select('template_id, template_family, version, status')
      .maybeSingle();
    if (error || !created) {
      return NextResponse.json({ error: error?.message ?? 'Insert failed' }, { status: 500 });
    }

    await writeLegalAudit(sb, {
      actor_user_id: ctx.user_id,
      actor_role: ctx.role,
      action_category: 'template',
      action_verb: 'created_version',
      target_table: 'legal_templates_library',
      target_id: created.template_id,
      after_state_json: { template_family: family, version, status },
    });

    return NextResponse.json({ template: created }, { status: 201 });
  } catch (err) {
    if (isTimeoutError(err)) {
      safeLog.warn('api.admin.legal.templates', 'POST timeout', { error: err });
      return NextResponse.json({ error: 'Request timed out.' }, { status: 503 });
    }
    safeLog.error('api.admin.legal.templates', 'unexpected error', { error: err });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
