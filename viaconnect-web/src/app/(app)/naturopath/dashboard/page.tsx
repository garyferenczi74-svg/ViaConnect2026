import Link from "next/link";
import { Users, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { resolveSessionRole } from "@/lib/auth/resolve-session-role";
import { naturopathPartnersForRole } from "@/lib/auth/session-role";
import {
  formatVisitDate,
  loadNaturopathLivePartners,
} from "@/lib/practitioner/live-roster";

export const dynamic = "force-dynamic";

export default async function NaturopathDashboardPage() {
  const supabase = await createClient();
  const session = await resolveSessionRole("app.naturopath.dashboard");
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const snapshot = user
    ? await loadNaturopathLivePartners(supabase, {
        userId: user.id,
        role: session?.role,
      })
    : await loadNaturopathLivePartners(supabase, {
        userId: "",
        role: undefined,
      });

  const entitled = naturopathPartnersForRole(
    session?.role,
    snapshot.partners
      .filter((row) => row.patientId)
      .map((row) => ({
        id: row.patientId as string,
        displayName: row.displayName,
      })),
  );

  return (
    <div
      className="min-h-screen px-4 md:px-6 lg:px-8 py-6 md:py-10"
      style={{ background: "linear-gradient(180deg, #0D1520 0%, #121E1A 50%, #131D2E 100%)" }}
    >
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <h1 className="text-heading-2" style={{ color: "#C4944A" }}>
            Welcome back
          </h1>
          <p className="text-body-sm text-secondary mt-1">
            Naturopathic Wellness Dashboard
          </p>
        </div>

        {snapshot.lookupFailed ? (
          <div className="glass-v2 p-4 rounded-xl mb-8">
            <p className="text-sm text-secondary">
              Shared-patient roster could not be loaded. No staged partner list is shown.
            </p>
          </div>
        ) : entitled.length === 0 ? (
          <div className="glass-v2 p-6 rounded-xl mb-8">
            <p className="text-sm text-white">No health partners have shared a protocol with you yet</p>
            <p className="text-sm text-secondary mt-1">
              When a patient sends you an invite code and you accept it, they appear here.
              This page does not show a staged 28-partner census or a 92% adherence figure.
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
              <div className="glass-v2 p-4 rounded-xl">
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: "#7BAE7F15" }}
                  >
                    <Users className="w-4 h-4" style={{ color: "#7BAE7F" }} strokeWidth={1.5} />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-white">{entitled.length}</p>
                    <p className="text-xs text-secondary">Health Partners</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mb-8">
              <p
                className="text-xs font-semibold uppercase tracking-widest mb-3"
                style={{ color: "#C4944A" }}
              >
                Shared patients
              </p>
              <div className="glass-v2 rounded-xl overflow-hidden overflow-x-auto">
                <table className="w-full min-w-[480px]">
                  <thead>
                    <tr className="border-b border-white/[0.06]">
                      <th className="text-left text-xs font-medium text-secondary px-4 py-2.5">Patient</th>
                      <th className="text-left text-xs font-medium text-secondary px-4 py-2.5">Shared since</th>
                    </tr>
                  </thead>
                  <tbody>
                    {snapshot.partners.map((row, i) => (
                      <tr
                        key={row.relationshipId}
                        className={i < snapshot.partners.length - 1 ? "border-b border-white/[0.04]" : ""}
                      >
                        <td className="text-sm text-white px-4 py-2.5">
                          {row.patientId ? (
                            <Link
                              href={`/naturopath/patients/${row.patientId}/protocol`}
                              className="hover:underline"
                              style={{ color: "#7BAE7F" }}
                            >
                              {row.displayName}
                            </Link>
                          ) : (
                            row.displayName
                          )}
                        </td>
                        <td className="text-xs text-secondary px-4 py-2.5">
                          {formatVisitDate(row.firstVisitDate)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        <div>
          <p
            className="text-xs font-semibold uppercase tracking-widest mb-3"
            style={{ color: "#C4944A" }}
          >
            Quick Actions
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/naturopath/patients"
              className="inline-flex items-center gap-2 px-5 py-2.5 min-h-[44px] rounded-lg text-sm font-medium text-white transition-all hover:opacity-90"
              style={{ background: "linear-gradient(135deg, #7BAE7F, #5E9462)" }}
            >
              Patient roster
            </Link>
            <Link
              href="/naturopath/accept-share"
              className="inline-flex items-center gap-2 px-5 py-2.5 min-h-[44px] rounded-lg text-sm font-medium border transition-colors hover:bg-white/[0.04]"
              style={{ borderColor: "#7BAE7F50", color: "#7BAE7F" }}
            >
              <ShieldCheck className="w-4 h-4" strokeWidth={1.5} />
              Accept invite code
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
