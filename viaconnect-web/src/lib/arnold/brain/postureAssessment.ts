// Arnold Brain — Domain 5: Posture & Structural Assessment

export const POSTURE_DEVIATIONS = {
  anterior_pelvic_tilt: {
    description: 'Pelvis tilts forward, creating exaggerated lower back curve and protruding abdomen',
    visualCues: ['Pronounced lower back arch in side view','Abdomen protrudes even at low body fat','Glutes appear to stick out'],
    affectsComposition: 'Makes abdominal fat appear worse than it is. Can add 2 to 4 percent to visual body fat estimate.',
    commonCauses: ['Prolonged sitting','Weak glutes','Tight hip flexors'],
    note: 'Arnold adjusts visual body fat estimate down when APT is detected.',
  },
  kyphosis: {
    description: 'Excessive upper back rounding, hunched shoulders',
    visualCues: ['Shoulders rolled forward in side view','Head forward of shoulder line','Upper back rounded'],
    affectsComposition: 'Makes chest appear less developed, back wider. Reduces visual V taper.',
    commonCauses: ['Desk work','Phone posture','Weak upper back muscles'],
  },
  lordosis: {
    description: 'Excessive lower back curve beyond normal',
    visualCues: ['Deep lower back curve in side view','Stomach pushed forward'],
    affectsComposition: 'Exaggerates abdominal protrusion. Similar visual impact to APT.',
    commonCauses: ['Weak core', 'Tight hip flexors', 'Pregnancy aftermath'],
  },
  lateral_shift: {
    description: 'Uneven weight distribution, body shifts to one side',
    visualCues: ['Uneven shoulder height in front view','Hip tilt','Asymmetric waist crease'],
    affectsComposition: 'Affects symmetry assessment. Arnold notes this as postural, not muscular.',
    commonCauses: ['Leg length discrepancy', 'Carrying habits', 'Scoliosis'],
  },
  forward_head: {
    description: 'Head positioned forward of the shoulder line',
    visualCues: ['Ear significantly forward of shoulder in side view'],
    affectsComposition: 'Minimal direct composition impact but affects visual assessment of neck and upper back.',
    commonCauses: ['Screen time', 'Phone use', 'Weak deep neck flexors'],
  },
} as const;

export type PostureDeviation = keyof typeof POSTURE_DEVIATIONS;

export const ALIGNMENT_LINES = {
  sideView: {
    plumbLine: 'Ear to shoulder to hip to knee to ankle should align vertically',
    deviationThreshold: '2 inches or more off plumb line is clinically significant',
  },
  frontView: {
    symmetryLine: 'Vertical center line should bisect nose, sternum, navel, pubic symphysis',
    shoulderLevel: 'Acromion processes should be at same height, plus or minus half an inch',
    hipLevel: 'Iliac crests should be at same height',
  },
} as const;

export const POSTURE_SUMMARY = `
POSTURE DEVIATIONS ARNOLD DETECTS IN PHOTOS:
  Anterior pelvic tilt: arched low back, protruding belly; add 2-4% to visual BF if detected
  Kyphosis: hunched upper back, reduces visual V taper
  Lordosis: deep low back curve, exaggerates belly
  Lateral shift: uneven shoulders/hips; postural not muscular
  Forward head: ear forward of shoulder line

ALIGNMENT REFERENCES:
  Side: plumb line through ear-shoulder-hip-knee-ankle; 2+ inches off is significant
  Front: center line bisects nose-sternum-navel; shoulders and hips level within 0.5"
`.trim();
