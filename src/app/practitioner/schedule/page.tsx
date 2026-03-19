"use client";

import { useState, useCallback, useMemo } from "react";
import CalendarHeader, { ViewMode } from "@/components/CalendarHeader";
import WeekViewGrid from "@/components/WeekViewGrid";
import FollowUpQueue from "@/components/FollowUpQueue";
import AppointmentModal from "@/components/AppointmentModal";
import {
  Appointment,
  FollowUp,
  appointments as initialAppointments,
  followUps,
  getWeekStart,
  getWeekDates,
  formatDateKey,
} from "@/data/schedule";

export default function SchedulePage() {
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [appointmentsList, setAppointmentsList] = useState<Appointment[]>(initialAppointments);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalInitialDate, setModalInitialDate] = useState<string | undefined>();
  const [modalInitialHour, setModalInitialHour] = useState<number | undefined>();
  const [modalInitialMinute, setModalInitialMinute] = useState<number | undefined>();
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);

  const weekStart = useMemo(() => getWeekStart(currentDate), [currentDate]);
  const weekDates = useMemo(() => getWeekDates(weekStart), [weekStart]);

  const weekLabel = useMemo(() => {
    const start = weekDates[0];
    const end = weekDates[6];
    const startMonth = start.toLocaleDateString("en-US", { month: "short" });
    const endMonth = end.toLocaleDateString("en-US", { month: "short" });
    const year = end.getFullYear();
    if (startMonth === endMonth) {
      return `${startMonth} ${start.getDate()} – ${end.getDate()}, ${year}`;
    }
    return `${startMonth} ${start.getDate()} – ${endMonth} ${end.getDate()}, ${year}`;
  }, [weekDates]);

  // Filter appointments for current week
  const weekAppointments = useMemo(() => {
    const dateKeys = new Set(weekDates.map(formatDateKey));
    return appointmentsList.filter((a) => dateKeys.has(a.date));
  }, [appointmentsList, weekDates]);

  const navigatePrev = useCallback(() => {
    setCurrentDate((d) => {
      const newDate = new Date(d);
      newDate.setDate(newDate.getDate() - 7);
      return newDate;
    });
  }, []);

  const navigateNext = useCallback(() => {
    setCurrentDate((d) => {
      const newDate = new Date(d);
      newDate.setDate(newDate.getDate() + 7);
      return newDate;
    });
  }, []);

  const navigateToday = useCallback(() => {
    setCurrentDate(new Date());
  }, []);

  const handleSlotClick = useCallback((date: string, hour: number, minute: number) => {
    setEditingAppointment(null);
    setModalInitialDate(date);
    setModalInitialHour(hour);
    setModalInitialMinute(minute);
    setModalOpen(true);
  }, []);

  const handleAppointmentClick = useCallback((appointment: Appointment) => {
    setEditingAppointment(appointment);
    setModalOpen(true);
  }, []);

  const handleDragReschedule = useCallback((appointmentId: string, newDate: string, newHour: number, newMinute: number) => {
    setAppointmentsList((prev) =>
      prev.map((a) =>
        a.id === appointmentId
          ? { ...a, date: newDate, startHour: newHour, startMinute: newMinute }
          : a
      )
    );
  }, []);

  const handleSaveAppointment = useCallback((data: Omit<Appointment, "id">) => {
    if (editingAppointment) {
      setAppointmentsList((prev) =>
        prev.map((a) => (a.id === editingAppointment.id ? { ...a, ...data } : a))
      );
    } else {
      const newAppt: Appointment = {
        ...data,
        id: `a-${Date.now()}`,
      };
      setAppointmentsList((prev) => [...prev, newAppt]);
    }
    setEditingAppointment(null);
  }, [editingAppointment]);

  const handleScheduleFollowUp = useCallback((followUp: FollowUp) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setEditingAppointment(null);
    setModalInitialDate(formatDateKey(tomorrow));
    setModalInitialHour(10);
    setModalInitialMinute(0);
    setModalOpen(true);
  }, []);

  const handleNewAppointment = useCallback(() => {
    setEditingAppointment(null);
    setModalInitialDate(formatDateKey(new Date()));
    setModalInitialHour(9);
    setModalInitialMinute(0);
    setModalOpen(true);
  }, []);

  return (
    <div className="min-h-screen bg-[#0c1322] text-[#dce2f7]">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col h-screen w-64 fixed left-0 top-0 bg-[#141b2b] shadow-[20px_0px_40px_rgba(0,0,0,0.4)] z-40 py-8 px-4 pt-20">
        <div className="px-6 mb-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#4ade80]/20 flex items-center justify-center">
            <svg className="w-5 h-5 text-[#6bfb9a]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
            </svg>
          </div>
          <span className="font-black text-[#6bfb9a] text-xl tracking-tighter">Clinical Nexus</span>
        </div>

        <div className="px-6 mb-8">
          <div className="flex items-center gap-4 p-3 bg-[#191f2f] rounded-xl">
            <div className="w-12 h-12 rounded-lg bg-[#323949] flex items-center justify-center">
              <svg className="w-6 h-6 text-[#6bfb9a]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
            </div>
            <div>
              <div className="text-[#dce2f7] font-bold text-sm">Dr. Nexus</div>
              <div className="text-[#6bfb9a] text-[10px] font-mono uppercase tracking-widest">Nexus-01</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-1">
          {[
            { label: "Dashboard", icon: "M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25", active: false },
            { label: "Schedule", icon: "M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5", active: true },
            { label: "Patients", icon: "M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z", active: false },
            { label: "Formulary", icon: "M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25", active: false },
            { label: "Assessment", icon: "M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z", active: false },
          ].map((item) => (
            <a
              key={item.label}
              href={item.label === "Formulary" ? "/practitioner/formulary" : item.label === "Assessment" ? "/practitioner/assessment" : "#"}
              className={`flex items-center gap-4 px-6 py-4 font-mono text-xs uppercase tracking-widest transition-all duration-300 ${
                item.active
                  ? "bg-[#232a3a] text-[#6bfb9a] border-l-4 border-[#6bfb9a]"
                  : "text-[#dce2f7]/50 hover:text-[#dce2f7] hover:bg-[#232a3a]/50"
              }`}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
              </svg>
              <span>{item.label}</span>
            </a>
          ))}
        </nav>

        <div className="px-6 pt-6 mt-auto border-t border-[#3d4a3e]/10">
          <div className="flex items-center justify-between text-[#dce2f7]/40 text-[10px] font-mono uppercase">
            <span>System Active</span>
            <span className="w-2 h-2 rounded-full bg-[#6bfb9a] animate-pulse" />
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="md:ml-64 min-h-screen pb-24 pt-24">
        {/* Top Bar */}
        <header className="bg-[#0c1322] fixed top-0 w-full z-50 flex items-center justify-between px-6 py-4 shadow-none">
          <div className="flex items-center gap-4">
            <div className="md:hidden w-8 h-8 rounded-full bg-[#4ade80]/20 flex items-center justify-center">
              <svg className="w-4 h-4 text-[#6bfb9a]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            </div>
            <h1 className="tracking-tight font-bold text-[#dce2f7] text-xl">Schedule</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex flex-col items-end mr-4">
              <span className="text-[10px] font-mono text-[#6bfb9a] uppercase">Clinical Scheduler</span>
              <span className="text-xs text-[#dce2f7]/60">
                {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
              </span>
            </div>
            <button className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-[#232a3a] transition-colors">
              <svg className="w-5 h-5 text-[#dce2f7]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
              </svg>
            </button>
          </div>
        </header>

        <div className="p-6 lg:p-8">
          {/* Calendar Header */}
          <CalendarHeader
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            weekLabel={weekLabel}
            onPrev={navigatePrev}
            onNext={navigateNext}
            onToday={navigateToday}
            onNewAppointment={handleNewAppointment}
          />

          {/* Bento Grid Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-9">
              <WeekViewGrid
                weekDates={weekDates}
                appointments={weekAppointments}
                onSlotClick={handleSlotClick}
                onAppointmentClick={handleAppointmentClick}
                onDragReschedule={handleDragReschedule}
              />
            </div>
            <div className="lg:col-span-3">
              <FollowUpQueue
                followUps={followUps}
                onScheduleFollowUp={handleScheduleFollowUp}
              />
            </div>
          </div>

          {/* Stats row below calendar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            {[
              { label: "Today", value: appointmentsList.filter((a) => a.date === formatDateKey(new Date())).length.toString(), sub: "appointments", color: "text-[#4ade80]" },
              { label: "This Week", value: weekAppointments.length.toString(), sub: "total scheduled", color: "text-[#dce2f7]" },
              { label: "Overdue", value: followUps.filter((f) => f.urgency === "overdue").length.toString(), sub: "follow-ups", color: "text-[#f87171]" },
              { label: "Utilization", value: `${Math.round((weekAppointments.reduce((s, a) => s + a.durationMinutes, 0) / (5 * 8 * 60)) * 100)}%`, sub: "weekly capacity", color: "text-[#a78bfa]" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="p-4 rounded-xl border border-[#3d4a3e]/10"
                style={{ background: "rgba(46, 53, 69, 0.4)", backdropFilter: "blur(20px)" }}
              >
                <div className="text-[10px] font-mono uppercase tracking-widest text-[#dce2f7]/40 mb-1">{stat.label}</div>
                <div className={`text-2xl font-black ${stat.color}`}>{stat.value}</div>
                <div className="text-[10px] text-[#dce2f7]/30">{stat.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full flex justify-around items-center px-4 pb-6 pt-3 z-50 rounded-t-3xl border-t border-[#3d4a3e]/15" style={{ background: "rgba(12, 19, 34, 0.8)", backdropFilter: "blur(20px)" }}>
        {[
          { label: "Home", icon: "M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25", active: false },
          { label: "Schedule", icon: "M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5", active: true },
          { label: "Patients", icon: "M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z", active: false },
          { label: "More", icon: "M6.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM12.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM18.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0z", active: false },
        ].map((item) => (
          <a
            key={item.label}
            href="#"
            className={`flex flex-col items-center justify-center px-3 py-1 transition-transform active:scale-90 ${
              item.active ? "bg-[#6bfb9a]/10 text-[#6bfb9a] rounded-xl" : "text-[#dce2f7]/40"
            }`}
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
            </svg>
            <span className="text-[10px] font-medium">{item.label}</span>
          </a>
        ))}
      </nav>

      {/* Appointment Modal */}
      <AppointmentModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditingAppointment(null); }}
        onSave={handleSaveAppointment}
        initialDate={modalInitialDate}
        initialHour={modalInitialHour}
        initialMinute={modalInitialMinute}
        editAppointment={editingAppointment}
      />
    </div>
  );
}
