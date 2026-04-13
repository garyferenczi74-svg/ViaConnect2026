"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { PageTransition, StaggerChild } from "@/lib/motion";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type AppointmentType =
  | "Initial Consult"
  | "Follow-up"
  | "Constitutional Assessment"
  | "Botanical Review"
  | "New Patient";

type AppointmentStatus = "Confirmed" | "Pending" | "Completed";

interface Appointment {
  id: string;
  patient: string;
  type: AppointmentType;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  duration: number; // minutes
  status: AppointmentStatus;
  notes: string;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const typeColors: Record<AppointmentType, string> = {
  "Initial Consult": "bg-sage",
  "Follow-up": "bg-portal-green",
  "Constitutional Assessment": "bg-[#A78BFA]",
  "Botanical Review": "bg-[#FBBF24]",
  "New Patient": "bg-[#22D3EE]",
};

const typeDotColors: Record<AppointmentType, string> = {
  "Initial Consult": "bg-sage",
  "Follow-up": "bg-portal-green",
  "Constitutional Assessment": "bg-[#A78BFA]",
  "Botanical Review": "bg-[#FBBF24]",
  "New Patient": "bg-[#22D3EE]",
};

const statusBadge: Record<AppointmentStatus, "active" | "pending" | "info"> = {
  Confirmed: "active",
  Pending: "pending",
  Completed: "info",
};

const DAYS_OF_WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const HOURS = Array.from({ length: 11 }, (_, i) => i + 8); // 8-18

const MOCK_PATIENTS = [
  { value: "elena-vasquez", label: "Elena Vasquez" },
  { value: "marcus-chen", label: "Marcus Chen" },
  { value: "priya-sharma", label: "Priya Sharma" },
  { value: "david-okafor", label: "David Okafor" },
  { value: "sarah-williams", label: "Sarah Williams" },
  { value: "james-kowalski", label: "James Kowalski" },
  { value: "amara-diallo", label: "Amara Diallo" },
  { value: "nina-petrova", label: "Nina Petrova" },
];

const APPT_TYPE_OPTIONS: { value: AppointmentType; label: string }[] = [
  { value: "Initial Consult", label: "Initial Consult" },
  { value: "Follow-up", label: "Follow-up" },
  { value: "Constitutional Assessment", label: "Constitutional Assessment" },
  { value: "Botanical Review", label: "Botanical Review" },
  { value: "New Patient", label: "New Patient" },
];

const DURATION_OPTIONS = [
  { value: "30", label: "30 min" },
  { value: "45", label: "45 min" },
  { value: "60", label: "60 min" },
  { value: "90", label: "90 min" },
];

/* ------------------------------------------------------------------ */
/*  Initial mock appointments                                          */
/* ------------------------------------------------------------------ */

const INITIAL_APPOINTMENTS: Appointment[] = [
  { id: "1", patient: "Elena Vasquez", type: "Constitutional Assessment", date: "2026-03-02", time: "09:00", duration: 90, status: "Completed", notes: "Vata-Pitta typing complete" },
  { id: "2", patient: "Marcus Chen", type: "Follow-up", date: "2026-03-04", time: "10:00", duration: 45, status: "Completed", notes: "Review liver support protocol" },
  { id: "3", patient: "Priya Sharma", type: "Initial Consult", date: "2026-03-06", time: "14:00", duration: 60, status: "Completed", notes: "New patient intake, thyroid concerns" },
  { id: "4", patient: "David Okafor", type: "Botanical Review", date: "2026-03-10", time: "11:00", duration: 45, status: "Completed", notes: "Adjust adaptogen formula" },
  { id: "5", patient: "Sarah Williams", type: "New Patient", date: "2026-03-13", time: "09:30", duration: 60, status: "Completed", notes: "Referral from Dr. Kim" },
  { id: "6", patient: "James Kowalski", type: "Follow-up", date: "2026-03-16", time: "15:00", duration: 30, status: "Confirmed", notes: "MTHFR protocol check-in" },
  { id: "7", patient: "Amara Diallo", type: "Constitutional Assessment", date: "2026-03-18", time: "10:00", duration: 90, status: "Confirmed", notes: "Full constitutional workup" },
  { id: "8", patient: "Elena Vasquez", type: "Follow-up", date: "2026-03-21", time: "09:00", duration: 45, status: "Confirmed", notes: "Post-constitutional follow-up" },
  { id: "9", patient: "Nina Petrova", type: "New Patient", date: "2026-03-21", time: "11:00", duration: 60, status: "Pending", notes: "Hormone panel review" },
  { id: "10", patient: "Marcus Chen", type: "Botanical Review", date: "2026-03-21", time: "14:30", duration: 45, status: "Confirmed", notes: "Botanical tincture adjustment" },
  { id: "11", patient: "Priya Sharma", type: "Follow-up", date: "2026-03-25", time: "10:00", duration: 30, status: "Pending", notes: "Thyroid labs follow-up" },
  { id: "12", patient: "David Okafor", type: "Initial Consult", date: "2026-03-27", time: "13:00", duration: 60, status: "Pending", notes: "Gut health evaluation" },
  { id: "13", patient: "Sarah Williams", type: "Follow-up", date: "2026-03-30", time: "16:00", duration: 30, status: "Pending", notes: "Sleep protocol assessment" },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number) {
  const day = new Date(year, month, 1).getDay();
  // Convert Sunday=0 to Monday-based (Mon=0 … Sun=6)
  return day === 0 ? 6 : day - 1;
}

function getWeekDates(date: Date): Date[] {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Monday start
  const monday = new Date(d);
  monday.setDate(d.getDate() + diff);
  return Array.from({ length: 7 }, (_, i) => {
    const dt = new Date(monday);
    dt.setDate(monday.getDate() + i);
    return dt;
  });
}

function formatDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function timeToHour(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h + m / 60;
}

function formatTime12(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hr = h % 12 || 12;
  return `${hr}:${String(m).padStart(2, "0")} ${ampm}`;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function SchedulerPage() {
  const [viewMode, setViewMode] = useState<"week" | "month">("month");
  const [currentDate, setCurrentDate] = useState(new Date(2026, 2, 21)); // Mar 21, 2026
  const [selectedDate, setSelectedDate] = useState<string | null>("2026-03-21");
  const [appointments, setAppointments] = useState<Appointment[]>(INITIAL_APPOINTMENTS);
  const [showModal, setShowModal] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);

  // Form state
  const [formPatient, setFormPatient] = useState("");
  const [formType, setFormType] = useState<string>("");
  const [formDate, setFormDate] = useState("");
  const [formTime, setFormTime] = useState("");
  const [formDuration, setFormDuration] = useState("60");
  const [formNotes, setFormNotes] = useState("");

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthName = currentDate.toLocaleString("default", { month: "long" });

  const todayKey = "2026-03-21";

  /* ---- Navigation ---- */
  const goPrev = () => {
    const d = new Date(currentDate);
    if (viewMode === "month") d.setMonth(d.getMonth() - 1);
    else d.setDate(d.getDate() - 7);
    setCurrentDate(d);
  };

  const goNext = () => {
    const d = new Date(currentDate);
    if (viewMode === "month") d.setMonth(d.getMonth() + 1);
    else d.setDate(d.getDate() + 7);
    setCurrentDate(d);
  };

  /* ---- Appointment map by date ---- */
  const apptsByDate = useMemo(() => {
    const map: Record<string, Appointment[]> = {};
    for (const a of appointments) {
      (map[a.date] ??= []).push(a);
    }
    return map;
  }, [appointments]);

  /* ---- Today's appointments ---- */
  const todayAppts = useMemo(
    () =>
      (apptsByDate[todayKey] ?? []).sort((a, b) =>
        a.time.localeCompare(b.time)
      ),
    [apptsByDate]
  );

  /* ---- Modal helpers ---- */
  const resetForm = useCallback(() => {
    setFormPatient("");
    setFormType("");
    setFormDate("");
    setFormTime("");
    setFormDuration("60");
    setFormNotes("");
    setEditingAppointment(null);
  }, []);

  const openNewAppt = useCallback(
    (date?: string, time?: string) => {
      resetForm();
      if (date) setFormDate(date);
      if (time) setFormTime(time);
      setShowModal(true);
    },
    [resetForm]
  );

  const openEditAppt = useCallback((appt: Appointment) => {
    setEditingAppointment(appt);
    setFormPatient(
      MOCK_PATIENTS.find((p) => p.label === appt.patient)?.value ?? ""
    );
    setFormType(appt.type);
    setFormDate(appt.date);
    setFormTime(appt.time);
    setFormDuration(String(appt.duration));
    setFormNotes(appt.notes);
    setShowModal(true);
  }, []);

  const saveAppointment = useCallback(() => {
    const patientLabel =
      MOCK_PATIENTS.find((p) => p.value === formPatient)?.label ?? formPatient;
    if (!patientLabel || !formType || !formDate || !formTime) return;

    if (editingAppointment) {
      setAppointments((prev) =>
        prev.map((a) =>
          a.id === editingAppointment.id
            ? {
                ...a,
                patient: patientLabel,
                type: formType as AppointmentType,
                date: formDate,
                time: formTime,
                duration: Number(formDuration),
                notes: formNotes,
              }
            : a
        )
      );
    } else {
      const newAppt: Appointment = {
        id: String(Date.now()),
        patient: patientLabel,
        type: formType as AppointmentType,
        date: formDate,
        time: formTime,
        duration: Number(formDuration),
        status: "Pending",
        notes: formNotes,
      };
      setAppointments((prev) => [...prev, newAppt]);
    }
    setShowModal(false);
    resetForm();
  }, [
    editingAppointment,
    formPatient,
    formType,
    formDate,
    formTime,
    formDuration,
    formNotes,
    resetForm,
  ]);

  const deleteAppointment = useCallback(() => {
    if (!editingAppointment) return;
    setAppointments((prev) =>
      prev.filter((a) => a.id !== editingAppointment.id)
    );
    setShowModal(false);
    resetForm();
  }, [editingAppointment, resetForm]);

  /* ---- Month grid ---- */
  const daysInMonth = getDaysInMonth(year, month);
  const firstDow = getFirstDayOfWeek(year, month);

  /* ---- Week grid ---- */
  const weekDates = getWeekDates(currentDate);

  /* ---- Selected day appointments ---- */
  const selectedDayAppts = useMemo(
    () =>
      selectedDate
        ? (apptsByDate[selectedDate] ?? []).sort((a, b) =>
            a.time.localeCompare(b.time)
          )
        : [],
    [apptsByDate, selectedDate]
  );

  return (
    <PageTransition className="min-h-screen bg-dark-bg px-4 md:px-6 lg:px-8 py-6 md:py-10">
      <div className="mx-auto max-w-7xl">
        {/* ============================================================ */}
        {/*  Header                                                       */}
        {/* ============================================================ */}
        <StaggerChild className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">
              Appointment Calendar
            </h1>
            <p className="mt-1 text-gray-400">
              Manage your schedule and patient appointments
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/naturopath/dashboard"
              className="text-sm text-sage hover:text-sage/80"
            >
              &larr; Dashboard
            </Link>
          </div>
        </StaggerChild>

        {/* ---- Controls bar ---- */}
        <StaggerChild className="mb-6 flex flex-wrap items-center justify-between gap-4">
          {/* View toggle */}
          <div className="inline-flex rounded-lg border border-white/[0.08] bg-white/[0.03] p-0.5">
            {(["month", "week"] as const).map((v) => (
              <button
                key={v}
                type="button"
                className={`rounded-md px-4 py-1.5 text-sm font-medium capitalize transition-colors ${
                  viewMode === v
                    ? "bg-sage text-white"
                    : "text-gray-400 hover:text-white"
                }`}
                onClick={() => setViewMode(v)}
              >
                {v}
              </button>
            ))}
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-4">
            <button
              type="button"
              className="text-sm text-gray-400 hover:text-white transition-colors"
              onClick={goPrev}
            >
              &larr; Previous
            </button>
            <h2 className="min-w-[160px] text-center text-lg font-semibold text-white">
              {viewMode === "month"
                ? `${monthName} ${year}`
                : `Week of ${weekDates[0].toLocaleDateString("en-US", { month: "short", day: "numeric" })} to ${weekDates[6].toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`}
            </h2>
            <button
              type="button"
              className="text-sm text-gray-400 hover:text-white transition-colors"
              onClick={goNext}
            >
              Next &rarr;
            </button>
          </div>

          {/* New appointment */}
          <button
            type="button"
            className="rounded-lg bg-sage px-4 py-2 min-h-[44px] text-sm font-medium text-white hover:bg-sage/80 transition-colors"
            onClick={() => openNewAppt()}
          >
            + New Appointment
          </button>
        </StaggerChild>

        {/* ============================================================ */}
        {/*  Month View                                                   */}
        {/* ============================================================ */}
        {viewMode === "month" && (
          <Card hover={false} className="border border-dark-border p-2 md:p-4 mb-6 overflow-x-auto">
            {/* Day headers */}
            <div className="mb-2 grid grid-cols-7 gap-1 min-w-[500px]">
              {DAYS_OF_WEEK.map((d) => (
                <div
                  key={d}
                  className="py-2 text-center text-xs font-semibold uppercase tracking-wider text-gray-500"
                >
                  {d}
                </div>
              ))}
            </div>

            {/* Calendar cells */}
            <div className="grid grid-cols-7 gap-1 min-w-[500px]">
              {/* Leading blanks */}
              {Array.from({ length: firstDow }).map((_, i) => (
                <div key={`blank-${i}`} className="h-20 rounded-lg" />
              ))}

              {/* Day cells */}
              {Array.from({ length: daysInMonth }, (_, i) => {
                const day = i + 1;
                const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                const isToday = dateKey === todayKey;
                const isSelected = dateKey === selectedDate;
                const dayAppts = apptsByDate[dateKey] ?? [];

                return (
                  <button
                    key={day}
                    type="button"
                    className={`relative h-20 rounded-lg border p-1.5 text-left transition-all ${
                      isToday
                        ? "border-sage bg-sage/10"
                        : isSelected
                          ? "border-sage/50 bg-white/[0.04]"
                          : "border-white/[0.04] hover:border-white/[0.12] hover:bg-white/[0.03]"
                    }`}
                    onClick={() => {
                      if (dayAppts.length > 0) {
                        setSelectedDate(dateKey);
                      } else {
                        openNewAppt(dateKey);
                      }
                    }}
                  >
                    <span
                      className={`text-xs font-medium ${
                        isToday
                          ? "text-sage font-bold"
                          : "text-gray-400"
                      }`}
                    >
                      {day}
                    </span>
                    {dayAppts.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {dayAppts.slice(0, 3).map((a) => (
                          <span
                            key={a.id}
                            className={`h-1.5 w-1.5 rounded-full ${typeDotColors[a.type]}`}
                          />
                        ))}
                        {dayAppts.length > 3 && (
                          <span className="text-[9px] text-gray-500">
                            +{dayAppts.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                    {dayAppts.length > 0 && (
                      <div className="mt-0.5 space-y-0.5">
                        {dayAppts.slice(0, 2).map((a) => (
                          <div
                            key={a.id}
                            className={`truncate rounded px-1 py-0.5 text-[9px] font-medium text-white/80 ${typeColors[a.type]}/20`}
                          >
                            {formatTime12(a.time).replace(/ (AM|PM)/, "")} {a.patient.split(" ")[0]}
                          </div>
                        ))}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </Card>
        )}

        {/* ============================================================ */}
        {/*  Week View                                                    */}
        {/* ============================================================ */}
        {viewMode === "week" && (
          <Card hover={false} className="border border-dark-border p-2 md:p-4 mb-6 overflow-x-auto">
            {/* Day headers */}
            <div className="grid grid-cols-[60px_repeat(7,1fr)] gap-1 mb-1">
              <div />
              {weekDates.map((d, i) => {
                const dk = formatDateKey(d);
                const isToday = dk === todayKey;
                return (
                  <div
                    key={i}
                    className={`py-2 text-center text-xs font-semibold uppercase tracking-wider ${
                      isToday ? "text-sage" : "text-gray-500"
                    }`}
                  >
                    {DAYS_OF_WEEK[i]}{" "}
                    <span className={isToday ? "text-sage" : "text-gray-400"}>
                      {d.getDate()}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Time grid */}
            <div className="grid grid-cols-[60px_repeat(7,1fr)] gap-1">
              {HOURS.map((hour) => (
                <div key={hour} className="contents">
                  {/* Time label */}
                  <div className="flex h-14 items-start justify-end pr-2 pt-0.5">
                    <span className="font-mono text-[10px] text-gray-600">
                      {hour % 12 || 12} {hour < 12 ? "AM" : "PM"}
                    </span>
                  </div>
                  {/* Day cells for this hour */}
                  {weekDates.map((d, di) => {
                    const dk = formatDateKey(d);
                    const cellAppts = (apptsByDate[dk] ?? []).filter(
                      (a) => {
                        const h = timeToHour(a.time);
                        return h >= hour && h < hour + 1;
                      }
                    );
                    return (
                      <button
                        key={`${hour}-${di}`}
                        type="button"
                        className="h-14 rounded border border-white/[0.03] hover:border-white/[0.1] hover:bg-white/[0.03] transition-colors relative"
                        onClick={() => {
                          if (cellAppts.length > 0) {
                            openEditAppt(cellAppts[0]);
                          } else {
                            openNewAppt(dk, `${String(hour).padStart(2, "0")}:00`);
                          }
                        }}
                      >
                        {cellAppts.map((a) => (
                          <div
                            key={a.id}
                            className={`absolute inset-x-0.5 top-0.5 bottom-0.5 rounded px-1.5 py-0.5 text-[10px] font-medium text-white overflow-hidden ${typeColors[a.type]}/80`}
                          >
                            <div className="truncate">{a.patient.split(" ")[0]}</div>
                            <div className="text-[9px] opacity-75 truncate">
                              {formatTime12(a.time)}
                            </div>
                          </div>
                        ))}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>

            {/* Legend */}
            <div className="mt-4 flex flex-wrap gap-4 border-t border-white/[0.06] pt-3">
              {APPT_TYPE_OPTIONS.map((t) => (
                <div key={t.value} className="flex items-center gap-1.5">
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${typeColors[t.value as AppointmentType]}`}
                  />
                  <span className="text-[11px] text-gray-400">{t.label}</span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* ============================================================ */}
        {/*  Selected Day Detail (Month view)                             */}
        {/* ============================================================ */}
        {viewMode === "month" && selectedDate && selectedDayAppts.length > 0 && (
          <Card hover={false} className="border border-dark-border p-3 md:p-5 mb-6">
            <h3 className="mb-3 text-sm font-semibold text-white">
              Appointments for{" "}
              {new Date(selectedDate + "T00:00:00").toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </h3>
            <div className="space-y-2">
              {selectedDayAppts.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  className="flex w-full items-center gap-3 md:gap-4 rounded-lg border border-white/[0.06] bg-white/[0.02] p-2.5 md:p-3 min-h-[44px] text-left hover:bg-white/[0.05] transition-colors"
                  onClick={() => openEditAppt(a)}
                >
                  <span className="w-16 font-mono text-xs text-sage">
                    {formatTime12(a.time)}
                  </span>
                  <span className={`h-2 w-2 rounded-full ${typeDotColors[a.type]}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {a.patient}
                    </p>
                    <p className="text-xs text-gray-500">{a.type} &middot; {a.duration} min</p>
                  </div>
                  <Badge variant={statusBadge[a.status]}>{a.status}</Badge>
                </button>
              ))}
            </div>
          </Card>
        )}

        {/* ============================================================ */}
        {/*  Today's Schedule                                             */}
        {/* ============================================================ */}
        <h2 className="mb-4 text-lg font-semibold text-white">
          Today&apos;s Schedule
        </h2>
        {todayAppts.length === 0 ? (
          <Card hover={false} className="border border-dark-border p-6">
            <p className="text-center text-sm text-gray-400">
              No appointments scheduled for today.
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {todayAppts.map((a) => (
              <Card
                key={a.id}
                hover={false}
                className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 md:gap-0 border border-dark-border p-3 md:p-4"
              >
                <div className="flex items-center gap-4">
                  <span className="w-20 font-mono text-sm text-sage">
                    {formatTime12(a.time)}
                  </span>
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${typeDotColors[a.type]}`}
                  />
                  <div>
                    <p className="text-sm font-medium text-white">
                      {a.patient}
                    </p>
                    <p className="text-xs text-gray-400">
                      {a.type} &middot; {a.duration} min
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={statusBadge[a.status]}>{a.status}</Badge>
                  <Link
                    href="/naturopath/patients"
                    className="text-xs text-sage hover:text-sage/80 transition-colors"
                  >
                    View Patient
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* ============================================================ */}
        {/*  New / Edit Appointment Modal                                  */}
        {/* ============================================================ */}
        <Modal
          open={showModal}
          onOpenChange={(open) => {
            if (!open) {
              resetForm();
            }
            setShowModal(open);
          }}
          title={editingAppointment ? "Edit Appointment" : "New Appointment"}
          description={
            editingAppointment
              ? "Update appointment details below."
              : "Fill in the details to schedule a new appointment."
          }
          className="max-w-lg"
        >
          <div className="space-y-4">
            <Select
              label="Patient"
              placeholder="Select patient..."
              value={formPatient}
              onValueChange={setFormPatient}
              options={MOCK_PATIENTS}
            />

            <Select
              label="Appointment Type"
              placeholder="Select type..."
              value={formType}
              onValueChange={setFormType}
              options={APPT_TYPE_OPTIONS}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Date"
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
              />
              <Input
                label="Time"
                type="time"
                value={formTime}
                onChange={(e) => setFormTime(e.target.value)}
              />
            </div>

            <Select
              label="Duration"
              placeholder="Select duration..."
              value={formDuration}
              onValueChange={setFormDuration}
              options={DURATION_OPTIONS}
            />

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-400">
                Notes
              </label>
              <textarea
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white placeholder:text-gray-600 outline-none transition-colors focus:border-sage/50 focus:ring-1 focus:ring-sage/20 resize-none"
                placeholder="Add appointment notes..."
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Button
                size="md"
                className="flex-1 !bg-sage hover:!bg-sage/80 !shadow-none"
                onClick={saveAppointment}
              >
                {editingAppointment ? "Update" : "Save"} Appointment
              </Button>
              <Button
                variant="secondary"
                size="md"
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              {editingAppointment && (
                <Button
                  variant="danger"
                  size="md"
                  onClick={deleteAppointment}
                >
                  Delete
                </Button>
              )}
            </div>
          </div>
        </Modal>
      </div>
    </PageTransition>
  );
}
