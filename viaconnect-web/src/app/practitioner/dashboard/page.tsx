import { createClient } from "@/lib/supabase/server";

export default async function PractitionerDashboard() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const name = user?.user_metadata?.full_name ?? "Doctor";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">
          Welcome, {name}
        </h1>
        <p className="text-gray-400 mt-1">Practitioner Portal</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <DashCard
          title="Patients"
          description="Manage patient profiles and genomic results"
          href="/practitioner/patients"
        />
        <DashCard
          title="Protocols"
          description="Create and assign supplement protocols"
          href="/practitioner/protocols"
        />
        <DashCard
          title="Analytics"
          description="Patient outcomes and adherence metrics"
          href="/practitioner/analytics"
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
      className="block bg-gray-900 border border-white/10 rounded-2xl p-6 hover:border-portal-green/30 transition-colors group"
    >
      <div className="w-2 h-2 rounded-full bg-portal-green mb-4 group-hover:scale-125 transition-transform" />
      <h3 className="text-lg font-semibold text-white">{title}</h3>
      <p className="text-sm text-gray-400 mt-1">{description}</p>
    </a>
  );
}
