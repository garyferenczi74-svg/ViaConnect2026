import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function PatientsPage() {
  const supabase = createClient();
  await supabase.auth.getUser();

  return (
    <div className="min-h-screen bg-dark-bg p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Patient Roster</h1>
            <p className="text-gray-400 mt-1">
              Manage and monitor your patients
            </p>
          </div>
          <button className="bg-portal-green/20 text-portal-green border border-portal-green/30 px-4 py-2 rounded-lg text-sm font-medium hover:bg-portal-green/30 transition-colors">
            + Add Patient
          </button>
        </div>

        {/* Search Bar Placeholder */}
        <div className="glass rounded-xl p-4">
          <div className="flex gap-4">
            <div className="flex-1 bg-dark-surface border border-dark-border rounded-lg px-4 py-2.5 text-gray-500 text-sm">
              Search patients by name, email, or condition...
            </div>
            <div className="bg-dark-surface border border-dark-border rounded-lg px-4 py-2.5 text-gray-500 text-sm">
              Filter by Status
            </div>
          </div>
        </div>

        {/* Patient Table */}
        <div className="glass rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-dark-border">
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">
                  Name
                </th>
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">
                  Email
                </th>
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">
                  Last Visit
                </th>
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">
                  Status
                </th>
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {/* Placeholder rows */}
              {[1, 2, 3, 4, 5].map((i) => (
                <tr
                  key={i}
                  className="border-b border-dark-border/50 hover:bg-white/[0.02] transition-colors"
                >
                  <td className="px-6 py-4">
                    <div className="h-4 w-32 bg-dark-surface rounded animate-pulse" />
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-4 w-40 bg-dark-surface rounded animate-pulse" />
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-4 w-24 bg-dark-surface rounded animate-pulse" />
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-block px-2 py-1 rounded-full text-xs bg-portal-green/20 text-portal-green">
                      Active
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <Link
                      href={`/practitioner/patients/${i}`}
                      className="text-portal-green text-sm hover:underline"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Placeholder */}
        <div className="flex items-center justify-between text-sm text-gray-400">
          <p>Showing 1-5 of — patients</p>
          <div className="flex gap-2">
            <span className="px-3 py-1 glass rounded-lg cursor-pointer">
              Previous
            </span>
            <span className="px-3 py-1 glass rounded-lg cursor-pointer">
              Next
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
