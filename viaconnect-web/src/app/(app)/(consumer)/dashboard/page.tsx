import { ConsumerDashboard } from '@/components/dashboard/ConsumerDashboard';
import { resolveSessionRole } from '@/lib/auth/resolve-session-role';

export default async function ConsumerDashboardPage() {
  const session = await resolveSessionRole('app.dashboard.page');
  const sessionRole = session?.role ?? 'consumer';
  return <ConsumerDashboard sessionRole={sessionRole} />;
}
