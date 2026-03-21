import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function SettingsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const displayName =
    user?.user_metadata?.full_name ?? user?.email ?? "Practitioner";

  return (
    <div className="min-h-screen bg-dark-bg p-6 md:p-10">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-white">Practice Settings</h1>
          <p className="text-gray-400 mt-1">
            Manage your practice configuration and integrations
          </p>
        </div>

        {/* Practice Info */}
        <div className="glass rounded-2xl p-6 space-y-4">
          <h2 className="text-lg font-semibold text-white">
            Practice Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { label: "Practice Name", value: "—" },
              { label: "Practitioner", value: displayName },
              { label: "NPI Number", value: "—" },
              { label: "Specialty", value: "—" },
              { label: "Address", value: "—" },
              { label: "Phone", value: "—" },
            ].map((field) => (
              <div key={field.label}>
                <p className="text-xs text-gray-500">{field.label}</p>
                <p className="text-white text-sm mt-1">{field.value}</p>
              </div>
            ))}
          </div>
          <button className="text-portal-green text-sm hover:underline">
            Edit Practice Info
          </button>
        </div>

        {/* Team Members */}
        <div className="glass rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Team Members</h2>
            <button className="bg-portal-green/20 text-portal-green border border-portal-green/30 px-4 py-2 rounded-lg text-sm font-medium hover:bg-portal-green/30 transition-colors">
              + Invite Member
            </button>
          </div>
          <div className="space-y-3">
            {[
              { name: displayName, role: "Owner", status: "Active" },
              {
                name: "Pending Invitation",
                role: "Associate",
                status: "Pending",
              },
            ].map((member, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-4 rounded-xl bg-dark-surface/50 border border-dark-border"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-portal-green/20 flex items-center justify-center text-portal-green text-sm font-bold">
                    {member.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium">
                      {member.name}
                    </p>
                    <p className="text-gray-500 text-xs">{member.role}</p>
                  </div>
                </div>
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                    member.status === "Active"
                      ? "bg-portal-green/20 text-portal-green"
                      : "bg-yellow-500/20 text-yellow-400"
                  }`}
                >
                  {member.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Billing */}
        <div className="glass rounded-2xl p-6 space-y-4">
          <h2 className="text-lg font-semibold text-white">Billing</h2>
          <div className="flex items-center justify-between p-4 rounded-xl bg-dark-surface/50 border border-dark-border">
            <div>
              <p className="text-white font-medium">Practitioner Plan</p>
              <p className="text-gray-500 text-sm">
                Full access to all practitioner tools and AI advisor
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-portal-green">$128.88</p>
              <p className="text-gray-500 text-xs">per month</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button className="text-portal-green text-sm hover:underline">
              Update Payment Method
            </button>
            <span className="text-gray-600">|</span>
            <button className="text-gray-400 text-sm hover:text-white transition-colors">
              View Invoices
            </button>
          </div>
        </div>

        {/* API Keys */}
        <div className="glass rounded-2xl p-6 space-y-4">
          <h2 className="text-lg font-semibold text-white">API Keys</h2>
          <p className="text-gray-500 text-sm">
            Manage API keys for third-party integrations and webhook endpoints
          </p>
          <div className="space-y-3">
            {[
              { name: "Production Key", created: "Jan 15, 2026", active: true },
              { name: "Staging Key", created: "Feb 1, 2026", active: true },
            ].map((key) => (
              <div
                key={key.name}
                className="flex items-center justify-between p-4 rounded-xl bg-dark-surface/50 border border-dark-border"
              >
                <div>
                  <p className="text-white text-sm font-medium">{key.name}</p>
                  <p className="text-gray-500 text-xs">
                    Created: {key.created}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-gray-600 text-xs">
                    sk_live_****...****
                  </span>
                  <button className="text-portal-green text-sm hover:underline">
                    Reveal
                  </button>
                </div>
              </div>
            ))}
          </div>
          <button className="bg-portal-green/20 text-portal-green border border-portal-green/30 px-4 py-2 rounded-lg text-sm font-medium hover:bg-portal-green/30 transition-colors">
            + Generate New Key
          </button>
        </div>

        {/* Integrations */}
        <div className="glass rounded-2xl p-6 space-y-4">
          <h2 className="text-lg font-semibold text-white">Integrations</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              {
                name: "EHR Systems",
                description: "Epic, Cerner, Allscripts",
                href: "/practitioner/ehr",
                connected: true,
              },
              {
                name: "Lab Providers",
                description: "Quest, LabCorp, Genova",
                href: "#",
                connected: false,
              },
              {
                name: "Stripe Payments",
                description: "Payment processing for protocols",
                href: "#",
                connected: true,
              },
              {
                name: "Webhooks",
                description: "Real-time event notifications",
                href: "#",
                connected: false,
              },
            ].map((integration) => (
              <Link
                key={integration.name}
                href={integration.href}
                className="flex items-center justify-between p-4 rounded-xl bg-dark-surface/50 border border-dark-border hover:border-portal-green/30 transition-colors"
              >
                <div>
                  <p className="text-white text-sm font-medium">
                    {integration.name}
                  </p>
                  <p className="text-gray-500 text-xs">
                    {integration.description}
                  </p>
                </div>
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                    integration.connected
                      ? "bg-portal-green/20 text-portal-green"
                      : "bg-gray-500/20 text-gray-400"
                  }`}
                >
                  {integration.connected ? "Connected" : "Not Connected"}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
