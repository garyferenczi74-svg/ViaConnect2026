'use client';

import { useRouter } from 'next/navigation';

const gatewayOptions = [
  {
    title: 'Order GeneX360 Kit',
    price: '$589+',
    description: 'Comprehensive genetic testing kit with full SNP analysis, pathway mapping, and AI-powered protocol generation.',
    features: ['500+ SNP Analysis', 'Pathway Risk Assessment', 'Personalized Protocols', 'AI Health Insights'],
    cta: 'Order Kit',
    primary: true,
  },
  {
    title: 'Upload Existing DNA',
    price: '$299',
    description: 'Already have genetic data from 23andMe or AncestryDNA? Upload your raw data for GeneX360 analysis.',
    features: ['Raw Data Processing', 'Pathway Mapping', 'Protocol Generation', 'Compatibility Check'],
    cta: 'Upload DNA',
    primary: false,
  },
  {
    title: 'Skip for Now',
    price: 'Free',
    description: 'Continue with your CAQ-based wellness profile. You can order genetic testing anytime from your dashboard.',
    features: ['CAQ-Based Insights', 'General Protocols', 'Supplement Suggestions', 'Upgrade Anytime'],
    cta: 'Continue Free',
    primary: false,
  },
];

export default function GatewayPage() {
  const router = useRouter();

  function handleSelect(index: number) {
    // For now, all paths lead to dashboard
    router.push('/onboarding/dashboard-intro');
  }

  return (
    <div className="flex min-h-screen flex-col items-center px-4 py-16">
      <div className="max-w-3xl text-center">
        <h1 className="text-4xl font-bold text-white">
          <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
            GeneX360
          </span>{' '}
          Gateway
        </h1>
        <p className="mt-3 text-lg text-slate-400">
          Unlock the full power of precision health with genetic analysis
        </p>
      </div>

      <div className="mt-10 grid w-full max-w-5xl gap-6 lg:grid-cols-3">
        {gatewayOptions.map((opt, i) => (
          <div
            key={i}
            className={`relative rounded-2xl border p-6 transition-all ${
              opt.primary
                ? 'border-emerald-500/50 bg-emerald-500/5 shadow-lg shadow-emerald-500/10'
                : 'border-white/10 bg-white/5'
            }`}
          >
            {opt.primary && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 px-4 py-1 text-xs font-medium text-white">
                Recommended
              </div>
            )}
            <div className="text-center">
              <h3 className="text-xl font-bold text-white">{opt.title}</h3>
              <p className="mt-1 text-3xl font-bold text-emerald-400">{opt.price}</p>
              <p className="mt-3 text-sm text-slate-400">{opt.description}</p>
            </div>
            <ul className="mt-6 space-y-3">
              {opt.features.map((feature) => (
                <li key={feature} className="flex items-center gap-2 text-sm text-slate-300">
                  <svg className="h-4 w-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {feature}
                </li>
              ))}
            </ul>
            <button
              onClick={() => handleSelect(i)}
              className={`mt-6 w-full rounded-lg px-4 py-3 font-medium transition-all ${
                opt.primary
                  ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-white hover:from-emerald-600 hover:to-cyan-600'
                  : 'border border-white/10 text-white hover:bg-white/5'
              }`}
            >
              {opt.cta}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
