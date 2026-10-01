// My Genetics action chips reuse the section sub-nav tab
// (Research Hub / Science / Shop / Profile in MobileNavBar) and the
// portal tab shape (Personal Wellness / Practitioner / Naturopath / Admin).
// Classes are copied from those controls. This module does not change them.
//
// The active section tab paints a 15 percent teal wash that is see-through.
// On the nav bar (#0D1520) the teal label stays at or above WCAG AA. On a
// card photo that same wash lets the image through and the label fails AA.
// The wash is therefore layered on an opaque #0D1520 plate, which is the
// bar color the tabs already sit on, so the chip matches the tab and the
// label contrast does not depend on the photo.

export const GENETICS_ACTION_TAB_TEXT = '#2DA5A0';
export const GENETICS_ACTION_TAB_BAR = '#0D1520';
export const GENETICS_ACTION_TAB_HOVER = '#1A2744';
export const GENETICS_ACTION_TAB_WASH = 0.15;

export const GENETICS_ACTION_TAB_CTA_CLASS = [
  'inline-flex min-h-[44px] flex-shrink-0 items-center gap-1.5 px-3 py-2',
  'rounded-full text-xs font-medium whitespace-nowrap transition-all',
  'border border-[rgba(45,165,160,0.3)] text-[#2DA5A0]',
  'bg-[linear-gradient(rgba(45,165,160,0.15),rgba(45,165,160,0.15)),linear-gradient(#0D1520,#0D1520)]',
  'group-hover:bg-none group-hover:border-[#2DA5A0]/50 group-hover:bg-[#1A2744]',
  'group-focus-visible:outline-none group-focus-visible:border-[#2DA5A0]',
  'group-focus-visible:ring-2 group-focus-visible:ring-[#2DA5A0]/70',
  'group-focus-visible:ring-offset-2 group-focus-visible:ring-offset-[#1A2744]',
  'group-active:border-[#2DA5A0]',
].join(' ');

export const GENETICS_ACTION_CTA_COPY = {
  uploadDna: { visible: 'DNA', aria: 'Upload DNA' },
  uploadLabs: { visible: 'Labs', aria: 'Upload Labs' },
  catalog: { visible: 'Catalog', aria: 'Browse Catalog' },
  panels: { visible: 'Panels', aria: 'View Panels' },
} as const;
