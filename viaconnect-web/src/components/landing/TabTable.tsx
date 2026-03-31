"use client";

interface TabTableProps {
  headers: string[];
  rows: string[][];
}

export function TabTable({ headers, rows }: TabTableProps) {
  return (
    <div className="overflow-x-auto my-6 rounded-lg border border-white/10">
      <table className="w-full min-w-[600px]">
        <thead>
          <tr className="bg-[#0D3B45]/80">
            {headers.map((h, i) => (
              <th key={i} className="text-white/90 font-semibold text-sm uppercase tracking-wider py-3 px-4 text-left">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} className={`${ri % 2 === 0 ? "bg-white/5" : "bg-transparent"} hover:bg-white/10 transition-colors border-b border-white/10`}>
              {row.map((cell, ci) => (
                <td key={ci} className="text-white/70 py-3 px-4 text-sm">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
