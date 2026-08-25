/**
 * /admin/jeffery — Jeffery Command Center (Prompt #60c; Prompt 219I harden)
 *
 * Server shell: pre-fetches registry + heartbeats + tasks + first agent events.
 * Fail-open: empty operational data never crashes the shell.
 */

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fetchCurrentTasks, fetchHeartbeats, fetchRecentEvents } from "@/lib/agents/activity-tracker";
import { orderedRegistry } from "@/lib/agents/registry";
import type { AgentActivityEvent, AgentCurrentTask, AgentHeartbeat } from "@/lib/agents/types";
import { safeLog } from "@/lib/utils/safe-log";
import JefferyClient from "./JefferyClient";

export const dynamic = "force-dynamic";

export default async function JefferyCommandCenter() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?redirectTo=/admin/jeffery`);

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile || profile.role !== "admin") redirect("/");

  const registry = orderedRegistry();

  try {
    const { ensureAllAccOpsRowsPersisted } = await import(
      "@/lib/agents/command-center-ingest"
    );
    await ensureAllAccOpsRowsPersisted();
  } catch (err) {
    safeLog.warn("admin.jeffery.page", "acc ops ensure failed open", {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  let heartbeats: AgentHeartbeat[] = [];
  let tasks: AgentCurrentTask[] = [];
  let initialEvents: AgentActivityEvent[] = [];

  try {
    const [hb, tk] = await Promise.all([
      fetchHeartbeats(supabase),
      fetchCurrentTasks(supabase),
    ]);
    heartbeats = hb;
    tasks = tk;
  } catch (err) {
    safeLog.error("admin.jeffery.page", "activity prefetch failed open", {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  const firstAgentId = registry[0]?.agent_id;
  if (firstAgentId) {
    try {
      initialEvents = await fetchRecentEvents(supabase, firstAgentId, 100);
    } catch (err) {
      safeLog.warn("admin.jeffery.page", "events prefetch failed open", {
        error: err instanceof Error ? err.message : String(err),
      });
      initialEvents = [];
    }
  }

  return (
    <JefferyClient
      agentRegistry={registry}
      agentHeartbeats={heartbeats}
      agentTasks={tasks}
      agentInitialEvents={initialEvents}
    />
  );
}
