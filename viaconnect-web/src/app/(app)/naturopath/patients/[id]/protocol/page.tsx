"use client";

import { useParams } from "next/navigation";
import { SharedPatientProtocol } from "@/components/provider/SharedPatientProtocol";

export default function NaturopathPatientProtocolPage() {
  const params = useParams<{ id: string }>();
  const patientId = Array.isArray(params?.id) ? params!.id[0] : params?.id;
  if (!patientId) return null;
  return (
    <SharedPatientProtocol patientId={patientId} backHref="/naturopath/patients" />
  );
}
