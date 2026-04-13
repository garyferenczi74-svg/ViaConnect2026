export function localMidnightUTC(timezone: string, offsetDays: number): Date {
  const formatter = new Intl.DateTimeFormat('sv-SE', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const localDate = formatter.format(new Date());
  const [y, m, d] = localDate.split('-').map(Number);

  const target = new Date(y, m - 1, d + offsetDays, 0, 0, 0, 0);
  return target;
}

export function isSubmittedToday(
  submittedAt: string | null | undefined,
  timezone: string,
): boolean {
  if (!submittedAt) return false;

  const todayStart = localMidnightUTC(timezone, 0);
  const todayEnd = localMidnightUTC(timezone, 1);
  const submitted = new Date(submittedAt);

  return submitted >= todayStart && submitted < todayEnd;
}
