"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, UserPlus } from "lucide-react";
import {
  formatVisitDate,
  type LiveRosterPatient,
} from "@/lib/practitioner/live-roster";

type FilterKey = "all" | "active" | "invited";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "invited", label: "Invited" },
];

export function PractitionerPatientsRoster({
  patients,
  lookupFailed,
}: {
  patients: readonly LiveRosterPatient[];
  lookupFailed: boolean;
}) {
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");

  const filtered = useMemo(() => {
    let list = [...patients];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.displayName.toLowerCase().includes(q) ||
          (p.email ?? "").toLowerCase().includes(q),
      );
    }
    if (activeFilter !== "all") {
      list = list.filter((p) => p.status === activeFilter);
    }
    return list;
  }, [patients, search, activeFilter]);

  return (
    <div className="min-h-screen bg-dark-bg p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h1 className="text-heading-2 text-[#B75E18]">Patients</h1>
          <Link
            href="/practitioner/patients/invite"
            className="inline-flex items-center justify-center gap-2 px-4 py-2 min-h-[44px] rounded-lg text-sm font-medium text-white bg-gradient-to-r from-[#4A90D9] to-[#3A7BC8] hover:opacity-90 transition-opacity"
          >
            <UserPlus className="w-4 h-4" strokeWidth={1.5} />
            Invite patient
          </Link>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search patients..."
            className="w-full h-10 min-h-[44px] pl-9 pr-3 rounded-lg text-base text-white placeholder:text-gray-600 outline-none transition-colors
              bg-white/[0.04] border border-white/[0.08] backdrop-blur-sm focus:border-[#4A90D9]/50 focus:ring-1 focus:ring-[#4A90D9]/20"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {FILTERS.map((filter) => (
            <button
              key={filter.key}
              type="button"
              onClick={() => setActiveFilter(filter.key)}
              className={`px-3 py-1.5 min-h-[44px] md:min-h-0 rounded-full text-xs font-medium transition-colors ${
                activeFilter === filter.key
                  ? "bg-[#4A90D9]/15 text-[#4A90D9]"
                  : "bg-white/[0.04] text-gray-400 hover:bg-white/[0.06] hover:text-gray-300"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {lookupFailed ? (
          <div className="glass-v2 p-6">
            <p className="text-sm text-secondary">
              Roster could not be loaded. No staged patient list is shown.
            </p>
          </div>
        ) : patients.length === 0 ? (
          <div className="glass-v2 p-6">
            <p className="text-sm text-white">No patients on this roster yet</p>
            <p className="text-sm text-secondary mt-1">
              Invite a patient. They appear here after the relationship is created.
            </p>
          </div>
        ) : (
          <div className="glass-v2 p-0 overflow-x-auto">
            <table className="w-full text-left min-w-[640px]">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="text-xs text-secondary uppercase font-medium py-2 px-3">Name</th>
                  <th className="text-xs text-secondary uppercase font-medium py-2 px-3">Status</th>
                  <th className="text-xs text-secondary uppercase font-medium py-2 px-3">First visit</th>
                  <th className="text-xs text-secondary uppercase font-medium py-2 px-3">Updated</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((patient, i) => (
                  <tr
                    key={patient.relationshipId}
                    className={`transition-colors ${i % 2 === 1 ? "bg-white/[0.02]" : ""}`}
                  >
                    <td className="text-xs font-medium text-white py-2 px-3">
                      {patient.patientId ? (
                        <Link
                          href={`/practitioner/patients/${patient.patientId}`}
                          className="text-[#4A90D9] hover:underline"
                        >
                          {patient.displayName}
                        </Link>
                      ) : (
                        patient.displayName
                      )}
                    </td>
                    <td className="text-xs text-gray-300 py-2 px-3">{patient.status}</td>
                    <td className="text-xs text-gray-400 py-2 px-3">
                      {formatVisitDate(patient.firstVisitDate)}
                    </td>
                    <td className="text-xs text-gray-400 py-2 px-3">
                      {formatVisitDate(patient.updatedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="text-xs text-secondary">
          {patients.length === 0
            ? "No patients on this roster yet"
            : `Showing ${filtered.length} of ${patients.length} patients`}
        </p>
      </div>
    </div>
  );
}
