import { createClient } from "@/lib/supabase/client";

export interface DisplayNameSource {
  fullName?: string | null;
  metadataName?: string | null;
  email?: string | null;
}

/**
 * Resolve a consumer first name for greetings.
 *
 * Order: first token of full name, first token of metadata name,
 * email local-part, then empty string.
 *
 * Never returns "there". An empty string means the greeting should
 * render without a name (e.g. "Good morning" not "Good morning, there").
 */
export function resolveDisplayName(source: DisplayNameSource): string {
  const fromFull = firstToken(source.fullName);
  if (fromFull) return fromFull;

  const fromMeta = firstToken(source.metadataName);
  if (fromMeta) return fromMeta;

  const local = emailLocalPart(source.email);
  if (local) return local;

  return "";
}

export function formatPersonalGreeting(periodGreeting: string, displayName: string): string {
  const name = displayName.trim();
  if (!name) return periodGreeting;
  return `${periodGreeting}, ${name}`;
}

function firstToken(value: string | null | undefined): string {
  if (!value) return "";
  const token = value.trim().split(/\s+/)[0] ?? "";
  if (!token || token.toLowerCase() === "there") return "";
  return token;
}

function emailLocalPart(email: string | null | undefined): string {
  if (!email) return "";
  const local = email.split("@")[0]?.trim() ?? "";
  if (!local || local.toLowerCase() === "there") return "";
  return local;
}

export async function getDisplayName(): Promise<string> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return "";

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single();

  const metadataName =
    (typeof user.user_metadata?.full_name === "string" && user.user_metadata.full_name) ||
    (typeof user.user_metadata?.name === "string" && user.user_metadata.name) ||
    null;

  return resolveDisplayName({
    fullName: profile?.full_name ?? null,
    metadataName,
    email: user.email ?? null,
  });
}
