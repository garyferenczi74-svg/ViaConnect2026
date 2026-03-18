import Link from "next/link";
import {
  Activity,
  Sparkles,
  Dna,
  TrendingUp,
  FileText,
  Clipboard,
  Share2,
  Target,
  GraduationCap,
  BookOpen,
} from "lucide-react";

const TABS = [
  { id: "dashboard", label: "Dashboard", href: "/wellness", icon: Activity },
  { id: "genetics", label: "Genetics", href: "/wellness/genetics", icon: Sparkles },
  { id: "variants", label: "Variants", href: "/wellness/variants", icon: Dna },
  { id: "bio", label: "Bio", href: "/wellness/bio", icon: TrendingUp },
  { id: "plans", label: "Plans", href: "/wellness/plans", icon: FileText },
  { id: "track", label: "Track", href: "/wellness/track", icon: Clipboard },
  { id: "share", label: "Share", href: "/wellness/share", icon: Share2 },
  { id: "insights", label: "Insights", href: "/wellness/insights", icon: Target },
  { id: "learn", label: "Learn", href: "/wellness/learn", icon: GraduationCap },
  { id: "research", label: "Research", href: "/wellness/research", icon: BookOpen },
] as const;

interface TabNavProps {
  activeTab: string;
}

export default function TabNav({ activeTab }: TabNavProps) {
  return (
    <nav className="max-w-6xl mx-auto px-4 pb-2 flex gap-2 overflow-x-auto scrollbar-hide">
      {TABS.map((tab) => {
        const isActive = tab.id === activeTab;
        const Icon = tab.icon;
        return (
          <Link
            key={tab.id}
            href={tab.href}
            className={`flex items-center gap-1.5 whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              isActive
                ? "bg-green-400 text-gray-900 font-bold"
                : "text-white/60 hover:text-white/80"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
