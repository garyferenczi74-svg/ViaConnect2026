'use client';

import Link from 'next/link';
import {
  Activity,
  Heart,
  Moon,
  Brain,
  Zap,
  Wind,
  Droplets,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Minus,
  Watch,
  Dna,
} from 'lucide-react';

/* ─── Score Ring ──────────────────────────────────────────────────────────── */

function ScoreRing({
  value,
  max = 100,
  color = '#2DA5A0',
  size = 56,
}: {
  value: number;
  max?: number;
  color?: string;
  size?: number;
}) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const pct = value / max;

  return (
    <svg width={size} height={size} className="mx-auto">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="rgba(255,255,255,0.08)"
        strokeWidth={4}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={4}
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={circ * (1 - pct)}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        className="transition-all duration-700"
      />
      <text
        x={size / 2}
        y={size / 2}
        textAnchor="middle"
        dominantBaseline="central"
        fill="white"
        fontSize={size * 0.24}
        fontWeight={700}
      >
        {value}
      </text>
    </svg>
  );
}

/* ─── HR Chart (SVG) ─────────────────────────────────────────────────────── */

function HRChart() {
  const data = [65,64,62,60,58,57,56,58,72,85,90,88,78,75,82,95,88,80,75,70,68,65,63,62];
  const min = 50;
  const max = 100;
  const h = 200;
  const pad = 16;

  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * 100;
      const y = ((max - v) / (max - min)) * (h - pad * 2) + pad;
      return `${x}%,${y}`;
    })
    .join(' ');

  // Area fill path
  const areaPoints = data.map((v, i) => {
    const x = (i / (data.length - 1)) * 100;
    const y = ((max - v) / (max - min)) * (h - pad * 2) + pad;
    return `${x}% ${y}`;
  });

  return (
    <div className="w-full" style={{ height: h }}>
      <svg
        viewBox={`0 0 100 ${h}`}
        preserveAspectRatio="none"
        className="w-full h-full"
        style={{ overflow: 'visible' }}
      >
        {/* Grid lines */}
        {[60, 70, 80, 90].map((hr) => {
          const y = ((max - hr) / (max - min)) * (h - pad * 2) + pad;
          return (
            <line
              key={hr}
              x1="0%"
              y1={y}
              x2="100%"
              y2={y}
              stroke="rgba(255,255,255,0.05)"
              strokeWidth={0.3}
            />
          );
        })}
        {/* Area */}
        <polygon
          points={`0%,${h} ${areaPoints.join(' ')} 100%,${h}`}
          fill="url(#hrGrad)"
          opacity={0.3}
        />
        {/* Line */}
        <polyline
          points={points}
          fill="none"
          stroke="#2DA5A0"
          strokeWidth={0.8}
          vectorEffect="non-scaling-stroke"
          strokeLinejoin="round"
        />
        <defs>
          <linearGradient id="hrGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2DA5A0" stopOpacity={0.4} />
            <stop offset="100%" stopColor="#2DA5A0" stopOpacity={0} />
          </linearGradient>
        </defs>
      </svg>
      {/* Hour labels */}
      <div className="flex justify-between text-[10px] text-tertiary mt-1 px-0.5">
        <span>12a</span><span>6a</span><span>12p</span><span>6p</span><span>Now</span>
      </div>
    </div>
  );
}

/* ─── Gene Badge ─────────────────────────────────────────────────────────── */

function GeneBadge({ label }: { label: string }) {
  return (
    <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-[#2DA5A0]/15 text-[#2DA5A0] border border-[#2DA5A0]/20">
      {label}
    </span>
  );
}

/* ─── Overline ───────────────────────────────────────────────────────────── */

function Overline({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-bold tracking-[0.15em] uppercase text-[#B75E18] mb-3">
      {children}
    </h2>
  );
}

/* ─── Score Card Data ────────────────────────────────────────────────────── */

const dailyScores = [
  { label: 'Recovery', value: 78, color: '#2DA5A0', trend: '↑ 5%', trendColor: 'text-green-400', icon: Activity },
  { label: 'Sleep', value: 85, color: '#2DA5A0', trend: '—', trendColor: 'text-gray-400', icon: Moon },
  { label: 'Strain', value: 42, color: '#F59E0B', trend: '↓ 8%', trendColor: 'text-red-400', icon: Zap },
  { label: 'Stress', value: 35, color: '#4ADE80', trend: '—', trendColor: 'text-gray-400', icon: Brain },
  { label: 'Energy', value: 72, color: '#2DA5A0', trend: '↑ 3%', trendColor: 'text-green-400', icon: TrendingUp },
];

/* ─── Sleep Staging Data ─────────────────────────────────────────────────── */

const sleepStages = [
  { label: 'Deep', minutes: 52, pct: 12, color: 'bg-teal-600' },
  { label: 'REM', minutes: 98, pct: 23, color: 'bg-teal-400' },
  { label: 'Light', minutes: 210, pct: 49, color: 'bg-slate-600' },
  { label: 'Awake', minutes: 72, pct: 16, color: 'bg-slate-700' },
];

/* ─── Main Page ──────────────────────────────────────────────────────────── */

export default function WearableDashboardPage() {
  return (
    <div
      className="min-h-screen overflow-x-hidden pb-24"
      style={{ background: 'var(--gradient-hero)' }}
    >
      <div className="max-w-3xl mx-auto px-4 pt-8 space-y-8">

        {/* ─── 1. HEADER ─────────────────────────────────────────────── */}
        <header>
          <h1 className="text-heading-1">Wearable Dashboard</h1>
          <p className="text-body-sm text-secondary mt-1">
            Biometric data through the lens of your genome
          </p>
          <div className="flex items-center gap-2 mt-2">
            <span className="w-2 h-2 rounded-full bg-green-400 inline-block animate-pulse" />
            <span className="text-xs text-tertiary">
              Source: Oura Ring · Apple Watch · Last sync: 5 min ago
            </span>
          </div>
        </header>

        {/* ─── CONNECT YOUR WEARABLE ─────────────────────────────────── */}
        <section>
          <Overline>Connect a Device</Overline>
          <Link
            href="/plugins/wearables"
            className="group block rounded-2xl border border-[#2DA5A0]/20 bg-gradient-to-br from-[#2DA5A0]/10 via-[#2DA5A0]/[0.04] to-transparent p-5 transition-all hover:border-[#2DA5A0]/40 hover:shadow-[0_0_30px_rgba(45,165,160,0.10)]"
          >
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl border border-[#2DA5A0]/30 bg-gradient-to-br from-[#1A2744] to-[#2DA5A0]">
                <Watch className="h-6 w-6 text-white" strokeWidth={1.5} />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-bold text-white">Connect Your Wearable</h3>
                <p className="mt-1 text-xs leading-relaxed text-white/50">
                  Sync Oura Ring, Apple Watch, Whoop, Garmin, Fitbit and more to power
                  real-time recovery, sleep, strain, and heart rate tracking — all
                  interpreted through the lens of your genetic profile.
                </p>
                <div className="mt-3 inline-flex min-h-[40px] items-center gap-2 rounded-xl border border-[#2DA5A0]/30 bg-[#2DA5A0]/15 px-4 py-2 text-sm font-semibold text-[#2DA5A0] transition-all group-hover:border-[#2DA5A0]/50 group-hover:bg-[#2DA5A0]/25">
                  <Watch className="h-4 w-4" strokeWidth={1.5} />
                  Browse Wearables
                  <ChevronRight className="h-4 w-4" strokeWidth={1.5} />
                </div>
              </div>
            </div>
          </Link>
        </section>

        {/* ─── 2. DAILY SCORES ───────────────────────────────────────── */}
        <section>
          <Overline>Today&apos;s Scores</Overline>
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
            {dailyScores.map((s) => (
              <div
                key={s.label}
                className="glass-v2 w-[140px] flex-shrink-0 p-4 rounded-2xl text-center hover:scale-[1.03] transition-transform cursor-default"
              >
                <ScoreRing value={s.value} color={s.color} size={56} />
                <p className="text-sm font-medium text-white mt-2">{s.label}</p>
                <p className={`text-xs mt-0.5 ${s.trendColor}`}>{s.trend}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ─── 3. HEART RATE ─────────────────────────────────────────── */}
        <section>
          <Overline>Heart Rate</Overline>
          <div className="glass-v2 p-5 rounded-2xl space-y-4 hover:ring-1 hover:ring-[#2DA5A0]/20 transition-all">
            <div className="flex items-baseline gap-3">
              <Heart className="w-5 h-5 text-red-400 flex-shrink-0" />
              <div>
                <span className="text-xs text-secondary">Resting HR</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-white">62 bpm</span>
                  <span className="text-xs text-green-400">↓ 2 from avg</span>
                </div>
              </div>
            </div>

            <HRChart />

            {/* Genetic context */}
            <div className="border-t border-white/5 pt-3 flex flex-col gap-2">
              <p className="text-xs text-secondary italic">
                COMT AG variant: moderate stress response threshold. Your resting HR is within genetic optimal (55–65 bpm).
              </p>
              <div>
                <GeneBadge label="COMT Val158Met" />
              </div>
            </div>
          </div>
        </section>

        {/* ─── 4. SLEEP ANALYSIS ─────────────────────────────────────── */}
        <section>
          <Overline>Sleep Analysis</Overline>
          <div className="glass-v2 p-5 rounded-2xl space-y-4 hover:ring-1 hover:ring-[#2DA5A0]/20 transition-all">
            {/* Header */}
            <div className="flex items-baseline justify-between">
              <div className="flex items-baseline gap-3">
                <Moon className="w-5 h-5 text-indigo-400 flex-shrink-0" />
                <div>
                  <span className="text-xs text-secondary">Last Night</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-white">7.2 hrs</span>
                    <span className="text-sm text-[#2DA5A0]">Score: 85/100</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Sleep staging bar */}
            <div>
              <div className="w-full h-6 rounded-full overflow-hidden flex">
                {sleepStages.map((st) => (
                  <div
                    key={st.label}
                    className={`${st.color} h-full`}
                    style={{ width: `${st.pct}%` }}
                  />
                ))}
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                {sleepStages.map((st) => (
                  <div key={st.label} className="flex items-center gap-1.5 text-xs text-secondary">
                    <span className={`w-2.5 h-2.5 rounded-full ${st.color}`} />
                    <span>{st.label}</span>
                    <span className="text-tertiary">{st.minutes}m</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Genetic chronotype insight */}
            <div className="glass-v2-insight p-3 rounded-xl space-y-2">
              <p className="text-xs text-secondary leading-relaxed">
                <Dna className="w-3.5 h-3.5 inline-block mr-1 text-[#2DA5A0] -mt-0.5" />
                <strong className="text-white">CLOCK rs1801260 (TC):</strong> Your genetic chronotype suggests an optimal sleep window of 10:30pm – 6:30am. Last night you slept 11:15pm – 6:25am — close to optimal.
              </p>
              <GeneBadge label="CLOCK" />
            </div>
          </div>
        </section>

        {/* ─── 5. HRV & STRESS ───────────────────────────────────────── */}
        <section>
          <Overline>HRV &amp; Stress</Overline>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* HRV Card */}
            <div className="glass-v2 p-4 rounded-2xl space-y-3 hover:ring-1 hover:ring-[#2DA5A0]/20 transition-all">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#2DA5A0]" />
                <span className="text-xs text-secondary">HRV</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-white">42 ms</span>
                <span className="text-xs text-tertiary">(rMSSD)</span>
              </div>
              <p className="text-xs text-red-400">Baseline: 48 ms · ↓ 12%</p>
              <p className="text-xs text-secondary leading-relaxed">
                COMT AG + MAOA AG: Intermediate stress vulnerability. HRV below baseline suggests elevated autonomic load.
              </p>
              <div className="flex flex-wrap gap-1.5">
                <GeneBadge label="COMT AG" />
                <GeneBadge label="MAOA AG" />
              </div>
            </div>

            {/* Stress Card */}
            <div className="glass-v2 p-4 rounded-2xl space-y-3 hover:ring-1 hover:ring-[#2DA5A0]/20 transition-all">
              <div className="flex items-center gap-2">
                <Brain className="w-4 h-4 text-amber-400" />
                <span className="text-xs text-secondary">Stress Level</span>
              </div>
              <span className="text-xl font-bold text-white block">Moderate</span>
              {/* Progress bar */}
              <div className="w-full h-2.5 rounded-full bg-white/5 overflow-hidden">
                <div
                  className="h-full rounded-full bg-amber-500 transition-all duration-500"
                  style={{ width: '45%' }}
                />
              </div>
              <p className="text-xs text-secondary leading-relaxed">
                Your MAOA variant processes serotonin at a moderate rate. Consider extra RELAX+ today.
              </p>
            </div>
          </div>
        </section>

        {/* ─── 6. BODY METRICS ───────────────────────────────────────── */}
        <section>
          <Overline>Body Metrics</Overline>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Body Battery */}
            <div className="glass-v2 p-4 rounded-2xl space-y-3 hover:ring-1 hover:ring-[#2DA5A0]/20 transition-all">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-[#2DA5A0]" />
                <span className="text-xs text-secondary">Body Battery</span>
              </div>
              <span className="text-2xl font-bold text-white">72/100</span>
              <div className="w-full h-2.5 rounded-full bg-white/5 overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#2DA5A0] transition-all duration-500"
                  style={{ width: '72%' }}
                />
              </div>
            </div>

            {/* SpO2 */}
            <div className="glass-v2 p-4 rounded-2xl space-y-3 hover:ring-1 hover:ring-[#2DA5A0]/20 transition-all">
              <div className="flex items-center gap-2">
                <Droplets className="w-4 h-4 text-blue-400" />
                <span className="text-xs text-secondary">SpO2</span>
              </div>
              <span className="text-2xl font-bold text-white">97%</span>
              <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-500/15 text-green-400 border border-green-500/20">
                Normal
              </span>
            </div>

            {/* Respiratory Rate */}
            <div className="glass-v2 p-4 rounded-2xl space-y-3 hover:ring-1 hover:ring-[#2DA5A0]/20 transition-all">
              <div className="flex items-center gap-2">
                <Wind className="w-4 h-4 text-sky-400" />
                <span className="text-xs text-secondary">Respiratory Rate</span>
              </div>
              <span className="text-2xl font-bold text-white">14.8 /min</span>
              <span className="text-xs text-secondary">Within range</span>
            </div>
          </div>
        </section>

        {/* ─── 7. GLUCOSE (CGM) ──────────────────────────────────────── */}
        <section>
          <Overline>Glucose (CGM)</Overline>
          <div className="glass-v2 p-5 rounded-2xl space-y-3 hover:ring-1 hover:ring-[#2DA5A0]/20 transition-all">
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <div>
                <span className="text-xs text-secondary">Avg</span>
                <span className="text-2xl font-bold text-white ml-2">98 mg/dL</span>
              </div>
              <div>
                <span className="text-xs text-secondary">Variability</span>
                <span className="text-lg font-semibold text-white ml-2">12% CV</span>
              </div>
            </div>
            <p className="text-xs text-secondary leading-relaxed">
              <strong className="text-white">FTO rs9939609 (AT):</strong> Moderate insulin sensitivity impact. Your glucose is within genetic optimal range (85–105 mg/dL).
            </p>
            <div className="flex items-center gap-3">
              <GeneBadge label="FTO AT" />
            </div>
            <p className="text-[10px] text-tertiary pt-1 border-t border-white/5">
              Source: FreeStyle Libre · Last reading: 15 min ago
            </p>
          </div>
        </section>

        {/* ─── 8. BOTTOM LINK ────────────────────────────────────────── */}
        <div className="pt-2 pb-4">
          <Link
            href="/plugins/manage"
            className="inline-flex items-center gap-1 text-sm font-medium text-[#2DA5A0] hover:underline transition-colors"
          >
            Manage Connections
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

      </div>
    </div>
  );
}
