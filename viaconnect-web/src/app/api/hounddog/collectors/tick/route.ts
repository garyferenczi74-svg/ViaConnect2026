import { NextResponse } from "next/server";
import { runCollectors } from "@/lib/hounddog/collectors/runCollectors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
    const report = await runCollectors();
    return NextResponse.json(report);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  return GET(req);
}
