import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

const daysOfWeek = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const placeholderSlots = [
  { time: "9:00 AM", patient: "Patient A", type: "Initial Consult" },
  { time: "10:30 AM", patient: "Patient B", type: "Follow-up" },
  { time: "1:00 PM", patient: "Patient C", type: "Constitutional Assessment" },
  { time: "3:00 PM", patient: null, type: "Available" },
  { time: "4:30 PM", patient: null, type: "Available" },
];

export default async function SchedulerPage() {
  const supabase = createClient();
  await supabase.auth.getUser();

  return (
    <div className="min-h-screen bg-dark-bg px-6 py-10">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">
              Appointment Calendar
            </h1>
            <p className="mt-1 text-gray-400">
              Manage your schedule and patient appointments
            </p>
          </div>
          <Link
            href="/naturopath/dashboard"
            className="text-sm text-sage hover:text-sage/80"
          >
            &larr; Back to Dashboard
          </Link>
        </div>

        {/* Calendar View Placeholder */}
        <div className="glass mb-6 rounded-xl border border-dark-border p-6">
          {/* Month Navigation */}
          <div className="mb-4 flex items-center justify-between">
            <button className="text-sm text-gray-400 hover:text-white">
              &larr; Previous
            </button>
            <h2 className="text-lg font-semibold text-white">March 2026</h2>
            <button className="text-sm text-gray-400 hover:text-white">
              Next &rarr;
            </button>
          </div>

          {/* Day Headers */}
          <div className="mb-2 grid grid-cols-7 gap-2">
            {daysOfWeek.map((day) => (
              <div
                key={day}
                className="py-2 text-center text-xs font-semibold uppercase tracking-wider text-gray-400"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid Placeholder */}
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: 35 }).map((_, i) => {
              const dayNum = i - 1; // offset for month start
              const isToday = dayNum === 20;
              const hasAppt = [3, 7, 10, 14, 17, 20, 24, 28].includes(dayNum);
              return (
                <div
                  key={i}
                  className={`flex h-12 items-center justify-center rounded-lg border text-sm ${
                    dayNum < 1 || dayNum > 31
                      ? "border-transparent"
                      : isToday
                        ? "border-sage bg-sage/20 font-bold text-sage"
                        : hasAppt
                          ? "border-dark-border bg-white/5 text-white"
                          : "border-dark-border text-gray-400"
                  }`}
                >
                  {dayNum >= 1 && dayNum <= 31 ? dayNum : ""}
                </div>
              );
            })}
          </div>
        </div>

        {/* Today's Appointments */}
        <h2 className="mb-4 text-lg font-semibold text-white">
          Today&apos;s Schedule
        </h2>
        <div className="space-y-3">
          {placeholderSlots.map((slot) => (
            <div
              key={slot.time}
              className="glass flex items-center justify-between rounded-xl border border-dark-border p-4"
            >
              <div className="flex items-center gap-4">
                <span className="w-20 font-mono text-sm text-sage">
                  {slot.time}
                </span>
                <div>
                  <p className="text-sm font-medium text-white">
                    {slot.patient ?? "Open Slot"}
                  </p>
                  <p className="text-xs text-gray-400">{slot.type}</p>
                </div>
              </div>
              {slot.patient ? (
                <span className="rounded-full bg-sage/10 px-3 py-1 text-xs text-sage">
                  Booked
                </span>
              ) : (
                <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-gray-400">
                  Available
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
