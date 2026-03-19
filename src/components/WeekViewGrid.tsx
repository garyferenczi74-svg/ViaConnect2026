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
const SLOT_HEIGHT = 60; // px per hour
const TOTAL_HOURS = HOURS.length; // 11 hours (8-18)

export default function WeekViewGrid({
  weekDates,
  appointments,
  onSlotClick,
  onAppointmentClick,
  onDragReschedule,
}: WeekViewGridProps) {
  const todayKey = formatDateKey(new Date());
  const scrollRef = useRef<HTMLDivElement>(null);
  const [currentMinuteOffset, setCurrentMinuteOffset] = useState(0);

  // Group appointments by date
  const appointmentsByDate = useMemo(() => {
    const map: Record<string, Appointment[]> = {};
    for (const appt of appointments) {
      if (!map[appt.date]) map[appt.date] = [];
      map[appt.date].push(appt);
    }
    return map;
  }, [appointments]);

  // Current time tracking
  useEffect(() => {
    const update = () => {
      const now = new Date();
      setCurrentMinuteOffset((now.getHours() - 8) * 60 + now.getMinutes());
    };
    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, []);

  // Auto-scroll to current time on mount
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = Math.max(0, (currentMinuteOffset / 60) * SLOT_HEIGHT - 120);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const showTimeLine = currentMinuteOffset >= 0 && currentMinuteOffset <= TOTAL_HOURS * 60;

  return (
    <div className="glass-card rounded-xl overflow-hidden flex-1 min-w-0">
      {/* Day headers */}
      <div className="grid border-b border-[#3d4a3e]/20" style={{ gridTemplateColumns: "64px repeat(7, 1fr)" }}>
        <div className="p-3" />
        {weekDates.map((date, i) => {
          const dateKey = formatDateKey(date);
          const isToday = dateKey === todayKey;
          return (
            <div key={i} className={`p-3 text-center border-l border-[#3d4a3e]/10 ${isToday ? "bg-[#4ade80]/5" : ""}`}>
              <div className={`text-[10px] font-mono uppercase tracking-widest ${isToday ? "text-[#4ade80]" : "text-[#dce2f7]/40"}`}>
                {DAY_NAMES[i]}
              </div>
              <div className={`text-lg font-black ${isToday ? "text-[#4ade80]" : "text-[#dce2f7]"}`}>
                {date.getDate()}
              </div>
            </div>
          );
        })}
      </div>

      {/* Scrollable grid */}
      <div ref={scrollRef} className="overflow-y-auto" style={{ maxHeight: "calc(100vh - 280px)" }}>
        <div className="grid" style={{ gridTemplateColumns: "64px repeat(7, 1fr)" }}>
          {/* Time labels column */}
          <div>
            {HOURS.map((hour) => (
              <div key={hour} className="flex items-start justify-end pr-3 pt-1" style={{ height: SLOT_HEIGHT }}>
                <span className="text-[10px] font-mono text-[#dce2f7]/30">{formatHour(hour)}</span>
              </div>
            ))}
          </div>

          {/* Day columns */}
          {weekDates.map((date, colIdx) => {
            const dateKey = formatDateKey(date);
            const isToday = dateKey === todayKey;
            const dayAppts = appointmentsByDate[dateKey] ?? [];

            return (
              <div key={colIdx} className={`relative border-l border-[#3d4a3e]/10 ${isToday ? "bg-[#4ade80]/[0.03]" : ""}`}>
                {/* Hour cells */}
                {HOURS.map((hour) => (
                  <div
                    key={hour}
                    className="border-t border-[#3d4a3e]/10 cursor-pointer hover:bg-[#4ade80]/[0.03] transition-colors"
                    style={{ height: SLOT_HEIGHT }}
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
                      className={`absolute left-0.5 right-1 rounded-r-lg px-2 py-1.5 cursor-pointer overflow-hidden transition-shadow hover:shadow-lg hover:shadow-black/20 z-10 ${style.bg} ${style.border}`}
                      style={{ top, height: Math.max(height - 2, 24) }}
                      onClick={(e) => { e.stopPropagation(); onAppointmentClick(appt); }}
                    >
                      <div className={`text-xs font-bold truncate ${style.text}`}>{appt.patientName}</div>
                      {height >= 40 && (
                        <div className="text-[10px] text-[#dce2f7]/50 truncate mt-0.5">{appt.protocol}</div>
                      )}
                      {height >= 55 && (
                        <div className="text-[10px] font-mono text-[#dce2f7]/30 mt-0.5">
                          {formatTimeRange(appt.startHour, appt.startMinute, appt.durationMinutes)}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Current time line - only in today's column */}
                {isToday && showTimeLine && (
                  <div
                    className="absolute left-0 right-0 z-20 pointer-events-none flex items-center"
                    style={{ top: (currentMinuteOffset / 60) * SLOT_HEIGHT }}
                  >
                    <div className="w-2.5 h-2.5 rounded-full bg-[#f87171] -ml-1 shrink-0" />
                    <div className="h-0.5 bg-[#f87171] flex-1" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

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

function formatTimeRange(startHour: number, startMinute: number, durationMinutes: number): string {
  const start = formatTime(startHour, startMinute);
  const endTotal = startHour * 60 + startMinute + durationMinutes;
  const end = formatTime(Math.floor(endTotal / 60), endTotal % 60);
  return `${start} – ${end}`;
}

function formatTime(hour: number, minute: number): string {
  const h = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  const ampm = hour >= 12 ? "PM" : "AM";
  return `${h}:${minute.toString().padStart(2, "0")} ${ampm}`;
}
