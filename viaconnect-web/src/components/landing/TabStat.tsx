"use client";

interface TabStatProps {
  stats: { value: string; label: string }[];
}

export function TabStat({ stats }: TabStatProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 my-8">
      {stats.map((s, i) => (
        <div key={i} className="text-center">
          <p className="text-4xl md:text-5xl font-bold text-[#06B6D4]">{s.value}</p>
          <p className="text-sm text-white/50 mt-1">{s.label}</p>
        </div>
      ))}
    </div>
  );
}
