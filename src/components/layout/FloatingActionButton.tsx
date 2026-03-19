"use client";

import { useState, useRef, useEffect } from "react";
import { Plus, UserPlus, ClipboardPlus, Zap } from "lucide-react";

const actions = [
  { label: "New Patient", icon: UserPlus },
  { label: "New Protocol", icon: ClipboardPlus },
  { label: "Quick Check", icon: Zap },
];

export default function FloatingActionButton() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="fixed bottom-6 right-6 z-50 hidden md:block" ref={ref}>
      {/* Expanded Menu */}
      {open && (
        <div className="absolute bottom-16 right-0 bg-gray-800 border border-green-400/15 rounded-xl shadow-2xl p-2 mb-2 w-52">
          {actions.map((action) => (
            <button
              key={action.label}
              className="flex items-center gap-3 w-full px-4 py-2.5 rounded-lg text-white hover:bg-green-400/10 transition-all duration-200 text-sm"
            >
              <action.icon className="w-5 h-5 text-green-400" />
              {action.label}
            </button>
          ))}
        </div>
      )}

      {/* FAB Button */}
      <button
        onClick={() => setOpen(!open)}
        className="bg-green-400 text-gray-900 rounded-full w-14 h-14 flex items-center justify-center shadow-lg shadow-green-400/20 hover:scale-105 active:scale-95 transition-all duration-200"
      >
        <Plus
          className={`w-7 h-7 transition-transform duration-200 ${
            open ? "rotate-45" : ""
          }`}
        />
      </button>
    </div>
  );
}
