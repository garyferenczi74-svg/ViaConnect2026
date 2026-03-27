"use client";

import { useState } from "react";
import { Gift, Brain } from "lucide-react";

const earnCards = [
  { emoji: "💊", title: "Take Supplements", reward: "+5 VT per dose", desc: "Complete your daily protocol" },
  { emoji: "📸", title: "Log a Meal", reward: "+3 VT per log", desc: "Camera food logging" },
  { emoji: "⌚", title: "Sync Wearable", reward: "+2 VT per sync", desc: "Keep devices connected" },
  { emoji: "🧬", title: "Complete Panel", reward: "+100 VT", desc: "Order a GeneX360 panel" },
];

const earnHistory = [
  { amount: "+5 VT", desc: "Took MTHFR+ (morning)", time: "Today, 8:15 AM" },
  { amount: "+5 VT", desc: "Took NAD+ (morning)", time: "Today, 8:20 AM" },
  { amount: "+3 VT", desc: "Logged breakfast", time: "Today, 8:45 AM" },
  { amount: "+10 VT", desc: "High-intensity workout", time: "Yesterday" },
  { amount: "+25 VT", desc: "Connected Oura Ring", time: "Mar 24" },
  { amount: "+100 VT", desc: "GeneX-M panel completed", time: "Mar 20" },
];

const rewardStore = [
  { name: "10% Off Next Order", cost: "500 VT", desc: "Apply to any supplement purchase" },
  { name: "Free Shipping", cost: "250 VT", desc: "On your next order" },
  { name: "Premium AI Insights", cost: "1,000 VT", desc: "Unlock detailed genetic deep-dives" },
];

const achievements = [
  { emoji: "🏆", label: "First Panel", earned: true },
  { emoji: "🔥", label: "7-Day Streak", earned: true },
  { emoji: "💊", label: "100 Doses", earned: true },
  { emoji: "⌚", label: "Device Connected", earned: true },
  { emoji: "🧬", label: "All 6 Panels", earned: false },
  { emoji: "🏅", label: "30-Day Streak", earned: false },
];

export default function TokensPage() {
  return (
    <div className="min-h-screen p-6 lg:p-8 space-y-8" style={{ background: "var(--gradient-hero)" }}>
      {/* ── HERO SECTION ── */}
      <section className="text-center space-y-3">
        <div className="flex items-center justify-center gap-3">
          <span className="text-5xl">🪙</span>
          <h1 className="text-heading-1" style={{ color: "#B75E18" }}>
            ViaTokens
          </h1>
        </div>

        <div className="flex items-baseline justify-center gap-2">
          <span
            className="text-white"
            style={{ fontSize: "56px", fontWeight: 800, lineHeight: 1.1 }}
          >
            1,245
          </span>
          <span className="text-body-lg text-secondary">VT</span>
        </div>

        <div className="flex items-center justify-center gap-3 flex-wrap">
          <span className="text-body-sm text-white">🔥 12-day streak</span>
          <span
            className="px-2.5 py-0.5 rounded-full text-xs font-semibold"
            style={{ backgroundColor: "rgba(45,165,160,0.15)", color: "#2DA5A0" }}
          >
            2x multiplier active
          </span>
        </div>

        <div className="flex justify-center">
          <span
            className="px-3 py-1 rounded-full text-xs font-semibold"
            style={{ backgroundColor: "rgba(245,190,80,0.15)", color: "#F5BE50" }}
          >
            Gold Member
          </span>
        </div>
      </section>

      {/* ── HOW TO EARN ── */}
      <section className="space-y-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-secondary">
          How to Earn
        </p>
        <div className="grid grid-cols-2 gap-3">
          {earnCards.map((c) => (
            <div key={c.title} className="glass-v2 p-4 space-y-2">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
                style={{ backgroundColor: "rgba(45,165,160,0.12)" }}
              >
                {c.emoji}
              </div>
              <p className="text-sm font-bold text-white">{c.title}</p>
              <p className="text-sm font-semibold" style={{ color: "#2DA5A0" }}>
                {c.reward}
              </p>
              <p className="text-xs text-secondary">{c.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── EARN HISTORY ── */}
      <section className="space-y-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-secondary">
          Earn History
        </p>
        <div className="glass-v2 p-4 space-y-3">
          {earnHistory.map((e, i) => (
            <div
              key={i}
              className="flex items-start justify-between gap-3"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm">
                  <span className="font-semibold" style={{ color: "#2DA5A0" }}>
                    {e.amount}
                  </span>
                  <span className="text-white"> — {e.desc}</span>
                </p>
              </div>
              <span className="text-xs text-tertiary whitespace-nowrap">{e.time}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── REWARD STORE ── */}
      <section className="space-y-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-secondary">
          Reward Store
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {rewardStore.map((r) => (
            <div key={r.name} className="glass-v2 p-4 space-y-3">
              <Gift className="w-5 h-5" style={{ color: "#2DA5A0" }} />
              <p className="text-sm font-bold text-white">{r.name}</p>
              <p className="text-sm font-semibold" style={{ color: "#2DA5A0" }}>
                {r.cost}
              </p>
              <p className="text-xs text-secondary">{r.desc}</p>
              <button
                className="w-full py-1.5 rounded-lg text-xs font-semibold border transition-colors"
                style={{ borderColor: "#2DA5A0", color: "#2DA5A0" }}
              >
                Redeem
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* ── ACHIEVEMENTS ── */}
      <section className="space-y-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-secondary">
          Achievements
        </p>
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
          {achievements.map((a) => (
            <div
              key={a.label}
              className={`glass-v2 w-20 h-24 flex-shrink-0 flex flex-col items-center justify-center text-center rounded-xl ${
                a.earned
                  ? "border border-[#2DA5A0]/40"
                  : "border border-dashed border-white/20 opacity-50"
              }`}
              style={
                a.earned
                  ? { boxShadow: "0 0 12px rgba(45,165,160,0.25)" }
                  : undefined
              }
            >
              <span className="text-2xl">{a.emoji}</span>
              <span className="text-[10px] text-white mt-1 leading-tight px-1">
                {a.label}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
