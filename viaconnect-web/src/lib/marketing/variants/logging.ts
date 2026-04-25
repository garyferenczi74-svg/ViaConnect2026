/**
 * Variant lifecycle audit log writes (Prompt #138a §10).
 *
 * Every state transition on a variant — created, word_count_validated,
 * precheck_completed, steve_approved, steve_revoked, activated, deactivated,
 * archived, restored — appends one row to marketing_copy_variant_events.
 * The log is append-only; no updates, no deletes.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { VariantEventKind } from "./types";

export interface LogVariantEventArgs {
  variantId: string;
  eventKind: VariantEventKind;
  eventDetail?: Record<string, unknown>;
  actorUserId?: string;
}

export async function logVariantEvent(
  client: SupabaseClient,
  args: LogVariantEventArgs,
): Promise<{ ok: boolean; error?: string }> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (client as any)
      .from("marketing_copy_variant_events")
      .insert({
        variant_id: args.variantId,
        event_kind: args.eventKind,
        event_detail: args.eventDetail ?? null,
        actor_user_id: args.actorUserId ?? null,
      });
    if (error) {
      // eslint-disable-next-line no-console
      console.warn(`[marketing/logging] event insert failed: ${error.message}`);
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (err) {
    const msg = (err as Error)?.message ?? "unknown";
    // eslint-disable-next-line no-console
    console.warn(`[marketing/logging] event insert threw: ${msg}`);
    return { ok: false, error: msg };
  }
}
