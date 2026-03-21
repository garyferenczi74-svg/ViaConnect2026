import { createClient } from "@/lib/supabase/server";

export default async function ConsumerDashboard() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const name = user?.user_metadata?.full_name ?? "there";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">
          Welcome back, {name}
        </h1>
        <p className="text-gray-400 mt-1">
          Your personal wellness dashboard
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <DashCard
          title="Genetic Profile"
          description="View your GeneX360 results and SNP analysis"
          href="/genetics"
          accent="teal"
        />
        <DashCard
          title="My Formulations"
          description="Personalized supplement recommendations"
          href="/formulations"
          accent="copper"
        />
        <DashCard
          title="ViaTokens"
          description="Track adherence rewards and redeem discounts"
          href="/tokens"
          accent="plum"
        />
      </div>
    </div>
  );
}

function DashCard({
  title,
  description,
  href,
  accent,
}: {
  title: string;
  description: string;
  href: string;
  accent: string;
}) {
  return (
    <a
      href={href}
      className="block bg-gray-900 border border-white/10 rounded-2xl p-6 hover:border-white/20 transition-colors group"
    >
      <div
        className={`w-2 h-2 rounded-full bg-${accent} mb-4 group-hover:scale-125 transition-transform`}
      />
      <h3 className="text-lg font-semibold text-white">{title}</h3>
      <p className="text-sm text-gray-400 mt-1">{description}</p>
    </a>
  );
}
