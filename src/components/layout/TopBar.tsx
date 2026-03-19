"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Bell, ChevronRight, User, Settings, HelpCircle, LogOut } from "lucide-react";
import { useSidebar } from "@/contexts/SidebarContext";

const routeLabels: Record<string, string> = {
  "/naturopath": "Dashboard",
  "/naturopath/patients": "Patients",
  "/naturopath/protocols": "Protocols",
  "/naturopath/formulary": "Formulary",
  "/naturopath/outcomes": "Outcomes",
  "/naturopath/ai": "AI Engine",
  "/naturopath/labs": "Labs/EHR",
  "/naturopath/compliance": "Compliance",
  "/naturopath/settings": "Settings",
};

export default function TopBar() {
  const pathname = usePathname();
  const { collapsed } = useSidebar();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentLabel = routeLabels[pathname] || "Page";

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <header
      className={`fixed top-0 right-0 h-16 bg-gray-900/80 backdrop-blur-md border-b border-green-400/10 flex items-center justify-between px-6 z-40 transition-all duration-200 ease-in-out ${
        collapsed ? "md:left-16" : "md:left-64"
      } left-0`}
    >
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm">
        <span className="text-white/40">Portal</span>
        <ChevronRight className="w-3 h-3 text-white/30" />
        <span className="text-white font-medium">{currentLabel}</span>
      </div>

      {/* Search */}
      <div className="hidden sm:flex items-center bg-gray-800/50 border border-gray-600/50 rounded-lg px-4 py-2 w-96 focus-within:border-green-400/50 focus-within:ring-1 focus-within:ring-green-400/20 transition-all duration-200">
        <input
          type="text"
          placeholder="Search patients, protocols, herbs..."
          className="bg-transparent border-none outline-none text-sm text-white placeholder-white/40 w-full"
        />
        <span className="bg-gray-700 text-white/40 text-xs px-1.5 py-0.5 rounded ml-2 shrink-0">
          ⌘K
        </span>
      </div>

      {/* Right */}
      <div className="flex items-center gap-3">
        {/* Notification Bell */}
        <button className="relative p-2 text-white/60 hover:text-white transition-colors duration-200">
          <Bell className="w-5 h-5" />
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-400 text-[10px] text-white rounded-full flex items-center justify-center font-bold">
            3
          </span>
        </button>

        {/* Avatar Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="w-9 h-9 rounded-full bg-green-400/20 flex items-center justify-center text-green-400 text-sm font-bold hover:bg-green-400/30 transition-colors duration-200"
          >
            SC
          </button>
          {dropdownOpen && (
            <div className="absolute right-0 top-12 bg-gray-800 border border-green-400/15 rounded-xl shadow-2xl p-2 w-48 z-50">
              {[
                { label: "Profile", icon: User },
                { label: "Settings", icon: Settings },
                { label: "Help", icon: HelpCircle },
              ].map((item) => (
                <button
                  key={item.label}
                  className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-white/80 hover:bg-green-400/10 hover:text-white transition-all duration-150"
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </button>
              ))}
              <div className="border-t border-green-400/10 my-1" />
              <button className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-red-400 hover:bg-red-400/10 transition-all duration-150">
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
