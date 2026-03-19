"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Appointment,
  AppointmentType,
  patients,
  formatHour,
  TYPE_STYLES,
} from "@/data/schedule";

interface AppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (appointment: Omit<Appointment, "id">) => void;
  initialDate?: string;
  initialHour?: number;
  initialMinute?: number;
  editAppointment?: Appointment | null;
}

const APPOINTMENT_TYPES: { key: AppointmentType; label: string }[] = [
  { key: "initial", label: "Initial Visit" },
  { key: "follow-up", label: "Follow-up" },
  { key: "urgent", label: "Urgent" },
];

const DURATIONS = [30, 45, 60, 90];

export default function AppointmentModal({
  isOpen,
  onClose,
  onSave,
  initialDate,
  initialHour,
  initialMinute,
  editAppointment,
}: AppointmentModalProps) {
  const [patientSearch, setPatientSearch] = useState("");
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [appointmentType, setAppointmentType] = useState<AppointmentType>("follow-up");
  const [date, setDate] = useState("");
  const [startHour, setStartHour] = useState(9);
  const [startMinute, setStartMinute] = useState(0);
  const [duration, setDuration] = useState(30);
  const [notes, setNotes] = useState("");
  const [protocol, setProtocol] = useState("");
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (editAppointment) {
        setSelectedPatientId(editAppointment.patientId);
        setPatientSearch(editAppointment.patientName);
        setAppointmentType(editAppointment.type);
        setDate(editAppointment.date);
        setStartHour(editAppointment.startHour);
        setStartMinute(editAppointment.startMinute);
        setDuration(editAppointment.durationMinutes);
        setNotes(editAppointment.notes ?? "");
        setProtocol(editAppointment.protocol ?? "");
      } else {
        setSelectedPatientId("");
        setPatientSearch("");
        setAppointmentType("follow-up");
        setDate(initialDate ?? new Date().toISOString().split("T")[0]);
        setStartHour(initialHour ?? 9);
        setStartMinute(initialMinute ?? 0);
        setDuration(30);
        setNotes("");
        setProtocol("");
      }
    }
  }, [isOpen, editAppointment, initialDate, initialHour, initialMinute]);

  const filteredPatients = useMemo(() => {
    if (!patientSearch) return patients;
    return patients.filter((p) => p.name.toLowerCase().includes(patientSearch.toLowerCase()));
  }, [patientSearch]);

  const selectedPatient = patients.find((p) => p.id === selectedPatientId);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    if (isOpen) {
      document.addEventListener("keydown", handleEsc);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (!selectedPatientId || !date) return;
    onSave({
      patientName: selectedPatient?.name ?? "",
      patientId: selectedPatientId,
      type: appointmentType,
      protocol: protocol || undefined,
      date,
      startHour,
      startMinute,
      durationMinutes: duration,
      notes: notes || undefined,
    });
    onClose();
  };

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-[61] flex items-center justify-center p-4">
        <div
          className="w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl border border-[#3d4a3e]/20"
          style={{ background: "#141b2b" }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-[#3d4a3e]/15 flex items-center justify-between bg-[#191f2f]">
            <div>
              <h3 className="text-lg font-bold text-[#dce2f7]">
                {editAppointment ? "Edit Appointment" : "New Appointment"}
              </h3>
              <p className="text-[10px] font-mono text-[#dce2f7]/40 uppercase tracking-widest">
                Clinical scheduling
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full hover:bg-[#232a3a] flex items-center justify-center text-[#dce2f7]/40 hover:text-[#dce2f7] transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Body */}
          <div className="px-6 py-5 space-y-5">
            {/* Patient search */}
            <div className="relative">
              <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#4ade80] block mb-2">
                Patient
              </label>
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#dce2f7]/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
                <input
                  type="text"
                  value={patientSearch}
                  onChange={(e) => { setPatientSearch(e.target.value); setShowPatientDropdown(true); setSelectedPatientId(""); }}
                  onFocus={() => setShowPatientDropdown(true)}
                  placeholder="Search patients..."
                  className="w-full bg-[#0c1322] border border-[#3d4a3e]/30 rounded-xl pl-10 pr-4 py-2.5 text-sm text-[#dce2f7] placeholder-[#dce2f7]/25 focus:outline-none focus:border-[#4ade80]/50 transition-colors"
                />
              </div>
              {showPatientDropdown && filteredPatients.length > 0 && !selectedPatientId && (
                <div className="absolute z-10 mt-1 w-full bg-[#191f2f] border border-[#3d4a3e]/20 rounded-xl shadow-xl overflow-hidden">
                  {filteredPatients.slice(0, 5).map((p) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        setSelectedPatientId(p.id);
                        setPatientSearch(p.name);
                        setShowPatientDropdown(false);
                        if (p.protocols.length > 0) setProtocol(p.protocols[0]);
                      }}
                      className="w-full text-left px-4 py-2.5 hover:bg-[#232a3a] transition-colors flex items-center justify-between"
                    >
                      <span className="text-sm text-[#dce2f7]">{p.name}</span>
                      <span className="text-[10px] text-[#dce2f7]/30 font-mono">{p.id}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Appointment Type */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#4ade80] block mb-2">
                Appointment Type
              </label>
              <div className="grid grid-cols-3 gap-2">
                {APPOINTMENT_TYPES.map((t) => {
                  const style = TYPE_STYLES[t.key];
                  const isActive = appointmentType === t.key;
                  return (
                    <button
                      key={t.key}
                      onClick={() => setAppointmentType(t.key)}
                      className={`py-2.5 px-3 rounded-xl text-xs font-bold uppercase tracking-widest border transition-all ${
                        isActive
                          ? `${style.bg} ${style.text} border-current`
                          : "border-[#3d4a3e]/15 text-[#dce2f7]/40 hover:text-[#dce2f7]"
                      }`}
                    >
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Date & Time */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#4ade80] block mb-2">Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-[#0c1322] border border-[#3d4a3e]/30 rounded-xl px-3 py-2.5 text-sm text-[#dce2f7] focus:outline-none focus:border-[#4ade80]/50 transition-colors [color-scheme:dark]"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#4ade80] block mb-2">Time</label>
                <select
                  value={`${startHour}:${startMinute}`}
                  onChange={(e) => {
                    const [h, m] = e.target.value.split(":").map(Number);
                    setStartHour(h);
                    setStartMinute(m);
                  }}
                  className="w-full bg-[#0c1322] border border-[#3d4a3e]/30 rounded-xl px-3 py-2.5 text-sm text-[#dce2f7] focus:outline-none focus:border-[#4ade80]/50 transition-colors appearance-none"
                >
                  {Array.from({ length: 20 }, (_, i) => {
                    const hour = Math.floor(i / 2) + 8;
                    const minute = (i % 2) * 30;
                    return (
                      <option key={i} value={`${hour}:${minute}`}>
                        {formatHour(hour).replace(":00", `:${minute.toString().padStart(2, "0")}`)}
                      </option>
                    );
                  })}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#4ade80] block mb-2">Duration</label>
                <select
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="w-full bg-[#0c1322] border border-[#3d4a3e]/30 rounded-xl px-3 py-2.5 text-sm text-[#dce2f7] focus:outline-none focus:border-[#4ade80]/50 transition-colors appearance-none"
                >
                  {DURATIONS.map((d) => (
                    <option key={d} value={d}>{d} min</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Protocol selector */}
            {selectedPatient && (
              <div>
                <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-purple-400 block mb-2">
                  Linked Protocol
                </label>
                <select
                  value={protocol}
                  onChange={(e) => setProtocol(e.target.value)}
                  className="w-full bg-[#0c1322] border border-purple-500/20 rounded-xl px-3 py-2.5 text-sm text-[#dce2f7] focus:outline-none focus:border-purple-500/50 transition-colors appearance-none"
                >
                  <option value="">No linked protocol</option>
                  {selectedPatient.protocols.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#4ade80] block mb-2">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Clinical notes, preparation instructions..."
                className="w-full bg-[#0c1322] border border-[#3d4a3e]/30 rounded-xl px-3 py-2.5 text-sm text-[#dce2f7] placeholder-[#dce2f7]/25 focus:outline-none focus:border-[#4ade80]/50 transition-colors resize-none"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-[#3d4a3e]/15 flex items-center justify-between bg-[#191f2f]">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest text-[#dce2f7]/40 hover:text-[#dce2f7] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!selectedPatientId || !date}
              className="bg-[#4ade80] text-[#003919] font-bold px-6 py-2.5 rounded-xl text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-[#6bfb9a] transition-colors shadow-lg shadow-[#4ade80]/20 disabled:opacity-30 disabled:cursor-not-allowed active:scale-95"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
              {editAppointment ? "Update" : "Schedule"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
