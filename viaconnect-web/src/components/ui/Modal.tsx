"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";

export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  className = "",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm" />
        <Dialog.Content
          className={`fixed left-1/2 top-1/2 z-[61] w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border p-6 shadow-2xl ${className}`}
          style={{
            background: "#111827",
            borderColor: "rgba(255,255,255,0.08)",
          }}
        >
          <div className="flex items-start justify-between mb-4">
            <div>
              <Dialog.Title className="text-lg font-semibold text-white">
                {title}
              </Dialog.Title>
              {description && (
                <Dialog.Description className="text-sm text-gray-500 mt-1">
                  {description}
                </Dialog.Description>
              )}
            </div>
            <Dialog.Close className="text-gray-500 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/[0.04]">
              <X className="w-4 h-4" />
            </Dialog.Close>
          </div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
