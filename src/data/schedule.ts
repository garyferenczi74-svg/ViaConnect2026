export type AppointmentType = "initial" | "follow-up" | "urgent";
export type FollowUpUrgency = "overdue" | "due-soon" | "upcoming";

export interface Appointment {
  id: string;
  patientName: string;
  patientId: string;
  type: AppointmentType;
  protocol?: string;
  date: string; // YYYY-MM-DD
  startHour: number; // 8-17 (24h)
  startMinute: number; // 0 or 30
  durationMinutes: number; // 30, 60, 90
  notes?: string;
}

export interface FollowUp {
  id: string;
  patientName: string;
  patientId: string;
  protocol: string;
  daysUntilDue: number; // negative = overdue
  urgency: FollowUpUrgency;
  lastVisit: string;
  appointmentType: AppointmentType;
}

export interface Patient {
  id: string;
  name: string;
  protocols: string[];
}

export const patients: Patient[] = [
  { id: "p1", name: "Sarah Chen", protocols: ["5R Gut Restoration", "Circadian Reset"] },
  { id: "p2", name: "Marcus Rivera", protocols: ["Anti-Inflammatory Joint Protocol"] },
  { id: "p3", name: "Elena Vasquez", protocols: ["Hepatic Detox Phase II", "Adaptogenic Support"] },
  { id: "p4", name: "James Okafor", protocols: ["Cardioprotective Protocol"] },
  { id: "p5", name: "Aanya Patel", protocols: ["Thyroid Support", "Nootropic Stack"] },
  { id: "p6", name: "David Kim", protocols: ["Sleep Optimization", "HPA Axis Reset"] },
  { id: "p7", name: "Rachel Torres", protocols: ["Menopause Transition Support"] },
  { id: "p8", name: "Lucas Bennett", protocols: ["Sports Recovery", "Mitochondrial Support"] },
];

// Helper to get the Monday of the current week
export function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function formatDateKey(date: Date): string {
  return date.toISOString().split("T")[0];
}

export function getWeekDates(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });
}

// Generate appointments relative to today
function generateAppointments(): Appointment[] {
  const today = new Date();
  const weekStart = getWeekStart(today);
  const dates = getWeekDates(weekStart);

  return [
    // Monday
    { id: "a1", patientName: "Sarah Chen", patientId: "p1", type: "initial", protocol: "5R Gut Restoration", date: formatDateKey(dates[0]), startHour: 9, startMinute: 0, durationMinutes: 60, notes: "Initial intake — GI-MAP results review" },
    { id: "a2", patientName: "Marcus Rivera", patientId: "p2", type: "follow-up", protocol: "Anti-Inflammatory Joint Protocol", date: formatDateKey(dates[0]), startHour: 11, startMinute: 0, durationMinutes: 30, notes: "4-week follow-up, review ESR labs" },
    { id: "a3", patientName: "Aanya Patel", patientId: "p5", type: "follow-up", protocol: "Thyroid Support", date: formatDateKey(dates[0]), startHour: 14, startMinute: 0, durationMinutes: 30 },

    // Tuesday
    { id: "a4", patientName: "Elena Vasquez", patientId: "p3", type: "urgent", protocol: "Hepatic Detox Phase II", date: formatDateKey(dates[1]), startHour: 8, startMinute: 30, durationMinutes: 60, notes: "GGT spike — reassess protocol" },
    { id: "a5", patientName: "David Kim", patientId: "p6", type: "initial", protocol: "Sleep Optimization", date: formatDateKey(dates[1]), startHour: 10, startMinute: 0, durationMinutes: 60, notes: "New patient intake — chronic insomnia" },
    { id: "a6", patientName: "James Okafor", patientId: "p4", type: "follow-up", protocol: "Cardioprotective Protocol", date: formatDateKey(dates[1]), startHour: 13, startMinute: 0, durationMinutes: 30 },

    // Wednesday
    { id: "a7", patientName: "Rachel Torres", patientId: "p7", type: "initial", protocol: "Menopause Transition Support", date: formatDateKey(dates[2]), startHour: 9, startMinute: 30, durationMinutes: 90, notes: "Comprehensive hormonal assessment" },
    { id: "a8", patientName: "Lucas Bennett", patientId: "p8", type: "follow-up", protocol: "Sports Recovery", date: formatDateKey(dates[2]), startHour: 14, startMinute: 0, durationMinutes: 30 },

    // Thursday
    { id: "a9", patientName: "Sarah Chen", patientId: "p1", type: "follow-up", protocol: "Circadian Reset", date: formatDateKey(dates[3]), startHour: 10, startMinute: 0, durationMinutes: 30, notes: "Sleep journal review" },
    { id: "a10", patientName: "Marcus Rivera", patientId: "p2", type: "urgent", protocol: "Anti-Inflammatory Joint Protocol", date: formatDateKey(dates[3]), startHour: 11, startMinute: 30, durationMinutes: 60, notes: "Acute flare — pain score 8/10" },
    { id: "a11", patientName: "Aanya Patel", patientId: "p5", type: "follow-up", protocol: "Nootropic Stack", date: formatDateKey(dates[3]), startHour: 15, startMinute: 0, durationMinutes: 30 },

    // Friday
    { id: "a12", patientName: "Elena Vasquez", patientId: "p3", type: "follow-up", protocol: "Adaptogenic Support", date: formatDateKey(dates[4]), startHour: 9, startMinute: 0, durationMinutes: 30 },
    { id: "a13", patientName: "David Kim", patientId: "p6", type: "follow-up", protocol: "HPA Axis Reset", date: formatDateKey(dates[4]), startHour: 11, startMinute: 0, durationMinutes: 60, notes: "Cortisol diurnal curve review" },
    { id: "a14", patientName: "James Okafor", patientId: "p4", type: "follow-up", protocol: "Cardioprotective Protocol", date: formatDateKey(dates[4]), startHour: 14, startMinute: 30, durationMinutes: 30 },
  ];
}

export const appointments: Appointment[] = generateAppointments();

export const followUps: FollowUp[] = [
  { id: "f1", patientName: "Marcus Rivera", patientId: "p2", protocol: "Anti-Inflammatory Joint Protocol", daysUntilDue: -3, urgency: "overdue", lastVisit: "2026-03-10", appointmentType: "follow-up" },
  { id: "f2", patientName: "Elena Vasquez", patientId: "p3", protocol: "Hepatic Detox Phase II", daysUntilDue: -1, urgency: "overdue", lastVisit: "2026-03-04", appointmentType: "urgent" },
  { id: "f3", patientName: "David Kim", patientId: "p6", protocol: "Sleep Optimization", daysUntilDue: 2, urgency: "due-soon", lastVisit: "2026-03-12", appointmentType: "follow-up" },
  { id: "f4", patientName: "Aanya Patel", patientId: "p5", protocol: "Thyroid Support", daysUntilDue: 3, urgency: "due-soon", lastVisit: "2026-03-08", appointmentType: "follow-up" },
  { id: "f5", patientName: "Rachel Torres", patientId: "p7", protocol: "Menopause Transition Support", daysUntilDue: 7, urgency: "upcoming", lastVisit: "2026-03-05", appointmentType: "follow-up" },
  { id: "f6", patientName: "Lucas Bennett", patientId: "p8", protocol: "Mitochondrial Support", daysUntilDue: 10, urgency: "upcoming", lastVisit: "2026-03-01", appointmentType: "follow-up" },
  { id: "f7", patientName: "Sarah Chen", patientId: "p1", protocol: "5R Gut Restoration", daysUntilDue: 12, urgency: "upcoming", lastVisit: "2026-02-28", appointmentType: "follow-up" },
  { id: "f8", patientName: "James Okafor", patientId: "p4", protocol: "Cardioprotective Protocol", daysUntilDue: 14, urgency: "upcoming", lastVisit: "2026-02-25", appointmentType: "follow-up" },
];

export const HOURS = Array.from({ length: 11 }, (_, i) => i + 8); // 8-18

export function formatHour(hour: number): string {
  if (hour === 12) return "12:00 PM";
  if (hour > 12) return `${hour - 12}:00 PM`;
  return `${hour}:00 AM`;
}

export const TYPE_STYLES: Record<AppointmentType, { bg: string; border: string; text: string; label: string }> = {
  initial: { bg: "bg-[#4ade80]/10", border: "border-l-4 border-[#4ade80]", text: "text-[#4ade80]", label: "Initial Visit" },
  "follow-up": { bg: "bg-[#a78bfa]/10", border: "border-l-4 border-[#a78bfa]", text: "text-[#a78bfa]", label: "Follow-up" },
  urgent: { bg: "bg-[#f87171]/10", border: "border-l-4 border-[#f87171]", text: "text-[#f87171]", label: "Urgent" },
};

export const URGENCY_STYLES: Record<FollowUpUrgency, { bg: string; text: string; label: string }> = {
  overdue: { bg: "bg-[#f87171]/20", text: "text-[#f87171]", label: "Overdue" },
  "due-soon": { bg: "bg-yellow-400/20", text: "text-yellow-400", label: "Due Soon" },
  upcoming: { bg: "bg-[#4ade80]/20", text: "text-[#4ade80]", label: "Upcoming" },
};
