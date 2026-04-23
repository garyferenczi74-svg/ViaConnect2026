// Prompt #113 — Per-SKU saleability lookup.

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const sb = createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const { data } = await sb
    .from("regulatory_sku_jurisdiction_status")
    .select("jurisdiction_id, npn, din_hm, license_class, license_expires_at, is_saleable, last_verified_at")
    .eq("sku_id", params.id);

  const byJurisdiction: Record<string, unknown> = {};
  for (const row of (data ?? []) as Array<Record<string, unknown>>) {
    byJurisdiction[String(row.jurisdiction_id)] = row;
  }
  return NextResponse.json({ ok: true, sku_id: params.id, by_jurisdiction: byJurisdiction });
}
