// Arnold Brain — Domain 2: Visual Assessment Markers
// What Arnold looks for when analyzing photos. Region by region.

export const FAT_REDUCTION_INDICATORS = {
  face: [
    'Sharper jawline definition',
    'More visible cheekbone structure',
    'Reduced submental under chin fullness',
    'More defined facial contours',
  ],
  neck_shoulders: [
    'More visible trapezius separation from neck',
    'Clearer clavicle definition',
    'Reduced upper back shelf',
  ],
  arms: [
    'Visible bicep and tricep separation',
    'Reduced upper arm circumference',
    'Vein visibility on forearms and biceps',
    'Tricep definition from back view',
  ],
  chest: [
    'Reduced chest tissue drooping, male',
    'More visible pectoral separation, male',
    'Upper chest definition emerging',
  ],
  midsection: [
    'Reduced waist width relative to shoulders',
    'Less abdominal protrusion in side view',
    'Oblique line visibility',
    'Upper ab visibility, first to show',
    'Love handle reduction',
    'Skin fold reduction at iliac crest',
  ],
  back: [
    'Reduced lower back fat pad',
    'Lat definition emerging',
    'Back dimple visibility at rhomboids',
    'Reduced bra line fat rolls, female',
  ],
  legs: [
    'Quad separation, vastus medialis visibility',
    'Inner thigh gap change, note highly genetic',
    'Reduced knee fat pad',
    'Calf definition',
    'Hamstring separation from back view',
  ],
  glutes: [
    'Improved gluteal fold definition',
    'Less lateral saddlebag volume',
    'More rounded vs flat shape from muscle development',
  ],
} as const;

export const MUSCLE_GROWTH_INDICATORS = {
  shoulders: [
    'Lateral deltoid cap formation',
    'Front deltoid separation from bicep',
    'Rear deltoid visibility from back',
    'Shoulder to waist ratio improvement, V taper',
  ],
  arms: [
    'Bicep peak development',
    'Tricep horseshoe formation',
    'Forearm thickness',
    'Brachialis visibility between bicep and tricep',
  ],
  chest: [
    'Upper lower pec separation line',
    'Inner chest thickness',
    'Overall chest projection from side view',
  ],
  back: [
    'Lat width, visible from front as wings',
    'Trapezius thickness from side view',
    'Rhomboid definition',
    'Erector spinae visible channels',
    'Christmas tree formation at lower back, advanced',
  ],
  core: [
    'Rectus abdominis visibility, 6 pack',
    'Oblique lines',
    'Serratus anterior finger definition',
    'Transverse abdominis tightness, flat midsection in side view',
  ],
  legs: [
    'Quadricep sweep, outer sweep from front',
    'Vastus medialis teardrop near knee',
    'Hamstring mass from side or back view',
    'Calf gastrocnemius vs soleus definition',
    'Gluteus medius shelf, upper glute from back',
  ],
} as const;

export const WATER_VS_FAT = {
  waterRetention: [
    'Puffy appearance, especially face and ankles',
    'Skin appears tight and shiny',
    'Rings or socks leave impressions',
    'Changes day to day, fat does not',
    'Worse in morning or after high sodium meals',
  ],
  fatGain: [
    'Gradual change over weeks or months',
    'Soft, pinchable tissue',
    'Consistent regardless of time of day',
    'Follows genetic distribution patterns',
  ],
} as const;

export const SKIN_FACTORS = {
  looseExcess: 'After significant weight loss over 50 lbs, loose skin can mask true body composition. Arnold adjusts estimates when user history shows large weight loss.',
  stretchMarks: 'Indicate rapid size changes in either direction. Not reversible but fade over time. Not a composition indicator.',
  cellulite: 'Structural fat pattern, primarily genetic. Present even at low body fat in many women. Not a meaningful composition metric.',
  tanning: 'Darker skin can visually enhance muscle definition. Arnold accounts for lighting conditions.',
} as const;

export const VISUAL_ASSESSMENT_SUMMARY = `
VISUAL MARKERS FOR FAT REDUCTION (Arnold checks by region):
  Face: jawline, cheekbones, reduced submental fat
  Midsection: oblique visibility, reduced protrusion, upper ab emergence
  Back: lower back pad reduction, lat definition, rhomboid dimples
  Arms: bicep/tricep separation, vein visibility
  Legs: quad separation, knee fat reduction, calf definition

VISUAL MARKERS FOR MUSCLE GROWTH:
  Shoulders: lateral cap, V taper improvement
  Back: lat width (wings), trap thickness
  Chest: upper/lower pec separation, projection
  Core: rectus abs, obliques, serratus fingers
  Legs: quad sweep, VMO teardrop, glute shelf

WATER vs FAT: Water is puffy, day-to-day variable, shiny. Fat is soft, gradual, consistent.
SKIN: Loose excess skin after big weight loss masks composition; Arnold adjusts estimates down.
`.trim();
