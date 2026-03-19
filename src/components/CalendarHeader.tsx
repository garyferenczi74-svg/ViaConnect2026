"use client";

export type ViewMode = "week" | "day" | "month";

interface CalendarHeaderProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  weekLabel: string;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onNewAppointment: () => void;
}

export default function CalendarHeader({
  viewMode,
  onViewModeChange,
  weekLabel,
  onPrev,
  onNext,
  onToday,
  onNewAppointment,
}: CalendarHeaderProps) {
  const modes: { key: ViewMode; label: string }[] = [
    { key: "day", label: "Day" },
    { key: "week", label: "Week" },
    { key: "month", label: "Month" },
  ];

  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
      <div>
        <div className="flex items-center gap-3">
          <h2 className="text-3xl font-black tracking-tighter text-[#dce2f7]">Weekly Planner</h2>
          <div className="flex items-center gap-1">
            <button onClick={onPrev} className="w-7 h-7 rounded-lg hover:bg-[#232a3a] flex items-center justify-center text-[#dce2f7]/40 hover:text-[#dce2f7] transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </button>
            <button onClick={onToday} className="px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest text-[#dce2f7]/40 hover:text-[#6bfb9a] transition-colors">
              Today
            </button>
            <button onClick={onNext} className="w-7 h-7 rounded-lg hover:bg-[#232a3a] flex items-center justify-center text-[#dce2f7]/40 hover:text-[#dce2f7] transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          </div>
        </div>
        <p className="font-mono text-xs text-[#6bfb9a]/70 uppercase mt-1 tracking-widest">{weekLabel}</p>
      </div>

      <div className="flex items-center gap-3">
        {/* View mode toggles */}
        <div className="flex bg-[#141b2b] p-1 rounded-xl">
          {modes.map((m) => (
            <button
              key={m.key}
              onClick={() => onViewModeChange(m.key)}
              className={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition-colors ${
                viewMode === m.key
                  ? "bg-[#6bfb9a]/10 text-[#6bfb9a] rounded-lg shadow-sm"
                  : "text-[#dce2f7]/40 hover:text-[#6bfb9a]"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* New appointment */}
        <button
          onClick={onNewAppointment}
          className="bg-[#6bfb9a] text-[#003919] font-bold px-5 py-2.5 rounded-xl flex items-center gap-2 text-sm shadow-[0_0_20px_rgba(107,251,154,0.3)] hover:scale-105 transition-transform active:scale-95"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          New Appointment
        </button>
      </div>
    </div>
  );
}
