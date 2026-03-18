"use client";

import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/types/database";

interface DashboardProps {
  greeting: string;
  firstName: string;
  avatarUrl: string | null;
  score: number | null;
  tokenBalance: number;
  currentStreak: number;
  multiplier: number | null;
  metrics: Tables<"health_metrics"> | null;
  tasks: Tables<"daily_tasks">[];
  insight: Tables<"ai_insights"> | null;
}

export default function Dashboard({
  greeting,
  firstName,
  avatarUrl,
  score,
  tokenBalance,
  currentStreak,
  metrics,
  tasks,
  insight,
}: DashboardProps) {
  const supabase = createClient();

  async function handleSignOut() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  async function toggleTask(taskId: string, completed: boolean) {
    await supabase
      .from("daily_tasks")
      .update({
        completed: !completed,
        completed_at: !completed ? new Date().toISOString() : null,
      })
      .eq("id", taskId);
    window.location.reload();
  }

  const healthScore = score ?? 87;
  const circumference = 2 * Math.PI * 58;
  const offset = circumference - (healthScore / 100) * circumference;

  return (
    <div className="relative flex min-h-screen w-full flex-col bg-gradient-dark overflow-x-hidden pb-24">
      {/* Top Navigation */}
      <div className="flex items-center p-6 pb-2 justify-between sticky top-0 z-20 bg-background-dark/80 backdrop-blur-md">
        <div className="flex flex-col">
          <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">
            ViaConnect™
          </p>
          <h2 className="text-white text-2xl font-bold leading-tight tracking-tight">
            {greeting}, {firstName}
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <button className="relative flex size-10 items-center justify-center rounded-full glass">
            <span className="material-symbols-outlined text-white text-xl">
              notifications
            </span>
            <span className="absolute top-2 right-2 size-2 bg-primary rounded-full"></span>
          </button>
          <button
            onClick={handleSignOut}
            className="size-10 rounded-full border-2 border-primary/30 p-0.5 overflow-hidden"
          >
            {avatarUrl ? (
              <div
                className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-full"
                style={{ backgroundImage: `url("${avatarUrl}")` }}
                role="img"
                aria-label="User avatar"
              />
            ) : (
              <div className="flex size-full items-center justify-center rounded-full bg-primary/20">
                <span className="text-primary font-bold text-sm">
                  {firstName[0]?.toUpperCase()}
                </span>
              </div>
            )}
          </button>
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
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeWidth="8"
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold text-white">{healthScore}</span>
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
              <p className="text-white text-2xl font-bold">
                {tokenBalance.toLocaleString()}
              </p>
            </div>
          </div>
          <div className="glass rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">
                Streak
              </p>
              <p className="text-white font-bold">
                🔥 {currentStreak} day{currentStreak !== 1 ? "s" : ""}
              </p>
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
          {tasks.length > 0 ? (
            tasks.map((task) => (
              <div
                key={task.id}
                className="glass rounded-2xl p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`flex size-10 items-center justify-center rounded-xl ${
                      task.task_type === "EXERCISE"
                        ? "bg-orange-500/10"
                        : "bg-primary/10"
                    }`}
                  >
                    <span
                      className={`material-symbols-outlined ${
                        task.task_type === "EXERCISE"
                          ? "text-orange-500"
                          : "text-primary"
                      }`}
                    >
                      {task.task_type === "SUPPLEMENT"
                        ? "pill"
                        : task.task_type === "EXERCISE"
                        ? "fitness_center"
                        : task.task_type === "MEAL_LOG"
                        ? "restaurant"
                        : task.task_type === "LAB_TEST"
                        ? "science"
                        : "task_alt"}
                    </span>
                  </div>
                  <div>
                    <p className="text-white font-bold">{task.title}</p>
                    {task.description && (
                      <p className="text-slate-400 text-xs">
                        {task.description}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => toggleTask(task.id, task.completed)}
                  className={`size-6 rounded border-2 flex items-center justify-center transition ${
                    task.completed
                      ? "border-primary/50 bg-primary/10"
                      : "border-slate-700"
                  }`}
                >
                  {task.completed && (
                    <span className="material-symbols-outlined text-primary text-sm font-bold">
                      check
                    </span>
                  )}
                </button>
              </div>
            ))
          ) : (
            <>
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
                <div className="size-6 rounded border-2 border-slate-700"></div>
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
            </>
          )}
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
              {metrics?.sleep_score ?? "—"}
              {metrics?.sleep_score && (
                <span className="text-sm font-normal text-slate-500">/100</span>
              )}
            </p>
          </div>
          <div className="glass rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="material-symbols-outlined text-red-400">
                favorite
              </span>
              <span className="text-[10px] font-bold text-slate-500 uppercase">
                {metrics?.hrv_source ?? "Whoop"}
              </span>
            </div>
            <p className="text-slate-400 text-xs mb-1">HRV</p>
            <p className="text-white text-xl font-bold">
              {metrics?.hrv_value ?? "—"}
              {metrics?.hrv_value && (
                <span className="text-sm font-normal text-slate-500"> ms</span>
              )}
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
            <p className="text-white text-xl font-bold">
              {metrics?.steps_count?.toLocaleString() ?? "—"}
            </p>
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
            <p className="text-white text-xl font-bold">
              {metrics?.recovery_state ?? "—"}
            </p>
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
            {insight?.insight_text ??
              "Complete your daily protocols and sync your wearable to unlock personalized AI insights tailored to your health data."}
          </p>
        </div>
      </div>

      {/* Research Card */}
      {insight?.research_title && (
        <div className="px-6 pt-4 pb-8">
          <h3 className="text-white text-xl font-bold mb-4">Daily Research</h3>
          <div className="glass rounded-2xl overflow-hidden">
            <div className="p-4">
              {insight.pubmed_id && (
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px] font-bold uppercase tracking-tight">
                    PubMed Ref: {insight.pubmed_id}
                  </span>
                </div>
              )}
              <h4 className="text-white font-bold mb-2 leading-snug">
                {insight.research_title}
              </h4>
              {insight.research_summary && (
                <p className="text-slate-400 text-xs line-clamp-2">
                  {insight.research_summary}
                </p>
              )}
              {insight.research_url && (
                <a
                  href={insight.research_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 text-primary text-xs font-bold uppercase tracking-widest flex items-center gap-1"
                >
                  Read Summary{" "}
                  <span className="material-symbols-outlined text-xs">
                    arrow_forward
                  </span>
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Bottom Tab Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-6">
        <div className="glass rounded-full px-6 py-3 flex items-center justify-between border-white/20">
          <a
            className="flex flex-col items-center gap-1 text-primary"
            href="/"
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
