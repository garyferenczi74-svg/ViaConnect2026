'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type PortalChoice = 'wellness' | 'practitioner' | 'naturopath';

const portalCards: { id: PortalChoice; title: string; description: string; icon: string; gradient: string }[] = [
  {
    id: 'wellness',
    title: 'Wellness Portal',
    description: 'Discover your genetic blueprint, personalized supplements, and AI-driven health insights.',
    icon: '🧬',
    gradient: 'from-emerald-500/20 to-teal-500/20',
  },
  {
    id: 'practitioner',
    title: 'Practitioner Portal',
    description: 'Manage patients, create treatment plans, and access clinical decision support.',
    icon: '⚕️',
    gradient: 'from-blue-500/20 to-indigo-500/20',
  },
  {
    id: 'naturopath',
    title: 'Naturopath Portal',
    description: 'Design botanical protocols informed by genetic pathways and interaction checking.',
    icon: '🌿',
    gradient: 'from-green-500/20 to-lime-500/20',
  },
];

export default function WelcomePage() {
  const [selected, setSelected] = useState<PortalChoice | null>(null);
  const router = useRouter();

  function handleContinue() {
    if (selected) {
      router.push('/onboarding/caq');
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-16">
      <div className="max-w-3xl text-center">
        <h1 className="text-5xl font-bold text-white">
          Welcome to{' '}
          <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
            GeneX360
          </span>
        </h1>
        <p className="mt-4 text-lg text-slate-400">
          Choose your portal to get started with precision health
        </p>
      </div>

      <div className="mt-12 grid w-full max-w-4xl gap-4 sm:grid-cols-3">
        {portalCards.map((card) => (
          <button
            key={card.id}
            onClick={() => setSelected(card.id)}
            className={`group relative rounded-2xl border p-6 text-left transition-all duration-300 ${
              selected === card.id
                ? 'border-emerald-500/50 bg-emerald-500/10 scale-[1.02] shadow-lg shadow-emerald-500/10'
                : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'
            }`}
          >
            <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${card.gradient} opacity-0 transition-opacity group-hover:opacity-100`} />
            <div className="relative">
              <span className="text-4xl">{card.icon}</span>
              <h3 className="mt-4 text-lg font-semibold text-white">{card.title}</h3>
              <p className="mt-2 text-sm text-slate-400">{card.description}</p>
            </div>
            {selected === card.id && (
              <div className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500">
                <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
          </button>
        ))}
      </div>

      <button
        onClick={handleContinue}
        disabled={!selected}
        className="mt-8 rounded-lg bg-gradient-to-r from-emerald-500 to-cyan-500 px-8 py-3 font-medium text-white disabled:opacity-30 transition-all hover:from-emerald-600 hover:to-cyan-600"
      >
        Continue to Health Assessment
      </button>
    </div>
  );
}
