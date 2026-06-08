'use client';

// Prompt 179c: the Measurements trend + history + scan-import surface, mounted in
// the Body Composition "measurements" section. Reads GET /api/body/measurements
// (events, latest scan id, Platinum flag). Platinum members get an explicit
// "Import from latest scan" action; others see an understated upsell in the same
// spot. Manual and scan points are visually distinguished (teal vs copper). Manual
// rows can be deleted, scan rows hidden; both soft-delete (DD-4).

import { useCallback, useEffect, useMemo, useState } from 'react';
import { TrendingUp, Sparkles, Trash2, EyeOff, Lock } from 'lucide-react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  ALL_SITES,
  SITES_BY_REGION,
  REGION_LABEL,
  SITE_LABEL,
  type CanonicalSite,
  type SiteRegion,
} from '@/lib/body-measurements/sites';
import { displayValue, type MeasurementUnit } from '@/lib/body-measurements/units';
import type { MeasurementEvent } from '@/lib/body-measurements/measurementsAccess';

const TEAL = '#2DA5A0';
const COPPER = '#B75E18';

interface ApiResponse {
  ok: boolean;
  events?: MeasurementEvent[];
  latestScanId?: string | null;
  platinum?: boolean;
}

interface MeasurementsPanelProps {
  unit: MeasurementUnit;
  onChanged?: () => void;
}

export function MeasurementsPanel({ unit, onChanged }: MeasurementsPanelProps) {
  const [events, setEvents] = useState<MeasurementEvent[]>([]);
  const [latestScanId, setLatestScanId] = useState<string | null>(null);
  const [platinum, setPlatinum] = useState(false);
  const [loading, setLoading] = useState(true);
  const [site, setSite] = useState<CanonicalSite>('waist');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/body/measurements');
      const json: ApiResponse = await res.json();
      if (json.ok) {
        setEvents(json.events ?? []);
        setLatestScanId(json.latestScanId ?? null);
        setPlatinum(Boolean(json.platinum));
      }
    } catch {
      /* fail open: an empty panel, never a blocked page */
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleImport = useCallback(async () => {
    if (!latestScanId || busy) return;
    setBusy(true);
    setNotice(null);
    try {
      const res = await fetch(`/api/body/measurements/from-scan/${latestScanId}`, { method: 'POST' });
      const json = await res.json();
      if (json.ok) {
        setNotice(json.status === 'already_imported' ? 'This scan was already imported.' : 'Imported your latest scan.');
        await load();
        onChanged?.();
      } else {
        setNotice(json.error === 'platinum_required' ? 'Platinum is required to import scans.' : 'Import did not complete; try again.');
      }
    } catch {
      setNotice('Import did not complete; try again.');
    }
    setBusy(false);
  }, [latestScanId, busy, load, onChanged]);

  const handleRemove = useCallback(
    async (id: string) => {
      if (busy) return;
      setBusy(true);
      try {
        const res = await fetch(`/api/body/measurements/${id}`, { method: 'DELETE' });
        const json = await res.json();
        if (json.ok) {
          await load();
          onChanged?.();
        }
      } catch {
        /* non-fatal */
      }
      setBusy(false);
    },
    [busy, load, onChanged],
  );

  // Per-site trend series, chronological, converted to the display unit.
  const series = useMemo(() => {
    return events
      .filter((e) => typeof e.values[site] === 'number')
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((e) => ({
        date: e.date,
        label: e.date.slice(5),
        value: displayValue(e.values[site] as number, e.entryUnit, unit),
        source: e.source,
      }));
  }, [events, site, unit]);

  const history = useMemo(
    () => events.slice().sort((a, b) => b.date.localeCompare(a.date)),
    [events],
  );

  return (
    <div className="space-y-5">
      {/* Import from latest scan (Platinum) or upsell */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#1E3054]/35 p-4 backdrop-blur-sm">
        {platinum ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm text-white/80">
              <Sparkles className="h-4 w-4 text-[#2DA5A0]" strokeWidth={1.5} />
              <span>Pull circumferences straight from your latest body scan.</span>
            </div>
            <button
              type="button"
              onClick={handleImport}
              disabled={!latestScanId || busy}
              className="rounded-full bg-[#2DA5A0] px-4 py-2 text-sm font-medium text-[#0c1622] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {busy ? 'Working' : latestScanId ? 'Import from latest scan' : 'No scan yet'}
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm text-white/70">
              <Lock className="h-4 w-4 text-[#B75E18]" strokeWidth={1.5} />
              <span>Import measurements automatically from each body scan with Platinum.</span>
            </div>
            <a
              href="/membership"
              className="rounded-full border border-[#B75E18]/50 px-4 py-2 text-sm font-medium text-[#B75E18] transition hover:bg-[#B75E18]/10"
            >
              See Platinum
            </a>
          </div>
        )}
        {notice && <p className="mt-3 text-xs text-white/55">{notice}</p>}
      </div>

      {/* Per-site trend */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#1E3054]/35 p-5 backdrop-blur-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-medium text-white/85">
            <TrendingUp className="h-4 w-4 text-[#2DA5A0]" strokeWidth={1.5} />
            <span>Trend</span>
          </div>
          <label className="flex items-center gap-2 text-xs text-white/55">
            <span>Site</span>
            <select
              value={site}
              onChange={(e) => setSite(e.target.value as CanonicalSite)}
              className="rounded-lg border border-white/10 bg-[#1A2744] px-2.5 py-1.5 text-xs text-white/85 outline-none focus:border-[#2DA5A0]/60"
            >
              {(Object.keys(SITES_BY_REGION) as SiteRegion[]).map((region) => (
                <optgroup key={region} label={REGION_LABEL[region]}>
                  {SITES_BY_REGION[region].map((s) => (
                    <option key={s} value={s}>
                      {SITE_LABEL[s]}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>
        </div>

        {loading ? (
          <div className="flex h-[220px] items-center justify-center text-sm text-white/40">Loading your measurements</div>
        ) : series.length === 0 ? (
          <div className="flex h-[220px] items-center justify-center px-6 text-center text-sm text-white/40">
            Log a measurement or run a body scan to see your {SITE_LABEL[site].toLowerCase()} trend.
          </div>
        ) : (
          <>
            <div className="h-[220px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={series} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
                  <CartesianGrid stroke="#ffffff14" vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: '#ffffff66', fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis
                    tick={{ fill: '#ffffff66', fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    width={36}
                    domain={['dataMin - 2', 'dataMax + 2']}
                  />
                  <Tooltip
                    contentStyle={{
                      background: '#1A2744',
                      border: '1px solid #ffffff1a',
                      borderRadius: 12,
                      color: '#ffffff',
                      fontSize: 12,
                    }}
                    formatter={(value) => [`${value as number} ${unit}`, SITE_LABEL[site]]}
                    labelStyle={{ color: '#ffffff99' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke={TEAL}
                    strokeWidth={2}
                    dot={(props: { cx?: number; cy?: number; payload?: { source?: string }; index?: number }) => {
                      const { cx, cy, payload, index } = props;
                      if (typeof cx !== 'number' || typeof cy !== 'number') {
                        return <g key={index} />;
                      }
                      const isScan = payload?.source === 'scan';
                      return (
                        <circle
                          key={index}
                          cx={cx}
                          cy={cy}
                          r={4}
                          fill={isScan ? COPPER : TEAL}
                          stroke="#0c1622"
                          strokeWidth={1.5}
                        />
                      );
                    }}
                    activeDot={{ r: 5 }}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 flex items-center gap-4 text-[11px] text-white/45">
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 rounded-full" style={{ background: TEAL }} /> Manual
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 rounded-full" style={{ background: COPPER }} /> Scan
              </span>
            </div>
          </>
        )}
      </div>

      {/* History with provenance */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#1E3054]/35 p-5 backdrop-blur-sm">
        <h3 className="mb-3 text-sm font-medium text-white/85">History</h3>
        {history.length === 0 ? (
          <p className="text-sm text-white/40">No measurements logged yet.</p>
        ) : (
          <ul className="divide-y divide-white/[0.06]">
            {history.map((e) => {
              const siteValue = e.values[site];
              const measured = ALL_SITES.filter((s) => typeof e.values[s] === 'number').length;
              const isScan = e.source === 'scan';
              return (
                <li key={e.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-white/85">{e.date}</span>
                      <span
                        className="rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide"
                        style={
                          isScan
                            ? { background: 'rgba(183,94,24,0.16)', color: COPPER }
                            : { background: 'rgba(45,165,160,0.16)', color: TEAL }
                        }
                      >
                        {isScan ? 'Scan' : 'Manual'}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-white/50">
                      {typeof siteValue === 'number'
                        ? `${SITE_LABEL[site]}: ${displayValue(siteValue, e.entryUnit, unit)} ${unit}`
                        : `${SITE_LABEL[site]} not measured`}
                      <span className="text-white/30"> ({measured} sites)</span>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemove(e.id)}
                    disabled={busy}
                    aria-label={isScan ? 'Hide this scan measurement' : 'Delete this measurement'}
                    className="flex shrink-0 items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-xs text-white/60 transition hover:border-white/20 hover:text-white/85 disabled:opacity-40"
                  >
                    {isScan ? <EyeOff className="h-3.5 w-3.5" strokeWidth={1.5} /> : <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />}
                    {isScan ? 'Hide' : 'Delete'}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
