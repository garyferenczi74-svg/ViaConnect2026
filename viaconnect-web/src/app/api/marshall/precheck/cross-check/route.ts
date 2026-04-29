import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { applyClearanceAdjustment } from "@/lib/marshall/precheck/crosscheck";
import type { Finding } from "@/lib/compliance/engine/types";
import { isTimeoutError } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Internal endpoint invoked by the Hounddog pipeline (service-role auth via
// internal shared secret). Not meant for user traffic.
function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("missing supabase env");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export async function POST(req: Request) {
  try {
    const secret = process.env.INTERNAL_WRITE_SECRET;
    if (secret) {
      const auth = req.headers.get("x-internal-secret") ?? "";
      if (auth !== secret) return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    let body: { finding?: Finding; signal?: { matchedPractitionerId?: string | null; content: { textDerived?: string } } };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    if (!body.finding || !body.signal) {
      return NextResponse.json({ error: "finding and signal required" }, { status: 400 });
    }
    const db = serviceClient();
    const result = await applyClearanceAdjustment({ finding: body.finding, signal: body.signal }, db);
    return NextResponse.json(result);
  } catch (err) {
    if (isTimeoutError(err)) {
      safeLog.warn('api.marshall.precheck.cross-check', 'request timeout', { error: err });
      return NextResponse.json({ error: 'timeout' }, { status: 503 });
    }
    safeLog.error('api.marshall.precheck.cross-check', 'unexpected error', { error: err });
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
