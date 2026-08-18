/**
 * Prompt 221B: Male/Female Hormone Report API.
 * GET: generate or return needsSex. POST: supply explicit sex when profile unset.
 * Consumer responses never include practitioner_depth.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  assertConsumerPayloadSafe,
  generateHormoneReport,
} from "@/lib/kb/hormones/generateHormoneReport";
import {
  loadHormoneIqVariants,
  loadHormonesForReport,
  loadNormalizedLabs,
  loadProfileSexRaw,
} from "@/lib/kb/hormones/loadReportInputs";
import { safeLog } from "@/lib/utils/safe-log";

export const dynamic = "force-dynamic";

async function buildReport(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  explicitSex?: string | null
) {
  const [profileSex, labs, hormones, hormoneIqVariants] = await Promise.all([
    loadProfileSexRaw(supabase, userId),
    loadNormalizedLabs(supabase, userId),
    loadHormonesForReport(supabase),
    loadHormoneIqVariants(supabase, userId),
  ]);

  const result = generateHormoneReport({
    profileSex,
    explicitSex,
    labs,
    hormones,
    genetics: [],
    influences: [],
    hormoneIqVariants,
  });

  if (result.ok && !result.needsSex && result.report) {
    assertConsumerPayloadSafe(result.report);
    try {
      await supabase.from("hormone_reports").insert({
        user_id: userId,
        track: result.track,
        payload: result.report,
        sources: { data_sources: result.report.overview.data_sources },
        generated_at: result.report.overview.generated_at,
      });
    } catch (err) {
      safeLog.warn("api.hormones.report", "persist skipped", {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return result;
}

export async function GET(): Promise<NextResponse> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await buildReport(supabase, user.id);
    return NextResponse.json(result);
  } catch (err) {
    safeLog.error("api.hormones.report", "GET failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { ok: false, error: "We could not generate your hormone report." },
      { status: 500 }
    );
  }
}

export async function POST(req: Request): Promise<NextResponse> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { sex?: string } = {};
  try {
    body = (await req.json()) as { sex?: string };
  } catch {
    body = {};
  }

  const sex = body.sex === "male" || body.sex === "female" ? body.sex : null;

  try {
    const result = await buildReport(supabase, user.id, sex);
    return NextResponse.json(result);
  } catch (err) {
    safeLog.error("api.hormones.report", "POST failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { ok: false, error: "We could not generate your hormone report." },
      { status: 500 }
    );
  }
}
