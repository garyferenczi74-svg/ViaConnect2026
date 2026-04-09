/**
 * Peptide Share Helper (Prompt #60d — Section 3A)
 *
 * Server-side helper that takes a consumer's peptide question + Jeffery's
 * response and routes it to the user's assigned practitioner/naturopath via
 * the protocol_shares table. Inserts an `advisor_peptide_shares` row and
 * fires a `user_notifications` row so the practitioner sees it in their
 * notification bell.
 *
 * Adapted from the spec which assumed `practitioner_patients` — uses
 * `protocol_shares (patient_id, provider_id, status='active')` instead.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export interface ShareResult {
  success: boolean;
  message?: string;
  shareId?: string;
  practitionerId?: string;
  practitionerName?: string;
}

function buildServiceClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

interface ShareInput {
  patientId: string;
  peptideName: string;
  originalQuestion: string;
  advisorResponse: string;
}

/**
 * Route a peptide recommendation from a consumer to their connected provider.
 *
 * Flow:
 *   1. Look up the patient's most recent active provider via protocol_shares.
 *   2. If no provider connected, return success=false with a friendly message.
 *   3. Insert a row into advisor_peptide_shares.
 *   4. Insert a row into user_notifications targeted at the provider.
 *   5. Return success + practitionerName so the UI can show "Sent to Dr. X".
 */
export async function sharePeptideWithPractitioner(input: ShareInput): Promise<ShareResult> {
  const db = buildServiceClient();

  // 1. Find the patient's active provider(s) via protocol_shares
  const { data: shares } = await db
    .from("protocol_shares")
    .select("provider_id, status, created_at")
    .eq("patient_id", input.patientId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1);

  if (!shares || shares.length === 0) {
    return {
      success: false,
      message: "You're not currently connected to a practitioner or naturopath. Visit the Connect section to invite one to review peptide recommendations.",
    };
  }

  const providerId = shares[0].provider_id as string;

  // 2. Look up the provider's display name (best effort)
  const { data: provider } = await db
    .from("profiles")
    .select("full_name")
    .eq("id", providerId)
    .maybeSingle();
  const providerName = (provider?.full_name as string | undefined) ?? "your practitioner";

  // 3. Insert the share record
  const { data: share, error: shareErr } = await db
    .from("advisor_peptide_shares")
    .insert({
      patient_id: input.patientId,
      practitioner_id: providerId,
      peptide_name: input.peptideName,
      original_question: input.originalQuestion,
      advisor_response: input.advisorResponse,
      status: "pending_review",
    })
    .select("id")
    .single();

  if (shareErr || !share) {
    return { success: false, message: `Couldn't save the share: ${shareErr?.message ?? "unknown error"}` };
  }
  const shareId = (share as { id: string }).id;

  // 4. Notify the provider via user_notifications (richer schema than `notifications`)
  await db.from("user_notifications").insert({
    user_id: providerId,
    type: "peptide_share",
    title: `Patient peptide inquiry: ${input.peptideName}`,
    body: `A patient has shared a peptide recommendation from their AI Wellness Assistant for your review.`,
    severity: "info",
    portal: "practitioner",
    link: `/practitioner/peptide-shares/${shareId}`,
    metadata: {
      share_id: shareId,
      patient_id: input.patientId,
      peptide_name: input.peptideName,
    },
  });

  return {
    success: true,
    shareId,
    practitionerId: providerId,
    practitionerName: providerName,
  };
}
