/**
 * Prompt #138a Phase 4: server-side hero variant renderer.
 *
 * Reads the visitor cookie (set by middleware), fetches the active test
 * round and its variant set for surface 'hero', and assigns deterministically
 * via assignVariant() (SHA-256 of visitor_id || test_id, modulo bucket
 * count). Renders HeroSection with the selected variant's text, plus an
 * ImpressionBeacon to record the render client-side.
 *
 * Falls back to control (HeroSection with no props) when:
 *   - no cookie is present (middleware sets one on first visit; this is
 *     a defensive fallback only)
 *   - no test round is active (paused or none created)
 *   - the active round names zero variants currently active_in_test=true
 *   - any DB error occurs along the way
 *
 * Visual non-disruption guarantee in spec section 3 holds either way:
 * HeroSection's visual structure does not change, only text props swap in.
 */
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { assignVariant } from '@/lib/marketing/variants/assignment';
import { VISITOR_COOKIE_NAME } from '@/lib/marketing/variants/types';
import type { MarketingCopyVariantRow, MarketingCopyTestRoundRow } from '@/lib/marketing/variants/types';
import { HeroSection } from './HeroSection';
import { ImpressionBeacon } from './ImpressionBeacon';

const CONTROL_SLOT_ID = 'hero.variant.control';

interface SelectedVariant {
  slot_id: string;
  headline_text: string | null;
  subheadline_text: string | null;
  cta_label: string | null;
  cta_destination: string | null;
}

export async function HeroVariantRenderer() {
  const visitorId = cookies().get(VISITOR_COOKIE_NAME)?.value ?? null;
  const selected = visitorId ? await selectVariantForVisitor(visitorId) : null;

  if (!selected || selected.slot_id === CONTROL_SLOT_ID) {
    return (
      <>
        <HeroSection />
        {visitorId ? <ImpressionBeacon visitorId={visitorId} slotId={CONTROL_SLOT_ID} /> : null}
      </>
    );
  }

  return (
    <>
      <HeroSection
        variantHeadline={selected.headline_text ?? undefined}
        variantSubheadline={selected.subheadline_text ?? undefined}
        variantCtaLabel={selected.cta_label ?? undefined}
        variantCtaHref={selected.cta_destination ?? undefined}
      />
      <ImpressionBeacon visitorId={visitorId!} slotId={selected.slot_id} />
    </>
  );
}

async function selectVariantForVisitor(visitorId: string): Promise<SelectedVariant | null> {
  try {
    const supabase = createClient();

    // Find the most recent running test round for the hero surface.
    // Running = ended_at IS NULL AND paused_at IS NULL (per spec section 6.6).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: round } = await (supabase as any)
      .from('marketing_copy_test_rounds')
      .select('id, test_id, surface, active_slot_ids, paused_at, ended_at')
      .eq('surface', 'hero')
      .is('ended_at', null)
      .is('paused_at', null)
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const activeRound = round as Pick<MarketingCopyTestRoundRow, 'test_id' | 'active_slot_ids'> | null;
    if (!activeRound || !activeRound.active_slot_ids?.length) return null;

    // Fetch the candidate variants, filter to active+not-archived defensively.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: variants } = await (supabase as any)
      .from('marketing_copy_variants')
      .select('slot_id, headline_text, subheadline_text, cta_label, cta_destination, active_in_test, archived')
      .in('slot_id', activeRound.active_slot_ids);

    const eligible = (variants as Array<Pick<MarketingCopyVariantRow,
      'slot_id' | 'headline_text' | 'subheadline_text' | 'cta_label' | 'cta_destination' | 'active_in_test' | 'archived'
    >> | null ?? []).filter((v) => v.active_in_test && !v.archived);

    if (eligible.length === 0) return null;

    // Preserve the round's declared order so assignVariant() returns the
    // same index for the same (visitor_id, test_id) across renders.
    const orderedSlots: string[] = [];
    for (const slot of activeRound.active_slot_ids) {
      if (eligible.some((v) => v.slot_id === slot)) orderedSlots.push(slot);
    }
    if (orderedSlots.length === 0) return null;

    const chosenSlot = await assignVariant({
      visitorId,
      testId: activeRound.test_id,
      activeSlotIds: orderedSlots,
    });
    if (!chosenSlot) return null;

    const chosen = eligible.find((v) => v.slot_id === chosenSlot);
    if (!chosen) return null;

    return {
      slot_id: chosen.slot_id,
      headline_text: chosen.headline_text,
      subheadline_text: chosen.subheadline_text,
      cta_label: chosen.cta_label,
      cta_destination: chosen.cta_destination,
    };
  } catch {
    return null;
  }
}
