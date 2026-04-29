import { NextResponse } from "next/server";
import { runCollectors } from "@/lib/hounddog/collectors/runCollectors";
import { withTimeout, isTimeoutError } from "@/lib/utils/with-timeout";
import { safeLog } from "@/lib/utils/safe-log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Cron entry. Authorized via the CRON_SECRET header or Vercel Cron signature;
// no user-facing auth because this is called by the platform scheduler.
export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get("authorization") ?? "";
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }
  try {
    safeLog.info("api.hounddog.collectors.tick", "starting collectors run");
    const report = await withTimeout(runCollectors(), 50000, "api.hounddog.collectors.tick");
    safeLog.info("api.hounddog.collectors.tick", "collectors run complete", { report });
    return NextResponse.json(report);
  } catch (e) {
    if (isTimeoutError(e)) {
      safeLog.error("api.hounddog.collectors.tick", "collectors timeout", { error: e });
      return NextResponse.json({ error: "Collectors took too long" }, { status: 504 });
    }
    safeLog.error("api.hounddog.collectors.tick", "collectors failed", { error: e });
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  return GET(req);
}
