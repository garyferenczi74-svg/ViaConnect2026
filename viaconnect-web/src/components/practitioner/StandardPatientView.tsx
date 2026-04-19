'use client';

// Revised Prompt #91 Phase 5.6: Standard patient view.
// Conventional clinical layout. Available to all credential types and
// is the default for non-naturopath credentials. Reads what the consent
// flags permit; supplements live under "Current Protocol" rather than
// being broken out from botanicals.

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  User,
  Pill,
  ClipboardList,
  Activity,
  HeartPulse,
  FileText,
  Loader2,
} from 'lucide-react';

const supabase = createClient();

interface Relationship {
  id: string;
  consent_share_caq: boolean;
  consent_share_protocols: boolean;
  consent_share_engagement_score: boolean;
  consent_share_nutrition: boolean;
  can_view_genetics: boolean;
}

interface Props {
  patientId: string;
  relationship: Relationship;
}

interface PatientProfile {
  id: string;
  full_name: string | null;
  email: string | null;
}

interface SupplementRow {
  id: string;
  supplement_name: string;
  dosage: string | null;
  frequency: string | null;
  is_active: boolean;
}

export function StandardPatientView({ patientId, relationship }: Props) {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [supplements, setSupplements] = useState<SupplementRow[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [{ data: prof }, { data: supps }] = await Promise.all([
        (supabase as any)
          .from('profiles')
          .select('id, full_name, email')
          .eq('id', patientId)
          .maybeSingle(),
        relationship.consent_share_protocols
          ? (supabase as any)
              .from('user_current_supplements')
              .select('id, supplement_name, dosage, frequency, is_active')
              .eq('user_id', patientId)
              .eq('is_active', true)
          : Promise.resolve({ data: [] }),
      ]);
      if (cancelled) return;
      setProfile(prof as PatientProfile | null);
      setSupplements((supps ?? []) as SupplementRow[]);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [patientId, relationship.consent_share_protocols]);

  if (loading) {
    return (
      <div className="flex items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] p-12 text-white/55">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" strokeWidth={1.5} />
        Loading patient
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 md:p-6">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-full border border-portal-green/30 bg-portal-green/10">
            <User className="h-6 w-6 text-portal-green" strokeWidth={1.5} />
          </span>
          <div>
            <h1 className="text-xl font-semibold text-white md:text-2xl">
              {profile?.full_name ?? 'Patient'}
            </h1>
            <p className="text-xs text-white/55">{profile?.email ?? ''}</p>
          </div>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section icon={ClipboardList} title="Current Protocol">
          {relationship.consent_share_protocols ? (
            supplements.length > 0 ? (
              <ul className="flex flex-col gap-2">
                {supplements.map((s) => (
                  <li
                    key={s.id}
                    className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-3"
                  >
                    <Pill className="h-4 w-4 shrink-0 text-portal-green" strokeWidth={1.5} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white">{s.supplement_name}</p>
                      <p className="text-xs text-white/55">
                        {[s.dosage, s.frequency].filter(Boolean).join(' · ') || 'Active'}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-white/55">No active supplement protocol.</p>
            )
          ) : (
            <ConsentNotice flag="protocols" />
          )}
        </Section>

        <Section icon={Activity} title="Bio Optimization Score">
          <p className="text-sm text-white/55">
            Trend chart and component breakdown surface here when score history is loaded.
          </p>
        </Section>

        <Section icon={HeartPulse} title="Adherence and Engagement">
          {relationship.consent_share_engagement_score ? (
            <p className="text-sm text-white/55">
              Aggregate engagement score (0 to 100) surfaces here. Helix Rewards balances and
              transactions are never shared, regardless of consent.
            </p>
          ) : (
            <ConsentNotice flag="engagement_score" />
          )}
        </Section>

        <Section icon={FileText} title="CAQ Assessment">
          {relationship.consent_share_caq ? (
            <p className="text-sm text-white/55">CAQ summary loads here.</p>
          ) : (
            <ConsentNotice flag="CAQ" />
          )}
        </Section>
      </div>
    </div>
  );
}

function Section({
  icon: Icon, title, children,
}: { icon: typeof User; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <header className="mb-3 flex items-center gap-2">
        <Icon className="h-4 w-4 text-portal-green" strokeWidth={1.5} />
        <h2 className="text-sm font-semibold text-white">{title}</h2>
      </header>
      {children}
    </section>
  );
}

function ConsentNotice({ flag }: { flag: string }) {
  return (
    <p className="text-sm text-white/55">
      Patient has not granted consent to share {flag} data.
    </p>
  );
}
