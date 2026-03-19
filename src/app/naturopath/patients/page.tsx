"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import {
  Search,
  UserPlus,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ClipboardList,
  Download,
  Bell,
  Archive,
} from "lucide-react";

/* ───────── Types ───────── */

interface Patient {
  id: string;
  name: string;
  email: string;
  mrn: string;
  age: number;
  status: "compliant" | "follow-up" | "concerning";
  lastVisit: string;
  activeProtocols: number;
  outcomeTrend: "up" | "down" | "flat";
  geneticStatus: "GX360" | "Pending";
}

/* ───────── Mock Data ───────── */

const patients: Patient[] = [
  { id: "1", name: "James Smith", email: "j.smith@email.com", mrn: "VM-1001", age: 52, status: "concerning", lastVisit: "Mar 6, 2026", activeProtocols: 3, outcomeTrend: "down", geneticStatus: "GX360" },
  { id: "2", name: "Maria Chen", email: "m.chen@email.com", mrn: "VM-1002", age: 41, status: "concerning", lastVisit: "Mar 13, 2026", activeProtocols: 2, outcomeTrend: "down", geneticStatus: "GX360" },
  { id: "3", name: "Raj Patel", email: "r.patel@email.com", mrn: "VM-1003", age: 38, status: "follow-up", lastVisit: "Mar 15, 2026", activeProtocols: 1, outcomeTrend: "flat", geneticStatus: "GX360" },
  { id: "4", name: "Amy Lee", email: "a.lee@email.com", mrn: "VM-1004", age: 29, status: "follow-up", lastVisit: "Mar 16, 2026", activeProtocols: 2, outcomeTrend: "up", geneticStatus: "Pending" },
  { id: "5", name: "Kevin Brown", email: "k.brown@email.com", mrn: "VM-1005", age: 64, status: "follow-up", lastVisit: "Mar 11, 2026", activeProtocols: 4, outcomeTrend: "up", geneticStatus: "GX360" },
  { id: "6", name: "Sarah Wilson", email: "s.wilson@email.com", mrn: "VM-1006", age: 45, status: "compliant", lastVisit: "Mar 17, 2026", activeProtocols: 1, outcomeTrend: "up", geneticStatus: "GX360" },
  { id: "7", name: "David Kim", email: "d.kim@email.com", mrn: "VM-1007", age: 57, status: "compliant", lastVisit: "Mar 14, 2026", activeProtocols: 2, outcomeTrend: "up", geneticStatus: "GX360" },
  { id: "8", name: "Lisa Nguyen", email: "l.nguyen@email.com", mrn: "VM-1008", age: 33, status: "compliant", lastVisit: "Mar 18, 2026", activeProtocols: 1, outcomeTrend: "flat", geneticStatus: "Pending" },
  { id: "9", name: "Tom Rivera", email: "t.rivera@email.com", mrn: "VM-1009", age: 48, status: "compliant", lastVisit: "Mar 12, 2026", activeProtocols: 3, outcomeTrend: "up", geneticStatus: "GX360" },
  { id: "10", name: "Emily Chang", email: "e.chang@email.com", mrn: "VM-1010", age: 36, status: "follow-up", lastVisit: "Mar 10, 2026", activeProtocols: 2, outcomeTrend: "down", geneticStatus: "GX360" },
  { id: "11", name: "Mark Johnson", email: "m.johnson@email.com", mrn: "VM-1011", age: 61, status: "compliant", lastVisit: "Mar 9, 2026", activeProtocols: 1, outcomeTrend: "up", geneticStatus: "GX360" },
  { id: "12", name: "Nina Desai", email: "n.desai@email.com", mrn: "VM-1012", age: 27, status: "compliant", lastVisit: "Mar 17, 2026", activeProtocols: 2, outcomeTrend: "up", geneticStatus: "Pending" },
  { id: "13", name: "Oscar Morales", email: "o.morales@email.com", mrn: "VM-1013", age: 55, status: "follow-up", lastVisit: "Mar 8, 2026", activeProtocols: 3, outcomeTrend: "flat", geneticStatus: "GX360" },
  { id: "14", name: "Hannah Park", email: "h.park@email.com", mrn: "VM-1014", age: 42, status: "compliant", lastVisit: "Mar 16, 2026", activeProtocols: 1, outcomeTrend: "up", geneticStatus: "GX360" },
  { id: "15", name: "Ben Taylor", email: "b.taylor@email.com", mrn: "VM-1015", age: 70, status: "concerning", lastVisit: "Mar 5, 2026", activeProtocols: 5, outcomeTrend: "down", geneticStatus: "GX360" },
];

const statusFilters = ["All", "Active", "Needs Follow-up", "Archived"] as const;

const statusDot: Record<Patient["status"], string> = {
  compliant: "bg-green-400",
  "follow-up": "bg-yellow-400",
  concerning: "bg-red-400",
};

const trendIcon: Record<Patient["outcomeTrend"], { icon: typeof ArrowUpRight; color: string }> = {
  up: { icon: ArrowUpRight, color: "text-green-400" },
  down: { icon: ArrowDownRight, color: "text-red-400" },
  flat: { icon: Minus, color: "text-white/40" },
};

/* ───────── Page ───────── */

export default function PatientsPage() {
  const [searchRaw, setSearchRaw] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<string>("All");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const perPage = 50;

  // 300ms debounce
  const handleSearch = useCallback((value: string) => {
    setSearchRaw(value);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setSearchQuery(value), 300);
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // Filter + search
  const filtered = useMemo(() => {
    let list = patients;
    if (activeFilter === "Active") list = list.filter((p) => p.status === "compliant");
    else if (activeFilter === "Needs Follow-up") list = list.filter((p) => p.status === "follow-up" || p.status === "concerning");
    // "Archived" shows none for mock purposes
    else if (activeFilter === "Archived") list = [];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.mrn.toLowerCase().includes(q) ||
          p.email.toLowerCase().includes(q)
      );
    }
    return list;
  }, [activeFilter, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const pageItems = filtered.slice((page - 1) * perPage, page * perPage);

  const allSelected = pageItems.length > 0 && pageItems.every((p) => selected.has(p.id));

  const toggleAll = () => {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(pageItems.map((p) => p.id)));
    }
  };

  const toggleOne = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  return (
    <div className="space-y-0">
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Patients</h1>
        <button className="bg-green-400 hover:bg-green-500 text-gray-900 font-semibold px-5 py-2.5 rounded-lg flex items-center gap-2 transition-colors duration-200">
          <UserPlus className="w-4 h-4" />
          New Patient
        </button>
      </div>

      {/* ── Search ── */}
      <div className="w-full bg-gray-800/50 border border-gray-600/50 focus-within:border-green-400/50 rounded-xl px-4 py-3 flex items-center gap-3 transition-all duration-200 mb-4">
        <Search className="w-5 h-5 text-white/30 shrink-0" />
        <input
          type="text"
          value={searchRaw}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search by name, MRN, or email..."
          className="bg-transparent text-white placeholder:text-white/30 flex-1 text-sm outline-none"
        />
        <span className="bg-gray-700 text-white/40 text-xs px-2 py-0.5 rounded font-mono shrink-0">
          ⌘K
        </span>
      </div>

      {/* ── Filters ── */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
        {statusFilters.map((f) => (
          <button
            key={f}
            onClick={() => { setActiveFilter(f); setPage(1); }}
            className={`rounded-full px-4 py-1.5 text-sm font-medium whitespace-nowrap transition-all duration-200 ${
              activeFilter === f
                ? "bg-green-400 text-gray-900"
                : "bg-transparent border border-gray-600/50 text-white/60 hover:text-white"
            }`}
          >
            {f}
          </button>
        ))}

        <div className="border-l border-gray-700/50 h-6 mx-1" />

        {["Protocol Type", "Last Visit Range", "Genetic Status"].map((label) => (
          <button
            key={label}
            className="flex items-center gap-1.5 rounded-full border border-gray-600/50 text-white/60 hover:text-white px-4 py-1.5 text-sm whitespace-nowrap transition-colors duration-200"
          >
            {label}
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        ))}
      </div>

      {/* ── Table ── */}
      <div className="bg-gray-800/50 backdrop-blur-sm border border-green-400/15 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className="bg-gray-800 text-xs font-medium text-white/40 uppercase tracking-wider">
                <th className="px-4 py-3 text-left w-10">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    className="rounded border-gray-600 bg-gray-700 text-green-400 focus:ring-green-400/20 focus:ring-offset-0"
                  />
                </th>
                <th className="px-4 py-3 text-left w-8"></th>
                <th className="px-4 py-3 text-left">Patient</th>
                <th className="px-4 py-3 text-left">MRN</th>
                <th className="px-4 py-3 text-left">Age</th>
                <th className="px-4 py-3 text-left">Last Visit</th>
                <th className="px-4 py-3 text-left">Protocols</th>
                <th className="px-4 py-3 text-left">Trend</th>
                <th className="px-4 py-3 text-left">Genetic</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((p) => {
                const Trend = trendIcon[p.outcomeTrend];
                const TrendIcon = Trend.icon;
                return (
                  <tr
                    key={p.id}
                    className="border-b border-gray-700/30 hover:bg-gray-700/20 cursor-pointer transition-colors duration-200"
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selected.has(p.id)}
                        onChange={() => toggleOne(p.id)}
                        className="rounded border-gray-600 bg-gray-700 text-green-400 focus:ring-green-400/20 focus:ring-offset-0"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block w-2.5 h-2.5 rounded-full ${statusDot[p.status]}`} />
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-white">{p.name}</p>
                      <p className="text-xs text-white/40">{p.email}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-white/60">{p.mrn}</td>
                    <td className="px-4 py-3 text-sm text-white/60">{p.age}</td>
                    <td className="px-4 py-3 text-sm text-white/60">{p.lastVisit}</td>
                    <td className="px-4 py-3">
                      <span className="bg-green-400/10 text-green-400 text-xs font-medium px-2 py-0.5 rounded-full">
                        {p.activeProtocols}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <TrendIcon className={`w-4 h-4 ${Trend.color}`} />
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          p.geneticStatus === "GX360"
                            ? "bg-green-400/20 text-green-400"
                            : "bg-yellow-400/20 text-yellow-400"
                        }`}
                      >
                        {p.geneticStatus}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {pageItems.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-white/40 text-sm">
                    No patients found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Pagination ── */}
      <div className="flex items-center justify-between mt-4">
        <span className="text-sm text-white/40">
          Showing {filtered.length === 0 ? 0 : (page - 1) * perPage + 1}–
          {Math.min(page * perPage, filtered.length)} of {filtered.length}
        </span>
        <div className="flex items-center gap-1">
          <button
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
            className="p-2 rounded-lg text-white/40 hover:text-white disabled:opacity-30 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              onClick={() => setPage(n)}
              className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors duration-200 ${
                page === n
                  ? "bg-green-400 text-gray-900"
                  : "text-white/40 hover:text-white hover:bg-gray-700/50"
              }`}
            >
              {n}
            </button>
          ))}
          <button
            disabled={page === totalPages}
            onClick={() => setPage(page + 1)}
            className="p-2 rounded-lg text-white/40 hover:text-white disabled:opacity-30 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Bulk Actions ── */}
      {selected.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 md:left-64 bg-gray-800 border-t border-green-400/15 px-5 py-3 flex items-center gap-4 z-40">
          <span className="text-sm text-white font-medium">
            {selected.size} selected
          </span>
          <div className="flex items-center gap-2 ml-auto">
            {[
              { label: "Assign Protocol", icon: ClipboardList },
              { label: "Export", icon: Download },
              { label: "Send Reminders", icon: Bell },
              { label: "Archive", icon: Archive },
            ].map((action) => (
              <button
                key={action.label}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-white/80 hover:bg-green-400/10 hover:text-white transition-colors duration-200 border border-gray-700/50"
              >
                <action.icon className="w-4 h-4" />
                {action.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
