'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Dna, Pill, Gift, ShoppingBag, Star } from 'lucide-react';
import { RewardCard } from '@/components/helix/RewardCard';
import { ConsultIcon } from '@/components/helix/HelixIcons';
import { useUserDashboardData } from '@/hooks/useUserDashboardData';
import { formatHelixBalance, NOT_ENOUGH_DATA } from '@/lib/helix/consumer-honesty';
import type { IconType } from '@/types/icon';

interface CatalogItem {
  id: string;
  display_name: string;
  description: string | null;
  points_cost: number;
  redemption_type: string;
}

function iconForItem(item: CatalogItem): { icon: IconType; glow: 'teal' | 'orange' } {
  const type = `${item.redemption_type} ${item.display_name}`.toLowerCase();
  if (type.includes('consult')) return { icon: ConsultIcon, glow: 'teal' };
  if (type.includes('gene') || type.includes('test')) return { icon: Dna, glow: 'teal' };
  if (type.includes('supply') || type.includes('supplement')) return { icon: Pill, glow: 'teal' };
  if (type.includes('merch') || type.includes('shop')) return { icon: ShoppingBag, glow: 'orange' };
  if (type.includes('vip') || type.includes('access')) return { icon: Star, glow: 'orange' };
  return { icon: Gift, glow: 'orange' };
}

export default function RedeemPage() {
  const { helixBalance } = useUserDashboardData();
  const balance = formatHelixBalance(helixBalance?.current_balance);
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/helix/redemption-catalog', { credentials: 'include' });
        if (!res.ok) {
          if (!cancelled) setLoaded(true);
          return;
        }
        const body = (await res.json()) as { items?: CatalogItem[] };
        if (!cancelled) setItems(Array.isArray(body.items) ? body.items : []);
      } catch {
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex flex-col gap-4 md:gap-6 p-4 md:p-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h2 className="text-[22px] font-extrabold text-[#B75E18]">Spend Your Helix</h2>
        <p className="text-[14px] text-white/40 mt-1">
          Redeem your earned Helix for premium rewards, products, and experiences
        </p>
      </motion.div>

      {loaded && items.length === 0 ? (
        <p className="text-sm text-white/45">{NOT_ENOUGH_DATA}</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          {items.map((item, i) => {
            const { icon, glow } = iconForItem(item);
            const cost = Number.isFinite(item.points_cost) ? item.points_cost : 0;
            return (
              <RewardCard
                key={item.id}
                icon={icon}
                glow={glow}
                name={item.display_name}
                description={item.description ?? ''}
                cost={cost}
                userBalance={balance}
                index={i}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
