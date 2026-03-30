import { createClient } from "@/lib/supabase/client";

export async function getDisplayName(): Promise<string> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return "there";

  // 1. Try profiles.full_name
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single();

  if (profile?.full_name) return profile.full_name.split(" ")[0];

  // 2. Try auth user_metadata
  if (user.user_metadata?.full_name) return user.user_metadata.full_name.split(" ")[0];
  if (user.user_metadata?.name) return user.user_metadata.name.split(" ")[0];

  // 3. Try email prefix
  if (user.email) return user.email.split("@")[0];

  return "there";
}
