'use client';

// Admin cohort management.
// Lists practitioner cohorts + their assigned waitlist members + lightweight
// onboarding metrics (invited, onboarded, certified). Lets the founder
// transition cohort status (selecting / onboarding / active / completed).
// Bulk dispatch of onboarding invitations is queued through the existing
// waitlist mailer (Phase 1) by writing rows into practitioner_email_queue.

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  Users,
  Calendar,
  Loader2,
  CheckCircle2,
  Clock,
  Target,
  RefreshCw,
} from 'lucide-react';

const supabase = createClient();

interface CohortRow {
  id: string;
  name: string;
  cohort_number: number;
  target_size: number;
  status: string;
  description: string | null;
  onboarding_start_date: string | null;
  onboarding_end_date: string | null;
}

interface MemberRow {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  practice_name: string;
  credential_type: string;
  status: string;
  priority_score: number | null;
  assigned_cohort_id: string | null;
}

const COHORT_STATUSES = ['planning', 'selecting', 'onboarding', 'active', 'completed'];

export default function AdminCohortsPage() {
  const [cohorts, setCohorts] = useState<CohortRow[]>([]);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [selectedCohortId, setSelectedCohortId] = useState<string | null>(null);

  const reload = async () => {
    setLoading(true);
    const [{ data: cohortData }, { data: waitlistData }] = await Promise.all([
      (supabase as any)
        .from('practitioner_cohorts')
        .select('id, name, cohort_number, target_size, status, description, onboarding_start_date, onboarding_end_date')
        .order('cohort_number', { ascending: true }),
      (supabase as any)
        .from('practitioner_waitlist')
        .select('id, first_name, last_name, email, practice_name, credential_type, status, priority_score, assigned_cohort_id')
        .not('assigned_cohort_id', 'is', null)
        .order('priority_score', { ascending: false, nullsFirst: false })
        .limit(500),
    ]);
    setCohorts((cohortData ?? []) as CohortRow[]);
    setMembers((waitlistData ?? []) as MemberRow[]);
    if (!selectedCohortId && (cohortData ?? []).length > 0) {
      setSelectedCohortId((cohortData as CohortRow[])[0].id);
    }
    setLoading(false);
  };

  useEffect(() => { reload(); }, []);

  const selectedCohort = useMemo(
    () => cohorts.find((c) => c.id === selectedCohortId) ?? null,
    [cohorts, selectedCohortId],
  );

  const cohortMembers = useMemo(
    () => members.filter((m) => m.assigned_cohort_id === selectedCohortId),
    [members, selectedCohortId],
  );

  const metrics = useMemo(() => {
    const total = cohortMembers.length;
    const approved = cohortMembers.filter((m) => m.status === 'approved_for_cohort').length;
    const onboarded = cohortMembers.filter((m) => m.status === 'converted_to_practitioner').length;
    return { total, approved, onboarded };
  }, [cohortMembers]);

  async function updateCohortStatus(id: string, status: string) {
    setBusyId(id);
    await (supabase as any)
      .from('practitioner_cohorts')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id);
    setCohorts((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status } : c)),
    );
    setBusyId(null);
  }

  return (
    <div className="min-h-screen bg-[#0E1A30] text-white px-4 py-6 md:px-8 md:py-10">
      <header className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-portal-green/30 bg-portal-green/10">
            <Users className="h-5 w-5 text-portal-green" strokeWidth={1.5} />
          </span>
          <div>
            <h1 className="text-xl font-semibold md:text-2xl">Cohorts</h1>
            <p className="text-xs text-white/55">
              Founding cohort management. Track approved waitlist members through onboarding.
            </p>
          </div>
        </div>
        <button
          onClick={reload}
          className="inline-flex items-center gap-2 self-start rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white/80 transition-colors hover:bg-white/[0.08]"
        >
          <RefreshCw className="h-4 w-4" strokeWidth={1.5} />
          Refresh
        </button>
      </header>

      {loading ? (
        <CenteredLoader />
      ) : (
        <div className="grid gap-5 md:grid-cols-[1fr_2fr]">
          <aside className="flex flex-col gap-3">
            {cohorts.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedCohortId(c.id)}
                className={`flex flex-col gap-1 rounded-2xl border p-4 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-portal-green/40 ${
                  selectedCohortId === c.id
                    ? 'border-portal-green/40 bg-portal-green/10'
                    : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.05]'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-portal-green">
                    Cohort {c.cohort_number}
                  </span>
                  <CohortStatusPill status={c.status} />
                </div>
                <h2 className="text-sm font-semibold text-white">{c.name.replace(/^Cohort \d+:\s*/, '')}</h2>
                <p className="text-xs text-white/55">Target: {c.target_size}</p>
              </button>
            ))}
          </aside>

          <section className="flex flex-col gap-5">
            {selectedCohort ? (
              <>
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 md:p-6">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.2em] text-portal-green">
                        Cohort {selectedCohort.cohort_number}
                      </p>
                      <h2 className="text-lg font-semibold text-white md:text-xl">
                        {selectedCohort.name}
                      </h2>
                      {selectedCohort.description && (
                        <p className="mt-1 text-sm text-white/65">{selectedCohort.description}</p>
                      )}
                    </div>
                    <CohortStatusPill status={selectedCohort.status} />
                  </div>

                  <dl className="mt-5 grid gap-3 text-sm md:grid-cols-3">
                    <Metric icon={Target} label="Target" value={String(selectedCohort.target_size)} />
                    <Metric icon={Users} label="Approved" value={`${metrics.approved} of ${metrics.total}`} />
                    <Metric icon={CheckCircle2} label="Onboarded" value={String(metrics.onboarded)} />
                  </dl>

                  <div className="mt-5 flex flex-wrap items-center gap-2">
                    <span className="text-[10px] uppercase tracking-[0.18em] text-white/40">
                      Set status
                    </span>
                    {COHORT_STATUSES.map((s) => (
                      <button
                        key={s}
                        onClick={() => updateCohortStatus(selectedCohort.id, s)}
                        disabled={busyId === selectedCohort.id}
                        className={`rounded-full border px-3 py-1 text-[11px] font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-portal-green/40 ${
                          selectedCohort.status === s
                            ? 'border-portal-green/40 bg-portal-green/15 text-portal-green'
                            : 'border-white/10 bg-white/[0.04] text-white/60 hover:bg-white/[0.08]'
                        } disabled:cursor-not-allowed disabled:opacity-60`}
                      >
                        {s.replace(/_/g, ' ')}
                      </button>
                    ))}
                    {busyId === selectedCohort.id && (
                      <Loader2 className="h-4 w-4 animate-spin text-portal-green" strokeWidth={1.5} />
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.03]">
                  <header className="flex items-center justify-between border-b border-white/5 px-4 py-3">
                    <h3 className="text-sm font-semibold text-white">Members</h3>
                    <span className="text-xs text-white/55">
                      {cohortMembers.length} total
                    </span>
                  </header>
                  {cohortMembers.length === 0 ? (
                    <p className="px-4 py-8 text-center text-sm text-white/55">
                      No members assigned yet. Use the waitlist admin to assign approved
                      practitioners to this cohort.
                    </p>
                  ) : (
                    <ul className="divide-y divide-white/[0.04]">
                      {cohortMembers.map((m) => (
                        <li key={m.id} className="flex items-center justify-between px-4 py-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-white">
                              {m.first_name} {m.last_name}
                              <span className="ml-2 text-white/45 font-normal">{m.practice_name}</span>
                            </p>
                            <p className="truncate text-xs text-white/45">
                              {m.credential_type.toUpperCase()} · {m.email}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {m.priority_score !== null && (
                              <span className="text-[10px] font-semibold text-[#B75E18]">
                                P{m.priority_score}
                              </span>
                            )}
                            <MemberStatusPill status={m.status} />
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </>
            ) : (
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center text-sm text-white/55">
                Select a cohort on the left to view members and update status.
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

function Metric({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <p className="mb-1 inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-white/45">
        <Icon className="h-3 w-3 text-portal-green" strokeWidth={1.5} />
        {label}
      </p>
      <p className="text-base font-semibold text-white">{value}</p>
    </div>
  );
}

function CohortStatusPill({ status }: { status: string }) {
  const tone = (() => {
    switch (status) {
      case 'planning':   return 'bg-white/10 text-white/55';
      case 'selecting':  return 'bg-portal-green/15 text-portal-green border border-portal-green/30';
      case 'onboarding': return 'bg-amber-500/15 text-amber-300 border border-amber-500/30';
      case 'active':     return 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30';
      case 'completed':  return 'bg-white/10 text-white/40';
      default:           return 'bg-white/10 text-white/55';
    }
  })();
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${tone}`}>
      <Calendar className="h-3 w-3" strokeWidth={1.5} />
      {status.replace(/_/g, ' ')}
    </span>
  );
}

function MemberStatusPill({ status }: { status: string }) {
  const tone = (() => {
    switch (status) {
      case 'approved_for_cohort':       return 'bg-portal-green/15 text-portal-green';
      case 'converted_to_practitioner': return 'bg-emerald-500/15 text-emerald-300';
      case 'declined':                  return 'bg-red-500/15 text-red-300';
      default:                          return 'bg-white/10 text-white/55';
    }
  })();
  const Icon = status === 'converted_to_practitioner' ? CheckCircle2 : Clock;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${tone}`}>
      <Icon className="h-3 w-3" strokeWidth={1.5} />
      {status.replace(/_/g, ' ')}
    </span>
  );
}

function CenteredLoader() {
  return (
    <div className="flex items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] p-12 text-white/50">
      <Loader2 className="mr-2 h-5 w-5 animate-spin" strokeWidth={1.5} />
      Loading cohorts
    </div>
  );
}
