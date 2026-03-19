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
    { key: "week", label: "Week" },
    { key: "day", label: "Day" },
    { key: "month", label: "Month" },
  ];

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      <div className="flex items-center gap-4">
        {/* Date navigation */}
        <div className="flex items-center gap-1">
          <button
            onClick={onPrev}
            className="w-9 h-9 rounded-lg hover:bg-[#232a3a] flex items-center justify-center text-[#dce2f7]/60 hover:text-[#dce2f7] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
          <button
            onClick={onToday}
            className="px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest text-[#dce2f7]/60 hover:text-[#4ade80] hover:bg-[#232a3a] transition-colors"
          >
            Today
          </button>
          <button
            onClick={onNext}
            className="w-9 h-9 rounded-lg hover:bg-[#232a3a] flex items-center justify-center text-[#dce2f7]/60 hover:text-[#dce2f7] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </button>
        </div>

        <h2 className="text-lg font-bold text-[#dce2f7] tracking-tight">{weekLabel}</h2>
      </div>

      <div className="flex items-center gap-3">
        {/* View mode toggles */}
        <div className="flex bg-[#141b2b] rounded-xl p-1 border border-[#3d4a3e]/10">
          {modes.map((m) => (
            <button
              key={m.key}
              onClick={() => onViewModeChange(m.key)}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${
                viewMode === m.key
                  ? "bg-[#4ade80] text-[#003919] shadow-lg shadow-[#4ade80]/20"
                  : "text-[#dce2f7]/50 hover:text-[#dce2f7]"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* New appointment */}
        <button
          onClick={onNewAppointment}
          className="bg-[#4ade80] text-[#003919] font-bold px-4 py-2 rounded-xl text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-[#6bfb9a] transition-colors shadow-lg shadow-[#4ade80]/20 active:scale-95"
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
