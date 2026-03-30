// Calendar Integration — .ics file generation for action plan items

interface CalendarAction {
  action: string;
  rationale: string;
  expectedTimeframe: string;
}

function formatICSDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function getActionStartDate(timeframe: string): Date {
  const now = new Date();
  const lower = timeframe.toLowerCase();

  if (lower.includes("today") || lower.includes("immediate")) {
    now.setHours(9, 0, 0, 0);
    return now;
  }
  if (lower.includes("week")) {
    now.setDate(now.getDate() + 3);
    now.setHours(9, 0, 0, 0);
    return now;
  }
  if (lower.includes("month")) {
    now.setDate(now.getDate() + 14);
    now.setHours(9, 0, 0, 0);
    return now;
  }
  // Ongoing — set 7 days from now
  now.setDate(now.getDate() + 7);
  now.setHours(9, 0, 0, 0);
  return now;
}

export function generateCalendarEvent(action: CalendarAction): string {
  const startDate = getActionStartDate(action.expectedTimeframe);
  const uid = `viaconnect-${Date.now()}-${Math.random().toString(36).slice(2)}@viaconnectapp.com`;

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//ViaConnect//Ultrathink//EN",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTART:${formatICSDate(startDate)}`,
    "DURATION:PT30M",
    `SUMMARY:ViaConnect: ${action.action}`,
    `DESCRIPTION:${action.rationale}\\n\\nFrom your ViaConnect\\u2122 Ultrathink Action Plan`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

export function downloadICS(action: CalendarAction): void {
  const icsContent = generateCalendarEvent(action);
  const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `viaconnect-action-${Date.now()}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
