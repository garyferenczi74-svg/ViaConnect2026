"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Gift } from "lucide-react";
import { shouldSuggestHelixRewards } from "@/lib/not-found/helix-alias-hint";

export function HelixAliasHint() {
  const pathname = usePathname() ?? "";
  if (!shouldSuggestHelixRewards(pathname)) {
    return null;
  }

  return (
    <p className="mt-4 max-w-md text-sm leading-relaxed text-white/70 md:text-base">
      <Gift
        aria-hidden="true"
        className="mr-1.5 inline-block h-4 w-4 align-text-bottom text-[#B75E18]"
        strokeWidth={1.5}
      />
      Did you mean Helix Rewards?{" "}
      <Link
        href="/helix"
        className="inline-flex min-h-[44px] items-center font-semibold text-[#2DA5A0] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2DA5A0]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1A2744]"
      >
        Open Helix
      </Link>
    </p>
  );
}
