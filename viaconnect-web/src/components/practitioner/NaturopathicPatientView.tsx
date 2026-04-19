'use client';

// Revised Prompt #91 Phase 6.6: Naturopathic patient view.
// Tailored data presentation for ND/DC/LAc practitioners.
//
// Key visual differences from StandardPatientView:
//   * Constitutional type displayed prominently in patient header
//   * Botanicals and supplements broken into separate sections (not lumped
//     under "Current Protocol")
//   * Three-column layout on desktop: constitutional + vitality |
//     botanicals + supplements | lifestyle + engagement
//   * CAQ + Genetics rendered with naturopathicFraming when consented
//   * Action bar adds "Build Natural Protocol" + "Initiate Constitutional
//     Assessment" peer-level to "Update Protocol"

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import {
  User as UserIcon,
  Wind, Leaf, Pill, Heart, Activity, ClipboardList, FileText,
  Loader2, ArrowRight,
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

interface ConstitutionalRow {
  framework: string;
  primary_dosha: 'vata' | 'pitta' | 'kapha' | null;
  secondary_dosha: 'vata' | 'pitta' | 'kapha' | null;
  vata_score: number | null;
  pitta_score: number | null;
  kapha_score: number | null;
  completed_at: string | null;
}

interface SupplementRow {
  id: string;
  supplement_name: string;
  dosage: string | null;
  frequency: string | null;
}

interface ProtocolRow {
  id: string;
  protocol_name: string;
  protocol_type: string | null;
  constitutional_framework: string | null;
  lifestyle_interventions: Record<string, unknown> | null;
  botanical_components: Array<Record<string, unknown>> | null;
  energetic_notes: string | null;
}

export function NaturopathicPatientView({ patientId, relationship }: Props) {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [constitutional, setConstitutional] = useState<ConstitutionalRow | null>(null);
  const [supplements, setSupplements] = useState<SupplementRow[]>([]);
  const [naturalProtocol, setNaturalProtocol] = useState<ProtocolRow | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [{ data: prof }, { data: cnst }, { data: supps }, { data: protos }] =
        await Promise.all([
          (supabase as any)
            .from('profiles')
            .select('id, full_name, email')
            .eq('id', patientId)
            .maybeSingle(),
          relationship.consent_share_caq
            ? (supabase as any)
                .from('constitutional_assessments')
                .select('framework, primary_dosha, secondary_dosha, vata_score, pitta_score, kapha_score, completed_at')
                .eq('patient_user_id', patientId)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle()
            : Promise.resolve({ data: null }),
          relationship.consent_share_protocols
            ? (supabase as any)
                .from('user_current_supplements')
                .select('id, supplement_name, dosage, frequency')
                .eq('user_id', patientId)
                .eq('is_active', true)
            : Promise.resolve({ data: [] }),
          relationship.consent_share_protocols
            ? (supabase as any)
                .from('supplement_protocols')
                .select('id, protocol_name, protocol_type, constitutional_framework, lifestyle_interventions, botanical_components, energetic_notes')
                .eq('patient_id', patientId)
                .eq('protocol_type', 'natural_protocol')
                .eq('status', 'active')
                .order('updated_at', { ascending: false })
                .limit(1)
                .maybeSingle()
            : Promise.resolve({ data: null }),
        ]);
      if (cancelled) return;
      setProfile(prof as PatientProfile | null);
      setConstitutional((cnst ?? null) as ConstitutionalRow | null);
      setSupplements((supps ?? []) as SupplementRow[]);
      setNaturalProtocol((protos ?? null) as ProtocolRow | null);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [patientId, relationship.consent_share_caq, relationship.consent_share_protocols]);

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
      <PatientHeader profile={profile} constitutional={constitutional} />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Column 1: constitutional + vitality */}
        <div className="space-y-6">
          <Section icon={Wind} title="Constitutional Assessment">
            {relationship.consent_share_caq ? (
              constitutional ? (
                <ConstitutionalSummary row={constitutional} />
              ) : (
                <EmptyAction
                  message="No constitutional assessment yet"
                  cta="Initiate Assessment"
                  href={`/practitioner/naturopath/constitutional?patient=${patientId}`}
                />
              )
            ) : (
              <ConsentNotice flag="constitutional" />
            )}
          </Section>

          <Section icon={Activity} title="Vitality Indicators">
            <p className="text-sm text-white/55">
              Energy, digestion, sleep quality, and mood signals surface here when wearable
              and check-in data is available. Qualitative; complementary to the Bio
              Optimization Score.
            </p>
          </Section>
        </div>

        {/* Column 2: botanicals SEPARATED from supplements */}
        <div className="space-y-6">
          <Section icon={Leaf} title="Current Botanicals" accent="emerald">
            {relationship.consent_share_protocols ? (
              naturalProtocol && Array.isArray(naturalProtocol.botanical_components) &&
              naturalProtocol.botanical_components.length > 0 ? (
                <ul className="flex flex-col gap-2">
                  {naturalProtocol.botanical_components.map((b, i) => (
                    <li
                      key={i}
                      className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 text-sm text-white/85"
                    >
                      {String((b as { name?: unknown }).name ?? 'Botanical')}
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyAction
                  message="No botanical recommendations yet"
                  cta="Build Natural Protocol"
                  href={`/practitioner/naturopath/natural-protocols?patient=${patientId}`}
                />
              )
            ) : (
              <ConsentNotice flag="protocols" />
            )}
          </Section>

          <Section icon={ClipboardList} title="ViaCura Supplements">
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
                <p className="text-sm text-white/55">No supplements in current protocol.</p>
              )
            ) : (
              <ConsentNotice flag="protocols" />
            )}
          </Section>
        </div>

        {/* Column 3: lifestyle + engagement */}
        <div className="space-y-6">
          <Section icon={Heart} title="Lifestyle Interventions">
            {relationship.consent_share_protocols && naturalProtocol?.lifestyle_interventions ? (
              <LifestyleList interventions={naturalProtocol.lifestyle_interventions} />
            ) : (
              <p className="text-sm text-white/55">
                Diet, sleep, movement, and stress recommendations from any active natural
                protocol render here. Build a Natural Protocol to populate these.
              </p>
            )}
          </Section>

          <Section icon={Activity} title="Engagement Score">
            {relationship.consent_share_engagement_score ? (
              <p className="text-sm text-white/55">
                Aggregate score (0 to 100) loads here. Helix internals stay consumer-only.
              </p>
            ) : (
              <ConsentNotice flag="engagement_score" />
            )}
          </Section>
        </div>
      </div>

      {(relationship.consent_share_caq || relationship.can_view_genetics) && (
        <div className="grid gap-6 lg:grid-cols-2">
          {relationship.consent_share_caq && (
            <Section icon={FileText} title="Health Assessment, CAQ">
              <p className="text-sm leading-relaxed text-white/65">
                Symptoms framed constitutionally. Cold extremities and low digestive fire
                suggest Vata or Kapha predominance; hot tendencies and irritability lean
                Pitta. Detailed CAQ render lands in a follow up.
              </p>
            </Section>
          )}
          {relationship.can_view_genetics && (
            <Section icon={Leaf} title="Genetic Context, Naturopathic Framing">
              <p className="text-sm leading-relaxed text-white/65">
                SNPs interpreted through methylation and constitutional lens. Where
                indicated, methylated B vitamins paired with nettle and dandelion for
                methylation support. Detailed gene table lands in a follow up.
              </p>
            </Section>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-2 pt-2">
        <ActionLink href={`/practitioner/protocols?patient=${patientId}`}>
          Update Protocol
        </ActionLink>
        <ActionLink
          href={`/practitioner/naturopath/natural-protocols?patient=${patientId}`}
          tone="emerald"
        >
          Build Natural Protocol
        </ActionLink>
        <ActionLink
          href={`/practitioner/naturopath/constitutional?patient=${patientId}`}
          tone="emerald"
        >
          Initiate Constitutional Assessment
        </ActionLink>
        <ActionLink href={`/practitioner/messages?patient=${patientId}`} tone="ghost">
          Send Message
        </ActionLink>
      </div>
    </div>
  );
}

function PatientHeader({
  profile, constitutional,
}: { profile: PatientProfile | null; constitutional: ConstitutionalRow | null }) {
  return (
    <header className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/10">
            <UserIcon className="h-6 w-6 text-emerald-300" strokeWidth={1.5} />
          </span>
          <div>
            <h1 className="text-xl font-semibold text-white md:text-2xl">
              {profile?.full_name ?? 'Patient'}
            </h1>
            <p className="text-xs text-white/55">{profile?.email ?? ''}</p>
          </div>
        </div>

        {constitutional?.primary_dosha && (
          <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
            <Wind className="h-5 w-5 text-emerald-300" strokeWidth={1.5} />
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-emerald-200/70">
                Constitutional Type
              </p>
              <p className="text-sm font-semibold capitalize text-white">
                {constitutional.primary_dosha}
                {constitutional.secondary_dosha && (
                  <span className="ml-1 text-white/55 font-normal">
                    , {constitutional.secondary_dosha} secondary
                  </span>
                )}
              </p>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

function ConstitutionalSummary({ row }: { row: ConstitutionalRow }) {
  return (
    <div className="flex flex-col gap-2 text-sm">
      <p className="text-white/85">
        Framework: <span className="capitalize text-white">{row.framework}</span>
      </p>
      <p className="text-white/85">
        Primary: <span className="capitalize text-white">{row.primary_dosha ?? 'n/a'}</span>
      </p>
      {row.secondary_dosha && (
        <p className="text-white/85">
          Secondary: <span className="capitalize text-white">{row.secondary_dosha}</span>
        </p>
      )}
      <ul className="mt-2 grid grid-cols-3 gap-2 text-xs">
        <ScoreCell label="Vata"  value={row.vata_score} />
        <ScoreCell label="Pitta" value={row.pitta_score} />
        <ScoreCell label="Kapha" value={row.kapha_score} />
      </ul>
    </div>
  );
}

function ScoreCell({ label, value }: { label: string; value: number | null }) {
  return (
    <li className="rounded-md border border-white/10 bg-white/[0.04] p-2 text-center">
      <p className="text-[10px] uppercase tracking-[0.18em] text-white/45">{label}</p>
      <p className="text-sm font-semibold text-white">{value ?? 'n/a'}</p>
    </li>
  );
}

function LifestyleList({ interventions }: { interventions: Record<string, unknown> }) {
  const entries = Object.entries(interventions).filter(([, v]) => typeof v === 'string' && v);
  if (entries.length === 0) {
    return <p className="text-sm text-white/55">No lifestyle interventions recorded.</p>;
  }
  return (
    <ul className="flex flex-col gap-2">
      {entries.map(([area, content]) => (
        <li key={area} className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
          <p className="mb-1 text-[10px] uppercase tracking-[0.18em] text-emerald-300">
            {area}
          </p>
          <p className="text-sm text-white/85">{String(content)}</p>
        </li>
      ))}
    </ul>
  );
}

function Section({
  icon: Icon, title, accent = 'teal', children,
}: {
  icon: typeof UserIcon;
  title: string;
  accent?: 'teal' | 'emerald';
  children: React.ReactNode;
}) {
  const accentText = accent === 'emerald' ? 'text-emerald-300' : 'text-portal-green';
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <header className="mb-3 flex items-center gap-2">
        <Icon className={`h-4 w-4 ${accentText}`} strokeWidth={1.5} />
        <h2 className="text-sm font-semibold text-white">{title}</h2>
      </header>
      {children}
    </section>
  );
}

function EmptyAction({
  message, cta, href,
}: { message: string; cta: string; href: string }) {
  return (
    <div className="flex flex-col gap-2 text-sm">
      <p className="text-white/55">{message}</p>
      <Link
        href={href}
        className="inline-flex items-center gap-1 self-start text-emerald-300 hover:text-emerald-200"
      >
        {cta}
        <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.5} />
      </Link>
    </div>
  );
}

function ConsentNotice({ flag }: { flag: string }) {
  return (
    <p className="text-sm text-white/55">
      Patient has not granted consent to share {flag} data.
    </p>
  );
}

function ActionLink({
  href, tone = 'primary', children,
}: {
  href: string;
  tone?: 'primary' | 'emerald' | 'ghost';
  children: React.ReactNode;
}) {
  const styles = (() => {
    switch (tone) {
      case 'emerald':
        return 'border-emerald-500/40 bg-emerald-500/15 text-emerald-200 hover:bg-emerald-500/25';
      case 'ghost':
        return 'border-white/10 bg-white/[0.04] text-white/80 hover:bg-white/[0.08]';
      default:
        return 'border-portal-green/40 bg-portal-green/15 text-portal-green hover:bg-portal-green/25';
    }
  })();
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-portal-green/40 ${styles}`}
    >
      {children}
    </Link>
  );
}
