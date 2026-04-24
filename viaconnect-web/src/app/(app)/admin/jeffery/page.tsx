/**
 * /admin/jeffery — Jeffery™ Command Center (Prompt #60c)
 *
 * Server shell: pre-fetches per-agent registry + heartbeats + tasks + first
 * agent's recent events, then hands off to the client tab container so the
 * "Agents" tab renders inline instead of requiring a separate page visit.
 */

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fetchCurrentTasks, fetchHeartbeats, fetchRecentEvents } from "@/lib/agents/activity-tracker";
import { orderedRegistry } from "@/lib/agents/registry";
import type { AgentActivityEvent } from "@/lib/agents/types";
import JefferyClient from "./JefferyClient";

export const dynamic = "force-dynamic";

export default async function JefferyCommandCenter() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?redirectTo=/admin/jeffery`);

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile || profile.role !== "admin") redirect("/");

  const registry = orderedRegistry();
  const [heartbeats, tasks] = await Promise.all([
    fetchHeartbeats(supabase),
    fetchCurrentTasks(supabase),
  ]);

  const firstAgentId = registry[0]?.agent_id;
  const initialEvents: AgentActivityEvent[] = firstAgentId
    ? await fetchRecentEvents(supabase, firstAgentId, 100)
    : [];

  return (
    <JefferyClient
      agentRegistry={registry}
      agentHeartbeats={heartbeats}
      agentTasks={tasks}
      agentInitialEvents={initialEvents}
    />
  );
}
