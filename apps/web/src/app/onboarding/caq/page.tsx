"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const HEALTH_GOALS = [
  { id: "longevity", label: "Longevity & Anti-Aging", icon: "hourglass_top" },
  { id: "energy", label: "Energy & Vitality", icon: "bolt" },
  { id: "sleep", label: "Sleep Optimization", icon: "bedtime" },
  { id: "stress", label: "Stress & Anxiety", icon: "spa" },
  { id: "gut", label: "Gut Health", icon: "gastroenterology" },
  { id: "hormones", label: "Hormone Balance", icon: "labs" },
  { id: "cognitive", label: "Cognitive Performance", icon: "psychology" },
  { id: "fitness", label: "Athletic Performance", icon: "fitness_center" },
  { id: "immune", label: "Immune Support", icon: "shield" },
  { id: "weight", label: "Weight Management", icon: "monitor_weight" },
];

const CONDITIONS = [
  "Hypertension",
  "Diabetes (Type 2)",
  "Thyroid Disorder",
  "Autoimmune Condition",
  "Anxiety / Depression",
  "IBS / Digestive Issues",
  "Chronic Fatigue",
  "Joint Pain / Arthritis",
  "High Cholesterol",
  "None of the above",
];

const SUPPLEMENTS = [
  "Vitamin D",
  "Omega-3 / Fish Oil",
  "Magnesium",
  "Probiotics",
  "B-Complex",
  "Vitamin C",
  "CoQ10",
  "Zinc",
  "Ashwagandha",
  "Turmeric / Curcumin",
  "NAC",
  "NMN / NR",
];

const TOTAL_STEPS = 5;

export default function CAQPage() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  // Step 1
  const [dob, setDob] = useState("");
  const [sex, setSex] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [weightKg, setWeightKg] = useState("");

  // Step 2
  const [goals, setGoals] = useState<string[]>([]);

  // Step 3
  const [conditions, setConditions] = useState<string[]>([]);
  const [medications, setMedications] = useState("");
  const [allergies, setAllergies] = useState("");

  // Step 4
  const [sleepHours, setSleepHours] = useState("");
  const [exerciseFreq, setExerciseFreq] = useState("");
  const [stressLevel, setStressLevel] = useState("");
  const [dietType, setDietType] = useState("");

  // Step 5
  const [supplements, setSupplements] = useState<string[]>([]);
  const [herbalExp, setHerbalExp] = useState(false);

  function toggleArrayItem(arr: string[], item: string, setter: (v: string[]) => void) {
    setter(arr.includes(item) ? arr.filter((i) => i !== item) : [...arr, item]);
  }

  async function handleSubmit() {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      window.location.href = "/login";
      return;
    }

    const { error } = await supabase.from("clinical_assessments").upsert({
      user_id: user.id,
      date_of_birth: dob || null,
      biological_sex: sex || null,
      height_cm: heightCm ? parseFloat(heightCm) : null,
      weight_kg: weightKg ? parseFloat(weightKg) : null,
      primary_goals: goals,
      current_conditions: conditions.filter((c) => c !== "None of the above"),
      current_medications: medications || null,
      allergies: allergies || null,
      sleep_hours_avg: sleepHours ? parseFloat(sleepHours) : null,
      exercise_frequency: exerciseFreq || null,
      stress_level: stressLevel || null,
      diet_type: dietType || null,
      current_supplements: supplements,
      previous_herbal_experience: herbalExp,
      completed: true,
      completed_at: new Date().toISOString(),
    });

    if (error) {
      console.error("CAQ save error:", error);
      setLoading(false);
      return;
    }

    // Mark onboarding complete
    await supabase
      .from("profiles")
      .update({ onboarding_completed: true })
      .eq("id", user.id);

    window.location.href = "/";
  }

  const progressPct = (step / TOTAL_STEPS) * 100;

  return (
    <div className="flex min-h-screen flex-col bg-gradient-dark">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background-dark/80 backdrop-blur-md px-6 pt-6 pb-4">
        <div className="flex items-center justify-between mb-4">
          {step > 1 ? (
            <button
              onClick={() => setStep(step - 1)}
              className="flex items-center gap-1 text-slate-400 text-sm"
            >
              <span className="material-symbols-outlined text-lg">arrow_back</span>
              Back
            </button>
          ) : (
            <div />
          )}
          <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
            Step {step} of {TOTAL_STEPS}
          </span>
        </div>
        {/* Progress bar */}
        <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      <div className="flex-1 px-6 py-6 overflow-y-auto pb-32">
        {/* Step 1: Basic Info */}
        {step === 1 && (
          <div className="flex flex-col gap-6">
            <div>
              <h2 className="text-white text-2xl font-bold mb-2">
                Let&apos;s get to know you
              </h2>
              <p className="text-slate-400 text-sm">
                This helps us personalize your health protocols.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Date of Birth
              </label>
              <input
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                className="w-full rounded-xl glass px-4 py-3 text-white outline-none focus:ring-2 focus:ring-primary/50 transition [color-scheme:dark]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Biological Sex
              </label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: "male", label: "Male" },
                  { value: "female", label: "Female" },
                  { value: "intersex", label: "Intersex" },
                  { value: "prefer_not_to_say", label: "Prefer not to say" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setSex(opt.value)}
                    className={`rounded-xl px-4 py-3 text-sm font-medium transition ${
                      sex === opt.value
                        ? "bg-primary text-white shadow-lg shadow-primary/20"
                        : "glass text-slate-300"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Height (cm)
                </label>
                <input
                  type="number"
                  value={heightCm}
                  onChange={(e) => setHeightCm(e.target.value)}
                  placeholder="175"
                  className="w-full rounded-xl glass px-4 py-3 text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-primary/50 transition"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Weight (kg)
                </label>
                <input
                  type="number"
                  value={weightKg}
                  onChange={(e) => setWeightKg(e.target.value)}
                  placeholder="75"
                  className="w-full rounded-xl glass px-4 py-3 text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-primary/50 transition"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Health Goals */}
        {step === 2 && (
          <div className="flex flex-col gap-6">
            <div>
              <h2 className="text-white text-2xl font-bold mb-2">
                What are your health goals?
              </h2>
              <p className="text-slate-400 text-sm">
                Select all that apply. We&apos;ll tailor your protocols accordingly.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {HEALTH_GOALS.map((goal) => (
                <button
                  key={goal.id}
                  onClick={() => toggleArrayItem(goals, goal.id, setGoals)}
                  className={`flex items-center gap-4 rounded-2xl p-4 transition ${
                    goals.includes(goal.id)
                      ? "bg-primary/15 border-2 border-primary/50"
                      : "glass"
                  }`}
                >
                  <div
                    className={`flex size-10 items-center justify-center rounded-xl ${
                      goals.includes(goal.id) ? "bg-primary/20" : "bg-slate-800"
                    }`}
                  >
                    <span
                      className={`material-symbols-outlined ${
                        goals.includes(goal.id) ? "text-primary" : "text-slate-400"
                      }`}
                    >
                      {goal.icon}
                    </span>
                  </div>
                  <span
                    className={`font-medium ${
                      goals.includes(goal.id) ? "text-white" : "text-slate-300"
                    }`}
                  >
                    {goal.label}
                  </span>
                  {goals.includes(goal.id) && (
                    <span className="material-symbols-outlined text-primary ml-auto">
                      check_circle
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Current Conditions */}
        {step === 3 && (
          <div className="flex flex-col gap-6">
            <div>
              <h2 className="text-white text-2xl font-bold mb-2">
                Health conditions & medications
              </h2>
              <p className="text-slate-400 text-sm">
                This ensures safe protocol recommendations. All data is encrypted.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                Current Conditions
              </label>
              <div className="flex flex-wrap gap-2">
                {CONDITIONS.map((condition) => (
                  <button
                    key={condition}
                    onClick={() =>
                      toggleArrayItem(conditions, condition, setConditions)
                    }
                    className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                      conditions.includes(condition)
                        ? "bg-primary text-white"
                        : "glass text-slate-300"
                    }`}
                  >
                    {condition}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Current Medications
              </label>
              <textarea
                value={medications}
                onChange={(e) => setMedications(e.target.value)}
                placeholder="List any medications you're currently taking..."
                rows={3}
                className="w-full rounded-xl glass px-4 py-3 text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-primary/50 transition resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Known Allergies
              </label>
              <input
                type="text"
                value={allergies}
                onChange={(e) => setAllergies(e.target.value)}
                placeholder="e.g. Ragweed, shellfish, penicillin"
                className="w-full rounded-xl glass px-4 py-3 text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-primary/50 transition"
              />
            </div>
          </div>
        )}

        {/* Step 4: Lifestyle */}
        {step === 4 && (
          <div className="flex flex-col gap-6">
            <div>
              <h2 className="text-white text-2xl font-bold mb-2">
                Your lifestyle
              </h2>
              <p className="text-slate-400 text-sm">
                Understanding your habits helps us calibrate dosing and timing.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Average Sleep (hours/night)
              </label>
              <input
                type="number"
                step="0.5"
                min="0"
                max="16"
                value={sleepHours}
                onChange={(e) => setSleepHours(e.target.value)}
                placeholder="7.5"
                className="w-full rounded-xl glass px-4 py-3 text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-primary/50 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                Exercise Frequency
              </label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: "none", label: "Sedentary" },
                  { value: "1-2_weekly", label: "1-2x / week" },
                  { value: "3-4_weekly", label: "3-4x / week" },
                  { value: "5+_weekly", label: "5+ / week" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setExerciseFreq(opt.value)}
                    className={`rounded-xl px-4 py-3 text-sm font-medium transition ${
                      exerciseFreq === opt.value
                        ? "bg-primary text-white shadow-lg shadow-primary/20"
                        : "glass text-slate-300"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                Stress Level
              </label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: "low", label: "Low" },
                  { value: "moderate", label: "Moderate" },
                  { value: "high", label: "High" },
                  { value: "very_high", label: "Very High" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setStressLevel(opt.value)}
                    className={`rounded-xl px-4 py-3 text-sm font-medium transition ${
                      stressLevel === opt.value
                        ? "bg-primary text-white shadow-lg shadow-primary/20"
                        : "glass text-slate-300"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                Diet Type
              </label>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: "omnivore", label: "Omnivore" },
                  { value: "vegetarian", label: "Vegetarian" },
                  { value: "vegan", label: "Vegan" },
                  { value: "keto", label: "Keto" },
                  { value: "paleo", label: "Paleo" },
                  { value: "mediterranean", label: "Mediterranean" },
                  { value: "other", label: "Other" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setDietType(opt.value)}
                    className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                      dietType === opt.value
                        ? "bg-primary text-white"
                        : "glass text-slate-300"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 5: Supplements & History */}
        {step === 5 && (
          <div className="flex flex-col gap-6">
            <div>
              <h2 className="text-white text-2xl font-bold mb-2">
                Supplement & herbal history
              </h2>
              <p className="text-slate-400 text-sm">
                Tell us what you&apos;re already taking so we avoid redundancy.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                Current Supplements
              </label>
              <div className="flex flex-wrap gap-2">
                {SUPPLEMENTS.map((supp) => (
                  <button
                    key={supp}
                    onClick={() =>
                      toggleArrayItem(supplements, supp, setSupplements)
                    }
                    className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                      supplements.includes(supp)
                        ? "bg-primary text-white"
                        : "glass text-slate-300"
                    }`}
                  >
                    {supp}
                  </button>
                ))}
              </div>
            </div>

            <div className="glass rounded-2xl p-4">
              <button
                onClick={() => setHerbalExp(!herbalExp)}
                className="flex items-center justify-between w-full"
              >
                <div>
                  <p className="text-white font-medium text-left">
                    Previous herbal medicine experience?
                  </p>
                  <p className="text-slate-400 text-xs mt-1">
                    Have you used tinctures, herbal formulas, or worked with an
                    herbalist before?
                  </p>
                </div>
                <div
                  className={`flex size-6 shrink-0 items-center justify-center rounded transition ${
                    herbalExp
                      ? "bg-primary"
                      : "border-2 border-slate-600"
                  }`}
                >
                  {herbalExp && (
                    <span className="material-symbols-outlined text-white text-sm">
                      check
                    </span>
                  )}
                </div>
              </button>
            </div>

            {/* Summary preview */}
            <div className="glass rounded-2xl p-5 border-primary/20 bg-primary/5">
              <div className="flex items-center gap-3 mb-3">
                <span className="material-symbols-outlined text-primary">
                  verified
                </span>
                <h4 className="text-primary font-bold">
                  Your data is secure
                </h4>
              </div>
              <p className="text-slate-300 text-sm leading-relaxed">
                All clinical assessment data is encrypted and only used to generate
                personalized health protocols. You can update your answers anytime
                from Settings.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Fixed Bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 z-50 px-6 pb-8 pt-4 bg-gradient-to-t from-background-dark via-background-dark/95 to-transparent">
        <button
          onClick={step < TOTAL_STEPS ? () => setStep(step + 1) : handleSubmit}
          disabled={loading}
          className="w-full rounded-xl bg-primary py-4 text-sm font-bold text-white shadow-lg shadow-primary/30 transition hover:bg-primary/90 disabled:opacity-50"
        >
          {loading
            ? "Saving..."
            : step < TOTAL_STEPS
            ? "Continue"
            : "Complete Assessment"}
        </button>
      </div>
    </div>
  );
}
