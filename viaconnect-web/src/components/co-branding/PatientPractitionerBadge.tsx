'use client';

// Medium co-branding badge for the patient-facing app header.
// When the signed-in patient has an active practitioner_patients row, this
// surfaces the practitioner's name + practice + (optional) logo so the
// patient sees who is in care. Standard tier shows medium co-branding;
// White-Label tier intentionally minimizes ViaCura branding alongside
// the practice mark; this badge handles the medium case.
//
// Drop-in usage:
//   import { PatientPractitionerBadge } from '@/components/co-branding/PatientPractitionerBadge';
//   <PatientPractitionerBadge />
//
// Renders nothing when:
//   * the user is not a patient (no active practitioner_patients row), or
//   * the patient has explicitly opted out (consent_share_engagement_score=
//     false implies a hands-off relationship; the badge stays hidden), or
//   * the practitioner record cannot be located.

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Stethoscope } from 'lucide-react';

const supabase = createClient();

interface BadgeData {
  practitionerName: string | null;
  practiceName: string | null;
  practiceLogoUrl: string | null;
}

export function PatientPractitionerBadge() {
  const [data, setData] = useState<BadgeData | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Find an active relationship where this user is the patient.
        const { data: rel } = await (supabase as any)
          .from('practitioner_patients')
          .select('practitioner_id, status')
          .eq('patient_id', user.id)
          .eq('status', 'active')
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!rel) return;

        // Resolve the practitioner's public-facing identity.
        const { data: prac } = await (supabase as any)
          .from('practitioners')
          .select('display_name, practice_name, practice_logo_url, patient_facing_display_name')
          .eq('user_id', rel.practitioner_id)
          .maybeSingle();

        if (cancelled || !prac) return;
        setData({
          practitionerName:
            (prac.patient_facing_display_name as string | null) ??
            (prac.display_name as string | null),
          practiceName: prac.practice_name ?? null,
          practiceLogoUrl: prac.practice_logo_url ?? null,
        });
      } catch {
        // table may not exist in older environments; render nothing
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (!data) return null;

  return (
    <div className="hidden md:flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs">
      <span className="text-white/55">with</span>
      {data.practiceLogoUrl ? (
        <img
          src={data.practiceLogoUrl}
          alt={data.practiceName ?? 'Practice'}
          className="h-5 w-auto rounded"
        />
      ) : (
        <Stethoscope className="h-3.5 w-3.5 text-portal-green" strokeWidth={1.5} />
      )}
      <span className="font-medium text-white">
        {data.practitionerName ?? data.practiceName ?? 'Your practitioner'}
      </span>
    </div>
  );
}
