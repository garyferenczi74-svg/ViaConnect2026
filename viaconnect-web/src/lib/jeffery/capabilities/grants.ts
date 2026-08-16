/**
 * Prompt 219G: permission matrix reads.
 * Static fallback matches migration seed so registry works before DB apply.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { safeLog } from "@/lib/utils/safe-log";
import {
  CAPABILITY_IDS,
  CORE_SEVEN_AGENTS,
  type CapabilityAgentId,
  type CapabilityId,
} from "./types";

/** In-memory grant cache for the process lifetime (fail-open to static seed). */
const staticGrants = new Set<string>();
for (const agent of CORE_SEVEN_AGENTS) {
  for (const cap of CAPABILITY_IDS) {
    staticGrants.add(`${agent}:${cap}`);
  }
}

let dbLoaded = false;
const dbGrants = new Set<string>();

function grantKey(agent: string, capability: string): string {
  return `${agent.trim().toLowerCase()}:${capability}`;
}

export async function refreshGrantsFromDb(): Promise<void> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("agent_capabilities")
      .select("agent_id, capability_id, granted")
      .eq("granted", true);
    if (error) {
      safeLog.warn("capability.grants", "db read failed; using static seed", {
        error: error.message,
      });
      dbLoaded = false;
      return;
    }
    dbGrants.clear();
    for (const row of data ?? []) {
      const a = String((row as { agent_id?: string }).agent_id ?? "");
      const c = String((row as { capability_id?: string }).capability_id ?? "");
      if (a && c) dbGrants.add(grantKey(a, c));
    }
    dbLoaded = true;
  } catch (err) {
    safeLog.warn("capability.grants", "threw; static seed", {
      error: err instanceof Error ? err.message : String(err),
    });
    dbLoaded = false;
  }
}

export async function isCapabilityGranted(
  agent: CapabilityAgentId,
  capability: CapabilityId
): Promise<boolean> {
  if (!dbLoaded) {
    await refreshGrantsFromDb();
  }
  const key = grantKey(String(agent), capability);
  if (dbLoaded && dbGrants.size > 0) return dbGrants.has(key);
  return staticGrants.has(key);
}

export function listStaticMatrix(): Array<{ agent_id: string; capability_id: string; granted: boolean }> {
  const rows: Array<{ agent_id: string; capability_id: string; granted: boolean }> = [];
  for (const agent of CORE_SEVEN_AGENTS) {
    for (const cap of CAPABILITY_IDS) {
      rows.push({ agent_id: agent, capability_id: cap, granted: true });
    }
  }
  return rows;
}

export async function listGrantMatrix(): Promise<
  Array<{ agent_id: string; capability_id: string; granted: boolean }>
> {
  await refreshGrantsFromDb();
  if (dbLoaded && dbGrants.size > 0) {
    return Array.from(dbGrants).map((k) => {
      const [agent_id, capability_id] = k.split(":");
      return { agent_id, capability_id, granted: true };
    });
  }
  return listStaticMatrix();
}
