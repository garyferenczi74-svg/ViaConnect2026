'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Plug } from 'lucide-react';
import { APP_REGISTRY, getAppsByCategory, type AppCategory } from '@/lib/integrations/appRegistry';
import { AppConnectionCard } from '@/components/settings/AppConnectionCard';

interface ConnectionState {
  isActive: boolean;
  lastSyncAt: string | null;
  syncStatus: 'healthy' | 'error' | 'reauth_needed';
}

const CATEGORIES: { id: AppCategory; label: string }[] = [
  { id: 'nutrition', label: 'Nutrition Trackers' },
  { id: 'fitness', label: 'Wearables and Fitness' },
  { id: 'mindfulness', label: 'Mindfulness' },
];

export default function IntegrationsPage() {
  const [connections, setConnections] = useState<Record<string, ConnectionState>>({});

  useEffect(() => {
    (async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data } = await (supabase as any)
          .from('data_source_connections')
          .select('source_id, is_active, last_sync_at')
          .eq('user_id', user.id);

        if (data) {
          const map: Record<string, ConnectionState> = {};
          for (const conn of data) {
            map[conn.source_id] = {
              isActive: conn.is_active,
              lastSyncAt: conn.last_sync_at,
              syncStatus: conn.is_active ? 'healthy' : 'reauth_needed',
            };
          }
          setConnections(map);
        }
      } catch { /* table may not exist yet */ }
    })();
  }, []);

  const handleConnect = useCallback((appId: string) => {
    // In production: redirect to OAuth2 authorization URL
    // For now: show that the flow would start
    const redirectUri = `${window.location.origin}/api/integrations/oauth/${appId}/callback`;
    console.log(`OAuth flow for ${appId} would redirect to authorization URL with callback: ${redirectUri}`);
    alert(`${appId} OAuth connection coming soon. The authorization flow will redirect to ${appId}'s login page.`);
  }, []);

  const handleDisconnect = useCallback(async (appId: string) => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await (supabase as any)
        .from('data_source_connections')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .eq('source_id', appId);

      setConnections((prev) => ({
        ...prev,
        [appId]: { ...prev[appId], isActive: false, syncStatus: 'reauth_needed' },
      }));
    } catch { /* table may not exist yet */ }
  }, []);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white sm:text-2xl">Connected Apps</h1>
        <p className="mt-1 text-sm text-white/40">Link your apps to power your scores</p>
      </div>

      {CATEGORIES.map((cat) => {
        const apps = getAppsByCategory(cat.id);
        if (apps.length === 0) return null;
        return (
          <section key={cat.id}>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/50">
              {cat.label}
            </h2>
            <div className="space-y-3">
              {apps.map((app) => (
                <AppConnectionCard
                  key={app.id}
                  app={app}
                  connection={connections[app.id]}
                  onConnect={() => handleConnect(app.id)}
                  onDisconnect={() => handleDisconnect(app.id)}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
