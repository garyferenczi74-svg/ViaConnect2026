"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { TabContent } from "./TabContent";
import type { TabId } from "./TabContent";

interface TabDropdownPanelProps {
  activeTab: TabId | null;
  onClose: () => void;
}

export function TabDropdownPanel({ activeTab, onClose }: TabDropdownPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Lock body scroll when open
  useEffect(() => {
    if (activeTab) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [activeTab]);

  // Escape to close
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (activeTab) {
      document.addEventListener("keydown", handleKey);
      return () => document.removeEventListener("keydown", handleKey);
    }
  }, [activeTab, onClose]);

  // Scroll panel to top on tab change
  useEffect(() => {
    if (activeTab && panelRef.current) {
      panelRef.current.scrollTop = 0;
    }
  }, [activeTab]);

  return (
    <AnimatePresence>
      {activeTab && (
        <>
          {/* Backdrop overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/50"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="fixed top-0 left-0 right-0 z-50 mt-[60px]"
            style={{ maxHeight: "calc(100vh - 60px)" }}
          >
            <div
              ref={panelRef}
              className="w-full overflow-y-auto bg-[#0a0f1c]/97 backdrop-blur-[20px] border-b border-[#06B6D4]/20"
              style={{ maxHeight: "80vh" }}
            >
              {/* Close button (mobile + desktop) */}
              <div className="sticky top-0 z-10 flex justify-end px-6 pt-4">
                <button
                  onClick={onClose}
                  className="w-10 h-10 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors text-white/50 hover:text-white"
                >
                  <X className="w-5 h-5" strokeWidth={1.5} />
                </button>
              </div>

              {/* Content */}
              <div className="max-w-5xl mx-auto px-6 md:px-12 pb-10 md:pb-16">
                <TabContent tab={activeTab} />
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
