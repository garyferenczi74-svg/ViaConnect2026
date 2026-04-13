// src/utils/protocolShareAccess.ts
//
// Permission resolution utility for protocol_shares (Prompt #54a).
//
// A provider (naturopath or practitioner) only sees patient data the
// consumer explicitly shared, and may only act within the action
// permissions the consumer granted. Every page in the provider portal
// that displays patient data MUST resolve permissions through this
// helper before rendering anything sensitive.
//
// Hard rule: this helper returns `null` if there is no active share —
// callers must treat null as "no access whatsoever". Never assume any
// fallback default of true.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

type ProtocolShareRow = Database['public']['Tables']['protocol_shares']['Row'];

// ── Types ──────────────────────────────────────────────────────────────

export type SharedDataKey =
  | "supplements"
  | "geneticResults"
  | "caqData"
  | "bioScore"
  | "wellnessAnalytics"
  | "peptideRecommendations"
  | "labResults";

export type ActionPermissionKey = "canOrder" | "canModify" | "canRecommend";

export interface SharePermissions {
  /** Raw share row id, for activity logging. */
  shareId: string;
  /** Provider type the share was directed at. */
  providerType: "naturopath" | "practitioner";
  /** Active-only flag — convenience boolean (status === 'active'). */
  isActive: boolean;
  /** ISO timestamp of share creation. */
  sharedAt: string;
  /** ISO timestamp of acceptance, or null if pending. */
  acceptedAt: string | null;

  // Data category permissions
  supplements: boolean;
  geneticResults: boolean;
  caqData: boolean;
  bioScore: boolean;
  wellnessAnalytics: boolean;
  peptideRecommendations: boolean;
  labResults: boolean;

  // Action permissions
  canOrder: boolean;
  canModify: boolean;
  canRecommend: boolean;
}

interface ShareRow {
  id: string;
  provider_type: "naturopath" | "practitioner";
  status: string;
  created_at: string;
  accepted_at: string | null;
  share_supplements: boolean | null;
  share_genetic_results: boolean | null;
  share_caq_data: boolean | null;
  share_bio_optimization_score: boolean | null;
  share_wellness_analytics: boolean | null;
  share_peptide_recommendations: boolean | null;
  share_lab_results: boolean | null;
  can_order_on_behalf: boolean | null;
  can_modify_protocol: boolean | null;
  can_recommend_products: boolean | null;
}

function rowToPermissions(row: ShareRow): SharePermissions {
  return {
    shareId: row.id,
    providerType: row.provider_type,
    isActive: row.status === "active",
    sharedAt: row.created_at,
    acceptedAt: row.accepted_at,
    supplements: !!row.share_supplements,
    geneticResults: !!row.share_genetic_results,
    caqData: !!row.share_caq_data,
    bioScore: !!row.share_bio_optimization_score,
    wellnessAnalytics: !!row.share_wellness_analytics,
    peptideRecommendations: !!row.share_peptide_recommendations,
    labResults: !!row.share_lab_results,
    canOrder: !!row.can_order_on_behalf,
    canModify: !!row.can_modify_protocol,
    canRecommend: !!row.can_recommend_products,
  };
}

// ── Lookups ────────────────────────────────────────────────────────────

/**
 * Resolve the active share permissions for a (provider, patient) pair.
 * Returns null if no active share exists.
 */
export async function getSharePermissions(
  providerId: string,
  patientId: string,
  supabase: SupabaseClient,
): Promise<SharePermissions | null> {
  const { data, error } = await supabase
    .from("protocol_shares")
    .select(
      "id, provider_type, status, created_at, accepted_at, share_supplements, share_genetic_results, share_caq_data, share_bio_optimization_score, share_wellness_analytics, share_peptide_recommendations, share_lab_results, can_order_on_behalf, can_modify_protocol, can_recommend_products",
    )
    .eq("provider_id", providerId)
    .eq("patient_id", patientId)
    .eq("status", "active")
    .maybeSingle();

  if (error || !data) return null;
  return rowToPermissions(data as ShareRow);
}

/**
 * List every active share a provider has across all their patients.
 * Used by the naturopath/practitioner "My Patients" page.
 */
export async function listProviderShares(
  providerId: string,
  supabase: SupabaseClient,
): Promise<Array<SharePermissions & { patientId: string }>> {
  const { data } = await supabase
    .from("protocol_shares")
    .select(
      "id, patient_id, provider_type, status, created_at, accepted_at, share_supplements, share_genetic_results, share_caq_data, share_bio_optimization_score, share_wellness_analytics, share_peptide_recommendations, share_lab_results, can_order_on_behalf, can_modify_protocol, can_recommend_products",
    )
    .eq("provider_id", providerId)
    .eq("status", "active")
    .order("accepted_at", { ascending: false });

  if (!data) return [];
  return (data as Array<ShareRow & { patient_id: string }>).map(row => ({
    ...rowToPermissions(row),
    patientId: row.patient_id,
  }));
}

/**
 * List all shares (any status) the patient has created.
 * Used by the consumer "Manage Shared Access" page.
 */
export async function listPatientShares(
  patientId: string,
  supabase: SupabaseClient,
): Promise<ProtocolShareRow[]> {
  const { data } = await supabase
    .from("protocol_shares")
    .select("*")
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false });
  return data ?? [];
}

// ── Hard guards ────────────────────────────────────────────────────────

/**
 * Throws if the provider has no active share for the given patient.
 * Use at the top of any provider-portal data fetch that touches PHI.
 */
export async function requireSharePermissions(
  providerId: string,
  patientId: string,
  supabase: SupabaseClient,
): Promise<SharePermissions> {
  const perms = await getSharePermissions(providerId, patientId, supabase);
  if (!perms) {
    throw new Error("No active protocol share between this provider and patient.");
  }
  return perms;
}

/**
 * Throws if a specific data category was not shared. Granular guard for
 * tab-level data fetches (e.g., before loading genetic variants the
 * provider wants to display).
 */
export function requireDataAccess(
  perms: SharePermissions,
  key: SharedDataKey,
): void {
  if (!perms[key]) {
    throw new Error(`Patient has not shared ${key}.`);
  }
}

/** Same as requireDataAccess, for action permissions. */
export function requireActionPermission(
  perms: SharePermissions,
  key: ActionPermissionKey,
): void {
  if (!perms[key]) {
    throw new Error(`Patient has not granted ${key} permission.`);
  }
}

// ── Display helpers ────────────────────────────────────────────────────

/** Pretty 8→9 char display: ABCDEFGH → ABCD-EFGH */
export function formatInviteCode(raw: string | null | undefined): string {
  if (!raw) return "";
  const clean = raw.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  if (clean.length !== 8) return clean;
  return `${clean.slice(0, 4)}-${clean.slice(4)}`;
}

/** Strip dashes / spaces and uppercase, returning the canonical 8-char form */
export function normalizeInviteCode(raw: string): string {
  return raw.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 8);
}
