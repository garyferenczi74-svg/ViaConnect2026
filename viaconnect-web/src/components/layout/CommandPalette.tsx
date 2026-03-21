"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import {
  Search,
  FileText,
  Users,
  Dna,
  Pill,
  ClipboardList,
  AlertTriangle,
  Brain,
  ArrowRight,
  Clock,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

type CommandItem = {
  id: string;
  label: string;
  description?: string;
  icon: React.ElementType;
  href?: string;
  action?: () => void;
  category: "page" | "action" | "patient" | "product" | "marker";
};

// ─── Static commands ────────────────────────────────────────────────────────

const PAGES: CommandItem[] = [
  { id: "dashboard", label: "Dashboard", icon: FileText, href: "/dashboard", category: "page" },
  { id: "genetics", label: "Genetics", icon: Dna, href: "/genetics", category: "page" },
  { id: "supplements", label: "Supplements", icon: Pill, href: "/supplements", category: "page" },
  { id: "patients", label: "Patients", icon: Users, href: "/practitioner/patients", category: "page" },
  { id: "protocols", label: "Protocols", icon: ClipboardList, href: "/practitioner/protocols", category: "page" },
  { id: "interactions", label: "Interactions", icon: AlertTriangle, href: "/practitioner/interactions", category: "page" },
  { id: "ai-advisor", label: "AI Advisor", icon: Brain, href: "/practitioner/ai", category: "page" },
];

const ACTIONS: CommandItem[] = [
  { id: "new-protocol", label: "New Protocol", description: "Create a new treatment protocol", icon: ClipboardList, href: "/practitioner/protocols/builder", category: "action" },
  { id: "search-patient", label: "Search Patient", description: "Find a patient by name or ID", icon: Users, href: "/practitioner/patients", category: "action" },
  { id: "interaction-check", label: "Run Interaction Check", description: "Check supplement interactions", icon: AlertTriangle, href: "/practitioner/interactions", category: "action" },
];

const PRODUCTS: CommandItem[] = [
  { id: "mthfr-plus", label: "MTHFR+", description: "Methylation support", icon: Pill, category: "product" },
  { id: "comt-plus", label: "COMT+", description: "Catechol metabolism", icon: Pill, category: "product" },
  { id: "focus-plus", label: "FOCUS+", description: "Cognitive enhancement", icon: Pill, category: "product" },
  { id: "blast-plus", label: "BLAST+", description: "Energy & performance", icon: Pill, category: "product" },
  { id: "shred-plus", label: "SHRED+", description: "Weight management", icon: Pill, category: "product" },
  { id: "nad-plus", label: "NAD+", description: "Cellular repair", icon: Pill, category: "product" },
];

const MARKERS: CommandItem[] = [
  { id: "mthfr-c677t", label: "MTHFR C677T", description: "Methylation gene variant", icon: Dna, category: "marker" },
  { id: "comt-v158m", label: "COMT V158M", description: "Catecholamine metabolism", icon: Dna, category: "marker" },
  { id: "cyp1a2", label: "CYP1A2", description: "Caffeine metabolism", icon: Dna, category: "marker" },
  { id: "apoe", label: "APOE", description: "Lipid metabolism", icon: Dna, category: "marker" },
  { id: "vdr-bsm", label: "VDR Bsm", description: "Vitamin D receptor", icon: Dna, category: "marker" },
];

const ALL_COMMANDS: CommandItem[] = [...PAGES, ...ACTIONS, ...PRODUCTS, ...MARKERS];

const CATEGORY_LABELS: Record<string, string> = {
  page: "Pages",
  action: "Quick Actions",
  patient: "Patients",
  product: "Products",
  marker: "Genetic Markers",
};

// ─── Fuzzy match ────────────────────────────────────────────────────────────

function fuzzyMatch(query: string, text: string): boolean {
  const q = query.toLowerCase();
  const t = text.toLowerCase();
  if (t.includes(q)) return true;
  // Simple fuzzy: each char of query appears in order in text
  let qi = 0;
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) qi++;
  }
  return qi === q.length;
}

// ─── Recent items (localStorage) ────────────────────────────────────────────

const RECENT_KEY = "viaconnect-recent-commands";
const MAX_RECENT = 5;

function getRecent(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
  } catch {
    return [];
  }
}

function addRecent(id: string) {
  const recent = getRecent().filter((r) => r !== id);
  recent.unshift(id);
  localStorage.setItem(RECENT_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)));
}

// ─── Component ──────────────────────────────────────────────────────────────

export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [recentIds, setRecentIds] = useState<string[]>([]);

  // Load recent on open
  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIndex(0);
      setRecentIds(getRecent());
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Filter results
  const results = useMemo(() => {
    if (!query.trim()) {
      // Show recent items first, then actions
      const recent = recentIds
        .map((id) => ALL_COMMANDS.find((c) => c.id === id))
        .filter(Boolean) as CommandItem[];
      return recent.length > 0 ? recent : ACTIONS;
    }
    return ALL_COMMANDS.filter(
      (item) =>
        fuzzyMatch(query, item.label) ||
        (item.description && fuzzyMatch(query, item.description))
    );
  }, [query, recentIds]);

  // Group by category
  const grouped = useMemo(() => {
    const map = new Map<string, CommandItem[]>();
    for (const item of results) {
      const arr = map.get(item.category) || [];
      arr.push(item);
      map.set(item.category, arr);
    }
    return map;
  }, [results]);

  // Flat list for keyboard nav
  const flatList = useMemo(() => {
    const items: CommandItem[] = [];
    grouped.forEach((group) => {
      items.push(...group);
    });
    return items;
  }, [grouped]);

  // Execute command
  const execute = useCallback(
    (item: CommandItem) => {
      addRecent(item.id);
      onOpenChange(false);
      if (item.href) {
        router.push(item.href);
      } else if (item.action) {
        item.action();
      }
    },
    [onOpenChange, router]
  );

  // Keyboard navigation
  function handleKeyDown(e: React.KeyboardEvent) {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, flatList.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
        break;
      case "Enter":
        e.preventDefault();
        if (flatList[activeIndex]) execute(flatList[activeIndex]);
        break;
    }
  }

  // Scroll active item into view
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-index="${activeIndex}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  let itemIndex = -1;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm animate-in fade-in-0" />
        <Dialog.Content
          className="fixed left-1/2 top-[20%] z-[61] w-full max-w-lg -translate-x-1/2 rounded-xl border overflow-hidden shadow-2xl animate-in fade-in-0 zoom-in-95"
          style={{
            background: "#111827",
            borderColor: "rgba(255,255,255,0.08)",
          }}
          onKeyDown={handleKeyDown}
        >
          <Dialog.Title className="sr-only">Command Palette</Dialog.Title>
          <Dialog.Description className="sr-only">
            Search pages, actions, products, and genetic markers
          </Dialog.Description>

          {/* Search input */}
          <div
            className="flex items-center gap-3 px-4 h-12 border-b"
            style={{ borderBottomColor: "rgba(255,255,255,0.06)" }}
          >
            <Search className="w-4 h-4 text-gray-500 shrink-0" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActiveIndex(0);
              }}
              placeholder="Search pages, patients, products, markers..."
              className="flex-1 bg-transparent text-sm text-white placeholder:text-gray-500 outline-none"
            />
            <kbd className="text-[10px] text-gray-600 bg-dark-surface px-1.5 py-0.5 rounded font-mono">
              ESC
            </kbd>
          </div>

          {/* Results */}
          <div ref={listRef} className="max-h-[320px] overflow-y-auto py-2">
            {flatList.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-8">No results found</p>
            )}

            {Array.from(grouped.entries()).map(([category, items]) => (
              <div key={category}>
                <p className="px-4 pt-3 pb-1 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                  {!query.trim() && recentIds.length > 0 ? (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Recent
                    </span>
                  ) : (
                    CATEGORY_LABELS[category] || category
                  )}
                </p>
                {items.map((item) => {
                  itemIndex++;
                  const idx = itemIndex;
                  return (
                    <button
                      key={item.id}
                      data-index={idx}
                      onClick={() => execute(item)}
                      onMouseEnter={() => setActiveIndex(idx)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                        idx === activeIndex
                          ? "bg-white/[0.06] text-white"
                          : "text-gray-400 hover:bg-white/[0.04]"
                      }`}
                    >
                      <item.icon className="w-4 h-4 shrink-0 text-gray-500" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{item.label}</p>
                        {item.description && (
                          <p className="text-xs text-gray-600 truncate">{item.description}</p>
                        )}
                      </div>
                      {item.href && <ArrowRight className="w-3 h-3 text-gray-600 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Footer */}
          <div
            className="flex items-center justify-between px-4 py-2 border-t text-[11px] text-gray-600"
            style={{ borderTopColor: "rgba(255,255,255,0.06)" }}
          >
            <span>
              <kbd className="bg-dark-surface px-1 py-0.5 rounded font-mono mr-0.5">↑↓</kbd> Navigate
              <kbd className="bg-dark-surface px-1 py-0.5 rounded font-mono mx-1">↵</kbd> Select
            </span>
            <span>{flatList.length} result{flatList.length !== 1 ? "s" : ""}</span>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
