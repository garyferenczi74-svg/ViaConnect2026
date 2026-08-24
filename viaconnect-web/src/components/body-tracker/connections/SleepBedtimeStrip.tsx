import {
  bedtimeBarPercent,
  weekdayLetter,
  type BedtimeStripView,
} from '@/lib/body-tracker/sleep-bedtime-strip';

interface SleepBedtimeStripProps {
  strip: BedtimeStripView;
}

export function SleepBedtimeStrip({ strip }: SleepBedtimeStripProps) {
  if (!strip.visible || strip.kind !== 'samples') return null;

  return (
    <div
      data-bedtime-strip="samples"
      aria-label="Two-week bedtime strip"
      className="mt-3"
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">
        Bedtimes
      </p>
      <div className="mt-2 flex h-16 items-stretch gap-1">
        {strip.nights.map((night) => {
          const percent = bedtimeBarPercent(night.offsetMinutes);
          const known = night.bedtimeAt !== null && percent !== null;
          return (
            <div
              key={night.dayKey}
              data-bedtime-night={night.dayKey}
              data-bedtime-at={night.bedtimeAt ?? 'unknown'}
              className="relative min-w-0 flex-1 rounded-sm bg-white/[0.04]"
              title={night.label ?? 'UNKNOWN'}
            >
              {known ? (
                <span
                  className="absolute left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-[#2DA5A0]"
                  style={{ top: `${percent}%` }}
                  aria-hidden
                />
              ) : null}
            </div>
          );
        })}
      </div>
      <div className="mt-1 flex gap-1">
        {strip.nights.map((night) => (
          <span
            key={`wd-${night.dayKey}`}
            className="min-w-0 flex-1 text-center text-[9px] text-white/35"
          >
            {weekdayLetter(night.dayKey)}
          </span>
        ))}
      </div>
    </div>
  );
}
