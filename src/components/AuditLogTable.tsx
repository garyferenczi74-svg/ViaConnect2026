"use client";

import { useState, useMemo } from "react";
import { AuditLogEntry, STATUS_STYLES, users, actionTypes } from "@/data/compliance";

interface AuditLogTableProps {
  entries: AuditLogEntry[];
}

const PAGE_SIZE = 20;

export default function AuditLogTable({ entries }: AuditLogTableProps) {
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState("All Users");
  const [selectedAction, setSelectedAction] = useState("All Actions");
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    return entries.filter((entry) => {
      if (search) {
        const q = search.toLowerCase();
        if (
          !entry.user.toLowerCase().includes(q) &&
          !entry.action.toLowerCase().includes(q) &&
          !entry.resource.toLowerCase().includes(q) &&
          !entry.ipAddress.includes(q)
        )
          return false;
      }
      if (selectedUser !== "All Users" && entry.user !== selectedUser) return false;
      if (selectedAction !== "All Actions" && entry.action !== selectedAction) return false;
      return true;
    });
  }, [entries, search, selectedUser, selectedAction]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const handleFilterChange = () => setPage(0);

  return (
    <div className="glass-card rounded-3xl overflow-hidden">
      {/* Header with Search */}
      <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#3d4a3e]/10">
        <h3 className="text-xl font-bold">Searchable Audit Log</h3>
        <div className="flex flex-wrap gap-3 flex-1 md:justify-end">
          <div className="relative w-full md:w-96">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#dce2f7]/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); handleFilterChange(); }}
              placeholder="Search logs by User, Action, or IP..."
              className="w-full bg-[#070e1d] border-none rounded-xl py-2 pl-10 pr-4 text-sm text-[#dce2f7] placeholder-[#dce2f7]/25 focus:outline-none focus:ring-1 focus:ring-[#6bfb9a]/40 transition-colors"
            />
          </div>
          <select
            value={selectedUser}
            onChange={(e) => { setSelectedUser(e.target.value); handleFilterChange(); }}
            className="bg-[#070e1d] border border-[#3d4a3e]/30 rounded-xl px-4 py-2.5 text-sm text-[#dce2f7] focus:outline-none focus:border-[#4ade80]/50 appearance-none min-w-[140px]"
          >
            {users.map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
          <select
            value={selectedAction}
            onChange={(e) => { setSelectedAction(e.target.value); handleFilterChange(); }}
            className="bg-[#070e1d] border border-[#3d4a3e]/30 rounded-xl px-4 py-2.5 text-sm text-[#dce2f7] focus:outline-none focus:border-[#4ade80]/50 appearance-none min-w-[140px]"
          >
            {actionTypes.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-[#323949]/50">
            <tr>
              <th className="px-6 py-4 text-[10px] font-mono text-[#bccabb] uppercase tracking-widest">Timestamp</th>
              <th className="px-6 py-4 text-[10px] font-mono text-[#bccabb] uppercase tracking-widest">User</th>
              <th className="px-6 py-4 text-[10px] font-mono text-[#bccabb] uppercase tracking-widest">Action</th>
              <th className="px-6 py-4 text-[10px] font-mono text-[#bccabb] uppercase tracking-widest">Resource</th>
              <th className="px-6 py-4 text-[10px] font-mono text-[#bccabb] uppercase tracking-widest">IP Address</th>
              <th className="px-6 py-4 text-[10px] font-mono text-[#bccabb] uppercase tracking-widest text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#3d4a3e]/5">
            {paged.map((entry, idx) => {
              const style = STATUS_STYLES[entry.status];
              return (
                <tr
                  key={entry.id}
                  className={`hover:bg-[#232a3a] transition-colors ${idx % 2 === 1 ? "bg-[#070e1d]/30" : ""}`}
                >
                  <td className="px-6 py-4 text-xs font-mono">{formatTimestamp(entry.timestamp)}</td>
                  <td className="px-6 py-4 text-sm font-bold">{entry.user}</td>
                  <td className="px-6 py-4 text-sm text-[#bccabb]">{entry.action}</td>
                  <td className="px-6 py-4 text-sm text-[#bccabb] max-w-[250px] truncate">{entry.resource}</td>
                  <td className="px-6 py-4 text-xs font-mono text-[#dce2f7]/40">{entry.ipAddress}</td>
                  <td className="px-6 py-4 text-right">
                    <span className={`text-[10px] font-bold uppercase px-3 py-1 rounded-full border ${style.bg} ${style.text} ${style.border}`}>
                      {style.label}
                    </span>
                  </td>
                </tr>
              );
            })}
            {paged.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-sm text-[#dce2f7]/30">
                  No log entries match your filters
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="p-4 border-t border-[#3d4a3e]/10 flex justify-between items-center">
        <p className="text-[10px] text-[#bccabb] font-mono">
          PAGE {page + 1} OF {Math.max(1, totalPages)}
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => setPage(Math.max(0, page - 1))}
            disabled={page === 0}
            className="p-1 hover:bg-[#232a3a] rounded transition-colors disabled:opacity-20"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
          <button
            onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
            disabled={page >= totalPages - 1}
            className="p-1 hover:bg-[#232a3a] rounded transition-colors disabled:opacity-20"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </button>
        </div>
      </div>

      <style jsx>{`
        .glass-card {
          background: rgba(46, 53, 69, 0.4);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(134, 148, 134, 0.15);
        }
      `}</style>
    </div>
  );
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffMin < 1440) return `${Math.floor(diffMin / 60)}h ago`;

  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) +
    " " + d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}
