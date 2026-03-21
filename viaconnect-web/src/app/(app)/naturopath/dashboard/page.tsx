import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

const navCards = [
  {
    title: "Patients",
    description: "Manage your patient roster and records",
    href: "/naturopath/patients",
    icon: "👤",
  },
  {
    title: "Botanical",
    description: "500+ herb database and formula builder",
    href: "/naturopath/botanical",
    icon: "🌿",
  },
  {
    title: "Constitutional",
    description: "Constitutional typing and assessments",
    href: "/naturopath/constitutional",
    icon: "🧬",
  },
  {
    title: "Protocols",
    description: "Naturopathic protocol management",
    href: "/naturopath/protocols",
    icon: "📋",
  },
  {
    title: "Scheduler",
    description: "Appointment calendar and booking",
    href: "/naturopath/scheduler",
    icon: "📅",
  },
  {
    title: "Compliance",
    description: "HIPAA audit and compliance dashboard",
    href: "/naturopath/compliance",
    icon: "🛡️",
  },
];

export default async function NaturopathDashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const displayName =
    user?.user_metadata?.full_name ?? user?.email ?? "Naturopath";

  return (
    <div className="min-h-screen bg-dark-bg px-6 py-10">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-white">
            Welcome back,{" "}
            <span className="text-sage">{displayName}</span>
          </h1>
          <p className="mt-2 text-gray-400">Naturopath Portal</p>
        </div>

        {/* Navigation Grid */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {navCards.map((card) => (
            <Link key={card.href} href={card.href}>
              <div className="glass rounded-2xl border border-dark-border p-6 transition-all hover:border-sage/40 hover:shadow-lg hover:shadow-sage/5">
                <div className="mb-3 text-3xl">{card.icon}</div>
                <h2 className="text-lg font-semibold text-white">
                  {card.title}
                </h2>
                <p className="mt-1 text-sm text-gray-400">
                  {card.description}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
