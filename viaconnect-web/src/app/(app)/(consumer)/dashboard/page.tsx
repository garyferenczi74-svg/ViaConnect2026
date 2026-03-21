import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const displayName =
    user?.user_metadata?.full_name ?? user?.email?.split("@")[0] ?? "there";

  const cards = [
    {
      title: "Genetic Profile",
      description: "GeneX360 results and SNP analysis across 6 panels",
      href: "/genetics",
      accent: "border-teal",
      icon: "🧬",
      accentText: "text-teal",
    },
    {
      title: "My Formulations",
      description: "Personalized supplement stack based on your genome",
      href: "/supplements",
      accent: "border-copper",
      icon: "💊",
      accentText: "text-copper",
    },
    {
      title: "ViaTokens",
      description: "Earn rewards for adherence, redeem for discounts",
      href: "/tokens",
      accent: "border-plum",
      icon: "🪙",
      accentText: "text-plum",
    },
  ];

  return (
    <div className="min-h-screen bg-dark-bg p-6 md:p-10">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Welcome */}
        <div>
          <h1 className="text-3xl font-bold text-white">
            Welcome back, <span className="text-copper">{displayName}</span>
          </h1>
          <p className="text-gray-400 mt-2">
            Personal Wellness Dashboard — One Genome. One Formulation. One Life
            at a Time.
          </p>
        </div>

        {/* Quick-access cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {cards.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className={`glass rounded-2xl p-6 border ${card.accent} border-opacity-40 hover:border-opacity-100 transition-all group`}
            >
              <span className="text-3xl">{card.icon}</span>
              <h2
                className={`text-xl font-semibold text-white mt-4 group-hover:${card.accentText} transition-colors`}
              >
                {card.title}
              </h2>
              <p className="text-gray-400 mt-2 text-sm">{card.description}</p>
            </Link>
          ))}
        </div>

        {/* Activity summary placeholder */}
        <div className="glass rounded-2xl p-6 border border-dark-border">
          <h3 className="text-lg font-semibold text-white mb-4">
            Recent Activity
          </h3>
          <p className="text-gray-400 text-sm">
            Your recent wellness activity and protocol adherence will appear
            here once data is available.
          </p>
        </div>
      </div>
    </div>
  );
}
