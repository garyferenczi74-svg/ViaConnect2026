import { useMemo } from "react";
import type { TimeRange, ScorePoint } from "../utils/trendCalculations";
import { trendDirection, tierFor } from "../utils/trendCalculations";

export type HannahInsight = {
  greeting: string;
  analysis: string;
  recommendation: string;
  focusArea: string;
  estimatedImpact: number;
};

type Params = {
  displayName: string;
  range: TimeRange;
  points: ScorePoint[];
  current: number;
  weeksActive: number;
};

export function useHannahInsights({ displayName, range, points, current, weeksActive }: Params): HannahInsight {
  return useMemo(() => {
    const direction = trendDirection(points);
    const tier = tierFor(current);
    const name = displayName || "there";

    const greetings: Record<TimeRange, string> = {
      "7D": `Hey ${name}, here is this week's read.`,
      "4W": `${name}, your four week pattern is emerging.`,
      "3M": `${name}, let's look at the last three months together.`,
      "1Y": `${name}, a full year of data tells a story.`,
    };

    let analysis = "";
    if (weeksActive < 2) {
      analysis = `You are building the first data points of your Bio Optimization journey. Early readings suggest a ${tier.name.toLowerCase()} baseline at ${current}. The next ten days of consistent check ins will unlock pattern detection.`;
    } else if (weeksActive < 8) {
      analysis =
        direction === "up"
          ? `Your score is trending upward, currently ${tier.name.toLowerCase()} at ${current}. Sleep and adherence look like the levers carrying the lift.`
          : direction === "down"
            ? `Your score has softened to ${current}, currently ${tier.name.toLowerCase()}. A dip in one category usually explains most of it; let's isolate it.`
            : `Your score is holding steady at ${current}, a ${tier.name.toLowerCase()} plateau. Plateaus are normal; the next step is a targeted push.`;
    } else if (weeksActive < 16) {
      analysis =
        direction === "up"
          ? `Two months of correlated gains. Sleep consistency and supplement adherence are the strongest predictors in your data right now, and they are compounding.`
          : `Two months of data lets us separate signal from noise. The underlying drivers for your ${current} score cluster around sleep quality and recovery load.`;
    } else {
      analysis = `Longitudinal view: your Bio Optimization trajectory has settled into a ${tier.name.toLowerCase()} band centered near ${current}. Seasonal and training cycles are now visible in the data.`;
    }

    let recommendation = "";
    let focusArea = "";
    let impact = 0;

    if (current < 55) {
      focusArea = "Sleep Recovery";
      recommendation = `Prioritize a consistent sleep window tonight; pair it with your evening Magnesium Glycinate dose for a ${range === "7D" ? "fast" : "durable"} lift.`;
      impact = 8;
    } else if (current < 75) {
      focusArea = "Nutrition Density";
      recommendation = `Add one whole food meal upgrade per day this week, paired with your Omega 3 Elite. Targeted, small wins compound at your tier.`;
      impact = 6;
    } else if (current < 90) {
      focusArea = "Stress Resilience";
      recommendation = `You are close to Optimal. A daily 10 minute breath protocol plus Ashwagandha Root Extract tends to be the bridge at this tier.`;
      impact = 5;
    } else {
      focusArea = "Longevity Stack";
      recommendation = `Peak tier maintenance: rotate recovery focus weekly and keep the NAD+ Precursor cycle steady. Small corrections, not big swings.`;
      impact = 3;
    }

    return {
      greeting: greetings[range],
      analysis,
      recommendation,
      focusArea,
      estimatedImpact: impact,
    };
  }, [displayName, range, points, current, weeksActive]);
}
