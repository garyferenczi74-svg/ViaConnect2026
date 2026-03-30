// Conversational symptom labels for CAQ phases
// Maps symptom field IDs to warm, conversational prompts

export const CONVERSATIONAL_LABELS: Record<string, { clinical: string; conversational: string }> = {
  // Physical Symptoms (Phase 3 / step 2a)
  fatigue_severity: { clinical: "Fatigue / Low Energy", conversational: "How's your energy feeling lately?" },
  pain_severity: { clinical: "Body Pain / Aches", conversational: "Any ongoing pain that won't quit?" },
  headache_severity: { clinical: "Headaches / Migraines", conversational: "Getting headaches or migraines?" },
  digestive_severity: { clinical: "Digestive Issues", conversational: "How's your gut treating you?" },
  respiratory_severity: { clinical: "Breathing / Respiratory", conversational: "Any trouble catching your breath?" },
  cardiovascular_severity: { clinical: "Heart / Circulation", conversational: "Any heart or circulation concerns?" },
  skin_severity: { clinical: "Skin Issues", conversational: "Anything going on with your skin?" },
  weight_severity: { clinical: "Unexplained Weight Changes", conversational: "Noticed unexpected weight shifts?" },

  // Neurological Symptoms (Phase 4 / step 2b)
  brain_fog_severity: { clinical: "Brain Fog", conversational: "Feeling mentally foggy or unclear?" },
  focus_severity: { clinical: "Focus / Concentration", conversational: "Hard to stay focused?" },
  memory_severity: { clinical: "Memory Issues", conversational: "Forgetting things more than usual?" },
  sleep_onset_severity: { clinical: "Falling Asleep", conversational: "Trouble winding down at night?" },
  sleep_quality_severity: { clinical: "Sleep Quality", conversational: "How's your sleep really?" },
  numbness_severity: { clinical: "Numbness / Tingling", conversational: "Pins and needles or numbness anywhere?" },
  vision_severity: { clinical: "Vision Changes", conversational: "Any shifts in your vision?" },
  tinnitus_severity: { clinical: "Tinnitus / Ear Issues", conversational: "Ringing or buzzing in your ears?" },

  // Emotional Symptoms (Phase 5 / step 2c)
  anxiety_severity: { clinical: "Anxiety / Nervousness", conversational: "Feeling anxious or on edge?" },
  depression_severity: { clinical: "Low Mood / Depression", conversational: "Feeling down or low more than usual?" },
  irritability_severity: { clinical: "Irritability / Mood Swings", conversational: "Getting frustrated more easily?" },
  stress_severity: { clinical: "Stress Level", conversational: "How heavy does stress feel right now?" },
  immune_severity: { clinical: "Frequent Illness", conversational: "Catching colds or feeling run down?" },
  inflammation_severity: { clinical: "Inflammation / Swelling", conversational: "Any puffiness, swelling, or inflammation?" },
  hormonal_severity: { clinical: "Hormonal Symptoms", conversational: "Anything that feels hormonal?" },
  hair_nail_severity: { clinical: "Hair & Nail Health", conversational: "Any changes with your hair or nails?" },
};
