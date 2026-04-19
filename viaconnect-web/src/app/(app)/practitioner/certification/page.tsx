'use client';

// Practitioner certification status + enrollment.
// Reads practitioner_certifications + certification_levels via the client
// supabase. RLS scopes the read to the current practitioner.

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  GraduationCap,
  Award,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Loader2,
  type LucideIcon,
} from 'lucide-react';

const supabase = createClient();

interface CertificationLevel {
  id: string;
  display_name: string;
  level_number: number;
  price_cents: number;
  annual_recertification_price_cents: number | null;
  description: string | null;
  estimated_hours: number | null;
  ce_credits_offered: number | null;
  ce_partnership_status: string;
  validity_months: number | null;
  is_required: boolean;
  unlocks_white_label: boolean;
  sort_order: number;
}

interface PractitionerCertification {
  id: string;
  certification_level_id: string;
  status: string;
  enrolled_at: string;
  certified_at: string | null;
  expires_at: string | null;
  lms_progress_percent: number | null;
  certificate_number: string | null;
  ce_credits_earned: number | null;
  ce_credit_status: string | null;
  is_recertification: boolean;
}

function fmtUsd(cents: number): string {
  return `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export default function PractitionerCertificationPage() {
  const [levels, setLevels] = useState<CertificationLevel[]>([]);
  const [certs, setCerts] = useState<PractitionerCertification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data: practitioner } = await (supabase as any)
        .from('practitioners')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      const [{ data: lvls }, { data: pCerts }] = await Promise.all([
        (supabase as any)
          .from('certification_levels')
          .select('*')
          .eq('is_active', true)
          .order('sort_order', { ascending: true }),
        practitioner
          ? (supabase as any)
              .from('practitioner_certifications')
              .select(
                'id, certification_level_id, status, enrolled_at, certified_at, expires_at, lms_progress_percent, certificate_number, ce_credits_earned, ce_credit_status, is_recertification',
              )
              .eq('practitioner_id', practitioner.id)
              .order('enrolled_at', { ascending: false })
          : Promise.resolve({ data: [] }),
      ]);

      if (cancelled) return;
      setLevels((lvls ?? []) as CertificationLevel[]);
      setCerts((pCerts ?? []) as PractitionerCertification[]);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const certByLevel = useMemo(() => {
    const map: Record<string, PractitionerCertification | undefined> = {};
    for (const c of certs) {
      if (c.is_recertification) continue;
      const cur = map[c.certification_level_id];
      if (!cur || new Date(c.enrolled_at) > new Date(cur.enrolled_at)) {
        map[c.certification_level_id] = c;
      }
    }
    return map;
  }, [certs]);

  return (
    <div className="min-h-screen bg-[#0E1A30] text-white px-4 py-6 md:px-8 md:py-10">
      <header className="mb-6 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-portal-green/30 bg-portal-green/10">
          <GraduationCap className="h-5 w-5 text-portal-green" strokeWidth={1.5} />
        </span>
        <div>
          <h1 className="text-xl font-semibold md:text-2xl">Certification</h1>
          <p className="text-xs text-white/50">
            Your training progress across the four ViaCura practitioner levels.
          </p>
        </div>
      </header>

      {loading ? (
        <div className="flex items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] p-12 text-white/50">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" strokeWidth={1.5} />
          Loading
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {levels.map((lvl) => {
            const myCert = certByLevel[lvl.id];
            return (
              <CertCard key={lvl.id} level={lvl} cert={myCert} />
            );
          })}
        </div>
      )}
    </div>
  );
}

function CertCard({
  level,
  cert,
}: {
  level: CertificationLevel;
  cert: PractitionerCertification | undefined;
}) {
  const status = cert?.status ?? 'not_enrolled';
  const isCertified = status === 'certified';
  const isInProgress = status === 'in_progress' || status === 'enrolled';
  const accent = isCertified
    ? 'border-emerald-500/40 bg-emerald-500/10'
    : isInProgress
      ? 'border-portal-green/30 bg-portal-green/10'
      : 'border-white/10 bg-white/[0.03]';

  return (
    <div className={`flex flex-col gap-4 rounded-2xl border ${accent} p-5 backdrop-blur-md transition-colors`}>
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-portal-green">
            Level {level.level_number}
          </p>
          <h2 className="text-base font-semibold text-white">{level.display_name}</h2>
        </div>
        <StatusBadge status={status} />
      </header>

      {level.description && (
        <p className="text-sm leading-relaxed text-white/65">{level.description}</p>
      )}

      <dl className="grid grid-cols-2 gap-2 text-xs text-white/55">
        <div>
          <dt>Hours</dt>
          <dd className="text-white">{level.estimated_hours ?? 'n/a'}</dd>
        </div>
        <div>
          <dt>CE credits</dt>
          <dd className="text-white">
            {level.ce_credits_offered ?? 'n/a'}
            {level.ce_partnership_status === 'pending' ? ' (pending partner)' : ''}
          </dd>
        </div>
        <div>
          <dt>Price</dt>
          <dd className="text-white">{level.price_cents === 0 ? 'Included' : fmtUsd(level.price_cents)}</dd>
        </div>
        <div>
          <dt>Recert</dt>
          <dd className="text-white">
            {level.annual_recertification_price_cents
              ? `${fmtUsd(level.annual_recertification_price_cents)} per year`
              : 'n/a'}
          </dd>
        </div>
      </dl>

      {isInProgress && cert && (
        <ProgressBar percent={cert.lms_progress_percent ?? 0} />
      )}

      {isCertified && cert && (
        <div className="flex items-start gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs text-emerald-200">
          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
          <span>
            Certified on {new Date(cert.certified_at!).toLocaleDateString()}.
            {cert.expires_at ? ` Expires ${new Date(cert.expires_at).toLocaleDateString()}.` : ''}
            {cert.certificate_number ? ` Certificate ${cert.certificate_number}.` : ''}
          </span>
        </div>
      )}

      {status === 'expired' && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-200">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
          <span>Certification has expired. Recertify to maintain status.</span>
        </div>
      )}

      <button
        type="button"
        className="mt-auto inline-flex items-center justify-center gap-2 rounded-lg border border-portal-green/40 bg-portal-green/10 px-4 py-2 text-sm font-medium text-portal-green transition-colors hover:bg-portal-green/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-portal-green/60"
      >
        {status === 'not_enrolled'
          ? level.price_cents === 0
            ? 'Start Foundation course'
            : `Enroll, ${fmtUsd(level.price_cents)}`
          : isCertified
            ? 'View certificate'
            : 'Continue course'}
        <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
      </button>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; tone: string; Icon: LucideIcon }> = {
    not_enrolled: { label: 'Not enrolled',  tone: 'bg-white/10 text-white/60', Icon: Clock },
    enrolled:     { label: 'Enrolled',      tone: 'bg-portal-green/15 text-portal-green', Icon: Clock },
    in_progress:  { label: 'In progress',   tone: 'bg-portal-green/15 text-portal-green', Icon: Clock },
    completed:    { label: 'Completed',     tone: 'bg-portal-green/20 text-portal-green', Icon: CheckCircle2 },
    certified:    { label: 'Certified',     tone: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30', Icon: Award },
    expired:      { label: 'Expired',       tone: 'bg-amber-500/15 text-amber-300 border border-amber-500/30', Icon: AlertCircle },
    revoked:      { label: 'Revoked',       tone: 'bg-red-500/15 text-red-300 border border-red-500/30', Icon: AlertCircle },
  };
  const cfg = map[status] ?? map.not_enrolled;
  const Icon = cfg.Icon;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-medium ${cfg.tone}`}>
      <Icon className="h-3 w-3" strokeWidth={1.5} />
      {cfg.label}
    </span>
  );
}

function ProgressBar({ percent }: { percent: number }) {
  const p = Math.max(0, Math.min(100, percent));
  return (
    <div>
      <div className="mb-1 flex justify-between text-[11px] text-white/55">
        <span>LMS progress</span>
        <span className="text-white">{p}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.06]">
        <div
          className="h-full rounded-full bg-portal-green transition-all"
          style={{ width: `${p}%` }}
        />
      </div>
    </div>
  );
}
