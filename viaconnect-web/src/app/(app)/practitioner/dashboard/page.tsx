import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

const navCards = [
  {
    title: "Patients",
    description: "Manage your patient roster and records",
    href: "/practitioner/patients",
    icon: "👤",
  },
  {
    title: "Protocols",
    description: "Create and manage supplement protocols",
    href: "/practitioner/protocols",
    icon: "📋",
  },
  {
    title: "Analytics",
    description: "Practice performance and outcomes",
    href: "/practitioner/analytics",
    icon: "📊",
  },
  {
    title: "Genomics",
    description: "Population-level genetic insights",
    href: "/practitioner/genomics",
    icon: "🧬",
  },
  {
    title: "Interactions",
    description: "Drug-supplement interaction checker",
    href: "/practitioner/interactions",
    icon: "⚠️",
  },
  {
    title: "AI Advisor",
    description: "Multi-LLM clinical reasoning assistant",
    href: "/practitioner/ai",
    icon: "🤖",
  },
];

export default async function PracticeDashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const displayName =
    user?.user_metadata?.full_name ?? user?.email ?? "Practitioner";

  return (
    <div className="min-h-screen bg-dark-bg p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-white">
            Welcome back,{" "}
            <span className="text-portal-green">{displayName}</span>
          </h1>
          <p className="text-gray-400 mt-1">Practitioner Portal</p>
        </div>

        {/* Navigation Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {navCards.map((card) => (
            <Link key={card.href} href={card.href}>
              <div className="glass glass-hover rounded-2xl p-6 transition-all cursor-pointer h-full">
                <div className="text-3xl mb-3">{card.icon}</div>
                <h2 className="text-lg font-semibold text-white">
                  {card.title}
                </h2>
                <p className="text-gray-400 text-sm mt-1">
                  {card.description}
                </p>
                <div className="mt-4 text-portal-green text-sm font-medium">
                  Open &rarr;
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Active Patients", value: "—" },
            { label: "Active Protocols", value: "—" },
            { label: "Avg Adherence", value: "—" },
            { label: "This Month Revenue", value: "—" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="glass rounded-xl p-4 text-center"
            >
              <p className="text-2xl font-bold text-portal-green">
                {stat.value}
              </p>
              <p className="text-gray-400 text-xs mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
