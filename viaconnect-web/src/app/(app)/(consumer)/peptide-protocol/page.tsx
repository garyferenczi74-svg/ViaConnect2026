"use client";

import PeptideProtocolPage from "@/components/protocol/PeptideProtocolPage";

export default function PeptideProtocolRoute() {
  return (
    <PeptideProtocolPage
      masterPatterns={[
        { name: "HPA Axis Dysregulation", symptomsInvolved: ["fatigue", "stress", "sleep"] },
        { name: "Neuroinflammation Pattern", symptomsInvolved: ["brain fog", "memory", "focus"] },
      ]}
      helixBalance={1250}
      caqCompleted={true}
    />
  );
}
