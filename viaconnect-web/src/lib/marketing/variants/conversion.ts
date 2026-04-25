/**
 * Conversion-write helper (Prompt #138a §6.3).
 *
 * Records caq_start, signup_complete, and bounce events with the visitor
 * cookie used for impression-conversion joins. preceding_slot_id is set
 * by looking up the visitor's most recent impression in the same browsing
 * session window (60 minutes).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { ConversionKind } from "./types";

const SESSION_WINDOW_MS = 60 * 60 * 1000; // 60 minutes

export interface RecordConversionArgs {
  visitorId: string;
  conversionKind: ConversionKind;
  /** Optional explicit slot — if omitted, the helper looks up the most recent impression. */
  precedingSlotId?: string;
  /** Optional explicit elapsed time — if omitted, computed from the lookup. */
  timeFromImpressionSeconds?: number;
}

export interface RecordConversionResult {
  ok: boolean;
  precedingSlotId: string | null;
  timeFromImpressionSeconds: number | null;
  error?: string;
}

/**
 * Insert one conversion row. Looks up the most recent impression for the
 * visitor within SESSION_WINDOW_MS to populate preceding_slot_id +
 * time_from_impression_seconds when caller didn't supply them. Never throws.
 */
export async function recordConversion(
  client: SupabaseClient,
  args: RecordConversionArgs,
): Promise<RecordConversionResult> {
  let precedingSlotId: string | null = args.precedingSlotId ?? null;
  let timeFromImpressionSeconds: number | null = args.timeFromImpressionSeconds ?? null;

  if (!precedingSlotId) {
    try {
      const cutoff = new Date(Date.now() - SESSION_WINDOW_MS).toISOString();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (client as any)
        .from("marketing_copy_impressions")
        .select("slot_id, rendered_at")
        .eq("visitor_id", args.visitorId)
        .gte("rendered_at", cutoff)
        .order("rendered_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) {
        precedingSlotId = data.slot_id;
        const ms = Date.now() - new Date(data.rendered_at).getTime();
        timeFromImpressionSeconds = Math.max(0, Math.floor(ms / 1000));
      }
    } catch {
      // Lookup failure is non-fatal; insert the conversion without a join.
    }
  }

  const row = {
    visitor_id: args.visitorId,
    conversion_kind: args.conversionKind,
    preceding_slot_id: precedingSlotId,
    time_from_impression_seconds: timeFromImpressionSeconds,
  };

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (client as any)
      .from("marketing_copy_conversions")
      .insert(row);
    if (error) {
      return { ok: false, precedingSlotId, timeFromImpressionSeconds, error: error.message };
    }
    return { ok: true, precedingSlotId, timeFromImpressionSeconds };
  } catch (err) {
    return {
      ok: false,
      precedingSlotId,
      timeFromImpressionSeconds,
      error: (err as Error)?.message ?? "unknown",
    };
  }
}
