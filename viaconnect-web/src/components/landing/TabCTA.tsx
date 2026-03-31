"use client";

import Link from "next/link";

interface TabCTAProps {
  text: string;
  href?: string;
}

export function TabCTA({ text, href = "/signup" }: TabCTAProps) {
  const lines = text.split("\n");
  return (
    <div className="mt-10 mb-4">
      <Link href={href} className="bg-gradient-to-r from-[#B87333] to-[#D4923A] text-white font-bold py-3 px-8 rounded-lg text-center block mx-auto max-w-md hover:opacity-90 transition-opacity">
        {lines.length > 1 ? (
          <span className="flex flex-col items-center gap-0.5">
            <span>{lines[0]}</span>
            <span>{lines[1]}</span>
          </span>
        ) : text}
      </Link>
    </div>
  );
}
