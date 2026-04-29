// Prompt #113 — Per-SKU saleability lookup.

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { withTimeout, isTimeoutError } from "@/lib/utils/with-timeout";
import { safeLog } from "@/lib/utils/safe-log";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    const sb = createClient();
    const { data: { user } } = await withTimeout(sb.auth.getUser(), 5000, 'api.compliance.sku.auth');
    if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

    const { data } = await withTimeout(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (async () => (sb as any)
        .from("regulatory_sku_jurisdiction_status")
        .select("jurisdiction_id, npn, din_hm, license_class, license_expires_at, is_saleable, last_verified_at")
        .eq("sku_id", params.id))(),
      8000,
      'api.compliance.sku.status',
    );

    const byJurisdiction: Record<string, unknown> = {};
    for (const row of (data ?? []) as Array<Record<string, unknown>>) {
      byJurisdiction[String(row.jurisdiction_id)] = row;
    }
    return NextResponse.json({ ok: true, sku_id: params.id, by_jurisdiction: byJurisdiction });
  } catch (err) {
    if (isTimeoutError(err)) {
      safeLog.warn('api.compliance.sku', 'timeout', { error: err });
      return NextResponse.json({ ok: false, error: 'timeout' }, { status: 503 });
    }
    safeLog.error('api.compliance.sku', 'unexpected error', { error: err });
    return NextResponse.json({ ok: false, error: 'unexpected_error' }, { status: 500 });
  }
}
