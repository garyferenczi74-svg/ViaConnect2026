/**
 * Mobile-first consumer glass chrome. Default classes apply at 390px.
 * Do not add smaller `md:` overrides that shrink type on desktop.
 * Desktop may keep an already-larger `md:` size (text-2xl, 26px, etc.).
 */

export const CONSUMER_CARD_TITLE =
  'text-xl font-semibold leading-tight text-white';

export const CONSUMER_CARD_SUBHEAD =
  'text-sm leading-relaxed text-white/85';

export const CONSUMER_HUB_H1 =
  'mt-1 text-xl font-semibold leading-tight text-white md:text-[26px]';

export const CONSUMER_HUB_SUBLINE =
  'mt-1 text-sm leading-relaxed text-white/85';

export const CONSUMER_EYEBROW =
  'text-xs font-semibold uppercase tracking-wider text-white/80';

export const CONSUMER_EYEBROW_TEAL =
  'flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-[#2DA5A0]';

export const CONSUMER_METRIC_LABEL =
  'text-xs uppercase tracking-wide text-white/70';

export const CONSUMER_SOURCE_PILL =
  'inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-sm text-white/90';

/** One In today's score row at 390. text-xs (not text-sm). 44px tap height. */
export const CONSUMER_BOS_CHIP =
  'inline-flex min-h-[44px] min-w-[44px] shrink-0 items-center gap-1 px-1 text-xs font-medium';

export const CONSUMER_HANNAH_CHIP =
  'inline-flex min-h-[44px] flex-shrink-0 items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-sm text-white/90 backdrop-blur-sm';

export const CONSUMER_OPEN_PILL_BASE =
  'inline-flex min-h-[44px] items-center gap-1 rounded-full border border-[#5B8DEF]/30 bg-[#2A4C9E]/[0.12] px-3 py-1.5 text-sm font-medium text-white backdrop-blur-md';

export const CONSUMER_OPEN_PILL_GROUP =
  `${CONSUMER_OPEN_PILL_BASE} transition-all duration-200 group-hover:border-[#5B8DEF]/55 group-hover:bg-[#2A4C9E]/20 motion-reduce:transition-none`;

export const CONSUMER_OPEN_PILL_LINK =
  `${CONSUMER_OPEN_PILL_BASE} no-underline transition-all duration-200 hover:border-[#5B8DEF]/55 hover:bg-[#2A4C9E]/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2DA5A0]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1A2744] motion-reduce:transition-none`;

/** Main / hero plasma rings (Dashboard BOS, Nutrition Score, Daily Macros). */
export const PLASMA_MAIN_MOBILE = 200;
export const PLASMA_MAIN_DESKTOP = 240;

/** Compact list-row rings. Stay in the row; not hero size. */
export const PLASMA_COMPACT_ROW = 148;

export const CONSUMER_HOMEWORK =
  'mt-0.5 min-w-0 text-sm leading-snug break-words [overflow-wrap:break-word] [word-break:normal]';

/**
 * Lift Brief 49 schedule-row type from DailySchedule wrappers only.
 * Do not edit ScheduleSupplementCard (SHA-locked).
 */
export const CONSUMER_SCHEDULE_ROW_SCALE =
  '[&_[data-testid=schedule-row-name]]:text-base [&_[data-testid=schedule-row-homework]]:min-w-0 [&_[data-testid=schedule-row-homework]]:text-sm [&_[data-testid=schedule-row-homework]]:leading-snug [&_[data-testid=schedule-row-homework]]:text-white/85 [&_[data-testid=schedule-row-dose]]:max-w-[28%] [&_[data-testid=schedule-row-dose]]:text-right';
