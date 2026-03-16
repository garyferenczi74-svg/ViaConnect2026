export default function LandingPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center">
      <div className="text-center">
        <h1 className="font-display text-6xl font-bold tracking-tight">
          <span className="bg-gradient-to-r from-emerald-400 to-teal-500 bg-clip-text text-transparent">
            GeneX360
          </span>
        </h1>
        <p className="mt-4 text-xl text-slate-400">
          Precision Health Platform by FarmCeutica Wellness
        </p>
        <div className="mt-8 flex gap-4 justify-center">
          <a
            href="/wellness"
            className="rounded-lg bg-emerald-600 px-6 py-3 font-medium text-white hover:bg-emerald-700 transition-colors"
          >
            Wellness Portal
          </a>
          <a
            href="/practitioner"
            className="rounded-lg border border-emerald-600 px-6 py-3 font-medium text-emerald-400 hover:bg-emerald-950 transition-colors"
          >
            Practitioner Portal
          </a>
        </div>
        {/* Three.js DNA helix placeholder - will be added in Phase 1 */}
        <div className="mt-16 h-64 w-full max-w-lg mx-auto rounded-xl border border-slate-800 flex items-center justify-center text-slate-600">
          DNA Helix Visualization (Phase 1)
        </div>
      </div>
    </main>
  );
}
