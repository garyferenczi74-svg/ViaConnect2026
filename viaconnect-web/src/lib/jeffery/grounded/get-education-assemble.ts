/**
 * In-process get_education assemble (chat wrap).
 *
 * Edu SSOT: READ loadConsumerEducationEntryByKey / loadConsumerEducationEntries
 *   (peptide_education_entries, is_practitioner_depth false, Thanos consumer keys).
 *   Mechanism first, then regulatory/safety_context as stored.
 *   Never invent monograph bodies, doses, or alias rows.
 *
 * safety_never_say: Lex/FAQ fixtures only — no new clinical invent.
 *
 * No HTTP loopback. No table writes.
 */

import {
  isPractitionerDepthEntryKey,
  type EducationEntry,
} from "@/lib/peptides/educationEntryFields";
import { loadConsumerEducationEntryByKey } from "@/lib/peptides/educationEntries";
import { isTimeoutError } from "@/lib/utils/with-timeout";
import { safeLog } from "@/lib/utils/safe-log";
import { dropPractitionerDepthEducation } from "./lookup-peptide-wrap";
import {
  isSafetyNeverSayId,
  isStageAEducationAllowlisted,
  safetyNeverSayFixture,
  type SafetyNeverSayFixture,
} from "./education-allowlist";

export const GET_EDUCATION_ROUTE = "peptide_education_entries / Stage A education allowlist";

export interface GetEducationAssembleInput {
  topic_id: string;
}

export interface GetEducationStoredRow {
  entryKey: string;
  title: string;
  isPeptide: boolean;
  mechanism: string | null;
  evidenceGrade: string;
  regulatoryStatus: string | null;
  safetyContext: string | null;
  provenanceText: string | null;
  pmids: string[];
}

export type GetEducationBlockedReason =
  | "depth"
  | "glp1"
  | "semaglutide"
  | "tirzepatide"
  | "oral_stack"
  | "clinician_only";

export type GetEducationEngineLoadStatus = "ok" | "unauthorized" | "error";

export interface GetEducationEnginePayload {
  loadStatus: GetEducationEngineLoadStatus;
  topicId: string;
  education: GetEducationStoredRow | null;
  educationFailed?: boolean;
  safetyFixture?: SafetyNeverSayFixture | null;
  blocked?: GetEducationBlockedReason;
  error?: string;
}

export type AssembleGetEducationFn = (
  input: GetEducationAssembleInput
) => Promise<GetEducationEnginePayload>;

export function failedGetEducationPayload(
  topicId: string,
  extra: Partial<GetEducationEnginePayload> = {}
): GetEducationEnginePayload {
  return {
    loadStatus: "error",
    topicId,
    education: null,
    educationFailed: true,
    ...extra,
  };
}

export function educationRowFromEntry(entry: EducationEntry): GetEducationStoredRow | null {
  if (isPractitionerDepthEntryKey(entry.entryKey)) return null;
  return {
    entryKey: entry.entryKey,
    title: entry.title,
    isPeptide: entry.isPeptide,
    mechanism: entry.mechanism,
    evidenceGrade: entry.evidenceGrade,
    regulatoryStatus: entry.regulatoryStatus,
    safetyContext: entry.safetyContext,
    provenanceText: entry.provenanceText,
    pmids: [...entry.pmids],
  };
}

function hasStoredEducationProse(row: GetEducationStoredRow): boolean {
  return Boolean(
    row.mechanism?.trim() || row.regulatoryStatus?.trim() || row.safetyContext?.trim()
  );
}

/**
 * Shared education assemble used by the grounded chat wrap.
 * Missing / empty stored row → education null (refuse, do not invent).
 */
export async function assembleGetEducation(
  input: GetEducationAssembleInput
): Promise<GetEducationEnginePayload> {
  const topicId = (input.topic_id ?? "").trim();
  if (!topicId) {
    return { loadStatus: "ok", topicId: "", education: null };
  }

  if (isSafetyNeverSayId(topicId)) {
    return {
      loadStatus: "ok",
      topicId,
      education: null,
      safetyFixture: safetyNeverSayFixture(topicId),
    };
  }

  if (isPractitionerDepthEntryKey(topicId)) {
    return { loadStatus: "ok", topicId, education: null, blocked: "depth" };
  }

  if (!isStageAEducationAllowlisted(topicId)) {
    return { loadStatus: "ok", topicId, education: null };
  }

  try {
    const entry = await loadConsumerEducationEntryByKey(topicId);
    if (!entry) {
      return { loadStatus: "ok", topicId, education: null };
    }
    const dropped = dropPractitionerDepthEducation({
      entryKey: entry.entryKey,
      title: entry.title,
      isPeptide: entry.isPeptide,
      mechanism: entry.mechanism,
      evidenceGrade: entry.evidenceGrade,
    });
    if (!dropped) {
      return { loadStatus: "ok", topicId, education: null, blocked: "depth" };
    }
    const mapped = educationRowFromEntry(entry);
    if (!mapped || !hasStoredEducationProse(mapped)) {
      return { loadStatus: "ok", topicId, education: null };
    }
    return { loadStatus: "ok", topicId, education: mapped };
  } catch (err) {
    const error = isTimeoutError(err)
      ? "timeout"
      : err instanceof Error
        ? err.message
        : String(err);
    safeLog.warn("advisor.grounded.get-education", "education read failed", {
      topicId,
      error,
    });
    return failedGetEducationPayload(topicId, { error });
  }
}
