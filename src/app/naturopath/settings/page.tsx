"use client";

import { useState } from "react";
import {
  User,
  Bell,
  Plug,
  LayoutTemplate,
  ShieldCheck,
  CreditCard,
  Upload,
  Leaf,
} from "lucide-react";

/* ───────── Data ───────── */

const tabs = [
  { key: "profile", label: "Profile", icon: User },
  { key: "notifications", label: "Notifications", icon: Bell },
  { key: "integrations", label: "Integrations", icon: Plug },
  { key: "templates", label: "Templates", icon: LayoutTemplate },
  { key: "security", label: "Security", icon: ShieldCheck },
  { key: "billing", label: "Billing", icon: CreditCard },
] as const;

const notifCategories = [
  { label: "Interaction Warnings", desc: "Drug-supplement interaction alerts", key: "interactions" },
  { label: "Outcome Reminders", desc: "Protocol outcome assessment due dates", key: "outcomes" },
  { label: "Lab Results", desc: "New lab results available for review", key: "labs" },
  { label: "Patient Messages", desc: "Incoming messages from patients", key: "messages" },
  { label: "AI Recommendations", desc: "New AI-generated clinical suggestions", key: "ai" },
];

const frequencies = ["Real-time", "Daily Digest", "Weekly Summary"] as const;

/* ───────── Toggle ───────── */

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={`relative w-10 h-5 rounded-full transition-colors duration-200 ${on ? "bg-green-400" : "bg-gray-700"}`}
    >
      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${on ? "translate-x-5" : "translate-x-0.5"}`} />
    </button>
  );
}

/* ───────── Page ───────── */

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("profile");
  const [notifToggles, setNotifToggles] = useState<Record<string, boolean>>({
    interactions: true, outcomes: true, labs: true, messages: true, ai: false,
  });
  const [frequency, setFrequency] = useState("Real-time");

  const toggleNotif = (key: string) =>
    setNotifToggles((p) => ({ ...p, [key]: !p[key] }));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Settings</h1>

      <div className="flex gap-6">
        {/* ── Left Nav ── */}
        <div className="hidden md:block w-64 shrink-0">
          <nav className="sticky top-4 space-y-0.5">
            {tabs.map((t) => {
              const Icon = t.icon;
              const active = activeTab === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => setActiveTab(t.key)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                    active
                      ? "bg-green-400/10 text-green-400 border-l-2 border-green-400"
                      : "text-white/60 hover:text-white hover:bg-gray-800/50 border-l-2 border-transparent"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {t.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Mobile tabs */}
        <div className="md:hidden w-full">
          <div className="flex gap-1 overflow-x-auto pb-2 mb-4">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                  activeTab === t.key ? "bg-green-400 text-gray-900" : "text-white/50 bg-gray-800/50"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Content Panel ── */}
        <div className="flex-1 min-w-0">
          {/* Profile */}
          {activeTab === "profile" && (
            <div className="bg-gray-800/50 backdrop-blur-sm border border-green-400/15 rounded-xl p-6 space-y-6">
              <h2 className="text-lg font-semibold text-white">Practice Profile</h2>

              {/* Avatar */}
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-full bg-green-400/20 flex items-center justify-center text-green-400 text-2xl font-bold">
                  SC
                </div>
                <button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-700/50 text-sm text-white/60 hover:text-white hover:bg-gray-700/30 transition-colors">
                  <Upload className="w-4 h-4" /> Upload Photo
                </button>
              </div>

              {/* Form */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { label: "Practice Name", value: "Chen Naturopathic Wellness", full: true },
                  { label: "NPI Number", value: "1234567890" },
                  { label: "License Number", value: "ND-CA-2019-4521" },
                  { label: "Specialties", value: "Genomic Medicine, Methylation, GI Health" },
                  { label: "Phone", value: "(555) 234-5678" },
                  { label: "Email", value: "dr.chen@viaconnect.health" },
                ].map((f) => (
                  <div key={f.label} className={f.full ? "md:col-span-2" : ""}>
                    <label className="text-xs text-white/40 uppercase tracking-wider font-bold block mb-1.5">
                      {f.label}
                    </label>
                    <input
                      defaultValue={f.value}
                      className="w-full bg-gray-800/50 border border-gray-600/50 focus:border-green-400/50 rounded-lg px-4 py-2.5 text-sm text-white outline-none focus:ring-1 focus:ring-green-400/20 transition-all"
                    />
                  </div>
                ))}
                <div className="md:col-span-2">
                  <label className="text-xs text-white/40 uppercase tracking-wider font-bold block mb-1.5">Bio</label>
                  <textarea
                    rows={3}
                    defaultValue="Board-certified Naturopathic Doctor specializing in genomic-informed integrative medicine. Focus on methylation disorders, adrenal health, and gut-brain axis optimization."
                    className="w-full bg-gray-800/50 border border-gray-600/50 focus:border-green-400/50 rounded-lg px-4 py-2.5 text-sm text-white outline-none focus:ring-1 focus:ring-green-400/20 resize-none transition-all"
                  />
                </div>
              </div>

              {/* FarmCeutica Badge */}
              <div className="bg-green-400/10 border border-green-400/30 rounded-xl p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-green-400/20 flex items-center justify-center">
                  <Leaf className="w-5 h-5 text-green-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-white">FarmCeutica Partner</p>
                  <p className="text-xs text-white/50">Verified practitioner — access to full supplement formulary and AI dosing engine</p>
                </div>
                <span className="bg-green-400/20 text-green-400 text-[10px] font-bold px-3 py-1 rounded-full uppercase">
                  Active
                </span>
              </div>

              {/* Save */}
              <div className="flex justify-end">
                <button className="bg-green-400 hover:bg-green-500 text-gray-900 font-semibold px-6 py-2.5 rounded-lg transition-colors">
                  Save Changes
                </button>
              </div>
            </div>
          )}

          {/* Notifications */}
          {activeTab === "notifications" && (
            <div className="bg-gray-800/50 backdrop-blur-sm border border-green-400/15 rounded-xl p-6 space-y-6">
              <h2 className="text-lg font-semibold text-white">Notification Preferences</h2>

              {/* Categories */}
              <div className="space-y-1">
                {notifCategories.map((c) => (
                  <div key={c.key} className="flex items-center justify-between px-4 py-3 rounded-lg hover:bg-gray-700/20 transition-colors">
                    <div>
                      <p className="text-sm font-medium text-white">{c.label}</p>
                      <p className="text-xs text-white/40">{c.desc}</p>
                    </div>
                    <Toggle on={notifToggles[c.key]} onToggle={() => toggleNotif(c.key)} />
                  </div>
                ))}
              </div>

              {/* Frequency */}
              <div className="pt-4 border-t border-gray-700/50">
                <h3 className="text-sm font-semibold text-white mb-3">Delivery Frequency</h3>
                <div className="flex gap-2">
                  {frequencies.map((f) => (
                    <button
                      key={f}
                      onClick={() => setFrequency(f)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        frequency === f
                          ? "bg-green-400 text-gray-900"
                          : "text-white/50 border border-gray-700/50 hover:text-white"
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end">
                <button className="bg-green-400 hover:bg-green-500 text-gray-900 font-semibold px-6 py-2.5 rounded-lg transition-colors">
                  Save Preferences
                </button>
              </div>
            </div>
          )}

          {/* Placeholder tabs */}
          {!["profile", "notifications"].includes(activeTab) && (
            <div className="bg-gray-800/50 backdrop-blur-sm border border-green-400/15 rounded-xl p-12 text-center">
              <p className="text-white/40 text-sm capitalize">{activeTab} settings — coming soon</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
