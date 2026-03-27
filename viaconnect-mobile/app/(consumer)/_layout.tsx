import { Slot } from 'expo-router';
import {
  DashboardShell,
  NavItem,
} from '../../src/components/shared/DashboardShell';

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', icon: '🏠', href: '/(consumer)' },
  { label: 'Helix', icon: '🏆', href: '/(consumer)/helix' },
  { label: 'Supplements', icon: '💊', href: '/(consumer)/supplements' },
  { label: 'Genetics', icon: '🧬', href: '/(consumer)/genetics' },
  { label: 'Profile', icon: '👤', href: '/(consumer)/profile' },
];

export default function ConsumerLayout() {
  return (
    <DashboardShell
      navItems={NAV_ITEMS}
      portalName="Personal Wellness"
      portalColor="#224852"
    >
      <Slot />
    </DashboardShell>
  );
}
