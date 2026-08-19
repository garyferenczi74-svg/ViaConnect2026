// Prompt 224: Biological Age v1 API (Arnold-owned, compute-on-read).
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  chronologicalAgeFromDob,
  resolveBiologicalAge,
  type BiologicalAgeInputs,
} from '@/lib/body-tracker/biological-age';

export const dynamic = 'force-dynamic';

const HORMONE_OR_METABOLIC = /cortisol|testosterone|estradiol|dhea|tsh|free.?t|glucose|hba1c|insulin|cholesterol|ldl|hdl|triglyceride|crp|homocysteine/i;

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await (supabase as any)
      .from('profiles')
      .select('date_of_birth')
      .eq('id', user.id)
      .maybeSingle();

    const chrono = profile?.date_of_birth
      ? chronologicalAgeFromDob(String(profile.date_of_birth))
      : 0;

    const { data: metabRow } = await (supabase as any)
      .from('body_tracker_metabolic')
      .select('metabolic_age, resting_hr_bpm, hrv_ms')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: weightRow } = await (supabase as any)
      .from('body_tracker_weight')
      .select('body_fat_pct')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    let labsMeasuredWithRefs = 0;
    let labsOutOfRange = 0;
    try {
      const { data: labs } = await (supabase as any)
        .from('lab_biomarkers')
        .select('name, value, reference_low, reference_high')
        .eq('user_id', user.id)
        .order('collection_date', { ascending: false })
        .limit(40);

      for (const row of labs ?? []) {
        const name = String(row.name ?? '');
        if (!HORMONE_OR_METABOLIC.test(name)) continue;
        const low = row.reference_low != null ? Number(row.reference_low) : NaN;
        const high = row.reference_high != null ? Number(row.reference_high) : NaN;
        const value = row.value != null ? Number(row.value) : NaN;
        if (!Number.isFinite(value) || (!Number.isFinite(low) && !Number.isFinite(high))) {
          continue;
        }
        labsMeasuredWithRefs += 1;
        if (
          (Number.isFinite(low) && value < low) ||
          (Number.isFinite(high) && value > high)
        ) {
          labsOutOfRange += 1;
        }
      }
    } catch {
      // lab_biomarkers may be unavailable; UNKNOWN contributes nothing
    }

    const inputs: BiologicalAgeInputs = {
      metabolicAge:
        metabRow?.metabolic_age != null ? Number(metabRow.metabolic_age) : undefined,
      restingHR:
        metabRow?.resting_hr_bpm != null ? Number(metabRow.resting_hr_bpm) : undefined,
      hrv: metabRow?.hrv_ms != null ? Number(metabRow.hrv_ms) : undefined,
      bodyFatPct:
        weightRow?.body_fat_pct != null ? Number(weightRow.body_fat_pct) : undefined,
      labsMeasuredWithRefs: labsMeasuredWithRefs || undefined,
      labsOutOfRange: labsMeasuredWithRefs ? labsOutOfRange : undefined,
    };

    const result = resolveBiologicalAge(chrono, inputs);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Biological age failed' },
      { status: 500 },
    );
  }
}
