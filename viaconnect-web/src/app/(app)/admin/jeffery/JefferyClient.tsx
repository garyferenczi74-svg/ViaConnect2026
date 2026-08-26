"use client";

/**
 * JefferyClient — client shell for /admin/jeffery.
 * Prompt 219I: every tab/panel wrapped in AdminPanelErrorBoundary so one
 * failure cannot crash the Command Center shell.
 */

import { useEffect, useState } from "react";
import { Cpu, Radio, ClipboardCheck, Compass, Brain, Database, Users, Zap, Activity, FlaskConical } from "lucide-react";
import LiveFeed from "@/components/admin/jeffery/LiveFeed";
import ReviewQueue from "@/components/admin/jeffery/ReviewQueue";
import SteeringConsole from "@/components/admin/jeffery/SteeringConsole";
import EvolutionTimeline from "@/components/admin/jeffery/EvolutionTimeline";
import KnowledgeExplorer from "@/components/admin/jeffery/KnowledgeExplorer";
import CapabilityUsagePanel from "@/components/admin/jeffery/CapabilityUsagePanel";
import ContinuousOpsPanel from "@/components/admin/jeffery/ContinuousOpsPanel";
import JefferyReviewDesk from "@/components/admin/jeffery/JefferyReviewDesk";
import CurationOpsPanel from "@/components/admin/jeffery/CurationOpsPanel";
import { AdminPanel } from "@/components/admin/AdminPanelErrorBoundary";
import AgentsClient from "./agents/AgentsClient";
import type {
  AgentActivityEvent,
  AgentCurrentTask,
  AgentHeartbeat,
  AgentRegistryRow,
} from "@/lib/agents/types";

const TABS = [
  { id: "feed", label: "Live Feed", icon: Radio },
  { id: "agents", label: "Agents", icon: Users },
  { id: "caps", label: "Capabilities", icon: Zap },
  { id: "ops", label: "Ops 24/7", icon: Activity },
  { id: "kb-review", label: "KB Review", icon: ClipboardCheck },
  { id: "curation", label: "Curation", icon: FlaskConical },
  { id: "review", label: "Review Queue", icon: ClipboardCheck },
  { id: "steer", label: "Steering", icon: Compass },
  { id: "evolution", label: "Evolution", icon: Brain },
  { id: "knowledge", label: "Knowledge", icon: Database },
] as const;

type TabId = (typeof TABS)[number]["id"];

interface JefferyClientProps {
  agentRegistry: AgentRegistryRow[];
  agentHeartbeats: AgentHeartbeat[];
  agentTasks: AgentCurrentTask[];
  agentInitialEvents: AgentActivityEvent[];
}

export default function JefferyClient({
  agentRegistry,
  agentHeartbeats,
  agentTasks,
  agentInitialEvents,
}: JefferyClientProps) {
  const [activeTab, setActiveTab] = useState<TabId>("feed");
  const [pendingCount, setPendingCount] = useState(0);
  const [curationQueueDepth, setCurationQueueDepth] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/jeffery/curation-ops", {
          credentials: "same-origin",
        });
        if (!res.ok || cancelled) return;
        const json = await res.json();
        if (!cancelled && json?.ok && typeof json.queueDepth === "number") {
          setCurationQueueDepth(json.queueDepth);
        }
      } catch {
        // Badge is best-effort; panel loads its own data.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#1A2744]">
      {/* Header — always renders (shell guarantee) */}
      <div className="px-4 md:px-8 py-4 md:py-5 border-b border-white/[0.08]">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="w-10 h-10 rounded-xl bg-[#B75E18]/20 border border-[#B75E18]/33 flex items-center justify-center flex-shrink-0">
            <Cpu className="w-5 h-5 text-[#B75E18]" strokeWidth={1.5} />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg md:text-xl font-bold text-white">Jeffery Command Center</h1>
            <p className="text-xs text-white/40">
              Self-Evolution Engine, Human-in-the-Loop Intelligence
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>
            <span className="text-xs text-emerald-400 font-medium">Jeffery Online</span>
          </div>
        </div>

        <div
          role="tablist"
          aria-label="Jeffery Command Center tabs"
          className="flex gap-1 mt-4 overflow-x-auto"
        >
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const selected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                id={`jeffery-tab-${tab.id}`}
                aria-selected={selected}
                aria-controls={`jeffery-tab-panel-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs md:text-sm whitespace-nowrap transition-colors ${
                  selected
                    ? "bg-white/10 text-white"
                    : "text-white/50 hover:text-white/80 hover:bg-white/5"
                }`}
              >
                <Icon className="w-3.5 h-3.5" strokeWidth={1.5} />
                {tab.label}
                {tab.id === "review" && pendingCount > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 rounded-full bg-[#B75E18] text-white text-[10px] font-bold">
                    {pendingCount}
                  </span>
                )}
                {tab.id === "curation" && curationQueueDepth > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 rounded-full bg-[#2DA5A0] text-white text-[10px] font-bold">
                    {curationQueueDepth}
                  </span>
                )}
                {tab.id === "agents" && (
                  <span className="ml-1 px-1.5 py-0.5 rounded-full bg-white/10 text-white/70 text-[10px] font-semibold">
                    {/* Brief 39: ACC seats only. Do not bind this digit to ultrathink. */}
                    {agentRegistry.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div
        id={`jeffery-tab-panel-${activeTab}`}
        role="tabpanel"
        aria-labelledby={`jeffery-tab-${activeTab}`}
        className={
          activeTab === "agents" ||
          activeTab === "caps" ||
          activeTab === "ops" ||
          activeTab === "kb-review" ||
          activeTab === "curation"
            ? ""
            : "px-4 md:px-8 py-6"
        }
      >
        {activeTab === "feed" && (
          <AdminPanel name="Live Feed">
            <LiveFeed />
          </AdminPanel>
        )}
        {activeTab === "review" && (
          <AdminPanel name="Review Queue">
            <ReviewQueue onCountChange={setPendingCount} />
          </AdminPanel>
        )}
        {activeTab === "steer" && (
          <AdminPanel name="Steering">
            <SteeringConsole />
          </AdminPanel>
        )}
        {activeTab === "evolution" && (
          <AdminPanel name="Evolution">
            <EvolutionTimeline />
          </AdminPanel>
        )}
        {activeTab === "knowledge" && (
          <AdminPanel name="Knowledge">
            <KnowledgeExplorer />
          </AdminPanel>
        )}
        {activeTab === "caps" && (
          <div className="px-0 md:px-4">
            <AdminPanel name="Capabilities">
              <CapabilityUsagePanel />
            </AdminPanel>
          </div>
        )}
        {activeTab === "ops" && (
          <div className="px-0 md:px-4">
            <AdminPanel name="Ops 24/7">
              <ContinuousOpsPanel />
            </AdminPanel>
          </div>
        )}
        {activeTab === "kb-review" && (
          <AdminPanel name="KB Review Desk">
            <JefferyReviewDesk />
          </AdminPanel>
        )}
        {activeTab === "curation" && (
          <AdminPanel name="Curation Ops">
            <CurationOpsPanel />
          </AdminPanel>
        )}
        {activeTab === "agents" && (
          <AdminPanel name="Agents">
            <AgentsClient
              embedded
              initialRegistry={agentRegistry}
              initialHeartbeats={agentHeartbeats}
              initialTasks={agentTasks}
              initialEvents={agentInitialEvents}
            />
          </AdminPanel>
        )}
      </div>
    </div>
  );
}
