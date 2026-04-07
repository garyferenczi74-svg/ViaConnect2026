'use client';

// My Recommendations — practitioner view of all recommendations they've sent.
// Reads practitioner_recommendations WHERE practitioner_id = current user.
// Supports filtering by patient, type, status, priority. Each row has Edit
// and Discontinue actions.

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Stethoscope,
  Search,
  Loader2,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Trash2,
  Calendar,
  User,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { usePractitioner } from '@/context/PractitionerContext';

interface RecommendationRow {
  id: string;
  patient_id: string;
  patientName: string;
  product_slug: string;
  product_name: string;
  product_type: string;
  recommendation_type: string;
  priority: string;
  delivery_form: string | null;
  duration_days: number | null;
  dosing_instructions: string | null;
  notes: string | null;
  status: string;
  created_at: string;
}

const TYPE_STYLE: Record<string, { bg: string; text: string; border: string; label: string }> = {
  prescribed: { bg: 'rgba(45,165,160,0.15)', text: '#2DA5A0', border: 'rgba(45,165,160,0.30)', label: 'Prescribed' },
  suggested: { bg: 'rgba(96,165,250,0.15)', text: '#60A5FA', border: 'rgba(96,165,250,0.30)', label: 'Suggested' },
  informational: { bg: 'rgba(255,255,255,0.06)', text: 'rgba(255,255,255,0.65)', border: 'rgba(255,255,255,0.15)', label: 'Informational' },
};

const PRIORITY_STYLE: Record<string, { text: string; label: string }> = {
  critical: { text: '#F87171', label: 'Critical' },
  high: { text: '#FB923C', label: 'High' },
  normal: { text: 'rgba(255,255,255,0.55)', label: 'Normal' },
  low: { text: 'rgba(255,255,255,0.40)', label: 'Low' },
};

const STATUS_STYLE: Record<string, { bg: string; text: string; border: string; label: string }> = {
  active: { bg: 'rgba(34,197,94,0.12)', text: '#22C55E', border: 'rgba(34,197,94,0.30)', label: 'Active' },
  completed: { bg: 'rgba(96,165,250,0.12)', text: '#60A5FA', border: 'rgba(96,165,250,0.30)', label: 'Completed' },
  discontinued: { bg: 'rgba(156,163,175,0.12)', text: '#9CA3AF', border: 'rgba(156,163,175,0.30)', label: 'Discontinued' },
  patient_declined: { bg: 'rgba(239,68,68,0.12)', text: '#F87171', border: 'rgba(239,68,68,0.30)', label: 'Declined' },
};

const TYPE_FILTER_OPTIONS = [
  { value: 'all', label: 'All product types' },
  { value: 'peptide', label: 'Peptides' },
  { value: 'supplement', label: 'Supplements' },
  { value: 'genetic_test', label: 'Genetic Tests' },
  { value: 'custom_package', label: 'Custom Packages' },
];

export default function MyRecommendationsPage() {
  const supabase = useMemo(() => createClient(), []);
  const { patients } = usePractitioner();
  const [recs, setRecs] = useState<RecommendationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [patientFilter, setPatientFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('active');
  const [actionPending, setActionPending] = useState<string | null>(null);

  const refresh = useMemo(
    () => async () => {
      setLoading(true);
      setError(null);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError('Not signed in');
        setLoading(false);
        return;
      }

      const { data, error: recsError } = await (supabase as any)
        .from('practitioner_recommendations')
        .select(`
          id, patient_id, product_slug, product_name, product_type,
          recommendation_type, priority, delivery_form, duration_days,
          dosing_instructions, notes, status, created_at
        `)
        .eq('practitioner_id', user.id)
        .order('created_at', { ascending: false })
        .limit(200);

      if (recsError) {
        setError(recsError.message);
        setLoading(false);
        return;
      }

      const patientMap = new Map(patients.map((p) => [p.id, p.fullName]));
      const built: RecommendationRow[] = (data ?? []).map((r: any) => ({
        ...r,
        patientName: patientMap.get(r.patient_id) ?? 'Unknown patient',
      }));

      setRecs(built);
      setLoading(false);
    },
    [supabase, patients],
  );

  useEffect(() => {
    refresh();
  }, [refresh]);

  const filtered = useMemo(() => {
    return recs.filter((r) => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (typeFilter !== 'all' && r.product_type !== typeFilter) return false;
      if (patientFilter !== 'all' && r.patient_id !== patientFilter) return false;
      if (query) {
        const q = query.toLowerCase();
        if (
          !r.product_name.toLowerCase().includes(q) &&
          !r.patientName.toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [recs, query, patientFilter, typeFilter, statusFilter]);

  const handleDiscontinue = async (id: string) => {
    setActionPending(id);
    const { error: updateError } = await (supabase as any)
      .from('practitioner_recommendations')
      .update({ status: 'discontinued', updated_at: new Date().toISOString() })
      .eq('id', id);
    setActionPending(null);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    refresh();
  };

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <Link
        href="/practitioner/shop"
        className="inline-flex items-center gap-1.5 text-xs text-[rgba(255,255,255,0.45)] transition-colors hover:text-[rgba(255,255,255,0.75)]"
      >
        <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
        Back to Practitioner Shop
      </Link>

      {/* Header */}
      <div className="flex items-start gap-3 sm:gap-4">
        <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl border border-[rgba(183,94,24,0.30)] bg-gradient-to-br from-[#1A2744] to-[#B75E18]">
          <Stethoscope className="h-5 w-5 text-white" strokeWidth={1.5} />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="break-words text-lg font-bold text-white sm:text-xl md:text-2xl">
            My Recommendations
          </h1>
          <p className="mt-0.5 text-xs leading-snug text-[rgba(255,255,255,0.45)] sm:text-sm">
            {filtered.length} of {recs.length} · peptides, supplements, and tests recommended to your patients
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="space-y-3 rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#1E3054] p-4">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[rgba(255,255,255,0.40)]"
            strokeWidth={1.5}
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by product or patient..."
            className="h-10 w-full rounded-xl border border-[rgba(255,255,255,0.10)] bg-[rgba(255,255,255,0.04)] pl-10 pr-4 text-sm text-white placeholder:text-[rgba(255,255,255,0.30)] outline-none focus:border-[rgba(45,165,160,0.40)]"
          />
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <select
            value={patientFilter}
            onChange={(e) => setPatientFilter(e.target.value)}
            className="h-10 rounded-xl border border-[rgba(255,255,255,0.10)] bg-[rgba(255,255,255,0.04)] px-3 text-sm text-white outline-none focus:border-[rgba(45,165,160,0.40)]"
          >
            <option value="all" className="bg-[#1A2744]">All patients</option>
            {patients.map((p) => (
              <option key={p.id} value={p.id} className="bg-[#1A2744]">
                {p.fullName}
              </option>
            ))}
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="h-10 rounded-xl border border-[rgba(255,255,255,0.10)] bg-[rgba(255,255,255,0.04)] px-3 text-sm text-white outline-none focus:border-[rgba(45,165,160,0.40)]"
          >
            {TYPE_FILTER_OPTIONS.map((o) => (
              <option key={o.value} value={o.value} className="bg-[#1A2744]">
                {o.label}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 rounded-xl border border-[rgba(255,255,255,0.10)] bg-[rgba(255,255,255,0.04)] px-3 text-sm text-white outline-none focus:border-[rgba(45,165,160,0.40)]"
          >
            <option value="all" className="bg-[#1A2744]">All statuses</option>
            <option value="active" className="bg-[#1A2744]">Active</option>
            <option value="completed" className="bg-[#1A2744]">Completed</option>
            <option value="discontinued" className="bg-[#1A2744]">Discontinued</option>
            <option value="patient_declined" className="bg-[#1A2744]">Patient declined</option>
          </select>
        </div>
      </div>

      {/* List */}
      {loading && (
        <div className="flex items-center justify-center gap-2 rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] py-12 text-sm text-[rgba(255,255,255,0.45)]">
          <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />
          Loading recommendations...
        </div>
      )}

      {error && !loading && (
        <div className="flex items-start gap-3 rounded-2xl border border-[rgba(239,68,68,0.30)] bg-[rgba(239,68,68,0.08)] p-4">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#F87171]" strokeWidth={1.5} />
          <div>
            <p className="text-sm font-semibold text-white">Couldn&apos;t load recommendations</p>
            <p className="mt-1 text-xs text-[rgba(255,255,255,0.55)]">{error}</p>
            <p className="mt-2 text-xs text-[rgba(255,255,255,0.40)]">
              Run <code className="rounded bg-white/[0.06] px-1.5 py-0.5">npx supabase db push</code> to apply the practitioner_ordering migration.
            </p>
          </div>
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] py-12 text-center">
          <Stethoscope className="mx-auto h-8 w-8 text-[rgba(255,255,255,0.20)]" strokeWidth={1.5} />
          <p className="mt-3 text-sm font-medium text-[rgba(255,255,255,0.55)]">
            {recs.length === 0 ? 'No recommendations yet' : 'No recommendations match your filters'}
          </p>
          <p className="mt-1 text-xs text-[rgba(255,255,255,0.40)]">
            {recs.length === 0
              ? 'Open a peptide profile and click Recommend to send your first one.'
              : 'Try adjusting your filters.'}
          </p>
        </div>
      )}

      <ul className="space-y-2">
        {filtered.map((r) => {
          const type = TYPE_STYLE[r.recommendation_type] ?? TYPE_STYLE.suggested;
          const priority = PRIORITY_STYLE[r.priority] ?? PRIORITY_STYLE.normal;
          const status = STATUS_STYLE[r.status] ?? STATUS_STYLE.active;
          return (
            <li
              key={r.id}
              className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#1E3054] p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span
                      className="rounded-full border px-2 py-0.5 text-[10px] font-medium"
                      style={{ backgroundColor: type.bg, color: type.text, borderColor: type.border }}
                    >
                      {type.label}
                    </span>
                    <span
                      className="rounded-full border px-2 py-0.5 text-[10px] font-medium"
                      style={{ backgroundColor: status.bg, color: status.text, borderColor: status.border }}
                    >
                      {status.label}
                    </span>
                    <span className="text-[10px] font-medium" style={{ color: priority.text }}>
                      {priority.label} priority
                    </span>
                  </div>
                  <h3 className="mt-2 break-words text-sm font-bold text-white">
                    {r.product_name}
                  </h3>
                  <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-[rgba(255,255,255,0.55)]">
                    <User className="h-3 w-3" strokeWidth={1.5} />
                    {r.patientName}
                  </p>
                  <div className="mt-2 grid grid-cols-1 gap-1 text-[11px] text-[rgba(255,255,255,0.55)] sm:grid-cols-2">
                    {r.delivery_form && (
                      <p>
                        <span className="text-[rgba(255,255,255,0.40)]">Delivery: </span>
                        {r.delivery_form}
                      </p>
                    )}
                    {r.duration_days != null && (
                      <p>
                        <span className="text-[rgba(255,255,255,0.40)]">Duration: </span>
                        {r.duration_days} days
                      </p>
                    )}
                    {r.dosing_instructions && (
                      <p className="col-span-full break-words">
                        <span className="text-[rgba(255,255,255,0.40)]">Dosing: </span>
                        {r.dosing_instructions}
                      </p>
                    )}
                    {r.notes && (
                      <p className="col-span-full break-words italic text-[rgba(255,255,255,0.45)]">
                        &ldquo;{r.notes}&rdquo;
                      </p>
                    )}
                  </div>
                  <p className="mt-2 inline-flex items-center gap-1 text-[10px] text-[rgba(255,255,255,0.40)]">
                    <Calendar className="h-2.5 w-2.5" strokeWidth={1.5} />
                    {new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
                {r.status === 'active' && (
                  <button
                    type="button"
                    onClick={() => handleDiscontinue(r.id)}
                    disabled={actionPending === r.id}
                    className="flex-shrink-0 rounded-lg border border-[rgba(255,255,255,0.10)] bg-[rgba(255,255,255,0.04)] p-2 text-[rgba(255,255,255,0.45)] transition-all hover:border-[rgba(239,68,68,0.30)] hover:text-[#F87171] disabled:opacity-50"
                    title="Discontinue recommendation"
                    aria-label="Discontinue recommendation"
                  >
                    {actionPending === r.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.5} />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                    )}
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
