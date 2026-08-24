import Link from "next/link";
import { Users, FlaskConical, Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { resolveSessionRole } from "@/lib/auth/resolve-session-role";
import { clinicianPatientsForRole } from "@/lib/auth/session-role";
import {
  formatVisitDate,
  loadPractitionerLiveRoster,
  rosterRowsToClinicianPatients,
} from "@/lib/practitioner/live-roster";

export const dynamic = "force-dynamic";

export default async function PractitionerDashboardPage() {
  const supabase = await createClient();
  const session = await resolveSessionRole("app.practitioner.dashboard");
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const snapshot = user
    ? await loadPractitionerLiveRoster(supabase, {
        userId: user.id,
        role: session?.role,
      })
    : await loadPractitionerLiveRoster(supabase, {
        userId: "",
        role: undefined,
      });

  const entitled = clinicianPatientsForRole(
    session?.role,
    rosterRowsToClinicianPatients(snapshot.patients),
  );
  const hasRoster = snapshot.activeCount > 0 || snapshot.invitedCount > 0;

  return (
    <div className="min-h-screen bg-dark-bg p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-heading-2 text-[#B75E18]">Practitioner Dashboard</h1>
          <p className="text-sm text-secondary mt-1">Your practice roster</p>
        </div>

        {snapshot.lookupFailed ? (
          <div className="glass-v2 p-4">
            <p className="text-sm text-secondary">
              Roster could not be loaded. No staged patient list is shown.
            </p>
          </div>
        ) : !hasRoster ? (
          <EmptyRoster />
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <StatCard
                icon={Users}
                color="text-[#4A90D9]"
                value={String(snapshot.activeCount)}
                label="Active Patients"
              />
              <StatCard
                icon={Mail}
                color="text-amber-400"
                value={String(snapshot.invitedCount)}
                label="Pending invitations"
              />
              <StatCard
                icon={FlaskConical}
                color="text-amber-400"
                value={String(snapshot.pendingResults.length)}
                label="Pending results"
              />
            </div>

            <section>
              <p className="text-overline mb-3">ROSTER</p>
              {entitled.length === 0 ? (
                <div className="glass-v2 p-4">
                  <p className="text-sm text-secondary">
                    No active patients yet. Outstanding invitations are not counted as a live roster.
                  </p>
                </div>
              ) : (
                <div className="glass-v2 p-0 overflow-hidden overflow-x-auto">
                  <table className="w-full text-left min-w-[480px]">
                    <thead>
                      <tr className="border-b border-white/[0.06]">
                        <th className="text-xs text-secondary uppercase font-medium py-2 px-3">Patient</th>
                        <th className="text-xs text-secondary uppercase font-medium py-2 px-3">Status</th>
                        <th className="text-xs text-secondary uppercase font-medium py-2 px-3">Updated</th>
                      </tr>
                    </thead>
                    <tbody>
                      {snapshot.patients
                        .filter((row) => row.status === "active" && row.patientId)
                        .map((row, i) => (
                          <tr
                            key={row.relationshipId}
                            className={i % 2 === 1 ? "bg-white/[0.02]" : ""}
                          >
                            <td className="text-xs text-white py-2 px-3">
                              <Link
                                href={`/practitioner/patients/${row.patientId}`}
                                className="text-[#4A90D9] hover:underline"
                              >
                                {row.displayName}
                              </Link>
                            </td>
                            <td className="text-xs text-gray-300 py-2 px-3">{row.status}</td>
                            <td className="text-xs text-gray-400 py-2 px-3">
                              {formatVisitDate(row.updatedAt)}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section>
              <p className="text-overline mb-3">RECENT RESULTS</p>
              {snapshot.recentResults.length === 0 ? (
                <div className="glass-v2 p-4">
                  <p className="text-sm text-secondary">
                    No results to review. Patient panels appear here after a real order lands.
                  </p>
                </div>
              ) : (
                <div className="glass-v2 p-0 overflow-hidden overflow-x-auto">
                  <table className="w-full text-left min-w-[480px]">
                    <thead>
                      <tr className="border-b border-white/[0.06]">
                        <th className="text-xs text-secondary uppercase font-medium py-2 px-3">Patient</th>
                        <th className="text-xs text-secondary uppercase font-medium py-2 px-3">Panel</th>
                        <th className="text-xs text-secondary uppercase font-medium py-2 px-3">Date</th>
                        <th className="text-xs text-secondary uppercase font-medium py-2 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {snapshot.recentResults.map((row, i) => (
                        <tr key={row.id} className={i % 2 === 1 ? "bg-white/[0.02]" : ""}>
                          <td className="text-xs text-white py-2 px-3">{row.displayName}</td>
                          <td className="text-xs text-gray-300 py-2 px-3">{row.panelType}</td>
                          <td className="text-xs text-gray-400 py-2 px-3">
                            {formatVisitDate(row.resultsReceivedAt ?? row.createdAt)}
                          </td>
                          <td className="text-xs text-gray-300 py-2 px-3">{row.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}

        <section>
          <p className="text-overline mb-3">QUICK ACTIONS</p>
          <div className="flex flex-wrap gap-3">
            <Link href="/practitioner/patients">
              <button
                type="button"
                className="px-4 py-2 min-h-[44px] rounded-lg text-sm font-medium text-white bg-gradient-to-r from-[#4A90D9] to-[#3A7BC8] hover:opacity-90 transition-opacity"
              >
                View patients
              </button>
            </Link>
            <Link href="/practitioner/patients/invite">
              <button
                type="button"
                className="px-4 py-2 min-h-[44px] rounded-lg text-sm font-medium text-[#4A90D9] border border-[#4A90D9]/30 bg-transparent hover:bg-[#4A90D9]/10 transition-colors"
              >
                Invite patient
              </button>
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  color,
  value,
  label,
}: {
  icon: typeof Users;
  color: string;
  value: string;
  label: string;
}) {
  return (
    <div className="glass-v2 p-3 flex items-center gap-3">
      <div className="w-9 h-9 rounded-lg bg-white/[0.04] flex items-center justify-center shrink-0">
        <Icon className={`w-4 h-4 ${color}`} strokeWidth={1.5} />
      </div>
      <div>
        <p className="text-2xl font-bold text-white leading-tight">{value}</p>
        <p className="text-xs text-secondary">{label}</p>
      </div>
    </div>
  );
}

function EmptyRoster() {
  return (
    <div className="glass-v2 p-6">
      <p className="text-sm text-white">No patients on this roster yet</p>
      <p className="text-sm text-secondary mt-1">
        Active relationships appear here after a patient accepts your invitation.
        This page does not show a staged census.
      </p>
    </div>
  );
}
