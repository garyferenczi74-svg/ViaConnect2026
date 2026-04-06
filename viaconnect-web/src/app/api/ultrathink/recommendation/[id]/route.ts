import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const update: Record<string, unknown> = {};

  if (body.is_accepted !== undefined) {
    update.is_accepted = body.is_accepted;
    if (body.is_accepted) update.added_to_protocol_at = new Date().toISOString();
  }
  if (body.is_dismissed !== undefined) {
    update.is_dismissed = body.is_dismissed;
    if (body.dismissed_reason) update.dismissed_reason = body.dismissed_reason;
  }

  const { error } = await supabase
    .from('ultrathink_recommendations')
    .update(update)
    .eq('id', params.id)
    .eq('user_id', user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
