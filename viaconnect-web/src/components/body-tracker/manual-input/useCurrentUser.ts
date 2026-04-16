'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface CurrentUser {
  id: string | null;
  unitSystem: 'imperial' | 'metric';
  loading: boolean;
}

export function useCurrentUser(): CurrentUser {
  const [id, setId] = useState<string | null>(null);
  const [unitSystem, setUnitSystem] = useState<'imperial' | 'metric'>('imperial');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const supabase = createClient();
    (async () => {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (!mounted) return;
      if (!user) {
        setLoading(false);
        return;
      }
      setId(user.id);
      const { data: profile } = await supabase
        .from('profiles')
        .select('unit_system')
        .eq('id', user.id)
        .maybeSingle();
      if (mounted && profile && (profile as { unit_system?: string }).unit_system) {
        const u = (profile as { unit_system?: string }).unit_system;
        if (u === 'imperial' || u === 'metric') setUnitSystem(u);
      }
      if (mounted) setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  return { id, unitSystem, loading };
}
