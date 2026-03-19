"use client";

import { useMemo, useRef, useEffect, useState } from "react";
import {
  Appointment,
  HOURS,
  formatHour,
  formatDateKey,
  TYPE_STYLES,
} from "@/data/schedule";

interface WeekViewGridProps {
  weekDates: Date[];
  appointments: Appointment[];
  onSlotClick: (date: string, hour: number, minute: number) => void;
  onAppointmentClick: (appointment: Appointment) => void;
  onDragReschedule: (appointmentId: string, newDate: string, newHour: number, newMinute: number) => void;
}

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const SLOT_HEIGHT = 80; // h-20 = 5rem = 80px per hour

export default function WeekViewGrid({
  weekDates,
  appointments,
  onSlotClick,
  onAppointmentClick,
}: WeekViewGridProps) {
  const todayKey = formatDateKey(new Date());
  const scrollRef = useRef<HTMLDivElement>(null);
  const [currentMinuteOffset, setCurrentMinuteOffset] = useState(0);

  const appointmentsByDate = useMemo(() => {
    const map: Record<string, Appointment[]> = {};
    for (const appt of appointments) {
      if (!map[appt.date]) map[appt.date] = [];
      map[appt.date].push(appt);
    }
    return map;
  }, [appointments]);

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setCurrentMinuteOffset((now.getHours() - 8) * 60 + now.getMinutes());
    };
    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = Math.max(0, (currentMinuteOffset / 60) * SLOT_HEIGHT - 120);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const showTimeLine = currentMinuteOffset >= 0 && currentMinuteOffset <= HOURS.length * 60;

  return (
    <div className="glass-panel rounded-3xl overflow-hidden border border-[#3d4a3e]/10">
      {/* Days Header — grid-cols-8 */}
      <div className="grid grid-cols-8 bg-[#141b2b]/80 border-b border-[#3d4a3e]/10">
        <div className="p-4 border-r border-[#3d4a3e]/5" />
        {weekDates.map((date, i) => {
          const dateKey = formatDateKey(date);
          const isToday = dateKey === todayKey;
          const isWeekend = i >= 5;
          return (
            <div
              key={i}
              className={`p-4 text-center border-r border-[#3d4a3e]/5 ${isToday ? "bg-[#6bfb9a]/5" : ""} ${isWeekend ? "text-[#dce2f7]/30" : ""}`}
            >
              <p className={`text-[10px] uppercase font-bold tracking-widest ${isToday ? "text-[#6bfb9a]" : isWeekend ? "" : "text-[#dce2f7]/40"}`}>
                {DAY_NAMES[i]}
              </p>
              <p className={`text-xl font-black ${isToday ? "text-[#6bfb9a]" : ""}`}>
                {date.getDate()}
              </p>
              {isToday && <div className="w-1.5 h-1.5 bg-[#6bfb9a] rounded-full mx-auto mt-1" />}
            </div>
          );
        })}
      </div>

      {/* Scrollable time grid */}
      <div ref={scrollRef} className="relative overflow-y-auto max-h-[600px]" style={{ scrollbarWidth: "thin", scrollbarColor: "#2e3545 transparent" }}>
        {/* Current time line — spans full width */}
        {showTimeLine && (
          <div
            className="absolute w-full z-20 flex items-center pointer-events-none"
            style={{ top: (currentMinuteOffset / 60) * SLOT_HEIGHT }}
          >
            <div className="w-2 h-2 bg-[#ffb4ab] rounded-full -ml-1" />
            <div className="h-px bg-[#ffb4ab] w-full" />
          </div>
        )}

        {/* Grid: cols-8 layout matching reference */}
        <div className="grid grid-cols-8 divide-x divide-[#3d4a3e]/5">
          {/* Hour column */}
          <div className="col-span-1 bg-[#070e1d]/30">
            {HOURS.map((hour) => (
              <div key={hour} className="h-20 p-2 text-right border-b border-[#3d4a3e]/5">
                <span className="font-mono text-[10px] text-[#dce2f7]/40 uppercase">
                  {formatHour(hour)}
                </span>
              </div>
            ))}
          </div>

          {/* Day columns */}
          {weekDates.map((date, colIdx) => {
            const dateKey = formatDateKey(date);
            const isToday = dateKey === todayKey;
            const isWeekend = colIdx >= 5;
            const dayAppts = appointmentsByDate[dateKey] ?? [];

            return (
              <div
                key={colIdx}
                className={`col-span-1 relative ${isToday ? "bg-[#6bfb9a]/5" : isWeekend ? "bg-[#070e1d]/10" : ""}`}
              >
                {/* Hour cells for click targets */}
                {HOURS.map((hour) => (
                  <div
                    key={hour}
                    className="h-20 border-b border-[#3d4a3e]/5 cursor-pointer hover:bg-[#6bfb9a]/[0.03] transition-colors"
                    onClick={() => onSlotClick(dateKey, hour, 0)}
                  />
                ))}

                {/* Appointment blocks */}
                {dayAppts.map((appt) => {
                  const style = TYPE_STYLES[appt.type];
                  const topMinutes = (appt.startHour - 8) * 60 + appt.startMinute;
                  const top = (topMinutes / 60) * SLOT_HEIGHT;
                  const height = (appt.durationMinutes / 60) * SLOT_HEIGHT;

                  return (
                    <div
                      key={appt.id}
                      className={`absolute left-1 right-1 rounded-r-lg p-2 cursor-pointer overflow-hidden transition-shadow hover:shadow-lg hover:shadow-black/20 z-10 ${style.bg} ${style.border}`}
                      style={{ top, height: Math.max(height - 2, 28) }}
                      onClick={(e) => { e.stopPropagation(); onAppointmentClick(appt); }}
                    >
                      <p className={`text-[9px] font-bold uppercase ${style.text}`}>
                        {style.label}
                      </p>
                      <p className="text-xs font-bold truncate">{appt.patientName}</p>
                      {height >= 60 && appt.protocol && (
                        <p className="text-[10px] mt-1 opacity-70 truncate">{appt.protocol}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      <style jsx>{`
        .glass-panel {
          background: rgba(35, 42, 58, 0.4);
          backdrop-filter: blur(20px);
        }
      `}</style>
    </div>
  );
}
