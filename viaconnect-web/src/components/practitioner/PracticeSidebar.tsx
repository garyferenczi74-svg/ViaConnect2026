'use client';

// Revised Prompt #91 Phase 5.3: Practice tab sidebar.
// All credential types see this when the Practice tab is active.

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Users, ClipboardList, ShoppingBag,
  GraduationCap, BarChart3, CreditCard, Settings,
  type LucideIcon,
} from 'lucide-react';

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const ITEMS: NavItem[] = [
  { href: '/practitioner/dashboard',    label: 'Dashboard',       icon: LayoutDashboard },
  { href: '/practitioner/patients',     label: 'Patient Panel',   icon: Users },
  { href: '/practitioner/protocols',    label: 'Protocols',       icon: ClipboardList },
  { href: '/practitioner/shop',         label: 'Shop, Wholesale', icon: ShoppingBag },
  { href: '/practitioner/certification',label: 'Certification',   icon: GraduationCap },
  { href: '/practitioner/analytics',    label: 'Analytics',       icon: BarChart3 },
  { href: '/practitioner/billing',      label: 'Billing',         icon: CreditCard },
  { href: '/practitioner/settings',     label: 'Settings',        icon: Settings },
];

export function PracticeSidebar() {
  const pathname = usePathname();
  return (
    <ul className="space-y-1">
      {ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive =
          pathname === item.href ||
          (item.href !== '/practitioner/dashboard' &&
            pathname.startsWith(item.href + '/'));
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-portal-green/40 ${
                isActive
                  ? 'bg-portal-green/15 text-portal-green font-medium'
                  : 'text-white/65 hover:bg-white/[0.04] hover:text-white'
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" strokeWidth={1.5} />
              <span>{item.label}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
