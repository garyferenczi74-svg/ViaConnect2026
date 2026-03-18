"use client";

import { useState, useCallback } from "react";
import {
  Sparkles,
  Calendar,
  Trophy,
  Circle,
  CheckCircle2,
  X,
} from "lucide-react";
import Link from "next/link";

/* ────────────────────────────────────────────
   TypeScript Interfaces
   ──────────────────────────────────────────── */

interface ProtocolTask {
  id: string;
  name: string;
  timing: string;
  category: "supplement" | "lifestyle";
}

interface WeekDay {
  day: string;
  adherence: number;
}

interface Achievement {
  name: string;
  status: "earned" | "locked";
}

/* ────────────────────────────────────────────
   Sample Data
   ──────────────────────────────────────────── */

const tasks: ProtocolTask[] = [
  {
    id: "methylfolate",
    name: "Methylfolate 800mcg",
    timing: "Morning",
    category: "supplement",
  },
  {
    id: "magnesium",
    name: "Magnesium Glycinate 400mg",
    timing: "Evening",
    category: "supplement",
  },
  {
    id: "omega3",
    name: "Omega-3 2000mg",
    timing: "With meal",
    category: "supplement",
  },
  {
    id: "exercise",
    name: "30min Moderate Exercise",
    timing: "Anytime",
    category: "lifestyle",
  },
  {
    id: "sleep",
    name: "7–9 hours Quality Sleep",
    timing: "By 10:30 PM",
    category: "lifestyle",
  },
];

const weeklyData: WeekDay[] = [
  { day: "Mon", adherence: 100 },
  { day: "Tue", adherence: 80 },
  { day: "Wed", adherence: 100 },
  { day: "Thu", adherence: 100 },
  { day: "Fri", adherence: 60 },
  { day: "Sat", adherence: 100 },
  { day: "Sun", adherence: 80 },
];

const achievements: Achievement[] = [
  { name: "7-Day Streak", status: "earned" },
  { name: "Perfect Week", status: "earned" },
  { name: "30-Day Warrior", status: "locked" },
];

/* ────────────────────────────────────────────
   Helpers
   ──────────────────────────────────────────── */

const NAV_TABS = [
  { label: "Dashboard", href: "/wellness" },
  { label: "Genetics", href: "/wellness/genetics" },
  { label: "Variants", href: "/wellness/variants" },
  { label: "Bio", href: "/wellness/bio" },
  { label: "Plans", href: "/wellness/plans" },
  { label: "Track", href: "/wellness/track" },
  { label: "Share", href: "/wellness/share" },
  { label: "Insights", href: "/wellness/insights" },
  { label: "Learn", href: "/wellness/learn" },
  { label: "Research", href: "/wellness/research" },
];

function adherenceColor(pct: number): string {
  if (pct >= 100) return "bg-green-500 text-white";
  if (pct >= 80) return "bg-green-600/80 text-white";
  if (pct >= 70) return "bg-yellow-500 text-gray-900";
  if (pct >= 60) return "bg-red-400 text-white";
  return "bg-gray-600 text-white";
}

/* ────────────────────────────────────────────
   Toast Component
   ──────────────────────────────────────────── */

function Toast({
  message,
  visible,
  onClose,
}: {
  message: string;
  visible: boolean;
  onClose: () => void;
}) {
  if (!visible) return null;
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] animate-bounce">
      <div className="bg-green-400 text-gray-900 px-5 py-2.5 rounded-full text-sm font-bold shadow-lg shadow-green-400/30 flex items-center gap-2">
        <Sparkles className="h-4 w-4" />
        {message}
        <button onClick={onClose} className="ml-1">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────
   Page Component
   ──────────────────────────────────────────── */

export default function TrackPage() {
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<{ message: string; visible: boolean }>({
    message: "",
    visible: false,
  });

  const completedCount = checked.size;
  const totalCount = tasks.length;
  const pct = Math.round((completedCount / totalCount) * 100);

  const toggleTask = useCallback(
    (id: string) => {
      setChecked((prev) => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
          // Show toast for earning tokens
          setToast({ message: "+5 FarmaTokens earned!", visible: true });
          setTimeout(
            () => setToast((t) => ({ ...t, visible: false })),
            2500
          );
        }
        return next;
      });
    },
    []
  );

  const pctColor =
    pct === 0
      ? "text-red-400"
      : pct < 50
        ? "text-yellow-400"
        : pct < 100
          ? "text-green-400"
          : "text-green-400";

  return (
    <div className="min-h-screen bg-[#111827] text-white font-sans antialiased">
      {/* ── Header ── */}
      <header className="sticky top-0 z-50 bg-[#111827]/90 backdrop-blur-md border-b border-gray-800">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/wellness"
              className="px-3 py-1.5 rounded-full bg-gray-800 text-xs text-gray-300 border border-gray-700 hover:bg-gray-700 transition-colors"
            >
              &larr; Return to Main Menu
            </Link>
            <div className="w-8 h-8 rounded-full bg-green-400 flex items-center justify-center text-gray-900">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-sm font-bold leading-tight">
                Personal Wellness Portal
              </h1>
              <p className="text-[10px] text-gray-400">
                ViaConnect&trade; AI-Powered Health
              </p>
            </div>
          </div>
        </div>

        {/* ── Tab Navigation ── */}
        <nav className="max-w-6xl mx-auto px-4 pb-2 flex gap-2 overflow-x-auto scrollbar-hide">
          {NAV_TABS.map((tab) => {
            const isActive = tab.label === "Track";
            return (
              <Link
                key={tab.label}
                href={tab.href}
                className={`whitespace-nowrap px-5 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-green-400 text-gray-900 font-bold"
                    : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </header>

      {/* ── Main Content ── */}
      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* ── 1. Title ── */}
        <section>
          <h2 className="text-2xl font-bold">Protocol Adherence Monitoring</h2>
          <p className="text-sm text-gray-400 mt-1">
            Track daily supplement intake and lifestyle targets. Check off items
            as you complete them to maintain your streak.
          </p>
        </section>

        {/* ── 2. Today's Protocol Card ── */}
        <section className="bg-gray-800/50 border border-green-400/15 rounded-xl backdrop-blur-sm p-5 space-y-4">
          {/* Header row */}
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-lg">Today&apos;s Protocol</h3>
            <div className="text-right">
              <p className={`text-xl font-bold ${pctColor}`}>{pct}%</p>
              <p className="text-[10px] text-gray-500">
                {completedCount}/{totalCount} completed
              </p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-gray-700 h-2 rounded-full overflow-hidden">
            <div
              className="bg-green-400 h-full rounded-full transition-all duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>

          {/* Checklist */}
          <div className="space-y-2">
            {tasks.map((task) => {
              const isDone = checked.has(task.id);
              return (
                <button
                  key={task.id}
                  onClick={() => toggleTask(task.id)}
                  className={`w-full flex items-center gap-3 bg-gray-900/40 border rounded-xl p-4 text-left transition-all ${
                    isDone
                      ? "border-green-400/30 bg-green-400/5"
                      : "border-gray-700 hover:border-green-400/20"
                  }`}
                >
                  {/* Checkbox */}
                  {isDone ? (
                    <CheckCircle2 className="h-5 w-5 text-green-400 flex-shrink-0" />
                  ) : (
                    <Circle className="h-5 w-5 text-gray-600 flex-shrink-0" />
                  )}

                  {/* Name + timing */}
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm font-bold transition-all ${
                        isDone
                          ? "line-through text-gray-500"
                          : "text-white"
                      }`}
                    >
                      {task.name}
                    </p>
                    <p className="text-[10px] text-gray-500">{task.timing}</p>
                  </div>

                  {/* Category badge */}
                  <span
                    className={`text-[10px] px-2.5 py-0.5 rounded-full border font-semibold flex-shrink-0 ${
                      task.category === "supplement"
                        ? "border-green-400/30 text-green-400"
                        : "border-purple-400/30 text-purple-400"
                    }`}
                  >
                    {task.category}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* ── 3. Two-Column: Weekly + Achievements ── */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Weekly Adherence */}
          <div className="bg-gray-800/50 border border-green-400/15 rounded-xl backdrop-blur-sm p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-green-400" />
              <div>
                <h3 className="font-bold text-sm">Weekly Adherence</h3>
                <p className="text-[10px] text-gray-500">
                  This week&apos;s protocol completion
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2">
              {weeklyData.map((wd) => (
                <div key={wd.day} className="flex flex-col items-center gap-1.5">
                  <div
                    className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-bold ${adherenceColor(
                      wd.adherence
                    )}`}
                  >
                    {wd.adherence}%
                  </div>
                  <span className="text-[10px] text-gray-500">{wd.day}</span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between text-[10px] text-gray-500 pt-2 border-t border-gray-700">
              <span>
                Weekly average:{" "}
                <span className="text-green-400 font-bold">
                  {Math.round(
                    weeklyData.reduce((s, d) => s + d.adherence, 0) /
                      weeklyData.length
                  )}
                  %
                </span>
              </span>
              <span>
                Best day:{" "}
                <span className="text-white font-medium">
                  {
                    weeklyData.reduce((best, d) =>
                      d.adherence > best.adherence ? d : best
                    ).day
                  }
                </span>
              </span>
            </div>
          </div>

          {/* Achievements */}
          <div className="bg-gray-800/50 border border-green-400/15 rounded-xl backdrop-blur-sm p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-green-400" />
              <h3 className="font-bold text-sm">Achievements</h3>
            </div>

            <div className="space-y-3">
              {achievements.map((a) => (
                <div
                  key={a.name}
                  className={`flex items-center justify-between p-3 rounded-xl border ${
                    a.status === "earned"
                      ? "bg-green-400/5 border-green-400/20"
                      : "bg-gray-900/30 border-gray-700"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        a.status === "earned"
                          ? "bg-green-400/20"
                          : "bg-gray-800"
                      }`}
                    >
                      <Trophy
                        className={`h-4 w-4 ${
                          a.status === "earned"
                            ? "text-green-400"
                            : "text-gray-600"
                        }`}
                      />
                    </div>
                    <span
                      className={`text-sm font-bold ${
                        a.status === "earned" ? "text-white" : "text-gray-500"
                      }`}
                    >
                      {a.name}
                    </span>
                  </div>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded uppercase font-bold ${
                      a.status === "earned"
                        ? "bg-green-500/20 text-green-400"
                        : "bg-gray-800 text-gray-600"
                    }`}
                  >
                    {a.status === "earned" ? "Earned" : "Locked"}
                  </span>
                </div>
              ))}
            </div>

            <div className="bg-gray-900/40 border border-gray-700 rounded-lg p-3">
              <p className="text-[10px] text-gray-500 leading-relaxed">
                Complete daily protocols to earn FarmaTokens and unlock
                achievements. Maintain streaks for bonus rewards.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* ── Toast ── */}
      <Toast
        message={toast.message}
        visible={toast.visible}
        onClose={() => setToast((t) => ({ ...t, visible: false }))}
      />
    </div>
  );
}
