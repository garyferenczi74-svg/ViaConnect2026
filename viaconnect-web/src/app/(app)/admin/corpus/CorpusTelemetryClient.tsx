'use client';

// Prompt #170 Phase 1n: /admin/corpus client tiles.
//
// Six Recharts surfaces in a responsive grid (1 col mobile, 2 cols md, 3 cols xl):
//   1. Row writes by day, by source (14d, line chart, 3 series).
//   2. Cuisine distribution histogram (all time, bar chart, 9 buckets).
//   3. Cooking oil distribution (30d, stacked bar, suggested vs overridden).
//   4. Photo contribution rate (30d, single big number).
//   5. Cache hit rate (30d, donut: sha256_exact vs phash_near vs miss).
//   6. Provider mix (30d, donut: logmeal vs gemini vs claude_vision).
//
// Brand tokens enforced: Navy #1A2744, Card #1E3054, Teal #2DA5A0,
// Orange #B75E18. Lucide icons strokeWidth 1.5.
//
// Hard rules honored: no em or en dashes, no emojis, no any.

import {
  ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  BarChart, Bar,
  PieChart, Pie, Cell,
} from 'recharts';
import { Activity, ChefHat, Camera, Database, Layers, BarChart3 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type {
  CorpusTelemetry,
  CorpusRowBySource,
  CuisineBucket,
  OilBucket,
  CacheHitMix,
  ProviderMix,
} from '@/lib/admin/corpus-telemetry';

const NAVY = '#1A2744';
const CARD = '#1E3054';
const TEAL = '#2DA5A0';
const ORANGE = '#B75E18';
const WHITE = '#FFFFFF';
const MUTED = 'rgba(255,255,255,0.55)';

interface CorpusTelemetryClientProps {
  telemetry: CorpusTelemetry;
}

export function CorpusTelemetryClient({ telemetry }: CorpusTelemetryClientProps): JSX.Element {
  return (
    <div className="min-h-screen bg-[#0B1120] p-4 text-white sm:p-6 lg:p-8">
      <div className="mx-auto w-full max-w-[1440px]">
        <header className="mb-6 flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-full"
            style={{ background: 'rgba(45,165,160,0.15)', color: TEAL }}
          >
            <BarChart3 className="h-5 w-5" strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">NutriVision Corpus Telemetry</h1>
            <p className="text-sm" style={{ color: MUTED }}>
              Internal diagnostic surface. Read-only.
            </p>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <TileRowsBySource data={telemetry.rowsBySource} />
          <TileCuisine data={telemetry.cuisineDistribution} />
          <TileOilMix data={telemetry.oilDistribution} />
          <TilePhotoContribution rate={telemetry.photoContributionRate} />
          <TileCacheHitRate data={telemetry.cacheHitRate} />
          <TileProviderMix data={telemetry.providerMix} />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared card shell
// ---------------------------------------------------------------------------

interface CardShellProps {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  iconColor: string;
  children: React.ReactNode;
}

function CardShell({ title, subtitle, icon: Icon, iconColor, children }: CardShellProps): JSX.Element {
  return (
    <div
      className="flex flex-col gap-3 rounded-2xl border border-white/[0.08] p-4 backdrop-blur-md"
      style={{ background: `${CARD}80` }}
    >
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4" strokeWidth={1.5} />
        <h2 className="text-sm font-semibold text-white">{title}</h2>
      </div>
      <p className="text-[11px]" style={{ color: MUTED }}>{subtitle}</p>
      <div className="mt-1 h-[220px] w-full">{children}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tile 1: row writes by day, by source (14d)
// ---------------------------------------------------------------------------

function TileRowsBySource({ data }: { data: ReadonlyArray<CorpusRowBySource> }): JSX.Element {
  const totals = data.reduce(
    (acc, r) => {
      acc.nutrivision += r.nutrivision;
      acc.quick_log += r.quick_log;
      acc.manual += r.manual;
      return acc;
    },
    { nutrivision: 0, quick_log: 0, manual: 0 },
  );
  const grand = totals.nutrivision + totals.quick_log + totals.manual;
  return (
    <CardShell
      title="Corpus writes by source"
      subtitle={`Last 14 days, ${grand.toLocaleString()} rows total`}
      icon={Activity}
      iconColor={TEAL}
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data.map((r) => ({ ...r }))}>
          <CartesianGrid stroke="rgba(255,255,255,0.06)" />
          <XAxis dataKey="date" tickFormatter={(v: string) => v.slice(5)} stroke={MUTED} fontSize={10} />
          <YAxis stroke={MUTED} fontSize={10} allowDecimals={false} />
          <Tooltip contentStyle={{ background: NAVY, border: '1px solid rgba(255,255,255,0.1)' }} />
          <Legend wrapperStyle={{ color: WHITE, fontSize: 11 }} />
          <Line type="monotone" dataKey="nutrivision" stroke={TEAL}   strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="quick_log"   stroke={ORANGE} strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="manual"      stroke="#9CA3AF" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </CardShell>
  );
}

// ---------------------------------------------------------------------------
// Tile 2: cuisine histogram (all-time)
// ---------------------------------------------------------------------------

function TileCuisine({ data }: { data: ReadonlyArray<CuisineBucket> }): JSX.Element {
  return (
    <CardShell
      title="Cuisine tag distribution"
      subtitle="All time, by recognized cuisine"
      icon={Layers}
      iconColor={TEAL}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data.map((d) => ({ ...d }))}>
          <CartesianGrid stroke="rgba(255,255,255,0.06)" />
          <XAxis dataKey="cuisine_tag" stroke={MUTED} fontSize={9} angle={-30} textAnchor="end" interval={0} height={60} />
          <YAxis stroke={MUTED} fontSize={10} allowDecimals={false} />
          <Tooltip contentStyle={{ background: NAVY, border: '1px solid rgba(255,255,255,0.1)' }} />
          <Bar dataKey="count" fill={TEAL} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </CardShell>
  );
}

// ---------------------------------------------------------------------------
// Tile 3: cooking oil mix (30d), stacked suggested vs overridden
// ---------------------------------------------------------------------------

function TileOilMix({ data }: { data: ReadonlyArray<OilBucket> }): JSX.Element {
  return (
    <CardShell
      title="Cooking oil selection mix"
      subtitle="Last 30 days, suggested vs overridden"
      icon={ChefHat}
      iconColor={ORANGE}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data.map((d) => ({ ...d }))}>
          <CartesianGrid stroke="rgba(255,255,255,0.06)" />
          <XAxis dataKey="oil_type" stroke={MUTED} fontSize={9} angle={-30} textAnchor="end" interval={0} height={60} />
          <YAxis stroke={MUTED} fontSize={10} allowDecimals={false} />
          <Tooltip contentStyle={{ background: NAVY, border: '1px solid rgba(255,255,255,0.1)' }} />
          <Legend wrapperStyle={{ color: WHITE, fontSize: 11 }} />
          <Bar dataKey="suggested"  stackId="oil" fill={TEAL}   radius={[0, 0, 0, 0]} />
          <Bar dataKey="overridden" stackId="oil" fill={ORANGE} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </CardShell>
  );
}

// ---------------------------------------------------------------------------
// Tile 4: photo contribution rate (single big number)
// ---------------------------------------------------------------------------

function TilePhotoContribution({ rate }: { rate: number }): JSX.Element {
  const display = `${rate.toFixed(1)}%`;
  return (
    <CardShell
      title="Photo contribution rate"
      subtitle="Last 30 days, opted-in users"
      icon={Camera}
      iconColor={TEAL}
    >
      <div className="flex h-full w-full flex-col items-center justify-center">
        <p className="text-[10px] uppercase tracking-wide" style={{ color: MUTED }}>Share of rows</p>
        <p className="mt-2 font-mono text-5xl font-bold" style={{ color: TEAL }}>{display}</p>
        <p className="mt-2 text-[11px]" style={{ color: MUTED }}>
          contributed_photo_path IS NOT NULL
        </p>
      </div>
    </CardShell>
  );
}

// ---------------------------------------------------------------------------
// Tile 5: cache hit rate donut
// ---------------------------------------------------------------------------

function TileCacheHitRate({ data }: { data: CacheHitMix }): JSX.Element {
  const pieData = [
    { name: 'sha256_exact', value: data.sha256_exact, fill: TEAL },
    { name: 'phash_near',   value: data.phash_near,   fill: ORANGE },
    { name: 'miss',         value: data.miss,         fill: '#9CA3AF' },
  ];
  const total = data.sha256_exact + data.phash_near + data.miss;
  return (
    <CardShell
      title="Cache hit rate"
      subtitle={`Last 30 days, ${total.toLocaleString()} analyze calls`}
      icon={Database}
      iconColor={TEAL}
    >
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>
            {pieData.map((entry) => (<Cell key={entry.name} fill={entry.fill} />))}
          </Pie>
          <Tooltip contentStyle={{ background: NAVY, border: '1px solid rgba(255,255,255,0.1)' }} />
          <Legend wrapperStyle={{ color: WHITE, fontSize: 11 }} />
        </PieChart>
      </ResponsiveContainer>
    </CardShell>
  );
}

// ---------------------------------------------------------------------------
// Tile 6: provider mix donut
// ---------------------------------------------------------------------------

function TileProviderMix({ data }: { data: ProviderMix }): JSX.Element {
  const pieData = [
    { name: 'logmeal',       value: data.logmeal,       fill: TEAL },
    { name: 'gemini',        value: data.gemini,        fill: ORANGE },
    { name: 'claude_vision', value: data.claude_vision, fill: '#9CA3AF' },
  ];
  const total = data.logmeal + data.gemini + data.claude_vision;
  return (
    <CardShell
      title="Recognition provider mix"
      subtitle={`Last 30 days, ${total.toLocaleString()} successful calls`}
      icon={Activity}
      iconColor={ORANGE}
    >
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>
            {pieData.map((entry) => (<Cell key={entry.name} fill={entry.fill} />))}
          </Pie>
          <Tooltip contentStyle={{ background: NAVY, border: '1px solid rgba(255,255,255,0.1)' }} />
          <Legend wrapperStyle={{ color: WHITE, fontSize: 11 }} />
        </PieChart>
      </ResponsiveContainer>
    </CardShell>
  );
}
