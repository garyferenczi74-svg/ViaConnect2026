import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { seedJourneyRecommendations } from "../../../actions/hannah";

const supabase = createClient();

export type JourneyRec = {
  id: string;
  title: string;
  description: string;
  category: string;
  estimatedImpact: number;
  icon: "sleep" | "nutrition" | "movement" | "stress" | "supplement";
};

function buildDefaults(current: number): JourneyRec[] {
  const base: JourneyRec[] = [
    {
      id: "sleep-window",
      title: "Anchor Your Sleep Window",
      description: "Hold a 30 minute sleep/wake window for 7 days. Biggest single lift for Bio Optimization.",
      category: "Sleep",
      estimatedImpact: 8,
      icon: "sleep",
    },
    {
      id: "omega-stack",
      title: "Add Omega 3 Elite",
      description: "Bioavailable EPA/DHA at 10 to 28 times absorption, paired with breakfast.",
      category: "Supplement",
      estimatedImpact: 6,
      icon: "supplement",
    },
    {
      id: "zone-2",
      title: "Zone 2 Movement Block",
      description: "Three 25 minute easy sessions this week; mitochondrial density payoff shows in 14 days.",
      category: "Movement",
      estimatedImpact: 5,
      icon: "movement",
    },
    {
      id: "breath-reset",
      title: "Midday Breath Reset",
      description: "Five minute box breathing at the 2pm dip; measurable HRV bump by day three.",
      category: "Stress",
      estimatedImpact: 4,
      icon: "stress",
    },
  ];
  if (current < 55) {
    base.unshift({
      id: "foundation-stack",
      title: "Activate Foundation Stack",
      description: "Magnesium Glycinate plus Vitamin D3/K2 to restore the baseline your score needs.",
      category: "Supplement",
      estimatedImpact: 10,
      icon: "supplement",
    });
  }
  return base.slice(0, 4);
}

function parseIcon(rawCategory: string, fallback: JourneyRec["icon"]): {
  category: string;
  icon: JourneyRec["icon"];
} {
  // We store "Category|icon" in the DB so we can round-trip the icon name.
  const [category, iconPart] = rawCategory.split("|");
  const valid: JourneyRec["icon"][] = ["sleep", "nutrition", "movement", "stress", "supplement"];
  const icon = valid.includes(iconPart as JourneyRec["icon"]) ? (iconPart as JourneyRec["icon"]) : fallback;
  return { category: category || rawCategory, icon };
}

/**
 * DB-first journey recommendations. If none exist for the user, seeds the
 * template defaults once via a server action, then shows the defaults
 * immediately. Future iterations can replace the template with a real
 * recommender.
 */
export function useJourneyRecommendations(userId: string | null, current: number): JourneyRec[] {
  const defaults = useMemo(() => buildDefaults(current), [current]);

  const { data: dbRecs } = useQuery<JourneyRec[]>({
    queryKey: ["analytics-journey-recs", userId],
    enabled: !!userId,
    staleTime: 60_000,
    queryFn: async () => {
      const sb = supabase as any;
      const { data } = await sb
        .from("journey_recommendations")
        .select("id, title, description, category, estimated_impact, priority, expires_at")
        .eq("user_id", userId!)
        .eq("status", "active")
        .order("priority", { ascending: false })
        .order("estimated_impact", { ascending: false })
        .limit(4);

      const now = Date.now();
      const rows = (data ?? []).filter((r: any) => {
        if (!r.expires_at) return true;
        return new Date(r.expires_at).getTime() > now;
      });

      return rows.map((r: any, i: number) => {
        const { category, icon } = parseIcon(r.category, defaults[i]?.icon ?? "supplement");
        return {
          id: r.id,
          title: r.title,
          description: r.description,
          category,
          estimatedImpact: Number(r.estimated_impact),
          icon,
        };
      });
    },
  });

  const [seededKey, setSeededKey] = useState<string>("");

  useEffect(() => {
    if (!userId) return;
    if (dbRecs === undefined) return; // still loading
    if (dbRecs && dbRecs.length > 0) return;

    const key = `${userId}|${current < 55 ? "low" : "norm"}`;
    if (key === seededKey) return;
    setSeededKey(key);

    void seedJourneyRecommendations(
      defaults.map((d, i) => ({
        title: d.title,
        description: d.description,
        category: d.category,
        estimatedImpact: d.estimatedImpact,
        priority: defaults.length - i,
        icon: d.icon,
      })),
    );
  }, [userId, dbRecs, defaults, current, seededKey]);

  return dbRecs && dbRecs.length > 0 ? dbRecs : defaults;
}
