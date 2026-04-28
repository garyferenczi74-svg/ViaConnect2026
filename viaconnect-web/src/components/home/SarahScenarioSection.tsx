/**
 * Prompt #138d §3 + §4 + §8: server-side Sarah Scenario section.
 *
 * Fetches the active persona, active categories, active copy blocks
 * (section title, intro, three phase cards, tier explainer, hand-off CTA
 * lead), and active closing disclosure. Renders nothing if no active
 * persona exists.
 *
 * COMPOSITE_DISCLOSURE P0 enforcement at the render layer: the section
 * does not render the persona card and phase cards unless an active
 * closing disclosure also exists; the opening disclosure is implicit in
 * the intro_paragraph copy block. Defense in depth alongside the
 * rule-engine layer.
 *
 * Visual non-disruption guarantee inherited from #138 §3 holds; this is
 * a NEW section between the trust band (#138c) and the outcome timeline
 * (#138e).
 */

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import type {
  ScenarioPersonaRow,
  ScenarioCategoryRow,
  ScenarioCopyBlockRow,
  ScenarioDisclosureRow,
} from '@/lib/marketing/scenario/types';
import { PersonaCard } from './PersonaCard';
import { ScenarioPhaseCard } from './ScenarioPhaseCard';
import { TierExplainerPanel } from './TierExplainerPanel';
import { CategoryStrip } from './CategoryStrip';
import { CompositeDisclosure } from './CompositeDisclosure';

const HAND_OFF_CTA_LABEL = 'Start my assessment';
const HAND_OFF_CTA_DESTINATION = '/signup';

interface ActiveContent {
  persona: ScenarioPersonaRow;
  categories: ScenarioCategoryRow[];
  blocks: Map<string, ScenarioCopyBlockRow>;
  closingDisclosure: ScenarioDisclosureRow | null;
}

export async function SarahScenarioSection() {
  const content = await loadActiveContent();
  if (!content) return null;

  // COMPOSITE_DISCLOSURE defense in depth: phase cards do not render
  // without a closing disclosure adjacency to satisfy spec section 6.3.
  const hasOpening = !!content.blocks.get('walkthrough.intro_paragraph');
  const hasClosing = !!content.closingDisclosure;
  const hasPhaseCards =
    !!content.blocks.get('walkthrough.phase_1') ||
    !!content.blocks.get('walkthrough.phase_2') ||
    !!content.blocks.get('walkthrough.phase_3');
  if (hasPhaseCards && !(hasOpening && hasClosing)) return null;

  const sectionTitle = content.blocks.get('walkthrough.section_title');
  const introParagraph = content.blocks.get('walkthrough.intro_paragraph');
  const phase1 = content.blocks.get('walkthrough.phase_1');
  const phase2 = content.blocks.get('walkthrough.phase_2');
  const phase3 = content.blocks.get('walkthrough.phase_3');
  const tierExplainer = content.blocks.get('walkthrough.tier_explainer');
  const ctaLead = content.blocks.get('walkthrough.hand_off_cta_lead');

  return (
    <section className="relative bg-[rgba(13,18,37,0.85)] backdrop-blur-xl border-t border-white/[0.04]">
      <div className="max-w-7xl mx-auto px-6 py-12 sm:py-16 lg:py-20 space-y-8 sm:space-y-10">
        {sectionTitle && (
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white">
              {sectionTitle.block_text}
            </h2>
            {introParagraph && (
              <CompositeDisclosure
                text={introParagraph.block_text}
                placement="opening"
              />
            )}
          </div>
        )}

        <PersonaCard
          displayName={content.persona.persona_display_name}
          ageBand={content.persona.age_band}
          lifestyleDescriptors={content.persona.lifestyle_descriptors}
          healthConcerns={content.persona.health_concerns_consumer_language}
        />

        {(phase1 || phase2 || phase3) && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
            {phase1 && <ScenarioPhaseCard phaseNumber={1} body={phase1.block_text} />}
            {phase2 && <ScenarioPhaseCard phaseNumber={2} body={phase2.block_text} />}
            {phase3 && <ScenarioPhaseCard phaseNumber={3} body={phase3.block_text} />}
          </div>
        )}

        {content.categories.length > 0 && (
          <CategoryStrip
            categories={content.categories.map((c) => ({
              id: c.id,
              category_code: c.category_code,
              category_display_name: c.category_display_name,
            }))}
          />
        )}

        {tierExplainer && <TierExplainerPanel text={tierExplainer.block_text} />}

        {ctaLead && (
          <div className="text-center max-w-3xl mx-auto space-y-5">
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
              {ctaLead.block_text}
            </p>
            <Link
              href={HAND_OFF_CTA_DESTINATION}
              className="inline-flex h-12 items-center justify-center rounded-full bg-[#b75e18] pl-6 pr-4 text-base font-semibold text-white shadow-[0_0_20px_rgba(183,94,24,0.4)] transition-all duration-300 hover:bg-[#d4741f] hover:shadow-[0_0_30px_rgba(183,94,24,0.6)] min-h-[44px]"
            >
              <span>{HAND_OFF_CTA_LABEL}</span>
              <ChevronRight className="ml-1" strokeWidth={2} />
            </Link>
          </div>
        )}

        {content.closingDisclosure && (
          <CompositeDisclosure
            text={content.closingDisclosure.disclosure_text}
            placement={content.closingDisclosure.disclosure_placement}
          />
        )}
      </div>
    </section>
  );
}

async function loadActiveContent(): Promise<ActiveContent | null> {
  try {
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: persona } = await (supabase as any)
      .from('scenario_personas')
      .select('*')
      .eq('active', true)
      .order('display_order', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!persona) return null;
    const p = persona as ScenarioPersonaRow;

    const [catsResp, blocksResp, disclosureResp] = await Promise.all([
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase as any)
        .from('scenario_categories')
        .select('*')
        .in('id', p.protocol_category_refs)
        .eq('active', true),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase as any)
        .from('scenario_copy_blocks')
        .select('*')
        .eq('surface', 'walkthrough')
        .eq('active', true)
        .order('display_order', { ascending: true }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase as any)
        .from('scenario_disclosures')
        .select('*')
        .eq('active', true)
        .in('disclosure_placement', ['closing', 'both'])
        .limit(1)
        .maybeSingle(),
    ]);

    const blocks = new Map<string, ScenarioCopyBlockRow>();
    for (const b of (blocksResp.data ?? []) as ScenarioCopyBlockRow[]) {
      blocks.set(b.slot_id, b);
    }

    return {
      persona: p,
      categories: ((catsResp.data ?? []) as ScenarioCategoryRow[]).sort((a, b) =>
        p.protocol_category_refs.indexOf(a.id) - p.protocol_category_refs.indexOf(b.id),
      ),
      blocks,
      closingDisclosure: (disclosureResp.data ?? null) as ScenarioDisclosureRow | null,
    };
  } catch {
    return null;
  }
}
