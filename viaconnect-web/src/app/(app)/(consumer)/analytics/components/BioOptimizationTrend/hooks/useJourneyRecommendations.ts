import { useMemo } from "react";

export type JourneyRec = {
  id: string;
  title: string;
  description: string;
  category: string;
  estimatedImpact: number;
  icon: "sleep" | "nutrition" | "movement" | "stress" | "supplement";
};

export function useJourneyRecommendations(current: number): JourneyRec[] {
  return useMemo(() => {
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
        description: "Bioavailable EPA/DHA at 10 to 27 times absorption, paired with breakfast.",
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
  }, [current]);
}
