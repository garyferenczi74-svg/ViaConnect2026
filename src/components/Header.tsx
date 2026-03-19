"use client";

import { PortalType } from "@/lib/types";

const portalStyles: Record<PortalType, { gradient: string; text: string }> = {
  wellness: {
    gradient: "from-green-50 to-white",
    text: "text-green-800",
  },
  practitioner: {
    gradient: "from-blue-50 to-white",
    text: "text-blue-800",
  },
  naturopath: {
    gradient: "from-amber-50 to-white",
    text: "text-amber-800",
  },
};

interface HeaderProps {
  portal: PortalType;
  title: string;
  subtitle?: string;
}

export default function Header({ portal, title, subtitle }: HeaderProps) {
  const styles = portalStyles[portal];

  return (
    <header className={`bg-gradient-to-r ${styles.gradient} border-b border-gray-200 px-8 py-6`}>
      <h1 className={`text-2xl font-bold ${styles.text}`}>{title}</h1>
      {subtitle && <p className="text-gray-600 mt-1 text-sm">{subtitle}</p>}
    </header>
  );
}
