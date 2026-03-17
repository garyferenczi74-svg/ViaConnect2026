'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type AnswerOption = {
  id: string;
  label: string;
  icon: string;
  iconColor: string;
  description?: string;
  common?: boolean;
};

const answerOptions: AnswerOption[] = [
  {
    id: 'normal',
    label: 'Yes — Normal (no variants)',
    icon: 'check_circle',
    iconColor: 'text-emerald-400',
  },
  {
    id: 'c677t_hetero',
    label: 'Yes — C677T Heterozygous',
    icon: 'warning',
    iconColor: 'text-amber-400',
  },
  {
    id: 'c677t_homo',
    label: 'Yes — C677T Homozygous',
    icon: 'error',
    iconColor: 'text-red-400',
  },
  {
    id: 'a1298c',
    label: 'Yes — A1298C Variant',
    icon: 'warning',
    iconColor: 'text-amber-400',
  },
  {
    id: 'compound_hetero',
    label: 'Yes — Compound Heterozygous',
    icon: 'error',
    iconColor: 'text-red-400',
  },
  {
    id: 'unknown',
    label: "I don't know / Not tested",
    icon: 'help',
    iconColor: 'text-slate-400',
    common: true,
  },
];

export default function GeneticAssessmentPage() {
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const router = useRouter();

  return (
    <div className="flex min-h-screen flex-col items-center px-4 py-8">
      {/* Progress bar — Section 3 of 4 */}
      <div className="w-full max-w-2xl">
        <div className="mb-3 flex items-center justify-between text-sm">
          <span className="text-slate-400">Section 3 of 4</span>
          <span className="text-cyan-400 font-mono text-xs">75% complete</span>
        </div>
        <div className="h-2 rounded-full bg-white/10">
          <div
            className="h-2 rounded-full bg-gradient-to-r from-[#06B6D4] to-[#8B5CF6] transition-all duration-500"
            style={{ width: '75%' }}
          />
        </div>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Genetic &amp; Advanced Health &middot; Question 5 of 18
          </span>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-emerald-400">Progress saved</span>
          </div>
        </div>
      </div>

      {/* Question card */}
      <div className="mt-8 w-full max-w-2xl rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl">
        <h2 className="font-[Syne] text-2xl font-bold text-white">
          Do you know your MTHFR status?
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-slate-400">
          MTHFR (methylenetetrahydrofolate reductase) is a gene that affects how your body processes
          folate and B-vitamins. Variants in this gene can impact energy production, detoxification,
          and mood regulation. Approximately 40% of people carry at least one variant.{' '}
          <button className="inline-flex items-center gap-1 text-cyan-400 hover:text-cyan-300 transition-colors">
            Learn More
            <span className="material-symbols-outlined text-sm">open_in_new</span>
          </button>
        </p>

        {/* Answer options */}
        <div className="mt-6 space-y-3">
          {answerOptions.map((option) => {
            const isSelected = selectedAnswer === option.id;
            return (
              <button
                key={option.id}
                onClick={() => setSelectedAnswer(option.id)}
                className={`group flex w-full items-center gap-4 rounded-xl border p-4 text-left transition-all duration-200 ${
                  isSelected
                    ? 'border-l-4 border-l-cyan-400 border-t-cyan-400/30 border-r-cyan-400/30 border-b-cyan-400/30 bg-cyan-400/10 shadow-[0_0_20px_rgba(6,182,212,0.15)]'
                    : option.common
                      ? 'border-white/20 bg-white/[0.07] hover:bg-white/10 hover:border-white/30'
                      : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/20'
                }`}
              >
                <span className={`material-symbols-outlined text-2xl ${option.iconColor}`}>
                  {option.icon}
                </span>
                <span
                  className={`flex-1 text-sm font-medium ${
                    option.common ? 'text-white' : 'text-slate-200'
                  }`}
                >
                  {option.label}
                </span>
                {isSelected && (
                  <span className="material-symbols-outlined text-cyan-400">check_circle</span>
                )}
                {option.common && !isSelected && (
                  <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-slate-400">
                    Most common
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Genetic data upload card */}
      <div className="mt-6 w-full max-w-2xl rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#8B5CF6]/20">
            <span className="material-symbols-outlined text-[#8B5CF6]">genetics</span>
          </div>
          <div className="flex-1">
            <h3 className="text-base font-semibold text-white">
              Have previous genetic test results?
            </h3>
            <p className="mt-1 text-sm text-slate-400">
              Upload your 23andMe, AncestryDNA, or MyHeritage data for enhanced precision.
            </p>
            <button className="mt-4 flex items-center gap-2 rounded-lg border border-cyan-400/50 bg-transparent px-5 py-2.5 text-sm font-medium text-cyan-400 transition-all hover:bg-cyan-400/10 hover:border-cyan-400">
              <span className="material-symbols-outlined text-lg">upload_file</span>
              Upload DNA File
            </button>
            <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
              <span className="material-symbols-outlined text-sm">lock</span>
              Supported: .txt, .csv, .vcf &middot; Max 100MB &middot; AES-256 encrypted
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="mt-8 flex w-full max-w-2xl items-center justify-between">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1 rounded-lg px-5 py-3 text-sm font-medium text-slate-400 transition-colors hover:text-white hover:bg-white/5"
        >
          <span className="material-symbols-outlined text-lg">arrow_back</span>
          Previous
        </button>
        <button
          onClick={() => router.push('/assessment/health')}
          className="flex items-center gap-1 rounded-lg bg-gradient-to-r from-[#06B6D4] to-[#8B5CF6] px-8 py-3 text-sm font-medium text-white transition-all hover:shadow-lg hover:shadow-cyan-500/25"
        >
          Next
          <span className="material-symbols-outlined text-lg">arrow_forward</span>
        </button>
      </div>

      {/* Progress footer */}
      <div className="mt-6 text-center">
        <p className="text-xs text-slate-500">
          67% complete &mdash; 2 sections remaining
        </p>
      </div>
    </div>
  );
}
