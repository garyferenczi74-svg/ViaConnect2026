/**
 * Prompt #138e §3 + §4.9 + §8: server-side outcome timeline section.
 *
 * Fetches the single active variant set and its active phases, qualifier,
 * cta, section title, and intro paragraph. Renders nothing if there is no
 * active variant set OR if the qualifier is missing. The qualifier-required
 * fallback enforces MARSHALL.MARKETING.OUTCOME_TIMELINE_QUALIFIER_REQUIRED
 * at the render layer in addition to the rule-engine layer: timeline
 * cards never render to visitors without an active qualifier alongside them.
 *
 * Visual non-disruption guarantee inherited from #138 §3 holds; this is a
 * NEW section between the trust band (#138c) and whatever sits below.
 */

import { createClient } from '@/lib/supabase/server';
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';
import type {
  OutcomeVariantSetRow,
  OutcomePhaseRow,
  OutcomeQualifierRow,
  OutcomeCtaRow,
  OutcomeSectionBlockRow,
} from '@/lib/marketing/outcomeTimeline/types';
import { PhaseCard } from './PhaseCard';
import { QualifierBlock } from './QualifierBlock';
import { OutcomeHandOffCta } from './OutcomeHandOffCta';

interface ActiveContent {
  variantSet: OutcomeVariantSetRow;
  sectionTitle: OutcomeSectionBlockRow | null;
  introParagraph: OutcomeSectionBlockRow | null;
  phases: OutcomePhaseRow[];
  qualifier: OutcomeQualifierRow | null;
  cta: OutcomeCtaRow | null;
}

export async function OutcomeTimelineSection() {
  const content = await loadActiveContent();
  if (!content) return null;

  // Spec section 6.3: timeline cards never render without a qualifier.
  // If the qualifier is not active, fall through gracefully even if phases
  // are active; the rule-engine layer should also have caught this.
  if (content.phases.length > 0 && !content.qualifier) {
    return null;
  }

  // If neither phases nor section blocks are active, render nothing.
  if (
    content.phases.length === 0 &&
    !content.sectionTitle &&
    !content.introParagraph &&
    !content.cta
  ) {
    return null;
  }

  return (
    <section className="relative bg-[rgba(13,18,37,0.85)] backdrop-blur-xl border-t border-white/[0.04]">
      <div className="max-w-7xl mx-auto px-6 py-12 sm:py-16 lg:py-20 space-y-8 sm:space-y-10">
        {(content.sectionTitle || content.introParagraph) && (
          <div className="text-center max-w-3xl mx-auto space-y-4">
            {content.sectionTitle && (
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white">
                {content.sectionTitle.block_text}
              </h2>
            )}
            {content.introParagraph && (
              <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                {content.introParagraph.block_text}
              </p>
            )}
          </div>
        )}

        {content.phases.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
            {content.phases.map((p) => (
              <PhaseCard
                key={p.id}
                title={p.phase_title}
                subtitle={p.phase_subtitle}
                body={p.phase_body}
              />
            ))}
          </div>
        )}

        {content.qualifier && (
          <QualifierBlock text={content.qualifier.qualifier_text} />
        )}

        {content.cta && (
          <OutcomeHandOffCta
            leadText={content.cta.cta_lead_text}
            ctaLabel={content.cta.cta_label}
            ctaDestination={content.cta.cta_destination}
          />
        )}
      </div>
    </section>
  );
}

async function loadActiveContent(): Promise<ActiveContent | null> {
  // Prompt #140a Pattern C (fail-soft): timeout 8000ms.
  try {
    return await withTimeout(loadActiveContentInner(), 8000, 'home.outcome-timeline.loadActiveContent');
  } catch (error) {
    if (isTimeoutError(error)) {
      safeLog.warn('home.outcome-timeline', 'load timed out, rendering null', { error });
    } else {
      safeLog.error('home.outcome-timeline', 'load failed', { error });
    }
    return null;
  }
}

async function loadActiveContentInner(): Promise<ActiveContent | null> {
  try {
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: variantSet } = await (supabase as any)
      .from('outcome_timeline_variant_sets')
      .select('*')
      .eq('active', true)
      .limit(1)
      .maybeSingle();

    if (!variantSet) return null;
    const set = variantSet as OutcomeVariantSetRow;

    const [phasesResp, qualifierResp, ctaResp, blocksResp] = await Promise.all([
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase as any)
        .from('outcome_timeline_phases')
        .select('*')
        .eq('variant_set_id', set.id)
        .eq('active', true)
        .order('display_order', { ascending: true }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase as any)
        .from('outcome_timeline_qualifier')
        .select('*')
        .eq('variant_set_id', set.id)
        .eq('active', true)
        .limit(1)
        .maybeSingle(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase as any)
        .from('outcome_timeline_cta')
        .select('*')
        .eq('variant_set_id', set.id)
        .eq('active', true)
        .limit(1)
        .maybeSingle(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase as any)
        .from('outcome_timeline_section_blocks')
        .select('*')
        .eq('variant_set_id', set.id)
        .eq('active', true),
    ]);

    const blocks = (blocksResp.data ?? []) as OutcomeSectionBlockRow[];
    return {
      variantSet: set,
      sectionTitle: blocks.find((b) => b.block_kind === 'section_title') ?? null,
      introParagraph: blocks.find((b) => b.block_kind === 'intro_paragraph') ?? null,
      phases: (phasesResp.data ?? []) as OutcomePhaseRow[],
      qualifier: (qualifierResp.data ?? null) as OutcomeQualifierRow | null,
      cta: (ctaResp.data ?? null) as OutcomeCtaRow | null,
    };
  } catch {
    return null;
  }
}
