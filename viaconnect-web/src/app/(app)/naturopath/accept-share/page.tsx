"use client";

import { AcceptShareForm } from "@/components/provider/AcceptShareForm";

export default function NaturopathAcceptSharePage() {
  return (
    <AcceptShareForm
      redirectPath="/naturopath/patients"
      audienceLabel="Naturopath access"
    />
  );
}
