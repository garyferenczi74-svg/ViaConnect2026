import Link from "next/link";
import { ViaConnectLogo } from "@/components/ui/ViaConnectLogo";

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-white/[0.06] bg-[#1A2744] text-gray-400">
      <div className="mx-auto max-w-6xl px-4 py-8 flex flex-col items-center gap-4 text-center md:flex-row md:items-center md:justify-between md:text-left">
        <div className="flex flex-col items-center gap-2 md:items-start">
          <ViaConnectLogo size="md" className="text-white" />
          <p className="text-xs text-gray-500">
            Farmceutica Wellness LLC. All rights reserved {year}.
          </p>
          <a
            href="mailto:info@farmceuticawellness.com"
            className="text-xs text-gray-400 hover:text-teal transition-colors"
          >
            info@farmceuticawellness.com
          </a>
        </div>
        <nav className="flex items-center gap-6 text-sm">
          <Link href="/privacy" className="hover:text-teal transition-colors">
            Privacy Policy
          </Link>
          <Link href="/terms" className="hover:text-teal transition-colors">
            Terms of Service
          </Link>
        </nav>
      </div>
    </footer>
  );
}
