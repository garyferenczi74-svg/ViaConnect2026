import { Slot } from 'expo-router';
import {
  DashboardShell,
  NavItem,
} from '../../src/components/shared/DashboardShell';

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', icon: '🌿', href: '/(naturopath)' },
  { label: 'Botanicals', icon: '🌱', href: '/(naturopath)/botanicals' },
  { label: 'Formulas', icon: '⚗️', href: '/(naturopath)/formulas' },
  { label: 'Clients', icon: '👥', href: '/(naturopath)/clients' },
  { label: 'Settings', icon: '⚙️', href: '/(naturopath)/settings' },
];

export default function NaturopathLayout() {
  return (
    <DashboardShell
      navItems={NAV_ITEMS}
      portalName="Naturopath"
      portalColor="#6D597A"
    >
      <Slot />
    </DashboardShell>
  );
}
