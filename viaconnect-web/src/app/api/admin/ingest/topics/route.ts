// Prompt 214b: Admin topic registry list + propose (Gary approval).
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
      .from('ingest_topic_registry')
      .select('*')
      .order('topic_key', { ascending: true });

    if (error) {
      safeLog.warn('admin.ingest.topics', 'list failed', { error });
      return Response.json({ topics: [] }, { status: 200 });
    }
    return Response.json({ topics: data ?? [] }, { status: 200 });
  } catch (err) {
    safeLog.error('admin.ingest.topics', 'threw', { error: err });
    return Response.json({ topics: [] }, { status: 200 });
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
      topic_key?: string;
      query_text?: string;
      domain?: string;
      action?: 'propose' | 'approve' | 'reject';
    };

    const admin = createAdminClient();

    if (body.action === 'approve' || body.action === 'reject') {
      if (!body.topic_key) {
        return Response.json({ error: 'topic_key required' }, { status: 400 });
      }
      const { error } = await admin
        .from('ingest_topic_registry')
        .update({
          approval_status: body.action === 'approve' ? 'approved' : 'rejected',
          is_active: body.action === 'approve',
          approved_by: user.id,
          updated_at: new Date().toISOString(),
        })
        .eq('topic_key', body.topic_key);
      if (error) return Response.json({ error: error.message }, { status: 400 });
      return Response.json({ ok: true }, { status: 200 });
    }

    // propose
    if (!body.topic_key || !body.query_text) {
      return Response.json({ error: 'topic_key and query_text required' }, { status: 400 });
    }
    const { error } = await admin.from('ingest_topic_registry').upsert(
      {
        topic_key: body.topic_key,
        query_text: body.query_text,
        domain: body.domain ?? 'wellness',
        source_classes: ['pubmed', 'social'],
        approval_status: 'proposed',
        is_active: false,
        proposed_by: user.id,
      },
      { onConflict: 'topic_key' },
    );
    if (error) return Response.json({ error: error.message }, { status: 400 });
    return Response.json({ ok: true, status: 'proposed' }, { status: 200 });
  } catch (err) {
    safeLog.error('admin.ingest.topics', 'post threw', { error: err });
    return Response.json({ error: 'server' }, { status: 200 });
  }
}
