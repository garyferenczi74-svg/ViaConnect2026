// Prompt #85n: SVG region paths for the 12 body-part heat-map overlay.
//
// These coordinates are approximate v1 starting points drawn against a
// 400 by 800 viewBox per the prompt brief. The actual avatar SVGs in the
// "Body Tracker" Supabase bucket render at 720 by 1152 (male) and 720 by
// 1008 (female), so the overlay is letterboxed by preserveAspectRatio
// against the rendered avatar bounds and the visual alignment will be
// approximate until #85n.1 calibrates each path against the rendered
// anatomy.
//
// The region IDs match the BODY_PARTS keys in
// app/(app)/(consumer)/body-tracker/composition/page.tsx so the overlay
// fill, the callout card, and the change hook all reference the same
// region by the same ID.

export interface OverlayRegion {
  id: string;
  label: string;
  malePath: string;
  femalePath: string;
}

export const BODY_REGIONS_OVERLAY: readonly OverlayRegion[] = [
  {
    id: 'neck',
    label: 'Neck',
    malePath: 'M185,80 L215,80 L215,105 L185,105 Z',
    femalePath: 'M185,85 L215,85 L215,110 L185,110 Z',
  },
  {
    id: 'shoulders',
    label: 'Shoulders',
    malePath: 'M130,105 L270,105 L270,130 L130,130 Z',
    femalePath: 'M140,110 L260,110 L260,135 L140,135 Z',
  },
  {
    id: 'chest',
    label: 'Chest',
    malePath: 'M145,130 L255,130 L255,190 L145,190 Z',
    femalePath: 'M148,135 L252,135 L252,195 L148,195 Z',
  },
  {
    id: 'waist',
    label: 'Waist',
    malePath: 'M155,190 L245,190 L245,250 L155,250 Z',
    femalePath: 'M155,195 L245,195 L245,255 L155,255 Z',
  },
  {
    id: 'r_bicep',
    label: 'R. Bicep',
    malePath: 'M265,130 L295,130 L295,200 L265,200 Z',
    femalePath: 'M255,135 L280,135 L280,200 L255,200 Z',
  },
  {
    id: 'l_bicep',
    label: 'L. Bicep',
    malePath: 'M105,130 L135,130 L135,200 L105,200 Z',
    femalePath: 'M120,135 L145,135 L145,200 L120,200 Z',
  },
  {
    id: 'r_forearm',
    label: 'R. Forearm',
    malePath: 'M270,200 L300,200 L300,290 L270,290 Z',
    femalePath: 'M258,200 L283,200 L283,285 L258,285 Z',
  },
  {
    id: 'l_forearm',
    label: 'L. Forearm',
    malePath: 'M100,200 L130,200 L130,290 L100,290 Z',
    femalePath: 'M117,200 L142,200 L142,285 L117,285 Z',
  },
  {
    id: 'r_quad',
    label: 'R. Quadriceps',
    malePath: 'M210,300 L250,300 L250,450 L210,450 Z',
    femalePath: 'M210,310 L255,310 L255,460 L210,460 Z',
  },
  {
    id: 'l_quad',
    label: 'L. Quadriceps',
    malePath: 'M150,300 L190,300 L190,450 L150,450 Z',
    femalePath: 'M145,310 L190,310 L190,460 L145,460 Z',
  },
  {
    id: 'r_calf',
    label: 'R. Calf',
    malePath: 'M215,455 L248,455 L248,580 L215,580 Z',
    femalePath: 'M215,465 L250,465 L250,590 L215,590 Z',
  },
  {
    id: 'l_calf',
    label: 'L. Calf',
    malePath: 'M152,455 L185,455 L185,580 L152,580 Z',
    femalePath: 'M150,465 L185,465 L185,590 L150,590 Z',
  },
];
