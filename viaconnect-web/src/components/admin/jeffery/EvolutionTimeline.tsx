"use client";

import { useState, useEffect } from "react";
import { TrendingUp, GraduationCap } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface EvoEntry {
  id: string;
  entry_type: string;
  agent_name: string | null;
  metric_name: string | null;
  metric_value: number | null;
  rolling_30d_avg: number | null;
  delta_pct: number | null;
  population_size: number | null;
  payload: Record<string, unknown>;
  notes: string | null;
  created_at: string;
}

interface LearningEntry {
  id: string;
  source_type: string;
  lesson: string;
  lesson_category: string | null;
  applied_to_agents: string[] | null;
  created_at: string;
}

type Combined = ({ kind: "evolution" } & EvoEntry) | ({ kind: "learning" } & LearningEntry);

export default function EvolutionTimeline() {
  const [items, setItems] = useState<Combined[]>([]);
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const [{ data: evo }, { data: learn }] = await Promise.all([
        supabase
          .from("ultrathink_jeffery_evolution")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(50),
        supabase
          .from("jeffery_learning_log")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(50),
      ]);
      const merged: Combined[] = [
        ...((evo ?? []) as EvoEntry[]).map(e => ({ kind: "evolution" as const, ...e })),
        ...((learn ?? []) as LearningEntry[]).map(l => ({ kind: "learning" as const, ...l })),
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setItems(merged.slice(0, 80));
    }
    load();
  }, [supabase]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <TrendingUp className="w-4 h-4 text-emerald-400" strokeWidth={1.5} />
        <h3 className="text-sm font-semibold text-white">Evolution Timeline</h3>
        <span className="text-xs text-white/30">last {items.length} events</span>
      </div>

      {items.length === 0 && (
        <div className="text-center text-white/30 text-sm py-12">
          No evolution events yet. Jeffery&rsquo;s weekly review runs Sundays at 2 AM UTC.
        </div>
      )}

      {/* Vertical timeline */}
      <div className="relative pl-6">
        <div className="absolute left-2 top-2 bottom-2 w-px bg-white/[0.08]" />
        {items.map((item) => {
          const isLearn = item.kind === "learning";
          const dotColor = isLearn ? "bg-[#B75E18]" : "bg-emerald-500";
          return (
            <div key={`${item.kind}-${item.id}`} className="relative mb-4">
              <div className={`absolute -left-[18px] top-2 w-2.5 h-2.5 rounded-full ${dotColor}`} />
              <div className="bg-[#1E3054] rounded-lg border border-white/[0.08] p-3">
                <div className="flex items-center gap-2 flex-wrap">
                  {isLearn ? (
                    <GraduationCap className="w-3.5 h-3.5 text-[#B75E18]" strokeWidth={1.5} />
                  ) : (
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-400" strokeWidth={1.5} />
                  )}
                  <span className="text-xs font-semibold text-white">
                    {isLearn ? item.source_type.replace(/_/g, " ") : item.entry_type.replace(/_/g, " ")}
                  </span>
                  {!isLearn && item.agent_name && (
                    <span className="text-[10px] text-white/40">{item.agent_name}</span>
                  )}
                  <span className="text-[10px] text-white/30 ml-auto">
                    {new Date(item.created_at).toLocaleString()}
                  </span>
                </div>
                {isLearn ? (
                  <p className="text-xs text-white/60 mt-1">{item.lesson}</p>
                ) : (
                  <>
                    {item.metric_name && (
                      <p className="text-xs text-white/60 mt-1">
                        {item.metric_name}: {item.metric_value?.toFixed(2) ?? "n/a"}
                        {item.rolling_30d_avg != null && (
                          <span className="text-white/30"> &nbsp;(30d avg {item.rolling_30d_avg.toFixed(2)}, {item.delta_pct != null ? `${item.delta_pct > 0 ? "+" : ""}${item.delta_pct.toFixed(1)}%` : "n/a"})</span>
                        )}
                      </p>
                    )}
                    {item.notes && <p className="text-xs text-white/50 mt-1">{item.notes}</p>}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
