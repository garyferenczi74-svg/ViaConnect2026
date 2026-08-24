/**
 * Prompt 213a: Marshall content/lexicon gate + Lex legal escalation for Hound Dog staging.
 * Nothing reaches consumer surfaces until approved.
 * (Separate from confidence-gate bridge in ./gate.ts.)
 */

import type { createAdminClient } from '@/lib/supabase/admin';

export type ContentGateVerdict = 'approved' | 'blocked' | 'escalated';

export interface StagingCandidate {
  id?: string;
  title: string;
  summary: string;
  source_url: string;
  source_type: string;
}

const FORBIDDEN = [
  /semaglutide/i,
  /cure[sd]?\b/i,
  /diagnos(e|is|ing)/i,
  /treats?\s+cancer/i,
  /buy\s+now/i,
  /add\s+to\s+cart/i,
];

const PEPTIDE_COMMERCIAL = [
  /order\s+retatrutide/i,
  /purchase\s+tirzepatide/i,
  /for\s+sale.*peptide/i,
];

/**
 * Pure gate: Marshall content/lexicon checks. Returns escalated when legal-adjacent.
 */
export function evaluateHoundDogGate(item: StagingCandidate): {
  verdict: ContentGateVerdict;
  notes: string;
  agent: 'marshall' | 'lex';
} {
  const text = `${item.title}\n${item.summary}`;

  for (const re of FORBIDDEN) {
    if (re.test(text)) {
      return {
        verdict: 'blocked',
        notes: `Marshall blocked: forbidden medical/commercial framing (${re.source})`,
        agent: 'marshall',
      };
    }
  }

  for (const re of PEPTIDE_COMMERCIAL) {
    if (re.test(text)) {
      return {
        verdict: 'blocked',
        notes: 'Marshall blocked: peptide commercial framing (practitioner educational only)',
        agent: 'marshall',
      };
    }
  }

  if (/\b\d+\s*[-to]+\s*\d+\s*x\b/i.test(text) && /bioavail/i.test(text)) {
    return {
      verdict: 'escalated',
      notes: 'Lex review: bioavailability phrasing must use Maximum Bioavailability',
      agent: 'lex',
    };
  }

  if (/\b(disease|disorder|syndrome)\b/i.test(text) && /\b(treat|therapy|drug)\b/i.test(text)) {
    return {
      verdict: 'escalated',
      notes: 'Lex escalation: disease-treatment adjacency',
      agent: 'lex',
    };
  }

  return {
    verdict: 'approved',
    notes: 'Marshall approved for structure/function educational staging',
    agent: 'marshall',
  };
}

type AdminClient = ReturnType<typeof createAdminClient>;

/**
 * Run gate on pending staging rows; promote approved to hounddog_gated_items.
 */
export async function processHoundDogGateQueue(
  supabase: AdminClient,
  limit = 20,
): Promise<{ approved: number; blocked: number; escalated: number }> {
  const counts = { approved: 0, blocked: 0, escalated: 0 };

  const { data, error } = await supabase
    .from('hounddog_staging_items')
    .select('id, title, summary, source_url, source_type, gate_status')
    .eq('gate_status', 'pending')
    .limit(limit);

  if (error || !Array.isArray(data)) return counts;

  for (const raw of data) {
    const row = raw as StagingCandidate & { id: string; source_type: string };
    const result = evaluateHoundDogGate(row);

    await supabase
      .from('hounddog_staging_items')
      .update({
        gate_status: result.verdict,
        gate_checked_at: new Date().toISOString(),
        gate_notes: result.notes,
        gate_agent: result.agent,
      })
      .eq('id', row.id);

    if (result.verdict === 'approved') {
      counts.approved += 1;
      await supabase.from('hounddog_gated_items').upsert(
        {
          staging_id: row.id,
          source_url: row.source_url,
          source_type: row.source_type,
          title: row.title,
          summary: row.summary,
          approved_by: result.agent,
          attribution: row.source_url,
        },
        { onConflict: 'staging_id' },
      );
    } else if (result.verdict === 'blocked') {
      counts.blocked += 1;
    } else {
      counts.escalated += 1;
    }
  }

  return counts;
}
