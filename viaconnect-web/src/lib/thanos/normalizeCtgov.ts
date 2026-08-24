/**
 * Prompt 225a: map CT.gov v2 JSON to redacted kb_trials fields.
 */

import { createHash } from 'node:crypto';
import {
  redactDoseInstructionText,
  redactInterventionName,
} from '@/lib/thanos/doseRedaction';

export interface NormalizedCtgovTrial {
  nctId: string;
  canonicalTrialId: string;
  briefTitle: string;
  officialTitle: string;
  status: string;
  statusReason: string | null;
  phase: string;
  studyType: string;
  allocation: string | null;
  masking: string | null;
  interventionModel: string | null;
  enrollmentCount: number | null;
  enrollmentType: 'actual' | 'estimated' | null;
  conditions: string[];
  interventionNames: string[];
  armCount: number;
  hasComparator: boolean;
  comparatorType: 'placebo' | 'active' | 'none' | 'unknown';
  hasResultsPosted: boolean;
  primaryOutcomeTitles: string[];
  sponsorName: string | null;
  sponsorClass: string | null;
  countries: string[];
  startDate: string | null;
  completionDate: string | null;
  lastUpdatePosted: string | null;
  sourceUrl: string;
  doseRedactionApplied: true;
  redactionCount: number;
  rawHash: string;
  /** Proof-only: sample of pre-redaction text that contained dose tokens. */
  redactionProof?: {
    beforeSample: string;
    afterSample: string;
  };
}

function mapStatus(raw?: string): string {
  const s = (raw ?? '').toUpperCase().replace(/\s+/g, '_');
  const map: Record<string, string> = {
    NOT_YET_RECRUITING: 'not_yet_recruiting',
    RECRUITING: 'recruiting',
    ACTIVE_NOT_RECRUITING: 'active_not_recruiting',
    COMPLETED: 'completed',
    TERMINATED: 'terminated',
    SUSPENDED: 'suspended',
    WITHDRAWN: 'withdrawn',
  };
  return map[s] ?? 'unknown';
}

function mapPhase(phases?: string[]): string {
  const p = (phases ?? []).join(' ').toUpperCase();
  if (p.includes('EARLY_PHASE1') || p.includes('EARLY PHASE 1')) return 'early_phase_1';
  if (p.includes('PHASE1') || p.includes('PHASE 1')) return 'phase_1';
  if (p.includes('PHASE2') || p.includes('PHASE 2')) return 'phase_2';
  if (p.includes('PHASE3') || p.includes('PHASE 3')) return 'phase_3';
  if (p.includes('PHASE4') || p.includes('PHASE 4')) return 'phase_4';
  if (p.includes('NA') || p.includes('N/A')) return 'not_applicable';
  return 'unknown';
}

function mapStudyType(raw?: string): string {
  const s = (raw ?? '').toUpperCase();
  if (s.includes('OBSERVATIONAL')) return 'observational';
  if (s.includes('EXPANDED')) return 'expanded_access';
  return 'interventional';
}

function mapSponsorClass(raw?: string): string | null {
  const s = (raw ?? '').toUpperCase();
  if (s.includes('INDUSTRY')) return 'industry';
  if (s.includes('NIH')) return 'nih';
  if (s.includes('OTHER_GOV') || s.includes('FED')) return 'other_gov';
  if (s.includes('OTHER') || s.includes('NETWORK')) return 'academic';
  if (s.includes('INDIVIDUAL')) return 'individual';
  return null;
}

function parseDate(raw?: string | null): string | null {
  if (!raw) return null;
  const m = String(raw).match(/^(\d{4}-\d{2}-\d{2}|\d{4}-\d{2}|\d{4})/);
  if (!m) return null;
  if (m[1].length === 4) return `${m[1]}-01-01`;
  if (m[1].length === 7) return `${m[1]}-01`;
  return m[1];
}

export function normalizeCtgovStudy(study: unknown): NormalizedCtgovTrial | null {
  const root = study as {
    protocolSection?: Record<string, any>;
    hasResults?: boolean;
  };
  const ps = root.protocolSection;
  if (!ps) return null;

  const id = ps.identificationModule ?? {};
  const nctId = String(id.nctId ?? '').toUpperCase();
  if (!/^NCT\d+$/.test(nctId)) return null;

  const statusMod = ps.statusModule ?? {};
  const designMod = ps.designModule ?? {};
  const designInfo = designMod.designInfo ?? {};
  const armsMod = ps.armsInterventionsModule ?? {};
  const conditionsMod = ps.conditionsModule ?? {};
  const outcomesMod = ps.outcomesModule ?? {};
  const sponsorMod = ps.sponsorCollaboratorsModule ?? {};
  const contactsMod = ps.contactsLocationsModule ?? {};

  const interventions = Array.isArray(armsMod.interventions)
    ? armsMod.interventions
    : [];
  const arms = Array.isArray(armsMod.armGroups) ? armsMod.armGroups : [];

  let redactionCount = 0;
  let proofBefore = '';
  let proofAfter = '';

  const interventionNames: string[] = [];
  for (const inter of interventions) {
    const rawName = String(inter?.name ?? '').trim();
    const rawDesc = String(inter?.description ?? '').trim();
    const combined = `${rawName} ${rawDesc}`.trim();
    if (!proofBefore && /\d/.test(combined) && /\b(mg|mcg|ml|weekly|daily)\b/i.test(combined)) {
      proofBefore = combined.slice(0, 240);
      const red = redactDoseInstructionText(combined);
      proofAfter = red.text.slice(0, 240);
      redactionCount += red.redactionCount;
    } else {
      const red = redactDoseInstructionText(combined);
      redactionCount += red.redactionCount;
    }
    const cleaned = redactInterventionName(rawName || combined);
    if (cleaned) interventionNames.push(cleaned);
  }

  for (const arm of arms) {
    const raw = `${arm?.label ?? ''} ${arm?.description ?? ''}`.trim();
    const red = redactDoseInstructionText(raw);
    redactionCount += red.redactionCount;
    if (!proofBefore && red.redactionCount > 0) {
      proofBefore = raw.slice(0, 240);
      proofAfter = red.text.slice(0, 240);
    }
  }

  const armTypes = arms.map((a: { type?: string }) =>
    String(a?.type ?? '').toUpperCase(),
  );
  const hasPlacebo = armTypes.some((t) => t.includes('PLACEBO'));
  const hasActive = armTypes.some((t) => t.includes('ACTIVE'));
  let comparatorType: NormalizedCtgovTrial['comparatorType'] = 'unknown';
  if (hasPlacebo) comparatorType = 'placebo';
  else if (hasActive) comparatorType = 'active';
  else if (arms.length <= 1) comparatorType = 'none';

  const enrollmentInfo = designMod.enrollmentInfo ?? {};
  let enrollmentCount: number | null =
    typeof enrollmentInfo.count === 'number' ? enrollmentInfo.count : null;
  if (enrollmentCount !== null && enrollmentCount <= 0) enrollmentCount = null;

  const lead = sponsorMod.leadSponsor ?? {};
  const locations = Array.isArray(contactsMod.locations)
    ? contactsMod.locations
    : [];
  const countries = [
    ...new Set(
      locations
        .map((l: { country?: string }) => String(l?.country ?? '').trim())
        .filter(Boolean),
    ),
  ];

  const primaryOutcomes = Array.isArray(outcomesMod.primaryOutcomes)
    ? outcomesMod.primaryOutcomes
    : [];
  const primaryOutcomeTitles = primaryOutcomes
    .map((o: { measure?: string }) => {
      const raw = String(o?.measure ?? '').trim();
      const red = redactDoseInstructionText(raw);
      redactionCount += red.redactionCount;
      return red.text.replace(/\[REDACTED\]/g, '').replace(/\s{2,}/g, ' ').trim();
    })
    .filter(Boolean)
    .slice(0, 12);

  const rawForHash = JSON.stringify({
    nctId,
    briefTitle: id.briefTitle,
    lastUpdate: statusMod.lastUpdatePostDateStruct?.date,
    interventions: interventions.map((i: { name?: string; description?: string }) => ({
      name: i?.name,
      description: i?.description,
    })),
  });
  const rawHash = createHash('sha256').update(rawForHash).digest('hex');

  const maskingInfo = designInfo.maskingInfo ?? {};
  const masking =
    typeof maskingInfo.masking === 'string'
      ? maskingInfo.masking
      : maskingInfo.maskingDescription
        ? String(maskingInfo.maskingDescription).slice(0, 80)
        : null;

  return {
    nctId,
    canonicalTrialId: `ctgov:${nctId}`,
    briefTitle: String(id.briefTitle ?? nctId).slice(0, 500),
    officialTitle: String(id.officialTitle ?? '').slice(0, 800),
    status: mapStatus(statusMod.overallStatus),
    statusReason: statusMod.whyStopped
      ? redactDoseInstructionText(String(statusMod.whyStopped)).text.slice(0, 500)
      : null,
    phase: mapPhase(designMod.phases),
    studyType: mapStudyType(designMod.studyType),
    allocation: designInfo.allocation ? String(designInfo.allocation) : null,
    masking,
    interventionModel: designInfo.interventionModel
      ? String(designInfo.interventionModel)
      : null,
    enrollmentCount,
    enrollmentType:
      String(enrollmentInfo.type ?? '').toUpperCase() === 'ACTUAL'
        ? 'actual'
        : String(enrollmentInfo.type ?? '').toUpperCase() === 'ESTIMATED'
          ? 'estimated'
          : null,
    conditions: (conditionsMod.conditions ?? []).map(String).slice(0, 40),
    interventionNames: [...new Set(interventionNames)].slice(0, 40),
    armCount: arms.length,
    hasComparator: comparatorType === 'placebo' || comparatorType === 'active',
    comparatorType,
    hasResultsPosted: root.hasResults === true,
    primaryOutcomeTitles,
    sponsorName: lead.name ? String(lead.name).slice(0, 240) : null,
    sponsorClass: mapSponsorClass(lead.class),
    countries: countries.slice(0, 40),
    startDate: parseDate(statusMod.startDateStruct?.date),
    completionDate: parseDate(
      statusMod.completionDateStruct?.date ??
        statusMod.primaryCompletionDateStruct?.date,
    ),
    lastUpdatePosted: parseDate(statusMod.lastUpdatePostDateStruct?.date),
    sourceUrl: `https://clinicaltrials.gov/study/${nctId}`,
    doseRedactionApplied: true,
    redactionCount,
    rawHash,
    redactionProof:
      proofBefore && proofAfter
        ? { beforeSample: proofBefore, afterSample: proofAfter }
        : undefined,
  };
}
