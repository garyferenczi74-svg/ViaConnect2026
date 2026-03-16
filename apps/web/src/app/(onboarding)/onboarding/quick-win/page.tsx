'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type Insight = {
  title: string;
  description: string;
  confidence: number;
  category: string;
};

const sampleInsights: Insight[] = [
  {
    title: 'Stress Management Priority',
    description: 'Based on your lifestyle assessment, targeted adaptogenic support may significantly improve your energy and sleep quality.',
    confidence: 78,
    category: 'Lifestyle',
  },
  {
    title: 'Nutritional Optimization',
    description: 'Your dietary pattern suggests potential benefit from B-vitamin complex and magnesium supplementation.',
    confidence: 72,
    category: 'Nutrition',
  },
  {
    title: 'Genetic Testing Recommended',
    description: 'Your family history profile indicates genetic testing could unlock highly personalized supplement protocols.',
    confidence: 85,
    category: 'Genetics',
  },
];

export default function QuickWinPage() {
  const [revealed, setRevealed] = useState(0);
  const router = useRouter();

  useEffect(() => {
    const timers = sampleInsights.map((_, i) =>
      setTimeout(() => setRevealed((r) => Math.max(r, i + 1)), (i + 1) * 800)
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center px-4 py-16">
      <div className="max-w-2xl text-center">
        <h1 className="text-4xl font-bold text-white">Your Initial Insights</h1>
        <p className="mt-3 text-lg text-slate-400">
          Based on your health assessment, here are your first personalized recommendations
        </p>
      </div>

      <div className="mt-10 w-full max-w-2xl space-y-4">
        {sampleInsights.map((insight, i) => (
          <div
            key={i}
            className={`rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl transition-all duration-700 ${
              i < revealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="inline-block rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-medium text-emerald-400">
                  {insight.category}
                </span>
                <h3 className="mt-3 text-lg font-semibold text-white">{insight.title}</h3>
                <p className="mt-2 text-sm text-slate-400">{insight.description}</p>
              </div>
              <div className="ml-4 flex flex-col items-center">
                <div className="relative h-14 w-14">
                  <svg className="h-14 w-14 -rotate-90" viewBox="0 0 56 56">
                    <circle cx="28" cy="28" r="24" fill="none" stroke="currentColor" strokeWidth="4" className="text-white/10" />
                    <circle
                      cx="28" cy="28" r="24" fill="none" stroke="currentColor" strokeWidth="4"
                      strokeDasharray={`${(insight.confidence / 100) * 150.8} 150.8`}
                      className="text-emerald-400 transition-all duration-1000"
                    />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-white">
                    {insight.confidence}%
                  </span>
                </div>
                <span className="mt-1 text-xs text-slate-500">confidence</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={() => router.push('/onboarding/gateway')}
        className="mt-10 rounded-lg bg-gradient-to-r from-emerald-500 to-cyan-500 px-8 py-3 font-medium text-white hover:from-emerald-600 hover:to-cyan-600 transition-all"
      >
        Continue to GeneX360 Gateway
      </button>
    </div>
  );
}
