'use client';

// =============================================================================
// Practitioner / Naturopath Body Scan patient tab. Prompt #169 Task 3 (spec 12).
// =============================================================================
// Read-only clinical view of a managed patient's body-scan history:
//   1. Longitudinal trend chart + the patient's measurement and composition data
//   2. Side-by-side comparison across any two of the patient's scans
//   3. The single aggregate engagement score (0 to 100) via the existing
//      /api/practitioner/patients/[patientId]/engagement-score route
//   4. Practitioner notes wired to body_scan_practitioner_notes
//   5. Practitioner-only peptide protocol guidance (educational)
//   6. Branded PDF export ("Farmceutica Wellness Ltd") via body-scan-export
//
// DATA ACCESS: practitioner-scoped RLS via the browser client, mirroring
// StandardPatientView / NaturopathicPatientView / ScanResultsPanel. The scan
// SELECT policies live in 20260516000060_prompt_169_practitioner_scan_read_rls.
//
// HELIX FIREWALL: only the aggregate engagement number is shown. No Helix
// tokens / achievements / challenges / leaderboard / balances. The payload is
// built through buildPractitionerScanPayload which runs assertNoHelixExposure.

import { useEffect, useMemo, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  Activity, Loader2, GitCompareArrows, NotebookPen, FlaskConical,
  TrendingUp, Boxes, Save, Check, Scale,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import {
  buildPractitionerScanPayload,
  TREND_METRICS,
  trendDelta,
  type ScanMeasurementRow,
  type EngagementScoreResponse,
  type PractitionerScanPayload,
  type TrendMetricKey,
} from '@/lib/body-tracker/practitioner-scan';
import {
  PRACTITIONER_PEPTIDE_GUIDANCE,
} from '@/lib/body-tracker/practitioner-peptide-guidance';
import { MeasurementGrid } from '@/components/body-tracker/scanning/MeasurementGrid';
import { CompositionBreakdownCard } from '@/components/body-tracker/scanning/CompositionBreakdownCard';
import { AsymmetryAnalysisPanel } from '@/components/body-tracker/scanning/AsymmetryAnalysisPanel';
import { AvatarComparison } from '@/components/body-tracker/scanning/AvatarComparison';
import { PractitionerScanPdfButton } from './PractitionerScanPdfButton';
import {
  detectSustainedAsymmetryTrends,
  ASYMMETRY_TREND_THRESHOLD_PCT,
  type AsymmetryTrend,
} from '@/lib/body-tracker/asymmetry-trend';
import type {
  ExtractedMeasurements, CompositionEstimate, BodyModelParameters, AsymmetryReport,
} from '@/lib/arnold/scanning/types';

type Accent = 'teal' | 'emerald';

interface Props {
  patientId: string;
  /** Patient display name (already resolved by the parent view). */
  patientName: string;
  /** Whether the relationship consents to sharing the engagement score. */
  engagementConsented: boolean;
  /** View accent so the tab matches Standard (teal) vs Naturopathic (emerald). */
  accent?: Accent;
}

interface SessionRow {
  id: string;
  session_date: string | null;
  extracted_measurements: ExtractedMeasurements | null;
  composition_estimate: CompositionEstimate | null;
  avatar_parameters: BodyModelParameters | null;
  // Asymmetry as CLINICAL CONTEXT (Prompt #169e Phase 1, section 3.2, item 4).
  // Per the standing rule, asymmetry flows to practitioners (unlike Helix); this
  // is read straight off the session, separate from the Helix-guarded engagement
  // payload, so the firewall/allow-list discipline is untouched.
  asymmetry_report: AsymmetryReport | null;
}

interface NoteRow {
  id: string;
  session_id: string;
  notes: string;
  updated_at: string;
}

const ACCENT_HEX: Record<Accent, string> = { teal: '#2DA5A0', emerald: '#34D399' };

export function PractitionerBodyScanTab({
  patientId, patientName, engagementConsented, accent = 'teal',
}: Props) {
  const accentHex = ACCENT_HEX[accent];

  const [loading, setLoading] = useState(true);
  const [payload, setPayload] = useState<PractitionerScanPayload | null>(null);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [sex, setSex] = useState<'male' | 'female'>('male');
  const [activeMetric, setActiveMetric] = useState<TrendMetricKey>('bodyFatPct');

  // Compare picker
  const [beforeId, setBeforeId] = useState<string | null>(null);
  const [afterId, setAfterId] = useState<string | null>(null);

  // Notes (keyed to the most recent session)
  const [noteSessionId, setNoteSessionId] = useState<string | null>(null);
  const [noteId, setNoteId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');
  const [noteSaving, setNoteSaving] = useState(false);
  const [noteSavedAt, setNoteSavedAt] = useState<string | null>(null);
  const [noteError, setNoteError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const supabase = createClient();
      const sb = supabase as any;

      // Measurement rows (trend + per-scan composition) via practitioner RLS.
      const measRes = await sb
        .from('body_scan_measurements')
        .select(
          'session_id, scan_date, waist_natural_circ_cm, hip_circ_cm, chest_circ_cm, ' +
          'waist_to_hip_ratio, body_fat_pct_mid, lean_mass_kg, fat_mass_kg, ffmi',
        )
        .eq('user_id', patientId)
        .order('scan_date', { ascending: true })
        .limit(60);
      const measurementRows = (measRes.data ?? []) as ScanMeasurementRow[];

      // Session rows (avatar params + JSONB blobs for the read-only displays).
      const sessRes = await sb
        .from('body_photo_sessions')
        .select('id, session_date, extracted_measurements, composition_estimate, avatar_parameters, asymmetry_report')
        .eq('user_id', patientId)
        .eq('scan_status', 'complete')
        .order('session_date', { ascending: false })
        .limit(60);
      const sessionRows = (sessRes.data ?? []) as SessionRow[];

      // Patient sex for composition classification (read via practitioner RLS
      // on profiles where consented; defaults to male if unavailable).
      const profRes = await sb
        .from('profiles')
        .select('sex')
        .eq('id', patientId)
        .maybeSingle();
      const patientSex: 'male' | 'female' =
        (profRes.data?.sex === 'female') ? 'female' : 'male';

      // Aggregate engagement score via the existing practitioner route. The
      // route enforces relationship + consent again server-side; we only call
      // it when the relationship consents to avoid a guaranteed 403.
      let engagement: EngagementScoreResponse | null = null;
      if (engagementConsented) {
        try {
          const res = await fetch(`/api/practitioner/patients/${patientId}/engagement-score`);
          if (res.ok) engagement = (await res.json()) as EngagementScoreResponse;
        } catch {
          engagement = null;
        }
      }

      // Existing note for the most recent completed session.
      const latestSessionId = sessionRows[0]?.id ?? null;
      let existingNote: NoteRow | null = null;
      if (latestSessionId) {
        const noteRes = await sb
          .from('body_scan_practitioner_notes')
          .select('id, session_id, notes, updated_at')
          .eq('patient_user_id', patientId)
          .eq('session_id', latestSessionId)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        existingNote = (noteRes.data ?? null) as NoteRow | null;
      }

      if (cancelled) return;

      const built = buildPractitionerScanPayload({
        patientDisplayName: patientName,
        measurementRows,
        engagement,
      });
      setPayload(built);
      setSessions(sessionRows);
      setSex(patientSex);
      // Default compare picks: two most recent completed sessions.
      setAfterId(sessionRows[0]?.id ?? null);
      setBeforeId(sessionRows[1]?.id ?? null);
      setNoteSessionId(latestSessionId);
      setNoteId(existingNote?.id ?? null);
      setNoteText(existingNote?.notes ?? '');
      setNoteSavedAt(existingNote?.updated_at ?? null);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [patientId, patientName, engagementConsented]);

  const chartData = useMemo(
    () => (payload?.trend ?? []).map((p) => ({
      label: formatShort(p.date),
      value: p[activeMetric],
    })).filter((d) => d.value !== null),
    [payload, activeMetric],
  );

  const before = sessions.find((s) => s.id === beforeId) ?? null;
  const after = sessions.find((s) => s.id === afterId) ?? null;
  const latestSession = sessions[0] ?? null;

  // Sustained cross-scan asymmetry (clinical context). sessions are newest-first,
  // which is exactly the order detectSustainedAsymmetryTrends expects.
  const asymmetryTrends = useMemo<AsymmetryTrend[]>(
    () => detectSustainedAsymmetryTrends(sessions.map((s) => s.asymmetry_report)),
    [sessions],
  );

  async function saveNote() {
    if (!noteSessionId) return;
    setNoteSaving(true);
    setNoteError(null);
    try {
      const supabase = createClient();
      const sb = supabase as any;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not signed in');

      if (noteId) {
        const { error } = await sb
          .from('body_scan_practitioner_notes')
          .update({ notes: noteText })
          .eq('id', noteId);
        if (error) throw new Error(error.message);
      } else {
        const { data, error } = await sb
          .from('body_scan_practitioner_notes')
          .insert({
            session_id: noteSessionId,
            practitioner_user_id: user.id,
            patient_user_id: patientId,
            notes: noteText,
          })
          .select('id, updated_at')
          .single();
        if (error) throw new Error(error.message);
        setNoteId((data as { id: string }).id);
      }
      setNoteSavedAt(new Date().toISOString());
    } catch (e) {
      setNoteError(e instanceof Error ? e.message : 'Could not save note');
    } finally {
      setNoteSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] p-12 text-white/55">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" strokeWidth={1.5} />
        Loading body scan history
      </div>
    );
  }

  if (!payload || payload.scanCount === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center">
        <Boxes className="mx-auto mb-3 h-9 w-9 text-white/30" strokeWidth={1.5} />
        <p className="text-sm font-semibold text-white">No body scans yet</p>
        <p className="mx-auto mt-1 max-w-sm text-xs text-white/55">
          When {payload?.patientDisplayName ?? 'this patient'} completes an AI body scan, the
          longitudinal trend, measurements, composition, and comparison tools appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Engagement (single aggregate) + scan count */}
      <div className="grid gap-4 sm:grid-cols-3">
        <SummaryCard
          icon={Activity}
          accentHex={accentHex}
          label="Engagement score"
          value={
            payload.engagement
              ? `${payload.engagement.score} / 100`
              : engagementConsented ? 'Not available' : 'Consent not granted'
          }
          sub={
            payload.engagement?.periodEnd
              ? `Through ${formatShort(payload.engagement.periodEnd)}`
              : 'Aggregate only; Helix internals stay consumer-side'
          }
        />
        <SummaryCard
          icon={Boxes}
          accentHex={accentHex}
          label="Completed scans"
          value={String(payload.scanCount)}
          sub={payload.latestScanDate ? `Latest ${formatShort(payload.latestScanDate)}` : undefined}
        />
        <SummaryCard
          icon={TrendingUp}
          accentHex={accentHex}
          label={`${labelFor(activeMetric)} change`}
          value={formatDelta(trendDelta(payload.trend, activeMetric), activeMetric)}
          sub="First to latest scan"
        />
      </div>

      {/* Trend chart */}
      <Section icon={TrendingUp} title="Longitudinal trend" accentHex={accentHex}>
        <div className="mb-3 flex flex-wrap gap-1.5">
          {TREND_METRICS.map((m) => (
            <button
              key={m.key}
              type="button"
              onClick={() => setActiveMetric(m.key)}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                activeMetric === m.key
                  ? 'text-white'
                  : 'border border-white/10 bg-white/[0.03] text-white/55 hover:text-white/80'
              }`}
              style={activeMetric === m.key ? { backgroundColor: `${accentHex}33`, borderColor: `${accentHex}59`, color: accentHex } : undefined}
            >
              {m.label}
            </button>
          ))}
        </div>
        {chartData.length >= 2 ? (
          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: -12, bottom: 0 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" stroke="rgba(255,255,255,0.3)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="rgba(255,255,255,0.3)" fontSize={12} tickLine={false} axisLine={false} domain={['dataMin - 2', 'dataMax + 2']} />
                <Tooltip
                  content={({ active, payload: tp, label }) =>
                    active && tp && tp.length ? (
                      <div className="rounded-lg border border-white/[0.08] bg-[#1E3054]/90 px-3 py-2 shadow-lg">
                        <p className="text-xs text-white/60">{label}</p>
                        <p className="text-sm font-semibold text-white">
                          {tp[0].value} {unitFor(activeMetric)}
                        </p>
                      </div>
                    ) : null
                  }
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={accentHex}
                  strokeWidth={2}
                  dot={{ r: 3, fill: accentHex }}
                  activeDot={{ r: 6, fill: accentHex, stroke: '#1E3054', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-sm text-white/55">
            At least two scans with {labelFor(activeMetric).toLowerCase()} data are needed to chart a trend.
          </p>
        )}
      </Section>

      {/* Latest scan: measurements + composition (read-only reuse) */}
      {latestSession?.extracted_measurements && (
        <Section icon={Boxes} title={`Latest scan, ${formatShort(latestSession.session_date)}`} accentHex={accentHex}>
          <div className="space-y-4">
            <MeasurementGrid
              measurements={latestSession.extracted_measurements}
              unitSystem="metric"
              heightCm={latestSession.avatar_parameters?.heightCm ?? 170}
            />
            {latestSession.composition_estimate && (
              <CompositionBreakdownCard composition={latestSession.composition_estimate} sex={sex} />
            )}
          </div>
        </Section>
      )}

      {/* Bilateral asymmetry as CLINICAL CONTEXT (Prompt #169e Phase 1, section
          3.2, item 4). Asymmetry is clinical and is allowed to flow to
          practitioners (unlike Helix gamification). Read straight off the
          session's asymmetry_report, so the Helix firewall/allow-list on the
          engagement payload is untouched. */}
      {latestSession?.asymmetry_report && (
        <Section icon={Scale} title="Bilateral symmetry (clinical context)" accentHex={accentHex}>
          <div className="space-y-3">
            {asymmetryTrends.length > 0 && (
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-white/50">
                  Sustained over {ASYMMETRY_TREND_THRESHOLD_PCT}% across {'≥'}2 scans
                </p>
                <ul className="space-y-1.5">
                  {asymmetryTrends.map((t) => (
                    <li key={t.name} className="flex items-center justify-between text-xs">
                      <span className="text-white/80">{t.name}</span>
                      <span className="tabular-nums text-white/55">
                        {t.dominantSide === 'right' ? 'R' : 'L'} larger,{' '}
                        {Math.abs(t.latestDeltaPct).toFixed(1)}% (max {t.maxDeltaPct.toFixed(1)}%, {t.sustainedCount}/{t.observedCount} scans)
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-[11px] leading-relaxed text-white/40">
                  Informational clinical context from the patient's scans; not a diagnosis.
                </p>
              </div>
            )}
            <AsymmetryAnalysisPanel report={latestSession.asymmetry_report} />
          </div>
        </Section>
      )}

      {/* Compare any two scans (read-only reuse of AvatarComparison) */}
      <Section icon={GitCompareArrows} title="Compare scans" accentHex={accentHex}>
        {sessions.length < 2 ? (
          <p className="text-sm text-white/55">Two completed scans are needed to compare.</p>
        ) : (
          <div className="space-y-3">
            <div className="grid gap-2 sm:grid-cols-2">
              <SessionSelect label="Before" value={beforeId} sessions={sessions} onChange={setBeforeId} accentHex={accentHex} />
              <SessionSelect label="After" value={afterId} sessions={sessions} onChange={setAfterId} accentHex={accentHex} />
            </div>
            {before?.avatar_parameters && after?.avatar_parameters ? (
              <AvatarComparison
                beforeParams={before.avatar_parameters}
                afterParams={after.avatar_parameters}
                beforeLabel={`Before, ${formatShort(before.session_date)}`}
                afterLabel={`After, ${formatShort(after.session_date)}`}
              />
            ) : (
              <p className="text-sm text-white/55">
                The selected scans do not both have avatar data to compare.
              </p>
            )}
          </div>
        )}
      </Section>

      {/* Practitioner notes */}
      <Section icon={NotebookPen} title="Practitioner notes" accentHex={accentHex}>
        {noteSessionId ? (
          <div className="space-y-2">
            <p className="text-[11px] text-white/45">
              Private clinical note on the latest scan ({formatShort(latestSession?.session_date)}). Visible to you and the patient.
            </p>
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              rows={4}
              placeholder="Observations on this patient's body composition trend, recommendations, or follow-up notes..."
              className="w-full resize-none rounded-lg border border-white/[0.08] bg-white/[0.04] p-3 text-sm text-white placeholder:text-white/35 outline-none focus:border-white/20"
            />
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-white/40">
                {noteSavedAt ? `Saved ${formatShort(noteSavedAt)}` : 'Not saved yet'}
              </span>
              <button
                type="button"
                onClick={saveNote}
                disabled={noteSaving || noteText.trim().length === 0}
                className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                style={{ backgroundColor: `${accentHex}26`, border: `1px solid ${accentHex}59`, color: accentHex }}
              >
                {noteSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />
                ) : noteSavedAt ? (
                  <Check className="h-4 w-4" strokeWidth={1.5} />
                ) : (
                  <Save className="h-4 w-4" strokeWidth={1.5} />
                )}
                Save note
              </button>
            </div>
            {noteError && <p className="text-xs text-red-300">{noteError}</p>}
          </div>
        ) : (
          <p className="text-sm text-white/55">A completed scan is required before adding notes.</p>
        )}
      </Section>

      {/* Peptide protocol guidance (practitioner-only educational content) */}
      <Section icon={FlaskConical} title={PRACTITIONER_PEPTIDE_GUIDANCE.heading} accentHex={accentHex}>
        <p className="mb-3 text-xs leading-relaxed text-white/60">
          {PRACTITIONER_PEPTIDE_GUIDANCE.intro}
        </p>
        <ul className="flex flex-col gap-2">
          {PRACTITIONER_PEPTIDE_GUIDANCE.items.map((item) => (
            <li key={item.id} className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
              <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-white">{item.name}</p>
                <span
                  className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
                  style={{ backgroundColor: `${accentHex}1F`, color: accentHex }}
                >
                  {item.routeTag}
                </span>
              </div>
              <p className="text-xs leading-relaxed text-white/65">{item.note}</p>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[11px] leading-relaxed text-white/40">
          {PRACTITIONER_PEPTIDE_GUIDANCE.disclaimer}
        </p>
      </Section>

      {/* Branded PDF export */}
      {latestSession && (
        <Section icon={NotebookPen} title="Export" accentHex={accentHex}>
          <p className="mb-3 text-xs text-white/55">
            Generate a Farmceutica Wellness Ltd branded body composition report for the latest scan.
          </p>
          <PractitionerScanPdfButton
            sessionId={latestSession.id}
            patientId={patientId}
            accentHex={accentHex}
          />
        </Section>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Presentational helpers
// ---------------------------------------------------------------------------

function Section({
  icon: Icon, title, accentHex, children,
}: { icon: typeof Activity; title: string; accentHex: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <header className="mb-3 flex items-center gap-2">
        <Icon className="h-4 w-4" strokeWidth={1.5} style={{ color: accentHex }} />
        <h3 className="text-sm font-semibold text-white">{title}</h3>
      </header>
      {children}
    </section>
  );
}

function SummaryCard({
  icon: Icon, label, value, sub, accentHex,
}: { icon: typeof Activity; label: string; value: string; sub?: string; accentHex: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="mb-1 flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5" strokeWidth={1.5} style={{ color: accentHex }} />
        <p className="text-[10px] font-semibold uppercase tracking-wider text-white/50">{label}</p>
      </div>
      <p className="text-lg font-semibold text-white">{value}</p>
      {sub && <p className="mt-0.5 text-[11px] text-white/45">{sub}</p>}
    </div>
  );
}

function SessionSelect({
  label, value, sessions, onChange, accentHex,
}: {
  label: string;
  value: string | null;
  sessions: SessionRow[];
  onChange: (id: string) => void;
  accentHex: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-white/50">{label}</span>
      <select
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-white/[0.08] bg-[#1A2744] px-2 py-2 text-sm text-white outline-none focus:border-white/30"
        style={{ borderColor: value ? `${accentHex}40` : undefined }}
      >
        {sessions.map((s) => (
          <option key={s.id} value={s.id}>{formatShort(s.session_date)}</option>
        ))}
      </select>
    </label>
  );
}

function formatShort(iso: string | null | undefined): string {
  if (!iso) return 'n/a';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'n/a';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function labelFor(key: TrendMetricKey): string {
  return TREND_METRICS.find((m) => m.key === key)?.label ?? key;
}

function unitFor(key: TrendMetricKey): string {
  return TREND_METRICS.find((m) => m.key === key)?.unit ?? '';
}

function formatDelta(delta: number | null, key: TrendMetricKey): string {
  if (delta === null) return 'n/a';
  const unit = unitFor(key);
  const sign = delta > 0 ? '+' : '';
  return `${sign}${delta.toFixed(1)} ${unit}`.trim();
}
