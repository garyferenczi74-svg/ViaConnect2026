"use client";

import { motion } from "framer-motion";
import { ChevronDown, ChevronRight, MessageSquare } from "lucide-react";
import {
  DatabaseZap, BookOpen, BrainCircuit, Settings2, TrendingUp,
  MessageCircle, AlertTriangle, Users, AlertOctagon, Search,
} from "lucide-react";

export const CATEGORY_CONFIG: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  data_ingestion:    { icon: DatabaseZap,   color: "#2DA5A0", label: "Data Ingestion" },
  knowledge_update:  { icon: BookOpen,      color: "#3B82F6", label: "Knowledge Update" },
  agent_decision:    { icon: BrainCircuit,  color: "#8B5CF6", label: "Agent Decision" },
  self_tune:         { icon: Settings2,     color: "#B75E18", label: "Self-Tune" },
  evolution_report:  { icon: TrendingUp,    color: "#10B981", label: "Evolution Report" },
  advisor_insight:   { icon: MessageCircle, color: "#06B6D4", label: "Advisor Insight" },
  interaction_alert: { icon: AlertTriangle, color: "#F59E0B", label: "Interaction Alert" },
  population_trend:  { icon: Users,         color: "#6366F1", label: "Population Trend" },
  error_escalation:  { icon: AlertOctagon,  color: "#EF4444", label: "Error Escalation" },
  research_task:     { icon: Search,        color: "rgba(255,255,255,0.6)", label: "Research Task" },
};

export const SEVERITY_BADGE: Record<string, { bg: string; text: string }> = {
  info:            { bg: "bg-white/10",      text: "text-white/50" },
  advisory:        { bg: "bg-blue-500/15",   text: "text-blue-400" },
  review_required: { bg: "bg-orange-500/15", text: "text-orange-400" },
  critical:        { bg: "bg-red-500/15",    text: "text-red-400" },
};

export interface JefferyMessage {
  id: string;
  category: string;
  severity: string;
  title: string;
  summary: string;
  detail: Record<string, unknown>;
  source_agent: string | null;
  status: string;
  proposed_action: Record<string, unknown> | null;
  applied_action: Record<string, unknown> | null;
  created_at: string;
  jeffery_message_comments?: Array<{ id: string; content: string; is_directive: boolean; created_at: string }>;
}

interface MessageCardProps {
  msg: JefferyMessage;
  expanded: boolean;
  onToggle: () => void;
  children?: React.ReactNode;
}

export default function MessageCard({ msg, expanded, onToggle, children }: MessageCardProps) {
  const cfg = CATEGORY_CONFIG[msg.category] ?? CATEGORY_CONFIG.data_ingestion;
  const sev = SEVERITY_BADGE[msg.severity] ?? SEVERITY_BADGE.info;
  const Icon = cfg.icon;
  const commentCount = msg.jeffery_message_comments?.length ?? 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#1E3054] rounded-xl border border-white/[0.08] overflow-hidden"
    >
      <button
        onClick={onToggle}
        className="w-full flex items-start gap-3 p-3 md:p-4 text-left hover:bg-white/[0.03] transition-colors"
      >
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
          style={{ background: `${cfg.color}15`, border: `1px solid ${cfg.color}33` }}
        >
          <Icon className="w-4 h-4" style={{ color: cfg.color }} strokeWidth={1.5} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-white">{msg.title}</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${sev.bg} ${sev.text}`}>
              {msg.severity.replace("_", " ")}
            </span>
            {msg.status === "pending" && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-500/20 text-orange-300">
                AWAITING REVIEW
              </span>
            )}
            {msg.status === "auto_applied" && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300">
                AUTO-APPLIED
              </span>
            )}
          </div>
          <p className="text-xs text-white/50 mt-1 line-clamp-2">{msg.summary}</p>
          <div className="flex items-center gap-3 mt-2 text-[10px] text-white/30 flex-wrap">
            <span>{cfg.label}</span>
            {msg.source_agent && <span>{msg.source_agent}</span>}
            <span>{new Date(msg.created_at).toLocaleString()}</span>
            {commentCount > 0 && (
              <span className="flex items-center gap-1">
                <MessageSquare className="w-3 h-3" strokeWidth={1.5} />
                {commentCount}
              </span>
            )}
          </div>
        </div>
        {expanded
          ? <ChevronDown className="w-4 h-4 text-white/30 flex-shrink-0 mt-1" strokeWidth={1.5} />
          : <ChevronRight className="w-4 h-4 text-white/30 flex-shrink-0 mt-1" strokeWidth={1.5} />}
      </button>
      {expanded && children}
    </motion.div>
  );
}
