import Link from "next/link";
import { ArrowLeft, Sparkles } from "lucide-react";
import TabNav from "./TabNav";

interface PortalHeaderProps {
  activeTab: string;
}

export default function PortalHeader({ activeTab }: PortalHeaderProps) {
  return (
    <header className="sticky top-0 z-50 bg-[#111827]/90 backdrop-blur-md border-b border-gray-800">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-4">
        <Link
          href="/"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-800/50 backdrop-blur-sm border border-white/10 text-white text-xs hover:bg-gray-700 transition-colors"
        >
          <ArrowLeft className="h-3 w-3" />
          Return to Main Menu
        </Link>

        <div className="w-12 h-12 rounded-full bg-[#4ade80] flex items-center justify-center text-gray-900 flex-shrink-0">
          <Sparkles className="h-5 w-5" />
        </div>

        <div className="hidden sm:block">
          <h1 className="text-2xl font-bold text-white leading-tight">
            Personal Wellness Portal
          </h1>
          <p className="text-sm text-white/50">
            ViaConnect&trade; AI-Powered Health
          </p>
        </div>
      </div>

      <TabNav activeTab={activeTab} />
    </header>
  );
}
