"use client";

import { useState } from "react";
import InteractionChecker from "@/components/InteractionChecker";

export default function InteractionsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Interaction Checker</h1>
        <p className="text-sm text-white/60">
          Check drug–supplement interactions before prescribing
        </p>
      </div>
      <InteractionChecker />
    </div>
  );
}
