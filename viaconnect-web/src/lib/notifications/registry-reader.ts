// Prompt #112 — Registry reader with in-memory cache.
// Registry rows are effectively immutable during a dispatcher run; caching
// by event_code keeps the dispatcher hot-path cheap.

import { createAdminClient } from "@/lib/supabase/admin";
import type { RegistryEntry } from "./types";

let cache: Map<string, RegistryEntry> | null = null;
let cachedAt = 0;
const CACHE_TTL_MS = 60_000;

async function loadRegistry(): Promise<Map<string, RegistryEntry>> {
  const admin = createAdminClient();
  const { data, error } = await admin.from("notification_event_registry").select("*");
  if (error || !data) {
    // eslint-disable-next-line no-console
    console.error("[registry] failed to load:", error?.message);
    return new Map();
  }
  const map = new Map<string, RegistryEntry>();
  for (const row of data as RegistryEntry[]) map.set(row.event_code, row);
  return map;
}

export async function getRegistry(): Promise<Map<string, RegistryEntry>> {
  const now = Date.now();
  if (!cache || now - cachedAt > CACHE_TTL_MS) {
    cache = await loadRegistry();
    cachedAt = now;
  }
  return cache;
}

export async function getEvent(eventCode: string): Promise<RegistryEntry | null> {
  const m = await getRegistry();
  return m.get(eventCode) ?? null;
}

export function invalidateRegistry(): void {
  cache = null;
  cachedAt = 0;
}
