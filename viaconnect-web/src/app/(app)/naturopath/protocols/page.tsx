import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

const placeholderProtocols = [
  {
    name: "Adrenal Recovery Protocol",
    patient: "Patient A",
    status: "Active",
  },
  {
    name: "Gut Restoration — Phase 2",
    patient: "Patient B",
    status: "Active",
  },
  {
    name: "Liver Detox Support",
    patient: "Patient C",
    status: "Completed",
  },
  {
    name: "Sleep Optimization",
    patient: "Patient D",
    status: "Draft",
  },
  {
    name: "Immune Resilience Program",
    patient: "Patient E",
    status: "Paused",
  },
];

function statusBadge(status: string) {
  const styles: Record<string, string> = {
    Active: "bg-sage/20 text-sage",
    Completed: "bg-white/10 text-gray-400",
    Draft: "bg-yellow-500/20 text-yellow-400",
    Paused: "bg-red-500/20 text-red-400",
  };
  return styles[status] ?? "bg-white/10 text-gray-400";
}

export default async function ProtocolsPage() {
  const supabase = createClient();
  await supabase.auth.getUser();

  return (
    <div className="min-h-screen bg-dark-bg px-6 py-10">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">
              Protocol Management
            </h1>
            <p className="mt-1 text-gray-400">
              Create, manage, and track naturopathic protocols
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="cursor-pointer rounded-lg bg-sage/20 px-4 py-2 text-sm font-medium text-sage hover:bg-sage/30">
              + New Protocol
            </div>
            <Link
              href="/naturopath/dashboard"
              className="text-sm text-sage hover:text-sage/80"
            >
              &larr; Dashboard
            </Link>
          </div>
        </div>

        {/* Protocol List */}
        <div className="space-y-3">
          {placeholderProtocols.map((protocol) => (
            <div
              key={protocol.name}
              className="glass flex items-center justify-between rounded-xl border border-dark-border p-5"
            >
              <div>
                <h3 className="font-semibold text-white">{protocol.name}</h3>
                <p className="mt-1 text-sm text-gray-400">
                  {protocol.patient}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-medium ${statusBadge(protocol.status)}`}
                >
                  {protocol.status}
                </span>
                <span className="text-sm text-gray-400">View &rarr;</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
