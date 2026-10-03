import Link from "next/link";
import { ViaConnectLogo } from "@/components/ui/ViaConnectLogo";

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-white/[0.06] bg-[#1A2744] text-gray-400">
      <div className="mx-auto max-w-6xl px-4 py-8 flex flex-col items-center gap-4 text-center md:flex-row md:items-center md:justify-between md:text-left">
        <div className="flex flex-col items-center gap-2 md:items-start">
          <ViaConnectLogo size="md" />
          <p className="text-xs text-gray-500">
            Farmceutica Wellness LLC. All rights reserved {year}.
          </p>
          <a
            href="mailto:info@viaconnectapp.com"
            className="text-xs text-gray-400 hover:text-teal transition-colors min-h-[44px] inline-flex items-center"
          >
            info@viaconnectapp.com
          </a>
        </div>
        <nav aria-label="Footer" className="flex flex-wrap items-center justify-center gap-x-6 gap-y-1 text-sm md:justify-end">
          <Link href="/privacy" className="hover:text-teal transition-colors min-h-[44px] inline-flex items-center">
            Privacy Policy
          </Link>
          <Link href="/terms" className="hover:text-teal transition-colors min-h-[44px] inline-flex items-center">
            Terms of Service
          </Link>
          <Link href="/support" className="hover:text-teal transition-colors min-h-[44px] inline-flex items-center">
            Support
          </Link>
          <Link href="/delete-account" className="hover:text-teal transition-colors min-h-[44px] inline-flex items-center">
            Delete account
          </Link>
        </nav>
      </div>
    </footer>
  );
}
