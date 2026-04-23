'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface ManualInputModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function ManualInputModal({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
}: ManualInputModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild>
              <motion.div
                className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              />
            </Dialog.Overlay>
            <Dialog.Content asChild>
              <motion.div
                className="fixed z-[61] flex flex-col overflow-hidden border shadow-2xl rounded-2xl
                           left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2
                           w-[calc(100vw-1.5rem)] max-w-2xl max-h-[calc(100vh-2rem)]
                           sm:w-full sm:max-h-[88vh]"
                style={{
                  background: '#111827',
                  borderColor: 'rgba(255,255,255,0.08)',
                }}
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
              >
                <div
                  className="flex items-start justify-between gap-4 px-4 pt-3 pb-4 sm:px-6 sm:pt-6"
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <div className="min-w-0">
                    <Dialog.Title className="text-base sm:text-lg font-semibold text-white truncate">
                      {title}
                    </Dialog.Title>
                    {description && (
                      <Dialog.Description className="text-xs sm:text-sm text-white/55 mt-0.5">
                        {description}
                      </Dialog.Description>
                    )}
                  </div>
                  <Dialog.Close
                    aria-label="Close"
                    className="flex items-center justify-center rounded-lg text-white/55 hover:text-white hover:bg-white/[0.06] transition-colors min-h-[44px] min-w-[44px]"
                  >
                    <X className="h-5 w-5" strokeWidth={1.5} />
                  </Dialog.Close>
                </div>
                <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
                  {children}
                </div>
                {footer && (
                  <div
                    className="px-4 py-3 sm:px-6 sm:py-4 pb-[max(env(safe-area-inset-bottom),1rem)]"
                    style={{ borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(17,24,39,0.95)' }}
                  >
                    {footer}
                  </div>
                )}
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
