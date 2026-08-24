import Link from "next/link";
import { Users, FlaskConical, AlertTriangle, TrendingUp, Video } from "lucide-react";
import { resolveSessionRole } from "@/lib/auth/resolve-session-role";
import { clinicianPatientsForRole } from "@/lib/auth/session-role";

export default async function PractitionerDashboardPage() {
  const session = await resolveSessionRole("app.practitioner.dashboard");
  const patients = clinicianPatientsForRole(session?.role, []);
  const patientCount = patients.length;

  const stats = [
    { value: String(patientCount), label: "Active Patients", icon: Users, color: "text-[#4A90D9]" },
    { value: "0", label: "Pending Results", icon: FlaskConical, color: "text-amber-400" },
    { value: "0", label: "Alerts Today", icon: AlertTriangle, color: "text-red-400" },
    { value: "--", label: "Avg Compliance", icon: TrendingUp, color: "text-emerald-400" },
  ];

  return (
    <div className="min-h-screen bg-dark-bg p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-heading-2 text-[#B75E18]">Practitioner Dashboard</h1>
          <p className="text-sm text-secondary mt-1">Your practice roster</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {stats.map((stat) => (
            <div key={stat.label} className="glass-v2 p-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-white/[0.04] flex items-center justify-center shrink-0">
                <stat.icon className={`w-4 h-4 ${stat.color}`} strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-2xl font-bold text-white leading-tight">{stat.value}</p>
                <p className="text-xs text-secondary">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        <section>
          <p className="text-overline mb-3">PATIENT ALERTS</p>
          <div className="glass-v2 p-4">
            <p className="text-sm text-secondary">
              No patient alerts. Roster is empty until a live patient relationship exists.
            </p>
          </div>
        </section>

        <section>
          <p className="text-overline mb-3">RECENT RESULTS</p>
          <div className="glass-v2 p-4">
            <p className="text-sm text-secondary">
              No results to review. Patient panels appear here after a real order lands.
            </p>
          </div>
        </section>

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
            <Link href="/practitioners">
              <button
                type="button"
                className="px-4 py-2 min-h-[44px] rounded-lg text-sm font-medium text-[#4A90D9] border border-[#4A90D9]/30 bg-transparent hover:bg-[#4A90D9]/10 transition-colors"
              >
                ViaCura waitlist
              </button>
            </Link>
            <span className="px-4 py-2 min-h-[44px] rounded-lg text-sm font-medium text-gray-300 flex items-center gap-2">
              <Video className="w-4 h-4" strokeWidth={1.5} />
              Video call (coming with live roster)
            </span>
          </div>
        </section>
      </div>
    </div>
  );
}
