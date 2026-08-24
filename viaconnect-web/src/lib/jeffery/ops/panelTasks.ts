/**
 * Prompt 219L: ACC panel task lifecycle (jeffery_agent_panel_tasks).
 * Fail-open; never block job execution.
 */

import { createAdminClientOrNull } from "@/lib/supabase/admin";
import { safeLog } from "@/lib/utils/safe-log";
import { resolveOpsAgentId } from "./heartbeats";

export async function startPanelTask(args: {
  agentId: string;
  title: string;
  description?: string;
  jobKey: string;
  runId: string;
  priority?: "low" | "normal" | "high" | "critical";
}): Promise<string | null> {
  const agent = resolveOpsAgentId(args.agentId);
  if (!agent) return null;
  const supabase = createAdminClientOrNull();
  if (!supabase) return null;
  const now = new Date().toISOString();
  try {
    const { data, error } = await supabase
      .from("jeffery_agent_panel_tasks")
      .insert({
        agent_id: agent,
        task_title: args.title.slice(0, 200),
        task_description: (args.description ?? args.jobKey).slice(0, 500),
        task_status: "running",
        progress_percent: 5,
        priority: args.priority ?? "normal",
        assigned_by_agent_id: "jeffery",
        metadata: {
          job_key: args.jobKey,
          ops_run_id: args.runId,
          source: "ops_tick",
        },
        started_at: now,
        updated_at: now,
      })
      .select("id")
      .single();
    if (error) {
      safeLog.warn("ops.panelTask", "start failed", {
        agent,
        code: error.code,
        message: error.message,
      });
      return null;
    }
    return (data as { id?: string } | null)?.id ?? null;
  } catch (err) {
    safeLog.warn("ops.panelTask", "start threw", {
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

export async function completePanelTask(args: {
  taskId: string | null;
  status: "completed" | "failed" | "cancelled";
  progress?: number;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  if (!args.taskId) return;
  const supabase = createAdminClientOrNull();
  if (!supabase) return;
  const now = new Date().toISOString();
  try {
    await supabase
      .from("jeffery_agent_panel_tasks")
      .update({
        task_status: args.status,
        progress_percent:
          args.progress ?? (args.status === "completed" ? 100 : 0),
        completed_at: now,
        updated_at: now,
        metadata: args.metadata ?? {},
      })
      .eq("id", args.taskId);
  } catch (err) {
    safeLog.warn("ops.panelTask", "complete threw", {
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
