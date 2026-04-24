"use client";

/**
 * /admin/jeffery — Jeffery™ Command Center (Prompt #60c)
 *
 * Tabbed admin page giving Gary human-in-the-loop control over Jeffery:
 *   1. Live Feed         — realtime stream of every Jeffery message
 *   2. Review Queue      — pending + flagged messages awaiting approval
 *   3. Steering          — high-level directives sent to Jeffery
 *   4. Evolution         — weekly evolution snapshots + learning log
 *   5. Knowledge         — every fact Jeffery has ingested, with verify action
 */

import { useState } from "react";
import Link from "next/link";
import { Cpu, Radio, ClipboardCheck, Compass, Brain, Database, Users } from "lucide-react";
import LiveFeed from "@/components/admin/jeffery/LiveFeed";
import ReviewQueue from "@/components/admin/jeffery/ReviewQueue";
import SteeringConsole from "@/components/admin/jeffery/SteeringConsole";
import EvolutionTimeline from "@/components/admin/jeffery/EvolutionTimeline";
import KnowledgeExplorer from "@/components/admin/jeffery/KnowledgeExplorer";

const TABS = [
  { id: "feed",      label: "Live Feed",      icon: Radio },
  { id: "review",    label: "Review Queue",   icon: ClipboardCheck },
  { id: "steer",     label: "Steering",       icon: Compass },
  { id: "evolution", label: "Evolution",      icon: Brain },
  { id: "knowledge", label: "Knowledge",      icon: Database },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function JefferyCommandCenter() {
  const [activeTab, setActiveTab] = useState<TabId>("feed");
  const [pendingCount, setPendingCount] = useState(0);

  return (
    <div className="min-h-screen bg-[#1A2744]">
      {/* Header */}
      <div className="px-4 md:px-8 py-4 md:py-5 border-b border-white/[0.08]">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="w-10 h-10 rounded-xl bg-[#B75E18]/20 border border-[#B75E18]/33 flex items-center justify-center flex-shrink-0">
            <Cpu className="w-5 h-5 text-[#B75E18]" strokeWidth={1.5} />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg md:text-xl font-bold text-white">Jeffery™ Command Center</h1>
            <p className="text-xs text-white/40">Self-Evolution Engine — Human-in-the-Loop Intelligence</p>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <Link
              href="/admin/jeffery/agents"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 text-white/70 hover:bg-white/10"
            >
              <Users className="w-3.5 h-3.5" strokeWidth={1.5} />
              Agents
            </Link>
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
              </span>
              <span className="text-xs text-emerald-400 font-medium">Jeffery Online</span>
            </div>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 mt-4 overflow-x-auto">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm font-medium transition-all whitespace-nowrap ${
                  active ? "bg-white/10 text-white" : "text-white/40 hover:text-white/60 hover:bg-white/5"
                }`}
              >
                <Icon className="w-4 h-4" strokeWidth={1.5} />
                {tab.label}
                {tab.id === "review" && pendingCount > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 rounded-full bg-[#B75E18] text-white text-[10px] font-bold">
                    {pendingCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab content */}
      <div className="px-4 md:px-8 py-6">
        {activeTab === "feed"      && <LiveFeed />}
        {activeTab === "review"    && <ReviewQueue onCountChange={setPendingCount} />}
        {activeTab === "steer"     && <SteeringConsole />}
        {activeTab === "evolution" && <EvolutionTimeline />}
        {activeTab === "knowledge" && <KnowledgeExplorer />}
      </div>
    </div>
  );
}
