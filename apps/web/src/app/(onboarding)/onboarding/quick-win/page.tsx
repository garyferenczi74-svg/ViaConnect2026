'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

type HealthScore = {
  label: string;
  value: number;
  icon: string;
};

const healthScores: HealthScore[] = [
  { label: 'Overall Health', value: 67, icon: 'favorite' },
  { label: 'Energy', value: 45, icon: 'bolt' },
  { label: 'Cognitive', value: 58, icon: 'psychology' },
  { label: 'Metabolic', value: 72, icon: 'local_fire_department' },
  { label: 'Stress Resilience', value: 63, icon: 'spa' },
];

function getScoreColor(value: number): string {
  if (value >= 80) return '#22c55e';
  if (value >= 60) return '#06B6D4';
  if (value >= 40) return '#f59e0b';
  return '#ef4444';
}

function getScoreLabel(value: number): string {
  if (value >= 80) return 'Excellent';
  if (value >= 60) return 'Moderate';
  if (value >= 40) return 'Needs Support';
  return 'Critical';
}

function ScoreGauge({ score, animated }: { score: HealthScore; animated: boolean }) {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const color = getScoreColor(score.value);
  const label = getScoreLabel(score.value);
  const offset = animated ? circumference - (score.value / 100) * circumference : circumference;

  return (
    <div className="flex flex-col items-center rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
      <div className="relative h-24 w-24">
        <svg className="h-24 w-24 -rotate-90" viewBox="0 0 96 96">
          <circle
            cx="48"
            cy="48"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="6"
            className="text-white/10"
          />
          <circle
            cx="48"
            cy="48"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 1.5s ease-out' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-mono text-xl font-bold text-white">{score.value}</span>
          <span className="text-[10px] text-slate-500">/100</span>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-1.5">
        <span className="material-symbols-outlined text-base" style={{ color }}>
          {score.icon}
        </span>
        <span className="text-sm font-medium text-white">{score.label}</span>
      </div>
      <span className="mt-1 text-xs" style={{ color }}>
        {label}
      </span>
    </div>
  );
}

export default function QuickWinPage() {
  const [animated, setAnimated] = useState(false);
  const router = useRouter();
  const gaugeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setAnimated(true), 300);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="relative flex min-h-screen flex-col items-center px-4 py-10 overflow-hidden">
      {/* Particle / radial glow background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-0 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/4 rounded-full bg-[radial-gradient(circle,rgba(6,182,212,0.12),transparent_70%)]" />
        <div className="absolute right-0 top-1/3 h-[400px] w-[400px] rounded-full bg-[radial-gradient(circle,rgba(139,92,246,0.08),transparent_70%)]" />
        <div className="absolute bottom-0 left-1/4 h-[300px] w-[300px] rounded-full bg-[radial-gradient(circle,rgba(6,182,212,0.06),transparent_70%)]" />
      </div>

      <div className="relative z-10 w-full max-w-4xl">
        {/* Logo + label */}
        <div className="flex flex-col items-center text-center">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#06B6D4] to-[#8B5CF6]">
              <span className="material-symbols-outlined text-lg text-white">biotech</span>
            </div>
            <span className="font-[Syne] text-sm font-bold tracking-wider text-slate-400 uppercase">
              ViaConnect
            </span>
          </div>
          <span className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-400">
            <span className="material-symbols-outlined text-sm">check_circle</span>
            Your Results Are Ready
          </span>
        </div>

        {/* Welcome */}
        <h1 className="mt-6 text-center font-[Syne] text-3xl font-bold text-white md:text-[32px]">
          Welcome, Gary! Your Health Assessment Results
        </h1>

        {/* Health Score cards */}
        <div ref={gaugeRef} className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {healthScores.map((score) => (
            <ScoreGauge key={score.label} score={score} animated={animated} />
          ))}
        </div>

        {/* AI Insights card */}
        <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl md:p-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#8B5CF6]/20">
              <span className="material-symbols-outlined text-[#8B5CF6]">auto_awesome</span>
            </div>
            <h2 className="font-[Syne] text-xl font-bold text-white">
              Your Personalized Health Insights
            </h2>
          </div>

          <p className="mt-4 text-sm leading-relaxed text-slate-400">
            Based on your comprehensive assessment, our AI analysis has identified several key areas
            for optimization. Your energy levels suggest potential methylation pathway inefficiencies,
            which can be addressed through targeted B-vitamin and folate support. Your metabolic
            markers are trending positively, indicating a strong foundation for improvement.
          </p>

          <div className="mt-5 space-y-3">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full bg-red-400" />
              <div>
                <span className="text-sm font-medium text-white">
                  Energy production pathways showing significant inefficiency
                </span>
                <p className="text-xs text-slate-500">
                  Likely related to methylation cycle — targeted supplementation recommended
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full bg-amber-400" />
              <div>
                <span className="text-sm font-medium text-white">
                  Stress response markers elevated above optimal range
                </span>
                <p className="text-xs text-slate-500">
                  Adaptogenic support and cortisol management could yield rapid improvement
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-400" />
              <div>
                <span className="text-sm font-medium text-white">
                  Metabolic foundation is strong with room for optimization
                </span>
                <p className="text-xs text-slate-500">
                  Good baseline — fine-tuning nutrient intake can push into the excellent range
                </p>
              </div>
            </div>
          </div>

          <button className="mt-6 flex items-center gap-1.5 rounded-lg border border-cyan-400/50 px-5 py-2.5 text-sm font-medium text-cyan-400 transition-all hover:bg-cyan-400/10 hover:border-cyan-400">
            Read Full Analysis
            <span className="material-symbols-outlined text-lg">arrow_forward</span>
          </button>
        </div>

        {/* Supplement Protocol card */}
        <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl md:p-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-400/20">
              <span className="material-symbols-outlined text-cyan-400">medication</span>
            </div>
            <h2 className="font-[Syne] text-xl font-bold text-white">
              Your Personalized Supplement Protocol
            </h2>
          </div>

          <div className="mt-6 space-y-4">
            {/* Product 1 */}
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-cyan-400">science</span>
                    <h3 className="text-base font-semibold text-white">MTHFR+ Support</h3>
                  </div>
                  <div className="mt-3 space-y-1.5 text-sm text-slate-400">
                    <p>
                      <span className="text-slate-300 font-medium">Why:</span> Supports methylation
                      pathways with bioavailable folate (5-MTHF), methylcobalamin B12, and cofactors
                      for optimal energy production.
                    </p>
                    <p>
                      <span className="text-slate-300 font-medium">When:</span> Take 1 capsule with
                      breakfast daily.
                    </p>
                    <p className="flex items-center gap-1.5">
                      <span className="text-slate-300 font-medium">Confidence:</span>
                      <span className="font-mono text-cyan-400">78%</span>
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className="font-mono text-lg font-bold text-white">$39.99<span className="text-xs font-normal text-slate-500">/month</span></span>
                  <button className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#06B6D4] to-[#8B5CF6] px-4 py-2 text-sm font-medium text-white transition-all hover:shadow-lg hover:shadow-cyan-500/25">
                    <span className="material-symbols-outlined text-base">add_shopping_cart</span>
                    Add to Cart
                  </button>
                </div>
              </div>
            </div>

            {/* Product 2 */}
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-amber-400">bolt</span>
                    <h3 className="text-base font-semibold text-white">ENERGY+ Vitality Complex</h3>
                  </div>
                  <div className="mt-3 space-y-1.5 text-sm text-slate-400">
                    <p>
                      <span className="text-slate-300 font-medium">Why:</span> Combines CoQ10,
                      PQQ, and adaptogenic herbs to combat fatigue and support mitochondrial energy
                      production at the cellular level.
                    </p>
                    <p>
                      <span className="text-slate-300 font-medium">When:</span> Take 2 capsules
                      with morning meal.
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className="font-mono text-lg font-bold text-white">$29.99<span className="text-xs font-normal text-slate-500">/month</span></span>
                  <button className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#06B6D4] to-[#8B5CF6] px-4 py-2 text-sm font-medium text-white transition-all hover:shadow-lg hover:shadow-cyan-500/25">
                    <span className="material-symbols-outlined text-base">add_shopping_cart</span>
                    Add to Cart
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Protocol total */}
          <div className="mt-6 flex flex-col items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4 sm:flex-row sm:justify-between">
            <div className="text-center sm:text-left">
              <span className="text-sm text-slate-400">Total Protocol: </span>
              <span className="font-mono text-lg font-bold text-white">$89.97</span>
              <span className="text-sm text-slate-500">/month</span>
              <span className="ml-2 text-sm text-emerald-400">&middot; Subscribe &amp; Save 20%</span>
            </div>
            <button className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#06B6D4] to-[#8B5CF6] px-6 py-3 text-sm font-semibold text-white transition-all hover:shadow-lg hover:shadow-cyan-500/25">
              Build My Protocol
              <span className="material-symbols-outlined text-lg">arrow_forward</span>
            </button>
          </div>
        </div>

        {/* GeneX360 Upsell card */}
        <div className="mt-8 rounded-2xl border border-[#8B5CF6]/30 bg-[#8B5CF6]/5 p-6 shadow-[0_0_40px_rgba(139,92,246,0.1)] backdrop-blur-xl md:p-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#8B5CF6]/20">
              <span className="material-symbols-outlined text-[#8B5CF6]">genetics</span>
            </div>
            <div>
              <h2 className="font-[Syne] text-lg font-bold text-white">
                Unlock 94%+ confidence with genetic testing
              </h2>
            </div>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-slate-400">
            Your current recommendations are based on your health assessment questionnaire. By adding
            GeneX360&trade; genetic analysis, we can identify your exact methylation variants, nutrient
            absorption genes, and hormonal pathways &mdash; increasing supplement protocol accuracy from
            ~65% to 94%+.
          </p>
          <button className="mt-5 flex items-center gap-1.5 rounded-lg border border-[#8B5CF6]/50 px-5 py-2.5 text-sm font-medium text-[#8B5CF6] transition-all hover:bg-[#8B5CF6]/10 hover:border-[#8B5CF6]">
            Upgrade to GENEX360&trade;
            <span className="material-symbols-outlined text-lg">arrow_forward</span>
          </button>
        </div>

        {/* Continue CTA */}
        <div className="mt-10 flex justify-center">
          <button
            onClick={() => router.push('/onboarding/gateway')}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#06B6D4] to-[#8B5CF6] px-10 py-4 text-base font-semibold text-white transition-all hover:shadow-xl hover:shadow-cyan-500/25"
          >
            Continue to Dashboard
            <span className="material-symbols-outlined">arrow_forward</span>
          </button>
        </div>
      </div>
    </div>
  );
}
