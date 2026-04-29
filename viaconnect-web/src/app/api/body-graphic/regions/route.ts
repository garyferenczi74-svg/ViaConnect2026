// Prompt #118 — Region registry read. Filters by mode + view if provided.

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { withTimeout, isTimeoutError } from "@/lib/utils/with-timeout";
import { safeLog } from "@/lib/utils/safe-log";

export async function GET(request: Request) {
  try {
    const sb = createClient();
    const { data: { user } } = await withTimeout(sb.auth.getUser(), 5000, 'api.body-graphic.regions.auth');
    if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

    const url = new URL(request.url);
    const mode = url.searchParams.get("mode"); // composition | muscle | null
    const view = url.searchParams.get("view"); // front | back | null

    const { data, error } = await withTimeout(
      (async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let q = (sb as any).from("body_regions")
          .select("region_id, display_name, display_name_fr, region_type, anatomical_group, applicable_views, display_order, is_bilateral")
          .order("display_order", { ascending: true });
        if (mode === "composition" || mode === "muscle") q = q.eq("region_type", mode);
        return q;
      })(),
      8000,
      'api.body-graphic.regions.query',
    );
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

    const rows = (data ?? []) as Array<{ applicable_views: string[] } & Record<string, unknown>>;
    const filtered = view === "front" || view === "back"
      ? rows.filter((r) => r.applicable_views.includes(view))
      : rows;
    return NextResponse.json({ ok: true, regions: filtered });
  } catch (err) {
    if (isTimeoutError(err)) {
      safeLog.warn('api.body-graphic.regions', 'timeout', { error: err });
      return NextResponse.json({ ok: false, error: 'timeout' }, { status: 503 });
    }
    safeLog.error('api.body-graphic.regions', 'unexpected error', { error: err });
    return NextResponse.json({ ok: false, error: 'unexpected_error' }, { status: 500 });
  }
}
