// Smart description placeholders for CAQ symptom textareas
// Symptom-specific examples that help users provide useful context

export const SMART_PLACEHOLDERS: Record<string, string> = {
  // Physical
  fatigue_severity: 'Optional: Tell Ultrathink more (e.g., "worse after coffee" or "better with sunlight")',
  pain_severity: 'Optional: Where and when? (e.g., "lower back, worse sitting" or "joint pain in mornings")',
  headache_severity: 'Optional: Describe it (e.g., "behind the eyes, afternoons" or "migraine with aura weekly")',
  digestive_severity: 'Optional: What you notice (e.g., "bloating after meals" or "alternating constipation/diarrhea")',
  respiratory_severity: 'Optional: When does it happen? (e.g., "short of breath climbing stairs" or "seasonal")',
  cardiovascular_severity: 'Optional: What you feel (e.g., "heart races at rest" or "cold hands/feet always")',
  skin_severity: 'Optional: Describe it (e.g., "dry patches on elbows" or "breakouts along jawline")',
  weight_severity: 'Optional: What changed? (e.g., "gained 15 lbs in 6 months" or "can\'t gain despite eating more")',

  // Neurological
  brain_fog_severity: 'Optional: Describe it (e.g., "can\'t find words midsentence" or "worse after eating")',
  focus_severity: 'Optional: When is it worst? (e.g., "can\'t read for more than 10 minutes" or "fine in morning, gone by 2pm")',
  memory_severity: 'Optional: What happens? (e.g., "forget why I walked into a room" or "names slip away")',
  sleep_onset_severity: 'Optional: What happens? (e.g., "takes 2 hours to fall asleep" or "racing thoughts at bedtime")',
  sleep_quality_severity: 'Optional: Describe it (e.g., "wake at 3am every night" or "don\'t feel rested even after 8 hours")',
  numbness_severity: 'Optional: Where? (e.g., "fingertips when typing" or "feet when standing too long")',
  vision_severity: 'Optional: What changed? (e.g., "blurry when reading" or "light sensitivity is new")',
  tinnitus_severity: 'Optional: Describe it (e.g., "high-pitched ring, worse at night" or "comes and goes")',

  // Emotional
  anxiety_severity: 'Optional: When does it hit? (e.g., "mainly at night" or "before meetings")',
  depression_severity: 'Optional: What it feels like (e.g., "no motivation to do things I used to enjoy")',
  irritability_severity: 'Optional: What triggers it? (e.g., "small things set me off" or "worse before period")',
  stress_severity: 'Optional: Main sources? (e.g., "work deadlines" or "financial pressure and caregiving")',
  immune_severity: 'Optional: How often? (e.g., "sick every month" or "takes weeks to recover from a cold")',
  inflammation_severity: 'Optional: Where? (e.g., "puffy face in mornings" or "swollen ankles by evening")',
  hormonal_severity: 'Optional: What you notice (e.g., "hot flashes 5x/day" or "libido gone since last year")',
  hair_nail_severity: 'Optional: What changed? (e.g., "hair falling out in shower" or "nails peel and break")',
};

export const DEFAULT_PLACEHOLDER = "Optional: Tell Ultrathink in your own words (helps us find hidden connections)";
