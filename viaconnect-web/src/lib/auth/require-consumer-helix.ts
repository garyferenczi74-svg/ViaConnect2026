/**
 * Helix is consumer-only. Fail-closed when profiles.role is missing or
 * is not consumer. Admin/practitioner/naturopath cannot earn or redeem.
 */

import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { User } from "@supabase/supabase-js";
import { lookupProfilesRole } from "@/lib/auth/resolve-session-role";
import { roleFromProfilesColumn } from "@/lib/auth/session-role";

export async function requireConsumerHelixRole(
  supabase: SupabaseClient,
  user: User,
  scope: string,
): Promise<{ ok: true } | { ok: false; response: NextResponse }> {
  const { profileRole } = await lookupProfilesRole(supabase, user.id, scope);
  const role = roleFromProfilesColumn(profileRole);
  if (role !== "consumer") {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Helix is available on Personal Wellness accounts only." },
        { status: 403 },
      ),
    };
  }
  return { ok: true };
}
