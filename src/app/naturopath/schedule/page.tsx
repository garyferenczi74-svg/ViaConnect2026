"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Clock, X } from "lucide-react";

/* ───────── Types & Data ───────── */

type ApptType = "initial" | "follow-up" | "urgent";

interface Appointment {
  id: string;
  patient: string;
  type: ApptType;
  day: number; // 0=Mon ... 6=Sun
  startHour: number;
  duration: number; // in hours
  note: string;
}

const typeStyles: Record<ApptType, { bg: string; border: string; label: string }> = {
  initial: { bg: "bg-green-400/10", border: "border-green-400", label: "Initial" },
  "follow-up": { bg: "bg-purple-400/10", border: "border-purple-400", label: "Follow-up" },
  urgent: { bg: "bg-red-400/10", border: "border-red-400", label: "Urgent" },
};

const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const weekDates = ["Mar 16", "Mar 17", "Mar 18", "Mar 19", "Mar 20", "Mar 21", "Mar 22"];
const todayIndex = 2; // Wednesday
const hours = Array.from({ length: 11 }, (_, i) => i + 8); // 8AM-6PM
const currentHour = 10.5; // 10:30 AM mock

const appointments: Appointment[] = [
  { id: "a1", patient: "Jane Smith", type: "initial", day: 2, startHour: 9, duration: 1.5, note: "New patient intake + genomic review" },
  { id: "a2", patient: "Kevin Brown", type: "follow-up", day: 2, startHour: 11, duration: 1, note: "Protocol review — 30-day check" },
  { id: "a3", patient: "Maria Chen", type: "urgent", day: 2, startHour: 14, duration: 1, note: "CYP2D6 interaction — urgent review" },
  { id: "a4", patient: "Raj Patel", type: "follow-up", day: 0, startHour: 10, duration: 1, note: "GI protocol follow-up" },
  { id: "a5", patient: "Sarah Wilson", type: "initial", day: 1, startHour: 9, duration: 1.5, note: "Initial consultation" },
  { id: "a6", patient: "Tom Rivera", type: "follow-up", day: 3, startHour: 13, duration: 1, note: "Lab review — homocysteine" },
  { id: "a7", patient: "Emily Chang", type: "follow-up", day: 4, startHour: 10, duration: 1, note: "Methylation protocol check" },
  { id: "a8", patient: "Ben Taylor", type: "urgent", day: 4, startHour: 15, duration: 1, note: "Adverse reaction assessment" },
];

interface FollowUp {
  patient: string;
  reason: string;
  dueIn: string;
  status: "overdue" | "due-soon" | "upcoming";
}

const followUps: FollowUp[] = [
  { patient: "J. Smith", reason: "30-day protocol review", dueIn: "3 days overdue", status: "overdue" },
  { patient: "M. Chen", reason: "Lab result review", dueIn: "1 day overdue", status: "overdue" },
  { patient: "R. Patel", reason: "GI assessment", dueIn: "Due today", status: "due-soon" },
  { patient: "A. Lee", reason: "Genomic follow-up", dueIn: "Due tomorrow", status: "due-soon" },
  { patient: "K. Brown", reason: "Outcome assessment", dueIn: "In 3 days", status: "upcoming" },
  { patient: "S. Wilson", reason: "Initial follow-up", dueIn: "In 5 days", status: "upcoming" },
  { patient: "D. Kim", reason: "Protocol adjustment", dueIn: "In 7 days", status: "upcoming" },
  { patient: "L. Nguyen", reason: "Supplement review", dueIn: "In 10 days", status: "upcoming" },
];

const statusStyles: Record<string, { bg: string; text: string; dot: string }> = {
  overdue: { bg: "bg-red-400/20", text: "text-red-400", dot: "bg-red-400" },
  "due-soon": { bg: "bg-yellow-400/20", text: "text-yellow-400", dot: "bg-yellow-400" },
  upcoming: { bg: "bg-green-400/20", text: "text-green-400", dot: "bg-green-400" },
};

/* ───────── Page ───────── */

export default function SchedulePage() {
  const [view, setView] = useState<"Week" | "Day" | "Month">("Week");
  const [newApptSlot, setNewApptSlot] = useState<{ day: number; hour: number } | null>(null);

  const handleSlotClick = (day: number, hour: number) => {
    setNewApptSlot({ day, hour });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Schedule</h1>
          <p className="text-sm text-white/60">March 16–22, 2026</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <button className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-gray-700/50 transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm text-white/60 px-2">This Week</span>
            <button className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-gray-700/50 transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="flex gap-1 bg-gray-800/50 rounded-lg p-1">
            {(["Week", "Day", "Month"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  view === v ? "bg-green-400 text-gray-900" : "text-white/50 hover:text-white"
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-6">
        {/* ── Calendar Grid ── */}
        <div className="flex-1 min-w-0 bg-gray-800/50 backdrop-blur-sm border border-green-400/15 rounded-xl overflow-hidden">
          {/* Day headers */}
          <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-gray-700/50">
            <div className="p-2" />
            {weekDays.map((d, i) => (
              <div
                key={d}
                className={`p-3 text-center border-l border-gray-700/30 ${
                  i === todayIndex ? "bg-green-400/5" : ""
                }`}
              >
                <p className={`text-xs font-medium ${i === todayIndex ? "text-green-400" : "text-white/40"}`}>
                  {d}
                </p>
                <p className={`text-sm font-bold ${i === todayIndex ? "text-green-400" : "text-white/70"}`}>
                  {weekDates[i]}
                </p>
              </div>
            ))}
          </div>

          {/* Time grid */}
          <div className="relative overflow-y-auto max-h-[600px]">
            {/* Current time line */}
            <div
              className="absolute left-[60px] right-0 h-0.5 bg-red-400 z-20 pointer-events-none"
              style={{ top: `${(currentHour - 8) * 60}px` }}
            >
              <div className="absolute -left-1.5 -top-1 w-3 h-3 rounded-full bg-red-400" />
            </div>

            {hours.map((hour) => (
              <div key={hour} className="grid grid-cols-[60px_repeat(7,1fr)] h-[60px]">
                <div className="flex items-start justify-end pr-2 pt-0.5 text-[10px] text-white/30">
                  {hour <= 12 ? hour : hour - 12}{hour < 12 ? "AM" : "PM"}
                </div>
                {weekDays.map((_, dayIdx) => {
                  const appt = appointments.find(
                    (a) => a.day === dayIdx && hour >= a.startHour && hour < a.startHour + a.duration
                  );
                  const isStart = appt && hour === appt.startHour;
                  const s = appt ? typeStyles[appt.type] : null;

                  return (
                    <div
                      key={dayIdx}
                      onClick={() => !appt && handleSlotClick(dayIdx, hour)}
                      className={`border-l border-t border-gray-700/20 relative ${
                        dayIdx === todayIndex ? "bg-green-400/5" : ""
                      } ${!appt ? "cursor-pointer hover:bg-green-400/5" : ""}`}
                    >
                      {isStart && s && appt && (
                        <div
                          className={`absolute inset-x-1 top-0.5 rounded-lg ${s.bg} border-l-4 ${s.border} px-2 py-1 z-10 overflow-hidden cursor-pointer hover:opacity-90 transition-opacity`}
                          style={{ height: `${appt.duration * 60 - 4}px` }}
                        >
                          <p className="text-[10px] font-bold text-white truncate">{appt.patient}</p>
                          <p className="text-[9px] text-white/50 truncate">{appt.note}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* ── Follow-up Queue ── */}
        <div className="hidden lg:block w-72 shrink-0">
          <div className="sticky top-4 bg-gray-800/50 backdrop-blur-sm border border-green-400/15 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-gray-700/50 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-green-400" /> Follow-up Queue
              </h3>
              <span className="bg-red-400/20 text-red-400 text-[10px] font-bold px-2 py-0.5 rounded-full">
                {followUps.filter((f) => f.status === "overdue").length} overdue
              </span>
            </div>
            <div className="divide-y divide-gray-700/30 max-h-[500px] overflow-y-auto">
              {followUps.map((f, i) => {
                const s = statusStyles[f.status];
                return (
                  <div key={i} className="px-4 py-3 hover:bg-gray-700/20 cursor-pointer transition-colors">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-white">{f.patient}</span>
                      <span className={`w-2 h-2 rounded-full ${s.dot}`} />
                    </div>
                    <p className="text-xs text-white/50 mb-1.5">{f.reason}</p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${s.bg} ${s.text}`}>
                      {f.dueIn}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── New Appointment Modal ── */}
      {newApptSlot && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setNewApptSlot(null)}>
          <div className="bg-gray-800 border border-green-400/15 rounded-xl p-6 w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">New Appointment</h3>
              <button onClick={() => setNewApptSlot(null)} className="text-white/30 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-white/40 uppercase tracking-wider font-bold block mb-1">Date & Time</label>
                <p className="text-sm text-white">
                  {weekDays[newApptSlot.day]}, {weekDates[newApptSlot.day]} at{" "}
                  {newApptSlot.hour <= 12 ? newApptSlot.hour : newApptSlot.hour - 12}:00{" "}
                  {newApptSlot.hour < 12 ? "AM" : "PM"}
                </p>
              </div>
              <div>
                <label className="text-xs text-white/40 uppercase tracking-wider font-bold block mb-1">Patient</label>
                <input placeholder="Search patient..." className="w-full bg-gray-900/60 border border-gray-700/50 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none focus:border-green-400/50" />
              </div>
              <div>
                <label className="text-xs text-white/40 uppercase tracking-wider font-bold block mb-1">Type</label>
                <div className="flex gap-2">
                  {(["initial", "follow-up", "urgent"] as const).map((t) => {
                    const s = typeStyles[t];
                    return (
                      <button key={t} className={`px-3 py-1.5 rounded-lg text-xs font-medium border-l-4 ${s.border} ${s.bg} text-white/70 hover:text-white transition-colors`}>
                        {s.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className="text-xs text-white/40 uppercase tracking-wider font-bold block mb-1">Notes</label>
                <textarea rows={2} placeholder="Appointment notes..." className="w-full bg-gray-900/60 border border-gray-700/50 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none focus:border-green-400/50 resize-none" />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setNewApptSlot(null)} className="flex-1 px-4 py-2.5 rounded-lg border border-gray-700/50 text-sm text-white/60 hover:bg-gray-700/30 transition-colors">
                Cancel
              </button>
              <button onClick={() => setNewApptSlot(null)} className="flex-1 px-4 py-2.5 rounded-lg bg-green-400 hover:bg-green-500 text-gray-900 text-sm font-semibold transition-colors flex items-center justify-center gap-1.5">
                <Plus className="w-4 h-4" /> Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
