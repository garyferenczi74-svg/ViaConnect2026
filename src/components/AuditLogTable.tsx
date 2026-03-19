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
      {/* Header */}
      <div className="p-6 border-b border-[#3d4a3e]/15">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-[#dce2f7]/60 text-xs uppercase tracking-widest font-medium">
              Audit Log
            </h3>
            <p className="text-xl font-bold text-[#dce2f7] mt-1">Activity Trail</p>
          </div>
          <span className="text-[10px] font-mono text-[#dce2f7]/40">
            {filtered.length} entries
          </span>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#dce2f7]/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); handleFilterChange(); }}
              placeholder="Search logs..."
              className="w-full bg-[#0c1322] border border-[#3d4a3e]/30 rounded-xl pl-10 pr-4 py-2.5 text-sm text-[#dce2f7] placeholder-[#dce2f7]/25 focus:outline-none focus:border-[#4ade80]/50 transition-colors"
            />
          </div>
          <select
            value={selectedUser}
            onChange={(e) => { setSelectedUser(e.target.value); handleFilterChange(); }}
            className="bg-[#0c1322] border border-[#3d4a3e]/30 rounded-xl px-4 py-2.5 text-sm text-[#dce2f7] focus:outline-none focus:border-[#4ade80]/50 appearance-none min-w-[160px]"
          >
            {users.map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
          <select
            value={selectedAction}
            onChange={(e) => { setSelectedAction(e.target.value); handleFilterChange(); }}
            className="bg-[#0c1322] border border-[#3d4a3e]/30 rounded-xl px-4 py-2.5 text-sm text-[#dce2f7] focus:outline-none focus:border-[#4ade80]/50 appearance-none min-w-[160px]"
          >
            {actionTypes.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-[#141b2b]/60">
              <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-[#dce2f7]/40">Timestamp</th>
              <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-[#dce2f7]/40">User</th>
              <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-[#dce2f7]/40">Action</th>
              <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-[#dce2f7]/40">Resource</th>
              <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-[#dce2f7]/40">IP Address</th>
              <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-[#dce2f7]/40">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#3d4a3e]/10">
            {paged.map((entry) => {
              const style = STATUS_STYLES[entry.status];
              return (
                <tr key={entry.id} className="hover:bg-[#232a3a]/30 transition-colors">
                  <td className="px-6 py-3.5 text-xs font-mono text-[#dce2f7]/50 whitespace-nowrap">
                    {formatTimestamp(entry.timestamp)}
                  </td>
                  <td className="px-6 py-3.5 text-xs font-bold text-[#dce2f7] whitespace-nowrap">
                    {entry.user}
                  </td>
                  <td className="px-6 py-3.5 text-xs text-[#dce2f7]/60 whitespace-nowrap">
                    {entry.action}
                  </td>
                  <td className="px-6 py-3.5 text-xs text-[#dce2f7]/50 max-w-[250px] truncate">
                    {entry.resource}
                  </td>
                  <td className="px-6 py-3.5 text-xs font-mono text-[#dce2f7]/40 whitespace-nowrap">
                    {entry.ipAddress}
                  </td>
                  <td className="px-6 py-3.5 whitespace-nowrap">
                    <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full ${style.bg} ${style.text}`}>
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
      {totalPages > 1 && (
        <div className="px-6 py-4 border-t border-[#3d4a3e]/15 flex items-center justify-between">
          <span className="text-[10px] font-mono text-[#dce2f7]/40">
            Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-[#dce2f7]/40 hover:text-[#dce2f7] hover:bg-[#232a3a] disabled:opacity-20 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </button>
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i}
                onClick={() => setPage(i)}
                className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors ${
                  page === i ? "bg-[#4ade80] text-[#003919]" : "text-[#dce2f7]/40 hover:bg-[#232a3a]"
                }`}
              >
                {i + 1}
              </button>
            ))}
            <button
              onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
              disabled={page >= totalPages - 1}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-[#dce2f7]/40 hover:text-[#dce2f7] hover:bg-[#232a3a] disabled:opacity-20 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          </div>
        </div>
      )}

      <style jsx>{`
        .glass-card {
          background: rgba(46, 53, 69, 0.4);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(107, 251, 154, 0.15);
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
