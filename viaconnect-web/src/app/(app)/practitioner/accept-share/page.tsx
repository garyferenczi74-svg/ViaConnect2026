"use client";

import { AcceptShareForm } from "@/components/provider/AcceptShareForm";

export default function PractitionerAcceptSharePage() {
  return (
    <AcceptShareForm
      redirectPath="/practitioner/patients"
      audienceLabel="Practitioner access"
    />
  );
}
