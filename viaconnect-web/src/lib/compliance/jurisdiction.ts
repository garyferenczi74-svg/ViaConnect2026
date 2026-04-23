// Prompt #113 — Jurisdiction resolver.
// Production call path: user.billing_country → profiles.billing_country
// (future column) → regulatory_jurisdictions.code. Today: defaults to US
// until billing_country ships on profiles.

import { createClient } from "@/lib/supabase/server";
import type { JurisdictionCode } from "./types";

export async function getUserJurisdictionCode(): Promise<JurisdictionCode> {
  const sb = createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return "US";
  // profiles.billing_country is not yet in schema; reserve this lookup site.
  // When it ships: select billing_country from profiles.
  return "US";
}

export async function getJurisdictionId(code: JurisdictionCode): Promise<string | null> {
  const sb = createClient();
  const { data } = await sb
    .from("regulatory_jurisdictions")
    .select("id")
    .eq("code", code)
    .eq("is_active", true)
    .maybeSingle();
  return data ? (data as { id: string }).id : null;
}

export function isValidJurisdiction(code: string): code is JurisdictionCode {
  return code === "US" || code === "CA";
}
