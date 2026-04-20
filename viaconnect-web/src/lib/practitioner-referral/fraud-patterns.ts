// Prompt #98 Phase 6: Fraud pattern detectors.
//
// Four pure pattern checks, each callable in isolation from the
// fraud-detection orchestrator. Self-referral (5th spec pattern) is
// handled at attribution creation time in Phase 2's resolver.

import { normalizeAddressParts, normalizePhone } from './schema-types';

export const HIGH_VELOCITY_THRESHOLD_DEFAULT = 5;
export const HIGH_VELOCITY_WINDOW_DAYS = 30;
export const RAPID_TERMINATION_WINDOW_DAYS = 90;
export const IP_OVERLAP_THRESHOLD = 3;

export type FraudSeverity = 'low' | 'medium' | 'high' | 'blocking';

export interface PatternResult {
  detected: boolean;
  severity?: FraudSeverity;
  evidence?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// High velocity
// ---------------------------------------------------------------------------

export interface MilestoneEventLite {
  id: string;
  attribution_id: string;
  achieved_at: string;          // ISO
}

export function detectHighVelocity(input: {
  recent_events: MilestoneEventLite[];
  now: Date;
  threshold?: number;
  windowDays?: number;
}): PatternResult {
  const threshold = input.threshold ?? HIGH_VELOCITY_THRESHOLD_DEFAULT;
  const windowDays = input.windowDays ?? HIGH_VELOCITY_WINDOW_DAYS;
  const cutoffMs = input.now.getTime() - windowDays * 86_400_000;
  const inWindow = input.recent_events.filter(
    (e) => new Date(e.achieved_at).getTime() >= cutoffMs,
  ).length;

  if (inWindow <= threshold) return { detected: false };
  return {
    detected: true,
    severity: inWindow > threshold * 2 ? 'high' : 'medium',
    evidence: { events_in_window: inWindow, threshold, window_days: windowDays },
  };
}

// ---------------------------------------------------------------------------
// Cluster pattern
// ---------------------------------------------------------------------------

export interface AttributionLite {
  attribution_id: string;
  referred_practitioner_id: string;
  practice_name: string | null;
  practice_phone: string | null;
  practice_street_address: string | null;
  practice_city: string | null;
  practice_state: string | null;
  practice_postal_code: string | null;
}

export function detectClusterPattern(input: { attributions: AttributionLite[] }): PatternResult {
  if (input.attributions.length < 2) return { detected: false };

  // Count distinct attributions per normalized phone + address.
  const phoneGroups = new Map<string, Set<string>>();
  const addressGroups = new Map<string, Set<string>>();

  for (const a of input.attributions) {
    const phone = normalizePhone(a.practice_phone).slice(-10);
    if (phone.length === 10) {
      if (!phoneGroups.has(phone)) phoneGroups.set(phone, new Set());
      phoneGroups.get(phone)!.add(a.attribution_id);
    }
    // Cluster detection requires a street address; city+state+postal
    // alone is not specific enough to be a real signal.
    if (a.practice_street_address && a.practice_street_address.trim().length > 0) {
      const addr = normalizeAddressParts({
        street: a.practice_street_address,
        city: a.practice_city,
        state: a.practice_state,
        postal_code: a.practice_postal_code,
      });
      if (addr.length > 0) {
        if (!addressGroups.has(addr)) addressGroups.set(addr, new Set());
        addressGroups.get(addr)!.add(a.attribution_id);
      }
    }
  }

  let sharedPhoneCount = 0;
  for (const ids of phoneGroups.values()) {
    if (ids.size >= 2) sharedPhoneCount = Math.max(sharedPhoneCount, ids.size);
  }
  let sharedAddressCount = 0;
  for (const ids of addressGroups.values()) {
    if (ids.size >= 2) sharedAddressCount = Math.max(sharedAddressCount, ids.size);
  }

  if (sharedPhoneCount < 2 && sharedAddressCount < 2) return { detected: false };
  return {
    detected: true,
    severity: 'high',
    evidence: {
      shared_phone_count: sharedPhoneCount,
      shared_address_count: sharedAddressCount,
    },
  };
}

// ---------------------------------------------------------------------------
// Rapid termination
// ---------------------------------------------------------------------------

export function detectRapidTermination(input: {
  attributed_at: string;
  terminated_at: Date | null;
  windowDays?: number;
}): PatternResult {
  if (!input.terminated_at) return { detected: false };
  const windowDays = input.windowDays ?? RAPID_TERMINATION_WINDOW_DAYS;
  const days = Math.floor(
    (input.terminated_at.getTime() - new Date(input.attributed_at).getTime()) / 86_400_000,
  );
  if (days > windowDays) return { detected: false };
  return {
    detected: true,
    severity: 'medium',
    evidence: { days_from_attribution_to_termination: days },
  };
}

// ---------------------------------------------------------------------------
// IP overlap
// ---------------------------------------------------------------------------

export interface ClickRecordLite {
  id: string;
  attribution_id: string;
  ip_address_hash: string | null;
}

export function detectIpOverlap(input: {
  clicks: ClickRecordLite[];
  threshold?: number;
}): PatternResult {
  const threshold = input.threshold ?? IP_OVERLAP_THRESHOLD;

  // Group distinct attribution_ids per ip_hash.
  const byIp = new Map<string, Set<string>>();
  for (const c of input.clicks) {
    if (!c.ip_address_hash) continue;    // DNT-respected click
    if (!byIp.has(c.ip_address_hash)) byIp.set(c.ip_address_hash, new Set());
    byIp.get(c.ip_address_hash)!.add(c.attribution_id);
  }

  for (const [hash, attributionIds] of byIp.entries()) {
    if (attributionIds.size >= threshold) {
      return {
        detected: true,
        severity: 'high',
        evidence: {
          shared_ip_hash: hash,
          distinct_attributions: attributionIds.size,
        },
      };
    }
  }
  return { detected: false };
}
