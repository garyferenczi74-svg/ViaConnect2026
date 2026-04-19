'use client';

// Admin practitioner waitlist review.
// Access control: RLS gate (waitlist_admin_all) returns empty for non-admins.
// Filters: status, credential type, free-text search across name/email/practice.
// Inline actions: priority score, cohort assignment, status, admin notes.
// Bulk: CSV export.

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  Filter,
  Download,
  ChevronDown,
  ChevronRight,
  Search,
  Loader2,
  CircleCheck,
  CircleX,
  ClipboardList,
} from 'lucide-react';

const supabase = createClient();

interface WaitlistRow {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  practice_name: string;
  practice_city: string | null;
  practice_state: string | null;
  credential_type: string;
  primary_clinical_focus: string;
  years_in_practice: number | null;
  approximate_patient_panel_size: number | null;
  uses_genetic_testing: boolean | null;
  currently_dispensing_supplements: boolean | null;
  referral_source: string;
  interest_reason: string;
  biggest_clinical_challenge: string | null;
  status: string;
  priority_score: number | null;
  assigned_cohort_id: string | null;
  admin_notes: string | null;
  submission_type: string;
  email_sequence_step: number | null;
  created_at: string;
}

interface CohortRow {
  id: string;
  name: string;
  cohort_number: number;
  status: string;
}

const STATUS_OPTIONS = [
  'pending_review',
  'approved_for_cohort',
  'waitlisted',
  'declined',
  'converted_to_practitioner',
  'withdrew',
];

const CREDENTIAL_LABELS: Record<string, string> = {
  md: 'MD', do: 'DO', nd: 'ND', dc: 'DC', np: 'NP',
  pa: 'PA', rd: 'RD', lac: 'LAc', other: 'Other',
};

export default function AdminWaitlistPage() {
  const [rows, setRows] = useState<WaitlistRow[]>([]);
  const [cohorts, setCohorts] = useState<CohortRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [credentialFilter, setCredentialFilter] = useState<string>('all');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [busyId, setBusyId] = useState<string | null>(null);

  const reload = async () => {
    setLoading(true);
    // Cast to any: practitioner_* tables ship with this migration set;
    // generated Database types catch up after the next type regen.
    const [{ data: waitlistData }, { data: cohortData }] = await Promise.all([
      (supabase as any)
        .from('practitioner_waitlist')
        .select(
          'id, email, first_name, last_name, practice_name, practice_city, practice_state, credential_type, primary_clinical_focus, years_in_practice, approximate_patient_panel_size, uses_genetic_testing, currently_dispensing_supplements, referral_source, interest_reason, biggest_clinical_challenge, status, priority_score, assigned_cohort_id, admin_notes, submission_type, email_sequence_step, created_at',
        )
        .order('priority_score', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false })
        .limit(500),
      (supabase as any)
        .from('practitioner_cohorts')
        .select('id, name, cohort_number, status')
        .order('cohort_number', { ascending: true }),
    ]);
    setRows((waitlistData ?? []) as WaitlistRow[]);
    setCohorts((cohortData ?? []) as CohortRow[]);
    setLoading(false);
  };

  useEffect(() => { reload(); }, []);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (credentialFilter !== 'all' && r.credential_type !== credentialFilter) return false;
      if (q) {
        const blob =
          `${r.first_name} ${r.last_name} ${r.email} ${r.practice_name} ${r.practice_city ?? ''}`.toLowerCase();
        if (!blob.includes(q)) return false;
      }
      return true;
    });
  }, [rows, search, statusFilter, credentialFilter]);

  const updateRow = async (id: string, patch: Partial<WaitlistRow>) => {
    setBusyId(id);
    const { error } = await (supabase as any)
      .from('practitioner_waitlist')
      .update({
        ...patch,
        status_updated_at: new Date().toISOString(),
      })
      .eq('id', id);
    if (!error) {
      setRows((prev) =>
        prev.map((r) => (r.id === id ? { ...r, ...patch } : r)),
      );
    }
    setBusyId(null);
  };

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const exportCsv = () => {
    const header = [
      'id', 'created_at', 'status', 'priority_score', 'submission_type',
      'first_name', 'last_name', 'email', 'practice_name', 'practice_city', 'practice_state',
      'credential_type', 'primary_clinical_focus', 'years_in_practice', 'panel_size',
      'referral_source', 'interest_reason',
    ];
    const lines = [header.join(',')];
    for (const r of visible) {
      const cells = [
        r.id, r.created_at, r.status, r.priority_score ?? '', r.submission_type,
        r.first_name, r.last_name, r.email, r.practice_name,
        r.practice_city ?? '', r.practice_state ?? '',
        r.credential_type, r.primary_clinical_focus,
        r.years_in_practice ?? '', r.approximate_patient_panel_size ?? '',
        r.referral_source,
        (r.interest_reason ?? '').replace(/\r?\n/g, ' '),
      ].map((v) => {
        const s = String(v);
        return s.includes(',') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
      });
      lines.push(cells.join(','));
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `practitioner-waitlist-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[#0E1A30] px-4 py-6 text-white md:px-8 md:py-10">
      <header className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#2DA5A0]/30 bg-[#2DA5A0]/10">
            <ClipboardList className="h-5 w-5 text-[#2DA5A0]" strokeWidth={1.5} />
          </span>
          <div>
            <h1 className="text-xl font-semibold md:text-2xl">Practitioner waitlist</h1>
            <p className="text-xs text-white/50">
              {loading ? 'Loading' : `${visible.length} of ${rows.length} entries`}
            </p>
          </div>
        </div>
        <button
          onClick={exportCsv}
          disabled={visible.length === 0}
          className="inline-flex items-center gap-2 self-start rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white/80 transition-colors hover:bg-white/[0.08] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2DA5A0]/60 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Download className="h-4 w-4" strokeWidth={1.5} />
          Export CSV
        </button>
      </header>

      {/* Filters */}
      <div className="mb-4 flex flex-col gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4 md:flex-row md:items-center">
        <div className="flex flex-1 items-center gap-2 rounded-lg border border-white/10 bg-[#0B1424] px-3 py-2">
          <Search className="h-4 w-4 text-white/40" strokeWidth={1.5} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email, or practice"
            className="flex-1 bg-transparent text-sm text-white placeholder:text-white/30 focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-white/40" strokeWidth={1.5} />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-white/10 bg-[#0B1424] px-3 py-2 text-sm text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2DA5A0]/60"
          >
            <option value="all">All statuses</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
            ))}
          </select>
          <select
            value={credentialFilter}
            onChange={(e) => setCredentialFilter(e.target.value)}
            className="rounded-lg border border-white/10 bg-[#0B1424] px-3 py-2 text-sm text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2DA5A0]/60"
          >
            <option value="all">All credentials</option>
            {Object.entries(CREDENTIAL_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] p-12 text-white/50">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" strokeWidth={1.5} />
          Loading waitlist
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-12 text-center text-sm text-white/50">
          No entries match the current filters.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {visible.map((r) => (
            <RowCard
              key={r.id}
              row={r}
              cohorts={cohorts}
              expanded={expanded.has(r.id)}
              busy={busyId === r.id}
              onToggle={() => toggleExpand(r.id)}
              onUpdate={(patch) => updateRow(r.id, patch)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function RowCard({
  row, cohorts, expanded, busy, onToggle, onUpdate,
}: {
  row: WaitlistRow;
  cohorts: CohortRow[];
  expanded: boolean;
  busy: boolean;
  onToggle: () => void;
  onUpdate: (patch: Partial<WaitlistRow>) => void;
}) {
  const cred = CREDENTIAL_LABELS[row.credential_type] ?? row.credential_type;
  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]">
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/[0.04] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2DA5A0]/40"
      >
        {expanded ? (
          <ChevronDown className="h-4 w-4 text-white/50" strokeWidth={1.5} />
        ) : (
          <ChevronRight className="h-4 w-4 text-white/50" strokeWidth={1.5} />
        )}
        <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-[10px] font-semibold uppercase tracking-wider text-[#2DA5A0]">
          {cred}
        </span>
        <div className="flex-1 min-w-0">
          <p className="truncate text-sm font-semibold text-white">
            {row.first_name} {row.last_name}
            <span className="ml-2 text-white/40 font-normal">{row.practice_name}</span>
          </p>
          <p className="truncate text-xs text-white/40">
            {row.email}
            {row.practice_city ? ` · ${row.practice_city}` : ''}
            {row.practice_state ? `, ${row.practice_state}` : ''}
            {row.submission_type === 'invitation' ? ' · invitation' : ''}
          </p>
        </div>
        <StatusPill status={row.status} />
        {row.priority_score !== null && (
          <span className="hidden md:inline text-xs font-semibold text-[#B75E18]">
            P{row.priority_score}
          </span>
        )}
        {busy && <Loader2 className="h-4 w-4 animate-spin text-[#2DA5A0]" strokeWidth={1.5} />}
      </button>

      {expanded && (
        <div className="border-t border-white/5 px-4 py-4 md:px-6 md:py-5">
          <div className="grid gap-5 md:grid-cols-2">
            {/* Submission details */}
            <div className="flex flex-col gap-3">
              <DetailField label="Primary clinical focus" value={row.primary_clinical_focus} />
              <DetailField label="Years in practice" value={row.years_in_practice ?? 'n/a'} />
              <DetailField label="Patient panel" value={row.approximate_patient_panel_size ?? 'n/a'} />
              <DetailField
                label="Uses genetic testing"
                value={row.uses_genetic_testing === null ? 'n/a' : row.uses_genetic_testing ? 'yes' : 'no'}
              />
              <DetailField
                label="Currently dispensing supplements"
                value={row.currently_dispensing_supplements === null ? 'n/a' : row.currently_dispensing_supplements ? 'yes' : 'no'}
              />
              <DetailField label="Referral source" value={row.referral_source} />
              <div>
                <p className="mb-1 text-[10px] uppercase tracking-[0.18em] text-white/40">Interest reason</p>
                <p className="whitespace-pre-line text-sm text-white/80">{row.interest_reason}</p>
              </div>
              {row.biggest_clinical_challenge && (
                <div>
                  <p className="mb-1 text-[10px] uppercase tracking-[0.18em] text-white/40">Biggest clinical challenge</p>
                  <p className="whitespace-pre-line text-sm text-white/80">{row.biggest_clinical_challenge}</p>
                </div>
              )}
            </div>

            {/* Admin actions */}
            <div className="flex flex-col gap-3">
              <ActionField label="Status">
                <select
                  value={row.status}
                  onChange={(e) => onUpdate({ status: e.target.value })}
                  className="w-full rounded-lg border border-white/10 bg-[#0B1424] px-3 py-2 text-sm text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2DA5A0]/60"
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                  ))}
                </select>
              </ActionField>

              <ActionField label="Priority score, 0 to 100">
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={row.priority_score ?? ''}
                  onChange={(e) => {
                    const v = e.target.value === '' ? null : Math.max(0, Math.min(100, Number(e.target.value)));
                    onUpdate({ priority_score: v });
                  }}
                  className="w-full rounded-lg border border-white/10 bg-[#0B1424] px-3 py-2 text-sm text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2DA5A0]/60"
                />
              </ActionField>

              <ActionField label="Assigned cohort">
                <select
                  value={row.assigned_cohort_id ?? ''}
                  onChange={(e) => onUpdate({ assigned_cohort_id: e.target.value || null })}
                  className="w-full rounded-lg border border-white/10 bg-[#0B1424] px-3 py-2 text-sm text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2DA5A0]/60"
                >
                  <option value="">Unassigned</option>
                  {cohorts.map((c) => (
                    <option key={c.id} value={c.id}>
                      Cohort {c.cohort_number}: {c.name.replace(/^Cohort \d+:\s*/, '')}
                    </option>
                  ))}
                </select>
              </ActionField>

              <ActionField label="Admin notes">
                <textarea
                  rows={4}
                  value={row.admin_notes ?? ''}
                  onChange={(e) => onUpdate({ admin_notes: e.target.value })}
                  className="w-full rounded-lg border border-white/10 bg-[#0B1424] px-3 py-2 text-sm text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2DA5A0]/60"
                />
              </ActionField>

              <p className="text-[10px] text-white/40">
                Submitted {new Date(row.created_at).toLocaleString()}
                {row.email_sequence_step ? ` · email step ${row.email_sequence_step}` : ''}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const tone = (() => {
    switch (status) {
      case 'pending_review':           return 'bg-white/10 text-white/70';
      case 'approved_for_cohort':      return 'bg-[#2DA5A0]/15 text-[#2DA5A0] border border-[#2DA5A0]/30';
      case 'converted_to_practitioner':return 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30';
      case 'waitlisted':               return 'bg-amber-500/15 text-amber-300 border border-amber-500/30';
      case 'declined':                 return 'bg-red-500/15 text-red-300 border border-red-500/30';
      case 'withdrew':                 return 'bg-white/5 text-white/40';
      default:                         return 'bg-white/10 text-white/70';
    }
  })();
  const Icon = status === 'declined' || status === 'withdrew' ? CircleX : CircleCheck;
  return (
    <span className={`hidden md:inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-medium ${tone}`}>
      <Icon className="h-3 w-3" strokeWidth={1.5} />
      {status.replace(/_/g, ' ')}
    </span>
  );
}

function DetailField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-[10px] uppercase tracking-[0.18em] text-white/40">{label}</p>
      <p className="text-sm text-white/85">{value}</p>
    </div>
  );
}

function ActionField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-[10px] uppercase tracking-[0.18em] text-white/40">{label}</p>
      {children}
    </div>
  );
}
