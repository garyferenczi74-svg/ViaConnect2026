/**
 * Prompt #138c §3 + §5: server-side trust band section.
 *
 * Fetches the single active regulatory paragraph, the active clinician
 * cards in display_order, and the active trust chips in display_order,
 * then composes the band. Renders nothing if no active content exists,
 * so the page stays clean during Phase A operational rollout when nothing
 * has been activated yet.
 *
 * Visual non-disruption guarantee inherited from #138 §3: the band is a
 * NEW section between the hero and the next existing section. It does not
 * modify any sibling section's markup, classes, or layout.
 */

import { createClient } from '@/lib/supabase/server';
import type {
  RegulatoryParagraphRow,
  ClinicianCardRow,
  TrustChipRow,
} from '@/lib/marketing/trustband/types';
import { RegulatoryParagraph } from './RegulatoryParagraph';
import { ClinicianCard } from './ClinicianCard';
import { TrustChipGrid } from './TrustChipGrid';

interface ActiveContent {
  regulatory: RegulatoryParagraphRow | null;
  clinicians: ClinicianCardRow[];
  chips: TrustChipRow[];
}

export async function TrustBandSection() {
  const content = await loadActiveContent();
  if (!content || (
    !content.regulatory && content.clinicians.length === 0 && content.chips.length === 0
  )) {
    return null;
  }

  return (
    <section className="relative bg-[rgba(13,18,37,0.85)] backdrop-blur-xl border-t border-white/[0.04]">
      <div className="max-w-7xl mx-auto px-6 py-12 sm:py-16 lg:py-20 space-y-8 sm:space-y-10">
        {content.regulatory && (
          <RegulatoryParagraph text={content.regulatory.paragraph_text} />
        )}

        {content.clinicians.length > 0 && (
          <div className="space-y-4">
            {content.clinicians.map((c) => (
              <ClinicianCard
                key={c.id}
                displayName={c.clinician_display_name}
                credentialLine={c.credential_line}
                roleLine={c.role_line}
                descriptorSentence={c.descriptor_sentence}
              />
            ))}
          </div>
        )}

        {content.chips.length > 0 && (
          <TrustChipGrid
            chips={content.chips.map((c) => ({
              id: c.id,
              icon_name: c.icon_name,
              chip_text: c.chip_text,
            }))}
          />
        )}
      </div>
    </section>
  );
}

async function loadActiveContent(): Promise<ActiveContent | null> {
  try {
    const supabase = createClient();
    const [regResp, clinResp, chipsResp] = await Promise.all([
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase as any)
        .from('trust_band_regulatory_paragraphs')
        .select('*')
        .eq('active', true)
        .limit(1)
        .maybeSingle(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase as any)
        .from('trust_band_clinician_cards')
        .select('*')
        .eq('active', true)
        .order('display_order', { ascending: true }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase as any)
        .from('trust_band_chips')
        .select('*')
        .eq('active', true)
        .order('display_order', { ascending: true }),
    ]);

    return {
      regulatory: (regResp.data ?? null) as RegulatoryParagraphRow | null,
      clinicians: (clinResp.data ?? []) as ClinicianCardRow[],
      chips: (chipsResp.data ?? []) as TrustChipRow[],
    };
  } catch {
    return null;
  }
}
