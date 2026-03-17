'use client';

import { useRouter } from 'next/navigation';

export default function GatewayPage() {
  const router = useRouter();

  return (
    <div className="relative flex min-h-screen flex-col items-center px-4 py-10 overflow-hidden">
      {/* Background glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-0 h-[500px] w-[700px] -translate-x-1/2 -translate-y-1/4 rounded-full bg-[radial-gradient(circle,rgba(139,92,246,0.1),transparent_60%)]" />
      </div>

      <div className="relative z-10 w-full max-w-4xl">
        {/* Progress indicator */}
        <div className="flex justify-center">
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5].map((phase) => (
              <div key={phase} className="flex items-center gap-2">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                    phase < 4
                      ? 'bg-cyan-400/20 text-cyan-400'
                      : phase === 4
                        ? 'bg-gradient-to-r from-[#06B6D4] to-[#8B5CF6] text-white'
                        : 'bg-white/10 text-slate-500'
                  }`}
                >
                  {phase < 4 ? (
                    <span className="material-symbols-outlined text-base">check</span>
                  ) : (
                    phase
                  )}
                </div>
                {phase < 5 && (
                  <div
                    className={`h-0.5 w-6 rounded ${
                      phase < 4 ? 'bg-cyan-400/30' : 'bg-white/10'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        <p className="mt-3 text-center text-xs text-slate-500">Phase 4 of 5</p>

        {/* Headline */}
        <h1 className="mt-8 text-center font-[Syne] text-4xl font-bold text-white md:text-5xl">
          Unlock Your Genetic Blueprint
        </h1>
        <p className="mx-auto mt-4 max-w-lg text-center text-lg text-white/60">
          Choose how you want to personalize your health journey
        </p>

        {/* 3 Option cards */}
        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {/* Card 1 — PREMIUM */}
          <div className="relative flex flex-col rounded-2xl border border-[#8B5CF6]/40 bg-white/5 p-6 shadow-[0_0_40px_rgba(139,92,246,0.12)] backdrop-blur-xl lg:scale-105 lg:-my-2">
            {/* Most popular badge */}
            <div className="absolute -top-3 right-4 rounded-full bg-gradient-to-r from-[#8B5CF6] to-[#a78bfa] px-4 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-lg">
              Most Popular
            </div>

            <div className="flex flex-col items-center text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#8B5CF6]/20">
                <span className="material-symbols-outlined text-3xl text-[#8B5CF6]">genetics</span>
              </div>
              <h3 className="mt-4 font-[Syne] text-xl font-bold text-white">
                GeneX360&trade; Complete
              </h3>
              <p className="mt-3 bg-gradient-to-r from-[#06B6D4] to-[#8B5CF6] bg-clip-text font-mono text-4xl font-bold text-transparent">
                $988.88
              </p>
              <p className="mt-2 text-sm text-slate-400">
                All 6 diagnostic panels in one comprehensive test
              </p>
            </div>

            <ul className="mt-6 space-y-3 flex-1">
              <FeatureItem label="GENEX-M&trade; — 25+ SNP Methylation & Pharmacogenomics" />
              <FeatureItem label="NUTRIGEN-DX&trade; — Nutrient Genomics" />
              <FeatureItem label="HormoneIQ&trade; — DUTCH Complete (40+ Hormones)" />
              <FeatureItem label="EpigenHQ&trade; — Biological Age (850K CpG sites)" />
              <FeatureItem
                label="PeptideIQ&trade; — Peptide Genetic Testing"
                badge="FIRST MOVER"
              />
              <FeatureItem
                label="CannabisIQ&trade; — Cannabinoid Genetics"
                badge="FIRST MOVER"
              />
              <FeatureItem label="6 Months ViaConnect Platinum FREE ($173 value)" highlight />
            </ul>

            <button
              onClick={() => router.push('/onboarding/dashboard-intro')}
              className="mt-6 w-full rounded-xl bg-gradient-to-r from-[#06B6D4] to-[#8B5CF6] px-6 py-4 text-base font-semibold text-white transition-all hover:shadow-xl hover:shadow-[#8B5CF6]/25"
            >
              Order GeneX360&trade; Complete
            </button>

            <div className="mt-4 flex flex-col items-center gap-2">
              <span className="flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-[11px] font-medium text-emerald-400">
                <span className="material-symbols-outlined text-sm">verified</span>
                HSA/FSA Eligible via Truemed
              </span>
              <span className="text-xs text-slate-500">Kit ships in 4 business days</span>
            </div>
          </div>

          {/* Card 2 — UPLOAD */}
          <div className="flex flex-col rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
            <div className="flex flex-col items-center text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-400/20">
                <span className="material-symbols-outlined text-3xl text-cyan-400">cloud_upload</span>
              </div>
              <h3 className="mt-4 font-[Syne] text-xl font-bold text-white">
                Upload Existing DNA
              </h3>
              <p className="mt-3 font-mono text-4xl font-bold text-white">$299</p>
              <p className="mt-2 text-sm text-slate-400">
                Already tested with 23andMe, AncestryDNA, or MyHeritage?
              </p>
            </div>

            <p className="mt-4 text-center text-sm leading-relaxed text-slate-400 flex-1">
              Upload your raw data and get results in 24&ndash;48 hours. Our AI analyzes your existing
              genetic data against 500+ health-relevant SNPs for personalized supplement protocols.
            </p>

            <button
              onClick={() => router.push('/onboarding/dashboard-intro')}
              className="mt-6 w-full rounded-xl border border-cyan-400/50 px-6 py-4 text-base font-semibold text-cyan-400 transition-all hover:bg-cyan-400/10 hover:border-cyan-400"
            >
              Upload My DNA Data
            </button>
          </div>

          {/* Card 3 — SKIP */}
          <div className="flex flex-col rounded-2xl border border-white/5 bg-white/[0.03] p-6 backdrop-blur-xl">
            <div className="flex flex-col items-center text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10">
                <span className="material-symbols-outlined text-3xl text-slate-400">skip_next</span>
              </div>
              <h3 className="mt-4 font-[Syne] text-xl font-bold text-white">
                Continue Without Testing
              </h3>
              <p className="mt-3 text-sm text-slate-400">
                Use CAQ-based recommendations (lower precision)
              </p>
            </div>

            <p className="mt-4 text-center text-sm leading-relaxed text-slate-500 flex-1">
              Continue with your questionnaire-based health profile. You can always add genetic testing
              later from your dashboard to unlock higher-confidence protocols.
            </p>

            <button
              onClick={() => router.push('/wellness')}
              className="mt-6 flex items-center justify-center gap-1 px-6 py-4 text-sm font-medium text-slate-400 transition-colors hover:text-white"
            >
              Skip for Now
              <span className="material-symbols-outlined text-lg">arrow_forward</span>
            </button>
          </div>
        </div>

        {/* Trust bar */}
        <div className="mt-12 flex items-center justify-center gap-2 text-xs text-slate-500">
          <span className="material-symbols-outlined text-base">lock</span>
          <span>AES-256 Encrypted &middot; HIPAA Compliant &middot; Your data is never sold</span>
        </div>
      </div>
    </div>
  );
}

function FeatureItem({
  label,
  badge,
  highlight,
}: {
  label: string;
  badge?: string;
  highlight?: boolean;
}) {
  return (
    <li className="flex items-start gap-2.5 text-sm">
      <span
        className={`material-symbols-outlined mt-0.5 text-base ${
          highlight ? 'text-emerald-400' : 'text-cyan-400'
        }`}
      >
        check_circle
      </span>
      <span className={highlight ? 'text-emerald-400' : 'text-slate-300'}>
        <span dangerouslySetInnerHTML={{ __html: label }} />
        {badge && (
          <span className="ml-2 inline-flex rounded bg-[#8B5CF6]/20 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#8B5CF6]">
            {badge}
          </span>
        )}
      </span>
    </li>
  );
}
