import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function PatientsPage() {
  const supabase = createClient();
  await supabase.auth.getUser();

  return (
    <div className="min-h-screen bg-dark-bg px-6 py-10">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Patient Roster</h1>
            <p className="mt-1 text-gray-400">
              Manage and view your patient records
            </p>
          </div>
          <Link
            href="/naturopath/dashboard"
            className="text-sm text-sage hover:text-sage/80"
          >
            &larr; Back to Dashboard
          </Link>
        </div>

        {/* Search Bar Placeholder */}
        <div className="glass mb-6 rounded-xl border border-dark-border p-4">
          <div className="flex items-center gap-4">
            <div className="h-10 flex-1 rounded-lg bg-white/5 px-4 py-2 text-gray-400">
              Search patients by name, condition, or ID...
            </div>
            <div className="rounded-lg bg-sage/20 px-4 py-2 text-sm font-medium text-sage">
              + Add Patient
            </div>
          </div>
        </div>

        {/* Patient List Placeholder */}
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="glass flex items-center justify-between rounded-xl border border-dark-border p-5"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sage/20 text-sm font-bold text-sage">
                  {String.fromCharCode(65 + i)}
                </div>
                <div>
                  <div className="h-4 w-40 rounded bg-white/10" />
                  <div className="mt-2 h-3 w-24 rounded bg-white/5" />
                </div>
              </div>
              <div className="text-sm text-gray-400">View &rarr;</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
