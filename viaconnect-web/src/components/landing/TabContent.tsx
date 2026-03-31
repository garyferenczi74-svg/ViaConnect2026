"use client";

import { FeaturesContent } from "./FeaturesContent";
import { GenomicsContent } from "./GenomicsContent";
import { ProcessContent } from "./ProcessContent";
import { AboutContent } from "./AboutContent";

export type TabId = "features" | "genomics" | "process" | "about";

export function TabContent({ tab }: { tab: TabId }) {
  switch (tab) {
    case "features": return <FeaturesContent />;
    case "genomics": return <GenomicsContent />;
    case "process": return <ProcessContent />;
    case "about": return <AboutContent />;
  }
}
