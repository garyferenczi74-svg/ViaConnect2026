/**
 * Live clinician roster. Practitioner census comes from practitioner_patients.
 * Naturopath partners come from protocol_shares. Never invent names or counts.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { withTimeout, isTimeoutError } from "@/lib/utils/with-timeout";
import { safeLog } from "@/lib/utils/safe-log";
import {
  clinicianPatientsForRole,
  naturopathPartnersForRole,
  type ClinicianPatientRow,
  type SessionRole,
} from "@/lib/auth/session-role";

export type RosterStatus = "active" | "invited";

export type LiveRosterPatient = {
  relationshipId: string;
  patientId: string | null;
  displayName: string;
  email: string | null;
  status: RosterStatus;
  firstVisitDate: string | null;
  invitedAt: string | null;
  updatedAt: string;
  chiefComplaint: string | null;
  tags: readonly string[];
};

export type LivePanelResult = {
  id: string;
  patientId: string;
  displayName: string;
  panelType: string;
  status: string;
  createdAt: string;
  resultsReceivedAt: string | null;
};

export type PractitionerRosterSnapshot = {
  patients: readonly LiveRosterPatient[];
  activeCount: number;
  invitedCount: number;
  pendingResults: readonly LivePanelResult[];
  recentResults: readonly LivePanelResult[];
  lookupFailed: boolean;
};

export type NaturopathPartnerSnapshot = {
  partners: readonly LiveRosterPatient[];
  activeCount: number;
  lookupFailed: boolean;
};

type RelationshipRow = {
  id: string;
  patient_id: string | null;
  status: string;
  invited_email: string | null;
  invited_first_name: string | null;
  invited_last_name: string | null;
  first_visit_date: string | null;
  invited_at: string | null;
  updated_at: string;
  chief_complaint: string | null;
  tags: string[] | null;
};

type ShareRow = {
  id: string;
  patient_id: string;
  status: string;
  invite_email: string | null;
  accepted_at: string | null;
  updated_at: string;
};

type ProfileNameRow = {
  id: string;
  full_name: string | null;
};

type PanelOrderRow = {
  id: string;
  patient_id: string;
  panel_type: string;
  status: string;
  created_at: string;
  results_received_at: string | null;
};

const UNNAMED_PATIENT = "Unnamed patient";

export function emptyPractitionerSnapshot(
  lookupFailed = false,
): PractitionerRosterSnapshot {
  return {
    patients: [],
    activeCount: 0,
    invitedCount: 0,
    pendingResults: [],
    recentResults: [],
    lookupFailed,
  };
}

export function emptyNaturopathSnapshot(
  lookupFailed = false,
): NaturopathPartnerSnapshot {
  return {
    partners: [],
    activeCount: 0,
    lookupFailed,
  };
}

export function displayNameFromInviteFields(input: {
  fullName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
}): string {
  const full = input.fullName?.trim();
  if (full) return full;
  const first = input.firstName?.trim() ?? "";
  const last = input.lastName?.trim() ?? "";
  const combined = `${first} ${last}`.trim();
  if (combined) return combined;
  const email = input.email?.trim();
  if (email) return email;
  return UNNAMED_PATIENT;
}

export function isLiveRosterStatus(status: string): status is RosterStatus {
  return status === "active" || status === "invited";
}

export function mapRelationshipToRosterRow(
  row: RelationshipRow,
  profileName?: string | null,
): LiveRosterPatient | null {
  if (!isLiveRosterStatus(row.status)) return null;
  return {
    relationshipId: row.id,
    patientId: row.patient_id,
    displayName: displayNameFromInviteFields({
      fullName: profileName,
      firstName: row.invited_first_name,
      lastName: row.invited_last_name,
      email: row.invited_email,
    }),
    email: row.invited_email,
    status: row.status,
    firstVisitDate: row.first_visit_date,
    invitedAt: row.invited_at,
    updatedAt: row.updated_at,
    chiefComplaint: row.chief_complaint,
    tags: row.tags ?? [],
  };
}

export function rosterRowsToClinicianPatients(
  rows: readonly LiveRosterPatient[],
): ClinicianPatientRow[] {
  return rows
    .filter((row) => row.status === "active" && row.patientId)
    .map((row) => ({
      id: row.patientId as string,
      displayName: row.displayName,
    }));
}

export function formatVisitDate(iso: string | null): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

async function loadProfileNames(
  supabase: SupabaseClient<Database>,
  patientIds: readonly string[],
  scope: string,
): Promise<Map<string, string>> {
  const names = new Map<string, string>();
  if (patientIds.length === 0) return names;
  try {
    const rows = await withTimeout(
      (async () => {
        const { data, error } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", [...patientIds]);
        if (error) {
          safeLog.warn(scope, "profiles name lookup failed", { error });
          return [] as ProfileNameRow[];
        }
        return (data ?? []) as ProfileNameRow[];
      })(),
      2500,
      `${scope}.profiles`,
    );
    for (const row of rows) {
      const name = row.full_name?.trim();
      if (name) names.set(row.id, name);
    }
  } catch (error) {
    if (isTimeoutError(error)) {
      safeLog.warn(scope, "profiles name lookup timed out", { error });
    } else {
      safeLog.warn(scope, "profiles name lookup error", { error });
    }
  }
  return names;
}

async function loadPanelOrdersForPatients(
  supabase: SupabaseClient<Database>,
  patientIds: readonly string[],
  scope: string,
): Promise<PanelOrderRow[]> {
  if (patientIds.length === 0) return [];
  try {
    return await withTimeout(
      (async () => {
        const { data, error } = await supabase
          .from("panel_orders")
          .select("id, patient_id, panel_type, status, created_at, results_received_at")
          .in("patient_id", [...patientIds])
          .order("created_at", { ascending: false })
          .limit(20);
        if (error) {
          safeLog.warn(scope, "panel_orders lookup failed", { error });
          return [] as PanelOrderRow[];
        }
        return (data ?? []) as PanelOrderRow[];
      })(),
      2500,
      `${scope}.panel_orders`,
    );
  } catch (error) {
    if (isTimeoutError(error)) {
      safeLog.warn(scope, "panel_orders lookup timed out", { error });
    } else {
      safeLog.warn(scope, "panel_orders lookup error", { error });
    }
    return [];
  }
}

function toPanelResult(
  row: PanelOrderRow,
  names: Map<string, string>,
): LivePanelResult {
  return {
    id: row.id,
    patientId: row.patient_id,
    displayName: names.get(row.patient_id) ?? UNNAMED_PATIENT,
    panelType: row.panel_type,
    status: row.status,
    createdAt: row.created_at,
    resultsReceivedAt: row.results_received_at,
  };
}

export async function loadPractitionerLiveRoster(
  supabase: SupabaseClient<Database>,
  args: { userId: string; role: SessionRole | undefined },
  scope = "practitioner.live-roster",
): Promise<PractitionerRosterSnapshot> {
  if (args.role !== "practitioner" && args.role !== "admin") {
    return emptyPractitionerSnapshot();
  }

  try {
    const rows = await withTimeout(
      (async () => {
        const { data, error } = await supabase
          .from("practitioner_patients")
          .select(
            "id, patient_id, status, invited_email, invited_first_name, invited_last_name, first_visit_date, invited_at, updated_at, chief_complaint, tags",
          )
          .eq("practitioner_id", args.userId)
          .in("status", ["active", "invited"])
          .order("updated_at", { ascending: false });
        if (error) throw error;
        return (data ?? []) as RelationshipRow[];
      })(),
      4000,
      `${scope}.relationships`,
    );

    const patientIds = rows
      .map((row) => row.patient_id)
      .filter((id): id is string => Boolean(id));
    const profileNames = await loadProfileNames(supabase, patientIds, scope);

    const patients = rows
      .map((row) =>
        mapRelationshipToRosterRow(
          row,
          row.patient_id ? profileNames.get(row.patient_id) : undefined,
        ),
      )
      .filter((row): row is LiveRosterPatient => row !== null);

    const entitled = clinicianPatientsForRole(
      args.role,
      rosterRowsToClinicianPatients(patients),
    );
    const entitledIds = new Set(entitled.map((row) => row.id));
    const entitledNameById = new Map(
      entitled.map((row) => [row.id, row.displayName]),
    );

    const orders = await loadPanelOrdersForPatients(
      supabase,
      [...entitledIds],
      scope,
    );
    const panelResults = orders.map((row) =>
      toPanelResult(row, entitledNameById),
    );

    return {
      patients,
      activeCount: patients.filter((row) => row.status === "active").length,
      invitedCount: patients.filter((row) => row.status === "invited").length,
      pendingResults: panelResults.filter((row) => !row.resultsReceivedAt),
      recentResults: panelResults.filter((row) => Boolean(row.resultsReceivedAt)),
      lookupFailed: false,
    };
  } catch (error) {
    if (isTimeoutError(error)) {
      safeLog.warn(scope, "practitioner_patients lookup timed out", { error });
    } else {
      safeLog.error(scope, "practitioner_patients lookup failed", { error });
    }
    return emptyPractitionerSnapshot(true);
  }
}

export async function loadNaturopathLivePartners(
  supabase: SupabaseClient<Database>,
  args: { userId: string; role: SessionRole | undefined },
  scope = "naturopath.live-partners",
): Promise<NaturopathPartnerSnapshot> {
  if (args.role !== "naturopath" && args.role !== "admin") {
    return emptyNaturopathSnapshot();
  }

  try {
    const rows = await withTimeout(
      (async () => {
        const { data, error } = await supabase
          .from("protocol_shares")
          .select("id, patient_id, status, invite_email, accepted_at, updated_at")
          .eq("provider_id", args.userId)
          .eq("status", "active")
          .order("updated_at", { ascending: false });
        if (error) throw error;
        return (data ?? []) as ShareRow[];
      })(),
      4000,
      `${scope}.shares`,
    );

    const patientIds = rows.map((row) => row.patient_id);
    const profileNames = await loadProfileNames(supabase, patientIds, scope);

    const partners: LiveRosterPatient[] = rows.map((row) => ({
      relationshipId: row.id,
      patientId: row.patient_id,
      displayName: displayNameFromInviteFields({
        fullName: profileNames.get(row.patient_id),
        email: row.invite_email,
      }),
      email: row.invite_email,
      status: "active",
      firstVisitDate: row.accepted_at,
      invitedAt: null,
      updatedAt: row.updated_at,
      chiefComplaint: null,
      tags: [],
    }));

    const entitled = naturopathPartnersForRole(
      args.role,
      partners
        .filter((row) => row.patientId)
        .map((row) => ({
          id: row.patientId as string,
          displayName: row.displayName,
        })),
    );

    return {
      partners: partners.filter(
        (row) => row.patientId && entitled.some((item) => item.id === row.patientId),
      ),
      activeCount: entitled.length,
      lookupFailed: false,
    };
  } catch (error) {
    if (isTimeoutError(error)) {
      safeLog.warn(scope, "protocol_shares lookup timed out", { error });
    } else {
      safeLog.error(scope, "protocol_shares lookup failed", { error });
    }
    return emptyNaturopathSnapshot(true);
  }
}
