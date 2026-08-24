// Prompt 212: GET/PATCH connected sources + precedence for UI.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { withTimeout, isTimeoutError } from "@/lib/utils/with-timeout";
import { safeLog } from "@/lib/utils/safe-log";
import { DEFAULT_PRECEDENCE, type MetricKey } from "@/lib/wearables/types";
import { isWhoopConfigured } from "@/lib/wearables/whoop/config";
import { isOuraConfigured } from "@/lib/wearables/oura/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SCOPE = "api.integrations.connected-sources";

async function authUserId(): Promise<string | null> {
  const supabase = await createClient();
  try {
    const { data } = await withTimeout(supabase.auth.getUser(), 5000, `${SCOPE}.auth`);
    return data.user?.id ?? null;
  } catch (err) {
    if (isTimeoutError(err)) return null;
    throw err;
  }
}

export async function GET() {
  try {
    const userId = await authUserId();
    if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const admin = createAdminClient();
    const { data: sources } = await withTimeout(
      (admin as any)
        .from("connected_sources")
        .select("provider, status, scopes, connected_at, last_sync_at, error_detail, external_user_id")
        .eq("user_id", userId),
      4000,
      `${SCOPE}.list`,
    );

    const { data: precedence } = await withTimeout(
      (admin as any)
        .from("wearable_metric_precedence")
        .select("metric_key, preferred_provider")
        .eq("user_id", userId),
      4000,
      `${SCOPE}.precedence`,
    );

    const precedenceMap: Record<string, string> = { ...DEFAULT_PRECEDENCE };
    for (const row of precedence ?? []) {
      precedenceMap[row.metric_key] = row.preferred_provider;
    }

    return NextResponse.json({
      sources: sources ?? [],
      precedence: precedenceMap,
      whoopConfigured: isWhoopConfigured(),
      ouraConfigured: isOuraConfigured(),
      healthConnectEnabled: process.env.HEALTH_CONNECT_ENABLED === "1",
    });
  } catch (err) {
    safeLog.error(SCOPE, "GET failed", { error: err });
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const userId = await authUserId();
    if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => null);
    const metricKey = body?.metric_key as MetricKey | undefined;
    const preferred = body?.preferred_provider as string | undefined;
    if (!metricKey || !preferred) {
      return NextResponse.json({ error: "metric_key and preferred_provider required" }, { status: 400 });
    }
    if (!["whoop", "health_kit", "health_connect", "oura"].includes(preferred)) {
      return NextResponse.json({ error: "invalid provider" }, { status: 400 });
    }

    const admin = createAdminClient();
    await withTimeout(
      (admin as any).from("wearable_metric_precedence").upsert(
        {
          user_id: userId,
          metric_key: metricKey,
          preferred_provider: preferred,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,metric_key" },
      ),
      4000,
      `${SCOPE}.upsertPrecedence`,
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    safeLog.error(SCOPE, "PATCH failed", { error: err });
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
