// Arnold Brain — Domain 4: Muscle Anatomy & Development Assessment

export const MUSCLE_VISIBILITY = {
  front_view: {
    primary:   ['Anterior deltoids','Pectorals','Biceps','Rectus abdominis','Obliques','Quadriceps','Tibialis anterior'],
    secondary: ['Serratus anterior','Forearms','Adductors','Vastus medialis'],
  },
  back_view: {
    primary:   ['Posterior deltoids','Trapezius','Latissimus dorsi','Rhomboids','Erector spinae','Gluteals','Hamstrings','Calves (gastrocnemius)'],
    secondary: ['Teres major and minor','Infraspinatus','Lower back (multifidus)'],
  },
  left_side_view: {
    primary:   ['Lateral deltoid','Tricep lateral head','Chest depth','Abdominal protrusion or flatness','Gluteal projection','Quadricep and hamstring balance'],
    secondary: ['Forearm thickness','Calf profile','Posture alignment'],
  },
  right_side_view: {
    primary:   ['Same as left, used for bilateral symmetry comparison'],
    secondary: ['Side specific development differences'],
  },
} as const;

export type MuscleDevelopmentLevel = 0 | 1 | 2 | 3 | 4;

export const DEVELOPMENT_LEVELS: Record<MuscleDevelopmentLevel, { label: string; description: string }> = {
  0: { label: 'Undeveloped', description: 'No visible muscle definition. Muscle covered by fat or simply not developed.' },
  1: { label: 'Beginner',    description: 'Slight muscle shape visible. Some definition when flexed.' },
  2: { label: 'Intermediate', description: 'Clear muscle shape at rest. Good definition when flexed. Separation between major groups.' },
  3: { label: 'Advanced',    description: 'Detailed muscle separation at rest. Striations visible in some areas. Clear V taper.' },
  4: { label: 'Elite',       description: 'Full muscle separation, cross striations, vascularity. Competition ready.' },
};

export interface SymmetryCheck {
  name: string;
  compare: string;
  view: 'front' | 'back' | 'side_comparison';
}

export const SYMMETRY_CHECKS: SymmetryCheck[] = [
  { name: 'Shoulder balance',    compare: 'left_deltoid vs right_deltoid', view: 'front' },
  { name: 'Arm symmetry',        compare: 'left_arm vs right_arm',         view: 'front' },
  { name: 'Chest symmetry',      compare: 'left_pec vs right_pec',         view: 'front' },
  { name: 'Quad symmetry',       compare: 'left_quad vs right_quad',       view: 'front' },
  { name: 'Lat symmetry',        compare: 'left_lat vs right_lat',         view: 'back' },
  { name: 'Calf symmetry',       compare: 'left_calf vs right_calf',       view: 'back' },
  { name: 'Glute symmetry',      compare: 'left_glute vs right_glute',     view: 'back' },
  { name: 'Side profile balance', compare: 'left_side vs right_side',      view: 'side_comparison' },
];

export const MUSCLE_ANATOMY_SUMMARY = `
WHAT ARNOLD CAN ASSESS FROM EACH POSE:
  Front: anterior delts, pecs, biceps, abs, obliques, quads, tibialis
  Back:  posterior delts, traps, lats, rhomboids, erectors, glutes, hammies, calves
  Side:  lateral delt cap, tricep, chest depth, ab flatness, glute projection

DEVELOPMENT LEVELS (0-4):
  0 undeveloped, 1 beginner, 2 intermediate, 3 advanced, 4 elite

SYMMETRY CHECKS (8 bilateral comparisons):
  Shoulders, arms, chest, quads (front) | lats, calves, glutes (back) | side profile (sides)
`.trim();
