// Prompt 204 (2026-06-21): read endpoint for the member's EpigenHQ results. Owner
// scoped via RLS; fail-open to an empty payload (matches the sibling genetics
// variants route). The client hook reads this to surface a member's epigenetic
// readouts on the EpigenHQ panel.

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeLog } from "@/lib/utils/safe-log";
import { loadEpigeneticResults } from "@/lib/genetics/loadEpigeneticResults";

export async function GET(): Promise<NextResponse> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const results = await loadEpigeneticResults(supabase, user.id);
    return NextResponse.json({ results });
  } catch (err) {
    safeLog.error("api.genetics.epigenetic", "threw (fail-open)", {
      user_id: user.id,
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ results: [] });
  }
}
