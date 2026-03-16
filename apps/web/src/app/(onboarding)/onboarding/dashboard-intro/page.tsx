'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const features = [
  { title: 'Health Dashboard', description: 'Your personalized health metrics and trends at a glance.', icon: '\u{1F4CA}' },
  { title: 'Genetic Insights', description: 'Deep dive into your genetic pathways and risk assessments.', icon: '\u{1F9EC}' },
  { title: 'Smart Protocols', description: 'AI-generated supplement and lifestyle protocols.', icon: '\u{1F48A}' },
  { title: 'Progress Tracking', description: 'Monitor your wellness journey with wearable integration.', icon: '\u{1F4C8}' },
];

export default function DashboardIntroPage() {
  const [currentFeature, setCurrentFeature] = useState(0);
  const router = useRouter();

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentFeature((prev) => (prev + 1) % features.length);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-16">
      <div className="max-w-2xl text-center">
        <h1 className="text-4xl font-bold text-white">You&apos;re All Set!</h1>
        <p className="mt-3 text-lg text-slate-400">
          Here&apos;s what awaits you in your personalized dashboard
        </p>
      </div>

      <div className="mt-10 grid w-full max-w-3xl gap-4 sm:grid-cols-2">
        {features.map((feature, i) => (
          <div
            key={i}
            className={`rounded-2xl border p-6 transition-all duration-500 ${
              i === currentFeature
                ? 'border-emerald-500/50 bg-emerald-500/10 scale-[1.02]'
                : 'border-white/10 bg-white/5'
            }`}
          >
            <span className="text-3xl">{feature.icon}</span>
            <h3 className="mt-3 text-lg font-semibold text-white">{feature.title}</h3>
            <p className="mt-2 text-sm text-slate-400">{feature.description}</p>
          </div>
        ))}
      </div>

      <button
        onClick={() => router.push('/wellness')}
        className="mt-10 rounded-lg bg-gradient-to-r from-emerald-500 to-cyan-500 px-10 py-4 text-lg font-medium text-white hover:from-emerald-600 hover:to-cyan-600 transition-all"
      >
        Launch My Dashboard
      </button>
    </div>
  );
}
