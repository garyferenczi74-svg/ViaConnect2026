import { Slot } from 'expo-router';
import {
  DashboardShell,
  NavItem,
} from '../../src/components/shared/DashboardShell';

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', icon: '🏥', href: '/(practitioner)' },
  { label: 'Patients', icon: '👥', href: '/(practitioner)/patients' },
  { label: 'Protocols', icon: '📋', href: '/(practitioner)/protocols' },
  { label: 'Analytics', icon: '📈', href: '/(practitioner)/analytics' },
  { label: 'Settings', icon: '⚙️', href: '/(practitioner)/settings' },
];

export default function PractitionerLayout() {
  return (
    <DashboardShell
      navItems={NAV_ITEMS}
      portalName="Practitioner"
      portalColor="#4ADE80"
    >
      <Slot />
    </DashboardShell>
  );
}
