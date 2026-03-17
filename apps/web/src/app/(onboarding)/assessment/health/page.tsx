'use client';

import Link from 'next/link';
import { useState } from 'react';

const progressSections = [
  { label: 'Basic Profile', step: 1 },
  { label: 'Health Foundation', step: 2 },
  { label: 'Genetic & Advanced', step: 3 },
  { label: 'Goals & Preferences', step: 4 },
];

const healthConcerns = [
  {
    id: 'energy',
    label: 'Low Energy / Fatigue',
    description: 'Persistent tiredness, difficulty staying alert, low motivation',
    icon: 'zap' as const,
    iconFallback: 'bolt',
  },
  {
    id: 'brainfog',
    label: 'Brain Fog / Focus Issues',
    description: 'Difficulty concentrating, mental clarity challenges',
    icon: 'psychology',
    iconFallback: 'psychology',
  },
  {
    id: 'stress',
    label: 'Stress / Anxiety',
    description: 'Chronic stress, nervousness, difficulty relaxing',
    icon: 'sentiment_stressed',
    iconFallback: 'sentiment_stressed',
  },
  {
    id: 'sleep',
    label: 'Sleep Problems',
    description: 'Insomnia, restless sleep, difficulty falling asleep',
    icon: 'bedtime',
    iconFallback: 'bedtime',
  },
  {
    id: 'weight',
    label: 'Weight Management',
    description: 'Difficulty maintaining healthy weight, slow metabolism',
    icon: 'monitor_weight',
    iconFallback: 'monitor_weight',
  },
  {
    id: 'immune',
    label: 'Immune Support',
    description: 'Frequent illness, slow recovery, weakened defenses',
    icon: 'shield',
    iconFallback: 'shield',
  },
];

export default function AssessmentHealthPage() {
  const [selected, setSelected] = useState<string>('');

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#0A0F1C] to-[#0F172A] px-4 py-8">
      {/* Progress Bar */}
      <div className="mx-auto mb-2 max-w-3xl">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-white/50">
            Health Foundation &middot; Question 3 of 25
          </span>
          {/* Auto-save indicator */}
          <div className="flex items-center gap-1.5 text-sm text-emerald-400">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />
            Progress saved
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          {progressSections.map((section) => (
            <div key={section.step} className="flex-1">
              <div
                className={`h-1.5 rounded-full ${
                  section.step <= 2
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

      {/* Question Card */}
      <div className="mx-auto mt-8 max-w-2xl">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl">
          {/* Question number badge */}
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#06B6D4]/30 bg-[#06B6D4]/10 px-3 py-1 text-xs font-semibold text-[#06B6D4]">
            <span className="material-symbols-outlined text-sm">help</span>
            Question 3
          </div>

          <h2 className="font-[Syne] text-2xl font-bold text-white">
            What is your primary health concern?
          </h2>
          <p className="mt-2 text-sm text-white/50">
            Select the area that matters most to you right now. This helps us prioritize your
            personalized protocol. You can address additional concerns later.
          </p>

          {/* Answer Options */}
          <div className="mt-8 space-y-3">
            {healthConcerns.map((concern) => {
              const isSelected = selected === concern.id;
              return (
                <button
                  key={concern.id}
                  onClick={() => setSelected(concern.id)}
                  className={`flex w-full items-center gap-4 rounded-xl border p-4 text-left transition-all ${
                    isSelected
                      ? 'border-l-4 border-[#06B6D4] bg-[#06B6D4]/[0.08]'
                      : 'border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.06]'
                  }`}
                >
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                      isSelected
                        ? 'bg-[#06B6D4]/20 text-[#06B6D4]'
                        : 'bg-white/10 text-white/50'
                    }`}
                  >
                    <span className="material-symbols-outlined">{concern.iconFallback}</span>
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-white">{concern.label}</div>
                    <div className="mt-0.5 text-xs text-white/40">{concern.description}</div>
                  </div>
                  {isSelected && (
                    <span className="material-symbols-outlined shrink-0 text-[#06B6D4]">
                      check_circle
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Navigation */}
          <div className="mt-8 flex items-center justify-between">
            <Link
              href="/assessment/basics"
              className="inline-flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium text-white/70 transition-all hover:border-white/20 hover:bg-white/[0.08]"
            >
              <span className="material-symbols-outlined text-lg">arrow_back</span>
              Previous
            </Link>
            <Link
              href="/assessment/transition"
              className={`inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white transition-all ${
                selected
                  ? 'bg-gradient-to-r from-[#06B6D4] to-[#8B5CF6] shadow-[0_0_30px_rgba(6,182,212,0.2)] hover:shadow-[0_0_40px_rgba(6,182,212,0.4)] hover:scale-[1.02]'
                  : 'cursor-not-allowed bg-white/10 text-white/30'
              }`}
            >
              Next
              <span className="material-symbols-outlined text-lg">arrow_forward</span>
            </Link>
          </div>
        </div>

        {/* Progress Ring & Motivation */}
        <div className="mt-8 flex flex-col items-center gap-3">
          <div className="relative h-16 w-16">
            <svg className="h-16 w-16 -rotate-90" viewBox="0 0 64 64">
              <circle
                cx="32"
                cy="32"
                r="28"
                fill="none"
                stroke="rgba(255,255,255,0.1)"
                strokeWidth="4"
              />
              <circle
                cx="32"
                cy="32"
                r="28"
                fill="none"
                stroke="url(#progressGradient)"
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={`${0.42 * 2 * Math.PI * 28} ${2 * Math.PI * 28}`}
              />
              <defs>
                <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#06B6D4" />
                  <stop offset="100%" stopColor="#8B5CF6" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">
              42%
            </div>
          </div>
          <p className="text-sm text-white/50">
            You&apos;re doing great! Almost halfway through your health assessment.
          </p>
          <Link
            href="/assessment/basics"
            className="text-sm text-white/30 transition-colors hover:text-white/50"
          >
            Need a break? Save &amp; Continue Later
          </Link>
        </div>
      </div>
    </main>
  );
}
