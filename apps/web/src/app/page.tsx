export default function Home() {
  return (
    <div className="relative flex min-h-screen w-full flex-col bg-gradient-dark overflow-x-hidden pb-24">
      {/* Top Navigation */}
      <div className="flex items-center p-6 pb-2 justify-between sticky top-0 z-20 bg-background-dark/80 backdrop-blur-md">
        <div className="flex flex-col">
          <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">
            ViaConnect™
          </p>
          <h2 className="text-white text-2xl font-bold leading-tight tracking-tight">
            Good morning, Gary
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <button className="relative flex size-10 items-center justify-center rounded-full glass">
            <span className="material-symbols-outlined text-white text-xl">
              notifications
            </span>
            <span className="absolute top-2 right-2 size-2 bg-primary rounded-full"></span>
          </button>
          <div className="size-10 rounded-full border-2 border-primary/30 p-0.5">
            <div
              className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-full"
              style={{
                backgroundImage:
                  'url("https://lh3.googleusercontent.com/aida-public/AB6AXuDXbRjoLQQya3pM6Jlg66BAuzRCB_iwLw57r0e0Vm8tblHyi66Qntf2T0C-okVFLe0MOqnRc_UFBY2nlWqobNUsdzsmWAoL-TUzRjKfJCbWK7fWjZ3uOY4kfcbIRjVfA-wUd0eMPCZTOWxlKdogo4PpyrdMnQvHL6OaaSgvNYTKsF8bWp2SMBtnPFeqzcxA6Ndgg9JCWsxGLUsUGgcfGYqX4cdmPvL8A_Gvse-YPz29TNSqGR7slDkUf2M9HW5NjsLzE3wLDoGMu64")',
              }}
              aria-label="Portrait of a smiling professional man"
              role="img"
            ></div>
          </div>
        </div>
      </div>

      {/* Hero Stats Section */}
      <div className="flex px-6 py-6 gap-6 items-center">
        {/* Score Circle */}
        <div className="relative flex flex-col items-center justify-center size-32 shrink-0">
          <svg className="size-full -rotate-90 transform">
            <circle
              className="text-slate-800"
              cx="64"
              cy="64"
              fill="transparent"
              r="58"
              stroke="currentColor"
              strokeWidth="8"
            />
            <circle
              className="text-primary glow-cyan"
              cx="64"
              cy="64"
              fill="transparent"
              r="58"
              stroke="currentColor"
              strokeDasharray="364.4"
              strokeDashoffset="47.3"
              strokeWidth="8"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold text-white">87</span>
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">
              Score
            </span>
          </div>
        </div>
        <div className="flex flex-col gap-4 flex-1">
          <div className="glass rounded-2xl p-4 flex flex-col gap-1">
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">
              FarmaTokens
            </p>
            <div className="flex items-center gap-2">
              <span className="text-xl">🪙</span>
              <p className="text-white text-2xl font-bold">1,247</p>
            </div>
          </div>
          <div className="glass rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">
                Streak
              </p>
              <p className="text-white font-bold">🔥 14 days</p>
            </div>
            <span className="material-symbols-outlined text-primary">
              trending_up
            </span>
          </div>
        </div>
      </div>

      {/* Quick Action Pills */}
      <div className="flex gap-3 px-6 overflow-x-auto no-scrollbar py-2">
        <div className="flex h-10 shrink-0 items-center justify-center gap-x-2 rounded-full bg-primary px-5 shadow-lg shadow-primary/20">
          <span className="material-symbols-outlined text-white text-sm">
            bolt
          </span>
          <p className="text-white text-sm font-bold">Log Activity</p>
        </div>
        <div className="flex h-10 shrink-0 items-center justify-center gap-x-2 rounded-full glass px-5">
          <span className="material-symbols-outlined text-primary text-sm">
            fingerprint
          </span>
          <p className="text-slate-200 text-sm font-medium">Sync Data</p>
        </div>
        <div className="flex h-10 shrink-0 items-center justify-center gap-x-2 rounded-full glass px-5">
          <span className="material-symbols-outlined text-primary text-sm">
            restaurant
          </span>
          <p className="text-slate-200 text-sm font-medium">Log Meal</p>
        </div>
        <div className="flex h-10 shrink-0 items-center justify-center gap-x-2 rounded-full glass px-5">
          <span className="material-symbols-outlined text-primary text-sm">
            science
          </span>
          <p className="text-slate-200 text-sm font-medium">Lab Results</p>
        </div>
      </div>

      {/* Today's Protocol */}
      <div className="px-6 pt-8 pb-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white text-xl font-bold">
            Today&apos;s Protocol
          </h3>
          <span className="text-primary text-sm font-semibold">View All</span>
        </div>
        <div className="flex flex-col gap-3">
          <div className="glass rounded-2xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
                <span className="material-symbols-outlined text-primary">
                  pill
                </span>
              </div>
              <div>
                <p className="text-white font-bold">AM Bio-Stack</p>
                <p className="text-slate-400 text-xs">
                  Omega-3, Vitamin D3 + K2
                </p>
              </div>
            </div>
            <div className="size-6 rounded border-2 border-primary/50 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary text-sm font-bold">
                check
              </span>
            </div>
          </div>
          <div className="glass rounded-2xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex size-10 items-center justify-center rounded-xl bg-orange-500/10">
                <span className="material-symbols-outlined text-orange-500">
                  fitness_center
                </span>
              </div>
              <div>
                <p className="text-white font-bold">Zone 2 Cardio</p>
                <p className="text-slate-400 text-xs">
                  45 minutes at 135 bpm
                </p>
              </div>
            </div>
            <div className="size-6 rounded border-2 border-slate-700"></div>
          </div>
        </div>
      </div>

      {/* Health Snapshot */}
      <div className="px-6 pt-4 pb-4">
        <h3 className="text-white text-xl font-bold mb-4">Health Snapshot</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="glass rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="material-symbols-outlined text-blue-400">
                bedtime
              </span>
              <span className="text-[10px] font-bold text-slate-500 uppercase">
                Oura
              </span>
            </div>
            <p className="text-slate-400 text-xs mb-1">Sleep Score</p>
            <p className="text-white text-xl font-bold">
              92
              <span className="text-sm font-normal text-slate-500">/100</span>
            </p>
          </div>
          <div className="glass rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="material-symbols-outlined text-red-400">
                favorite
              </span>
              <span className="text-[10px] font-bold text-slate-500 uppercase">
                Whoop
              </span>
            </div>
            <p className="text-slate-400 text-xs mb-1">HRV</p>
            <p className="text-white text-xl font-bold">
              78
              <span className="text-sm font-normal text-slate-500"> ms</span>
            </p>
          </div>
          <div className="glass rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="material-symbols-outlined text-green-400">
                directions_run
              </span>
              <span className="text-[10px] font-bold text-slate-500 uppercase">
                Steps
              </span>
            </div>
            <p className="text-slate-400 text-xs mb-1">Today</p>
            <p className="text-white text-xl font-bold">8,432</p>
          </div>
          <div className="glass rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="material-symbols-outlined text-primary">
                battery_charging_full
              </span>
              <span className="text-[10px] font-bold text-slate-500 uppercase">
                Recovery
              </span>
            </div>
            <p className="text-slate-400 text-xs mb-1">Ready State</p>
            <p className="text-white text-xl font-bold">Optimal</p>
          </div>
        </div>
      </div>

      {/* AI Insight Card */}
      <div className="px-6 pt-4 pb-4">
        <div className="glass rounded-2xl p-6 border-primary/20 bg-primary/5">
          <div className="flex items-center gap-3 mb-3">
            <div className="size-8 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/40">
              <span className="material-symbols-outlined text-white text-sm">
                lightbulb
              </span>
            </div>
            <h4 className="text-primary font-bold">AI Health Insight</h4>
          </div>
          <p className="text-slate-200 text-sm leading-relaxed">
            Your HRV has been trending up for 3 days. This suggests high
            metabolic flexibility. We recommend increasing your training
            intensity by 10% today.
          </p>
        </div>
      </div>

      {/* Research Card */}
      <div className="px-6 pt-4 pb-8">
        <h3 className="text-white text-xl font-bold mb-4">Daily Research</h3>
        <div className="glass rounded-2xl overflow-hidden">
          <div
            className="h-32 w-full bg-cover bg-center"
            style={{
              backgroundImage:
                "url('https://lh3.googleusercontent.com/aida-public/AB6AXuA7rMXIS9XpNDK5jFynUjEBxbofRZAZOPJKvnwkVIA7bPAuhuKlAAdhvGT1HuSP2wDy1lzuWbnjMe3eT5D7tEvxLXoHJtDizf7wYcFPVtLLEEJhJz58iFsA4ted48QzfdEK3Jr400QwuRpbnplfN5yjEVWQcfsXI6u3YxNLVVl2QTUwAZ3tIt9HiFGzTAA-zIoIMEaUuP-K7D1SyUdb9Lk65c146bG75Gxhmzz5dlTALL4N6eLGUttgdEDLYoJk1qOrd7MGNqD--Dw')",
            }}
            aria-label="Abstract molecular structure in blue light"
            role="img"
          ></div>
          <div className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px] font-bold uppercase tracking-tight">
                PubMed Ref: 3491208
              </span>
            </div>
            <h4 className="text-white font-bold mb-2 leading-snug">
              Effect of NAD+ Precursors on Mitochondrial Biogenesis and
              Longevity
            </h4>
            <p className="text-slate-400 text-xs line-clamp-2">
              Recent clinical trials demonstrate that NMN supplementation
              significantly increases systemic NAD+ levels in adults over 45...
            </p>
            <button className="mt-4 text-primary text-xs font-bold uppercase tracking-widest flex items-center gap-1">
              Read Summary{" "}
              <span className="material-symbols-outlined text-xs">
                arrow_forward
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Tab Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-6">
        <div className="glass rounded-full px-6 py-3 flex items-center justify-between border-white/20">
          <a
            className="flex flex-col items-center gap-1 text-primary"
            href="#"
          >
            <span className="material-symbols-outlined text-2xl">home</span>
            <span className="text-[10px] font-bold">Home</span>
            <div className="h-1 w-1 rounded-full bg-primary mt-0.5"></div>
          </a>
          <a
            className="flex flex-col items-center gap-1 text-slate-500"
            href="#"
          >
            <span className="material-symbols-outlined text-2xl">
              genetics
            </span>
            <span className="text-[10px] font-medium">Genomics</span>
          </a>
          <a
            className="flex flex-col items-center gap-1 text-slate-500"
            href="#"
          >
            <span className="material-symbols-outlined text-2xl">
              assignment
            </span>
            <span className="text-[10px] font-medium">Protocol</span>
          </a>
          <a
            className="flex flex-col items-center gap-1 text-slate-500"
            href="#"
          >
            <span className="material-symbols-outlined text-2xl">
              shopping_bag
            </span>
            <span className="text-[10px] font-medium">Shop</span>
          </a>
          <a
            className="flex flex-col items-center gap-1 text-slate-500"
            href="#"
          >
            <span className="material-symbols-outlined text-2xl">
              smart_toy
            </span>
            <span className="text-[10px] font-medium">AI Chat</span>
          </a>
        </div>
      </div>
    </div>
  );
}
