import Link from "next/link";

const portals = [
  {
    name: "Personal Wellness",
    href: "/wellness",
    description: "View your genetic profile, personalized supplement recommendations, and health reports based on your unique DNA.",
    color: "from-green-600 to-green-800",
    hoverBorder: "hover:border-green-400",
    icon: "🧬",
    features: ["Genetic Profile Viewer", "Personalized Supplements", "Health Reports", "SNP Analysis"],
  },
  {
    name: "Practitioner Portal",
    href: "/practitioner",
    description: "Manage patients, create evidence-based supplement protocols, and review genomic reports for clinical decision-making.",
    color: "from-blue-600 to-blue-800",
    hoverBorder: "hover:border-blue-400",
    icon: "🩺",
    features: ["Patient Management", "Supplement Protocols", "Genomic Reports", "Clinical Analytics"],
  },
  {
    name: "Naturopath Portal",
    href: "/naturopath",
    description: "Build herbal formulations guided by genetics, create natural medicine protocols, and analyze gene-herb interactions.",
    color: "from-amber-600 to-amber-800",
    hoverBorder: "hover:border-amber-400",
    icon: "🌿",
    features: ["Client Management", "Herbal Protocols", "Formulation Builder", "Gene-Herb Analysis"],
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex flex-col">
      <header className="text-center pt-16 pb-8 px-4">
        <h1 className="text-5xl font-bold text-white tracking-tight">
          Via<span className="text-green-400">Connect</span> 2026
        </h1>
        <p className="text-gray-400 mt-4 text-lg max-w-2xl mx-auto">
          Precision nutraceuticals powered by your genome. Select your portal to begin.
        </p>
      </header>

      <main className="flex-1 flex items-start justify-center px-4 pb-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl w-full mt-8">
          {portals.map((portal) => (
            <Link
              key={portal.href}
              href={portal.href}
              className={`group bg-gray-800/50 backdrop-blur border border-gray-700 rounded-2xl p-8 transition-all duration-300 ${portal.hoverBorder} hover:shadow-2xl hover:-translate-y-1`}
            >
              <div className={`inline-flex items-center justify-center w-16 h-16 rounded-xl bg-gradient-to-br ${portal.color} text-3xl mb-6`}>
                {portal.icon}
              </div>
              <h2 className="text-xl font-bold text-white mb-3">{portal.name}</h2>
              <p className="text-gray-400 text-sm leading-relaxed mb-6">{portal.description}</p>
              <ul className="space-y-2">
                {portal.features.map((feature) => (
                  <li key={feature} className="text-gray-500 text-xs flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-600 group-hover:bg-green-500 transition-colors" />
                    {feature}
                  </li>
                ))}
              </ul>
              <div className="mt-6 text-sm font-medium text-gray-500 group-hover:text-white transition-colors">
                Enter Portal →
              </div>
            </Link>
          ))}
        </div>
      </main>

      <footer className="text-center pb-8 text-gray-600 text-xs">
        ViaConnect 2026 — Genomics-Guided Personalized Health
      </footer>
    </div>
  );
}
