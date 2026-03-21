import { createClient } from "@/lib/supabase/server";

export default async function NaturopathDashboard() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const name = user?.user_metadata?.full_name ?? "Practitioner";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">
          Welcome, {name}
        </h1>
        <p className="text-gray-400 mt-1">Naturopath Portal</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <DashCard
          title="Clients"
          description="Manage client wellness profiles and genomics"
          href="/naturopath/clients"
        />
        <DashCard
          title="Integrative Protocols"
          description="Genomic-guided naturopathic treatment plans"
          href="/naturopath/protocols"
        />
        <DashCard
          title="PeptideIQ"
          description="Gene-panel peptide protocol management"
          href="/naturopath/peptide-iq"
        />
      </div>
    </div>
  );
}

function DashCard({
  title,
  description,
  href,
}: {
  title: string;
  description: string;
  href: string;
}) {
  return (
    <a
      href={href}
      className="block bg-gray-900 border border-white/10 rounded-2xl p-6 hover:border-sage/30 transition-colors group"
    >
      <div className="w-2 h-2 rounded-full bg-sage mb-4 group-hover:scale-125 transition-transform" />
      <h3 className="text-lg font-semibold text-white">{title}</h3>
      <p className="text-sm text-gray-400 mt-1">{description}</p>
    </a>
  );
}
