import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { verifyReceipt } from "@/lib/marshall/precheck/clearance";
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const userClient = createServerClient();
    const { data: { user } } = await withTimeout(userClient.auth.getUser(), 5000, 'api.marshall.precheck.receipts.auth');
    if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = userClient as any;
    const { data: receipt } = await supabase
      .from("precheck_clearance_receipts")
      .select("receipt_id, session_id, practitioner_id, draft_hash_sha256, jwt_compact, signing_key_id, issued_at, expires_at, revoked, revoked_at, revoked_reason")
      .eq("receipt_id", id)
      .maybeSingle();
    if (!receipt) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const verification = verifyReceipt((receipt as { jwt_compact: string }).jwt_compact);
    return NextResponse.json({ receipt, verification });
  } catch (err) {
    if (isTimeoutError(err)) {
      safeLog.warn('api.marshall.precheck.receipts', 'request timeout', { error: err });
      return NextResponse.json({ error: 'timeout' }, { status: 503 });
    }
    safeLog.error('api.marshall.precheck.receipts', 'unexpected error', { error: err });
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
