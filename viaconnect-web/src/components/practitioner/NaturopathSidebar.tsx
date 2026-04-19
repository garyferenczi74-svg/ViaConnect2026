'use client';

// Revised Prompt #91 Phase 6.1: Naturopath tab sidebar.
// Renders only when the Naturopath tab is active. Visible only for nd, dc,
// lac credential types (the tab itself is hidden for everyone else).
// Uses the labeled grouping pattern with a visible divider per spec.

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Brain, Leaf, Wind, Flower2,
  type LucideIcon,
} from 'lucide-react';

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  description: string;
}

const ITEMS: NavItem[] = [
  {
    href: '/practitioner/naturopath/holistic-advisor',
    label: 'AI Holistic Advisor',
    icon: Brain,
    description: 'Naturopathic-framed AI clinical support',
  },
  {
    href: '/practitioner/naturopath/botanicals',
    label: 'Botanicals',
    icon: Leaf,
    description: 'Materia medica and monographs',
  },
  {
    href: '/practitioner/naturopath/constitutional',
    label: 'Constitutional',
    icon: Wind,
    description: 'Ayurvedic, TCM, Homeopathic frameworks',
  },
  {
    href: '/practitioner/naturopath/natural-protocols',
    label: 'Natural Protocols',
    icon: Flower2,
    description: 'Build botanical and lifestyle protocols',
  },
];

export function NaturopathSidebar() {
  const pathname = usePathname();
  return (
    <div className="space-y-4">
      <div className="px-3 pt-2">
        <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300/80">
          Naturopathic Tools
        </h3>
        <p className="mt-1 text-xs leading-relaxed text-white/45">
          Clinical tools for naturopathic, constitutional, and botanical medicine.
        </p>
      </div>

      <div className="border-t border-white/[0.08]" />

      <ul className="space-y-1">
        {ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`flex items-start gap-3 rounded-md px-3 py-2 text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 ${
                  isActive
                    ? 'bg-emerald-500/15 text-emerald-200 font-medium'
                    : 'text-white/65 hover:bg-white/[0.04] hover:text-white'
                }`}
              >
                <Icon className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.5} />
                <div className="flex-1 min-w-0">
                  <div className="font-medium">{item.label}</div>
                  {isActive && (
                    <div className="mt-0.5 text-xs text-white/55">
                      {item.description}
                    </div>
                  )}
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
