// Prompt #124 P3: Takedown drafter.
//
// Given a confirmed counterfeit determination and a target platform
// (mechanism), loads the active template from takedown_templates,
// slot-fills it with determination + listing data, and writes a draft row
// to takedown_requests. The draft status is 'drafted' — Steve must
// approve + submit separately from the admin UI in P4.
//
// Detection-only philosophy: this module never fires a takedown. Every
// draft lands in a review queue. First-time drafts on a given platform
// carry a flag for dual approval (Thomas or Gary co-sign) — surfaced in
// the UI, enforced at submit-time by the API route in P5.

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  Determination,
  ReferenceCorpusEntry,
  TakedownMechanism,
  VisionConfigSnapshot,
} from './types';
import { canDraftTakedown } from './config';
import { log } from './logging';

export interface DraftTakedownInput {
  supabase: SupabaseClient;
  determinationId: string;
  /** The Determination object powering the draft; used to fill reasoning slots. */
  determination: Determination;
  mechanism: TakedownMechanism;
  jurisdiction?: string;
  language?: string;
  listingUrl: string;
  /** Optional evidence: cited reference corpus entries for rendering. */
  citedReferences?: readonly ReferenceCorpusEntry[];
  /** Identity of the actor initiating the draft (used as `submitted_by` placeholder; not actually submitted). */
  actorId: string;
  /** #119 finding id associated with the counterfeit determination. */
  findingId?: string;
  /** Optional test-buy that backs this draft. */
  testBuyId?: string;
  config: VisionConfigSnapshot;
}

export interface DraftTakedownResult {
  takedownRequestId: string;
  templateId: string;
  templateVersion: number;
  draftBody: string;
  firstTimeForPlatform: boolean;
  requiredSlotsStatus: Record<string, 'filled' | 'missing'>;
}

export class TakedownDraftError extends Error {
  constructor(public code: TakedownDraftErrorCode, message: string) {
    super(message);
    this.name = 'TakedownDraftError';
  }
}

export type TakedownDraftErrorCode =
  | 'platform_disabled'
  | 'no_active_template'
  | 'missing_required_slots'
  | 'insert_failed';

export async function draftTakedown(input: DraftTakedownInput): Promise<DraftTakedownResult> {
  const { supabase, mechanism, config } = input;

  if (!canDraftTakedown(config, mechanism)) {
    throw new TakedownDraftError(
      'platform_disabled',
      `Takedown drafts disabled for platform ${mechanism}. Flip marshall_vision_config takedown.${mechanism} to true first.`,
    );
  }

  const jurisdiction = input.jurisdiction ?? 'generic';
  const language = input.language ?? 'en-US';

  // 1. Load active template for (mechanism, jurisdiction). Most recent version wins.
  const { data: tpl, error: tplErr } = await supabase
    .from('takedown_templates')
    .select('id, template_code, version, jurisdiction, language, body, required_slots')
    .eq('mechanism', mechanism)
    .eq('jurisdiction', jurisdiction)
    .eq('language', language)
    .eq('active', true)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (tplErr) {
    throw new TakedownDraftError('no_active_template', `template lookup failed: ${tplErr.message}`);
  }
  if (!tpl) {
    throw new TakedownDraftError(
      'no_active_template',
      `no active template for ${mechanism} / ${jurisdiction} / ${language}`,
    );
  }
  const template = tpl as { id: string; version: number; body: string; required_slots: string[] };

  // 2. Build slot dictionary from the determination + input fields.
  const slots = buildSlots(input);
  const slotStatus: Record<string, 'filled' | 'missing'> = {};
  for (const s of template.required_slots) {
    slotStatus[s] = slots[s] !== undefined && String(slots[s]).length > 0 ? 'filled' : 'missing';
  }
  const missing = Object.entries(slotStatus).filter(([, v]) => v === 'missing').map(([k]) => k);
  if (missing.length > 0) {
    throw new TakedownDraftError(
      'missing_required_slots',
      `missing slots: ${missing.join(', ')}`,
    );
  }

  const draftBody = fillTemplate(template.body, slots);

  // 3. Determine first-time-for-platform by counting submitted takedowns for this mechanism.
  const { count: priorCount } = await supabase
    .from('takedown_requests')
    .select('id', { count: 'exact', head: true })
    .eq('platform', mechanism);
  const firstTimeForPlatform = (priorCount ?? 0) === 0;

  // 4. Insert draft row.
  const { data: ins, error: insErr } = await supabase
    .from('takedown_requests')
    .insert({
      finding_id: input.findingId ?? null,
      platform: mechanism,
      listing_url: input.listingUrl,
      mechanism,
      status: 'drafted',
      draft_body: draftBody,
      vision_determination_id: input.determinationId,
      test_buy_id: input.testBuyId ?? null,
      template_id: template.id,
      template_version: template.version,
    })
    .select('id')
    .single();
  if (insErr) {
    throw new TakedownDraftError('insert_failed', `takedown_requests insert: ${insErr.message}`);
  }
  const takedownRequestId = (ins as { id: string }).id;

  log.info('takedown_drafted', {
    evaluationId: input.determination.evaluationId,
    verdict: input.determination.verdict,
    confidence: input.determination.confidence,
    note: `mechanism=${mechanism} firstTime=${firstTimeForPlatform}`,
  });

  return {
    takedownRequestId,
    templateId: template.id,
    templateVersion: template.version,
    draftBody,
    firstTimeForPlatform,
    requiredSlotsStatus: slotStatus,
  };
}

/**
 * Build the slot dictionary for a takedown template. Exposed for tests so
 * template-fill can be exercised without Supabase.
 */
export function buildSlots(input: DraftTakedownInput): Record<string, string> {
  const d = input.determination;
  const mismatchList = d.mismatchFlags.length > 0
    ? d.mismatchFlags.map((f) => `- ${f.replace(/_/g, ' ')}`).join('\n')
    : '- none reported';
  const featureTrace = d.reasoningTrace.length > 0
    ? d.reasoningTrace.slice(0, 12).map((t) =>
        `- feature=${t.feature}; observation=${t.observation}; match=${t.match}; ref=${t.reference_image || 'n/a'}; note=${truncate(t.note, 240)}`,
      ).join('\n')
    : '- no feature observations available';
  const citedRefList = (input.citedReferences ?? [])
    .map((r) => `- ${r.storageKey} (sku=${r.sku}, kind=${r.artifactKind}, version=${r.version})`)
    .join('\n') || '- reference corpus citations attached separately';

  return {
    listing_url: input.listingUrl,
    listing_platform: input.mechanism,
    evaluation_id: d.evaluationId,
    matched_sku: d.matchedSku ?? 'unidentified',
    verdict: d.verdict,
    confidence: d.confidence.toFixed(2),
    mismatch_flags: mismatchList,
    feature_trace: featureTrace,
    cited_reference_list: citedRefList,
    finding_id: input.findingId ?? 'pending',
    test_buy_id: input.testBuyId ?? 'n/a',
    actor_id: input.actorId,
    brand_legal_name: 'FarmCeutica Wellness LLC',
    platform_name: MECHANISM_DISPLAY_NAMES[input.mechanism],
    jurisdiction: input.jurisdiction ?? 'generic',
    language: input.language ?? 'en-US',
  };
}

export const MECHANISM_DISPLAY_NAMES: Record<TakedownMechanism, string> = {
  amazon_brand_registry: 'Amazon Brand Registry',
  ebay_vero: 'eBay VeRO',
  walmart_seller_protection: 'Walmart Marketplace Seller Protection',
  etsy_ip_policy: 'Etsy IP Policy',
  dmca_takedown: 'DMCA Takedown',
  platform_trust_safety: 'Platform Trust & Safety',
  manual_legal: 'Manual Legal Counsel',
};

/** Replace `{{slot_name}}` with value. Unknown slots stay as-is for visibility. */
export function fillTemplate(body: string, slots: Record<string, string>): string {
  return body.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match, name) => {
    const v = slots[name];
    return v === undefined ? match : v;
  });
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 1) + '…';
}
