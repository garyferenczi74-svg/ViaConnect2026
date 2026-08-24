// Prompt 214c: Admin Science & Authorities allowlist list + approve/propose.
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { safeLog } from '@/lib/utils/safe-log';

export const dynamic = 'force-dynamic';

export async function GET(): Promise<Response> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return Response.json({ error: 'unauthenticated' }, { status: 401 });

    const admin = createAdminClient();
    const { data, error } = await admin
      .from('authorities_sources')
      .select('*')
      .order('domain', { ascending: true });

    if (error) {
      safeLog.warn('admin.authorities', 'list failed', { error: error.message });
      return Response.json({ sources: [] }, { status: 200 });
    }
    return Response.json({ sources: data ?? [] }, { status: 200 });
  } catch (err) {
    safeLog.error('admin.authorities', 'threw', { error: err });
    return Response.json({ sources: [] }, { status: 200 });
  }
}

export async function POST(req: Request): Promise<Response> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return Response.json({ error: 'unauthenticated' }, { status: 401 });

    const body = (await req.json()) as {
      domain?: string;
      label?: string;
      source_kind?: string;
      action?: 'propose' | 'approve' | 'reject';
    };

    const admin = createAdminClient();

    if (body.action === 'approve' || body.action === 'reject') {
      if (!body.domain) {
        return Response.json({ error: 'domain required' }, { status: 400 });
      }
      const { error } = await admin
        .from('authorities_sources')
        .update({
          approval_status: body.action === 'approve' ? 'approved' : 'rejected',
          is_active: body.action === 'approve',
          approved_by: user.id,
          updated_at: new Date().toISOString(),
        })
        .eq('domain', body.domain);
      if (error) return Response.json({ error: error.message }, { status: 400 });
      return Response.json({ ok: true }, { status: 200 });
    }

    if (!body.domain || !body.label) {
      return Response.json({ error: 'domain and label required' }, { status: 400 });
    }
    const { error } = await admin.from('authorities_sources').upsert(
      {
        domain: body.domain.toLowerCase().replace(/^www\./, ''),
        label: body.label,
        source_kind: body.source_kind ?? 'other',
        approval_status: 'proposed',
        is_active: false,
        proposed_by: user.id,
      },
      { onConflict: 'domain' },
    );
    if (error) return Response.json({ error: error.message }, { status: 400 });
    return Response.json({ ok: true, status: 'proposed' }, { status: 200 });
  } catch (err) {
    safeLog.error('admin.authorities', 'post threw', { error: err });
    return Response.json({ error: 'server' }, { status: 200 });
  }
}
