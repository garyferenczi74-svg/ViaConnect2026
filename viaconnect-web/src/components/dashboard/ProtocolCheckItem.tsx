'use client';

// ProtocolCheckItem — single check-off row inside TodaysProtocol.

import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

export interface ProtocolCheckItemData {
  id: string;
  productName: string;
  productSlug: string;
  deliveryForm?: string | null;
  dosage?: string | null;
  isCompleted: boolean;
}

interface Props {
  item: ProtocolCheckItemData;
  onToggle: (slug: string) => void;
}

export function ProtocolCheckItem({ item, onToggle }: Props) {
  return (
    <div className="flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-white/[0.03] sm:px-4 sm:py-3">
      <motion.button
        type="button"
        whileTap={{ scale: 0.9 }}
        onClick={() => onToggle(item.productSlug)}
        aria-pressed={item.isCompleted}
        aria-label={`${item.isCompleted ? 'Uncheck' : 'Check'} ${item.productName}`}
        className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2DA5A0]/50`}
      >
        <div
          className={`flex h-6 w-6 items-center justify-center rounded-md border-2 transition-all ${
            item.isCompleted
              ? 'border-[#2DA5A0] bg-[#2DA5A0]'
              : 'border-white/20 bg-transparent hover:border-[#2DA5A0]/60'
          }`}
        >
          {item.isCompleted && (
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ duration: 0.15 }}>
              <Check className="h-3.5 w-3.5 text-white" strokeWidth={2.5} />
            </motion.div>
          )}
        </div>
      </motion.button>

      <div className="min-w-0 flex-1">
        <p
          className={`truncate text-sm font-medium transition-colors ${
            item.isCompleted ? 'text-white/40 line-through' : 'text-white/85'
          }`}
        >
          {item.productName}
        </p>
        <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
          {item.dosage && <span className="text-[10px] text-white/35">{item.dosage}</span>}
          {item.deliveryForm && (
            <span className="rounded bg-white/[0.05] px-1.5 py-0.5 text-[10px] text-white/40">
              {item.deliveryForm}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
