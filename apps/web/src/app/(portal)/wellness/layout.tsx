export default function WellnessLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-950">
      <nav className="border-b border-slate-800 px-6 py-4">
        <span className="font-display text-lg font-bold text-emerald-400">GeneX360</span>
        <span className="ml-2 text-sm text-slate-500">Wellness</span>
      </nav>
      <main>{children}</main>
    </div>
  );
}
