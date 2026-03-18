import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Dashboard from "@/components/Dashboard";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const { data: tokens } = await supabase
    .from("farma_tokens")
    .select("balance")
    .eq("user_id", user.id)
    .single();

  const { data: streak } = await supabase
    .from("user_streaks")
    .select("current_streak, multiplier")
    .eq("user_id", user.id)
    .single();

  const { data: latestScore } = await supabase
    .from("health_scores")
    .select("score")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  const { data: metrics } = await supabase
    .from("health_metrics")
    .select("*")
    .eq("user_id", user.id)
    .order("metric_date", { ascending: false })
    .limit(1)
    .single();

  const { data: tasks } = await supabase
    .from("daily_tasks")
    .select("*")
    .eq("user_id", user.id)
    .eq("protocol_date", new Date().toISOString().split("T")[0])
    .order("created_at", { ascending: true });

  const { data: insight } = await supabase
    .from("ai_insights")
    .select("*")
    .eq("user_id", user.id)
    .order("generated_at", { ascending: false })
    .limit(1)
    .single();

  const firstName =
    profile?.username || profile?.full_name?.split(" ")[0] || "there";
  const avatarUrl = profile?.avatar_url ?? null;

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <Dashboard
      greeting={greeting}
      firstName={firstName}
      avatarUrl={avatarUrl}
      score={latestScore?.score ?? null}
      tokenBalance={tokens?.balance ?? 0}
      currentStreak={streak?.current_streak ?? 0}
      multiplier={streak?.multiplier ?? 1}
      metrics={metrics}
      tasks={tasks ?? []}
      insight={insight}
    />
  );
}
