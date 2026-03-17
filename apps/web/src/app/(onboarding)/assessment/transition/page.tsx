'use client';

import Link from 'next/link';

const progressSections = [
  { label: 'Basic Profile', step: 1 },
  { label: 'Health Foundation', step: 2 },
  { label: 'Genetic & Advanced', step: 3 },
  { label: 'Goals & Preferences', step: 4 },
];

const dimensions = [
  { label: 'Energy & Vitality', icon: 'bolt', progress: 0.35, color: '#06B6D4' },
  { label: 'Cognitive Function', icon: 'psychology', progress: 0.2, color: '#8B5CF6' },
  { label: 'Metabolic Health', icon: 'favorite', progress: 0.15, color: '#06B6D4' },
  { label: 'Stress Resilience', icon: 'spa', progress: 0.25, color: '#8B5CF6' },
];

function ProgressRing({
  progress,
  size = 72,
  strokeWidth = 4,
  icon,
  gradientId,
}: {
  progress: number;
  size?: number;
  strokeWidth?: number;
  icon: string;
  gradientId: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - progress);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="-rotate-90" width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-700"
        />
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#06B6D4" />
            <stop offset="100%" stopColor="#8B5CF6" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="material-symbols-outlined text-xl text-white/70">{icon}</span>
      </div>
    </div>
  );
}

export default function AssessmentTransitionPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-[#0A0F1C] to-[#0F172A] px-4 py-8">
      {/* ViaConnect Logo */}
      <div className="mb-6 flex justify-center">
        <div className="flex flex-col items-center">
          <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-white/40">
            FarmCeutica Wellness LLC
          </span>
          <h2 className="mt-1 text-xl font-bold tracking-tight">
            <span className="text-white">Via</span>
            <span className="bg-gradient-to-r from-[#06B6D4] to-[#8B5CF6] bg-clip-text text-transparent">
              Connect
            </span>
            <span className="text-white/60">&trade;</span>
          </h2>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mx-auto mb-8 max-w-3xl">
        <div className="flex gap-2">
          {progressSections.map((section) => (
            <div key={section.step} className="flex-1">
              <div
                className={`h-1.5 rounded-full ${
                  section.step <= 1
                    ? 'bg-gradient-to-r from-[#06B6D4] to-[#8B5CF6]'
                    : 'bg-white/10'
                }`}
              />
              <span className="mt-1 block text-center text-[11px] text-white/40">
                {section.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Main Card */}
      <div className="mx-auto max-w-2xl">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl">
          {/* Animated checkmark */}
          <div className="mb-6 flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 ring-4 ring-emerald-500/10">
              <span className="material-symbols-outlined text-3xl text-emerald-400">
                check_circle
              </span>
            </div>
          </div>

          <h1 className="text-center font-[Syne] text-[28px] font-bold text-white">
            Section 1 Complete!
          </h1>
          <p className="mt-2 text-center text-white/50">
            Basic Profile &mdash; 8 questions answered
          </p>

          {/* Health Dimension Progress Rings */}
          <div className="mt-8 grid grid-cols-2 gap-6 sm:grid-cols-4">
            {dimensions.map((dim, i) => (
              <div key={dim.label} className="flex flex-col items-center gap-2">
                <ProgressRing
                  progress={dim.progress}
                  icon={dim.icon}
                  gradientId={`ring-gradient-${i}`}
                />
                <span className="text-center text-xs font-medium text-white/60">
                  {dim.label}
                </span>
                <span className="font-mono text-[11px] text-white/30">
                  {Math.round(dim.progress * 100)}%
                </span>
              </div>
            ))}
          </div>

          {/* Blueprint progress */}
          <div className="mt-8 rounded-xl border border-[#06B6D4]/20 bg-[#06B6D4]/5 px-4 py-3 text-center">
            <p className="text-sm text-[#06B6D4]">
              <span className="material-symbols-outlined mr-1 align-middle text-base">
                auto_awesome
              </span>
              Your personalized Health Blueprint is{' '}
              <span className="font-semibold">25% complete</span>
            </p>
          </div>

          {/* What's Next Preview */}
          <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.03] p-5">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#8B5CF6]">skip_next</span>
              <h3 className="font-[Syne] text-lg font-bold text-white">
                Up Next: Health Foundation
              </h3>
            </div>
            <p className="mt-2 text-sm text-white/50">
              We&apos;ll dive deeper into your health history, current symptoms, lifestyle
              habits, and nutritional patterns to build a comprehensive picture of your
              wellness baseline.
            </p>
            <div className="mt-3 flex items-center gap-4 text-xs text-white/40">
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">timer</span>
                ~4 minutes
              </span>
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">quiz</span>
                25 questions
              </span>
            </div>
          </div>

          {/* CTAs */}
          <div className="mt-8 flex flex-col gap-3">
            <Link
              href="/assessment/health"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#06B6D4] to-[#8B5CF6] px-8 py-4 text-lg font-semibold text-white shadow-[0_0_40px_rgba(6,182,212,0.3)] transition-all hover:shadow-[0_0_60px_rgba(6,182,212,0.5)] hover:scale-[1.01]"
            >
              Continue to Health Foundation
              <span className="material-symbols-outlined text-xl">arrow_forward</span>
            </Link>
            <button className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-8 py-3 text-sm font-medium text-white/60 transition-all hover:border-white/20 hover:bg-white/[0.08]">
              <span className="material-symbols-outlined text-lg">bookmark</span>
              Save &amp; Continue Later
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
