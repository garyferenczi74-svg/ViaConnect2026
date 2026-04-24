import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fetchCurrentTasks, fetchHeartbeats, fetchRecentEvents } from "@/lib/agents/activity-tracker";
import { orderedRegistry } from "@/lib/agents/registry";
import AgentsClient from "./AgentsClient";
import type { AgentActivityEvent } from "@/lib/agents/types";

export const dynamic = "force-dynamic";

export default async function AgentsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?redirectTo=/admin/jeffery/agents`);

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
    <AgentsClient
      initialRegistry={registry}
      initialHeartbeats={heartbeats}
      initialTasks={tasks}
      initialEvents={initialEvents}
    />
  );
}
