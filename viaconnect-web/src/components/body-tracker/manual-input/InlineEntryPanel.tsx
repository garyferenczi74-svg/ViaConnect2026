'use client';

import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface InlineEntryPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function InlineEntryPanel({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
}: InlineEntryPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      panelRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
        inline: 'nearest',
      });
    }, 150);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [open, onOpenChange]);

  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          ref={panelRef}
          initial={{ height: 0, opacity: 0 }}
          animate={{
            height: 'auto',
            opacity: 1,
            transition: {
              height: { duration: 0.35, ease: [0.25, 0.1, 0.25, 1] },
              opacity: { duration: 0.25, delay: 0.1 },
            },
          }}
          exit={{
            height: 0,
            opacity: 0,
            transition: {
              height: { duration: 0.25, ease: [0.25, 0.1, 0.25, 1] },
              opacity: { duration: 0.15 },
            },
          }}
          className="overflow-hidden"
        >
          <div
            role="dialog"
            aria-modal="false"
            aria-label={title}
            className="rounded-2xl border border-white/[0.08] bg-[#1E3054]/90 shadow-lg shadow-black/20 backdrop-blur-xl"
          >
            <div
              className="flex items-start justify-between gap-4 px-4 pt-3 pb-4 sm:px-6 sm:pt-6"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
            >
              <div className="min-w-0">
                <h3 className="truncate text-base font-semibold text-white sm:text-lg">{title}</h3>
                {description && (
                  <p className="mt-0.5 text-xs text-white/55 sm:text-sm">{description}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                aria-label="Close panel"
                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-white/55 transition-colors hover:bg-white/[0.06] hover:text-white"
              >
                <X className="h-5 w-5" strokeWidth={1.5} />
              </button>
            </div>
            <div className="px-4 py-4 sm:px-6 sm:py-5">{children}</div>
            {footer && (
              <div
                className="px-4 py-3 sm:px-6 sm:py-4"
                style={{
                  borderTop: '1px solid rgba(255,255,255,0.06)',
                  background: 'rgba(26,39,68,0.55)',
                }}
              >
                {footer}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
