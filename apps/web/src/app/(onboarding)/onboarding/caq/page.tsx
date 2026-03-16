'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

const CAQ_MODULES = [
  'demographics',
  'health_history',
  'current_symptoms',
  'medications',
  'supplements',
  'diet_nutrition',
  'lifestyle',
  'health_goals',
  'family_history',
  'genetic_status',
] as const;

const MODULE_LABELS: Record<string, string> = {
  demographics: 'Demographics',
  health_history: 'Health History',
  current_symptoms: 'Current Symptoms',
  medications: 'Medications',
  supplements: 'Supplements',
  diet_nutrition: 'Diet & Nutrition',
  lifestyle: 'Lifestyle',
  health_goals: 'Health Goals',
  family_history: 'Family History',
  genetic_status: 'Genetic Status',
};

type CAQData = Record<string, Record<string, unknown>>;

export default function CAQPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [data, setData] = useState<CAQData>({});
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  const currentModule = CAQ_MODULES[currentStep];
  const progress = ((currentStep) / CAQ_MODULES.length) * 100;
  const isLastStep = currentStep === CAQ_MODULES.length - 1;

  const updateModuleData = useCallback((moduleData: Record<string, unknown>) => {
    setData((prev) => ({ ...prev, [currentModule]: moduleData }));
  }, [currentModule]);

  async function handleNext() {
    setSaving(true);
    // Simulate save to Supabase
    await new Promise((r) => setTimeout(r, 300));
    setSaving(false);

    if (isLastStep) {
      router.push('/onboarding/quick-win');
    } else {
      setCurrentStep((s) => s + 1);
    }
  }

  function handleBack() {
    if (currentStep > 0) {
      setCurrentStep((s) => s - 1);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center px-4 py-8">
      {/* Progress bar */}
      <div className="w-full max-w-2xl">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="text-slate-400">
            Step {currentStep + 1} of {CAQ_MODULES.length}
          </span>
          <span className="text-emerald-400">{Math.round(progress)}% complete</span>
        </div>
        <div className="h-2 rounded-full bg-white/10">
          <div
            className="h-2 rounded-full bg-gradient-to-r from-violet-500 to-emerald-500 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Module title */}
      <div className="mt-8 w-full max-w-2xl">
        <h2 className="text-2xl font-bold text-white">{MODULE_LABELS[currentModule]}</h2>
        <p className="mt-1 text-slate-400">Complete each section for a personalized health profile</p>
      </div>

      {/* Module form */}
      <div className="mt-6 w-full max-w-2xl rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
        <CAQModuleForm
          module={currentModule}
          data={data[currentModule] || {}}
          onChange={updateModuleData}
        />
      </div>

      {/* Navigation */}
      <div className="mt-6 flex w-full max-w-2xl gap-3">
        {currentStep > 0 && (
          <button
            onClick={handleBack}
            className="rounded-lg border border-white/10 px-6 py-3 text-white hover:bg-white/5 transition-colors"
          >
            Back
          </button>
        )}
        <button
          onClick={handleNext}
          disabled={saving}
          className="ml-auto rounded-lg bg-gradient-to-r from-emerald-500 to-cyan-500 px-8 py-3 font-medium text-white hover:from-emerald-600 hover:to-cyan-600 disabled:opacity-50 transition-all"
        >
          {saving ? 'Saving...' : isLastStep ? 'Complete Assessment' : 'Next'}
        </button>
      </div>

      {/* Module indicators */}
      <div className="mt-8 flex gap-2">
        {CAQ_MODULES.map((mod, i) => (
          <button
            key={mod}
            onClick={() => i <= currentStep && setCurrentStep(i)}
            className={`h-2 w-8 rounded-full transition-all ${
              i === currentStep
                ? 'bg-emerald-500 w-12'
                : i < currentStep
                  ? 'bg-emerald-500/50'
                  : 'bg-white/10'
            }`}
            title={MODULE_LABELS[mod]}
          />
        ))}
      </div>
    </div>
  );
}

function CAQModuleForm({
  module,
  data,
  onChange,
}: {
  module: string;
  data: Record<string, unknown>;
  onChange: (data: Record<string, unknown>) => void;
}) {
  function updateField(field: string, value: unknown) {
    onChange({ ...data, [field]: value });
  }

  switch (module) {
    case 'demographics':
      return (
        <div className="space-y-4">
          <FormField label="Age" type="number" value={data.age as number} onChange={(v) => updateField('age', parseInt(v))} placeholder="25" />
          <FormSelect label="Biological Sex" value={data.sex as string} onChange={(v) => updateField('sex', v)} options={[
            { value: 'male', label: 'Male' }, { value: 'female', label: 'Female' },
            { value: 'other', label: 'Other' }, { value: 'prefer_not_to_say', label: 'Prefer not to say' },
          ]} />
          <FormField label="Ethnicity (optional)" value={data.ethnicity as string} onChange={(v) => updateField('ethnicity', v)} />
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Height (cm)" type="number" value={data.height_cm as number} onChange={(v) => updateField('height_cm', parseFloat(v))} />
            <FormField label="Weight (kg)" type="number" value={data.weight_kg as number} onChange={(v) => updateField('weight_kg', parseFloat(v))} />
          </div>
        </div>
      );
    case 'health_history':
      return (
        <div className="space-y-4">
          <FormField label="Known Medical Conditions" value={data.conditions_text as string} onChange={(v) => updateField('conditions_text', v)} placeholder="Type conditions, separated by commas" />
          <FormField label="Past Surgeries" value={data.surgeries_text as string} onChange={(v) => updateField('surgeries_text', v)} placeholder="Type surgeries, separated by commas" />
          <FormField label="Allergies" value={data.allergies_text as string} onChange={(v) => updateField('allergies_text', v)} placeholder="Drug, food, or environmental allergies" />
          <FormSelect label="Blood Type" value={data.blood_type as string} onChange={(v) => updateField('blood_type', v)} options={[
            { value: 'unknown', label: 'Unknown' }, { value: 'A+', label: 'A+' }, { value: 'A-', label: 'A-' },
            { value: 'B+', label: 'B+' }, { value: 'B-', label: 'B-' }, { value: 'AB+', label: 'AB+' },
            { value: 'AB-', label: 'AB-' }, { value: 'O+', label: 'O+' }, { value: 'O-', label: 'O-' },
          ]} />
        </div>
      );
    case 'current_symptoms':
      return (
        <div className="space-y-4">
          <FormField label="Primary Complaint" value={data.primary_complaint as string} onChange={(v) => updateField('primary_complaint', v)} placeholder="What brings you here today?" />
          <FormField label="Current Symptoms" value={data.symptoms_text as string} onChange={(v) => updateField('symptoms_text', v)} placeholder="List your symptoms, separated by commas" />
          <FormSlider label="Overall Wellbeing" value={data.overall_wellbeing as number || 5} onChange={(v) => updateField('overall_wellbeing', v)} min={1} max={10} />
        </div>
      );
    case 'medications':
      return (
        <div className="space-y-4">
          <FormField label="Current Medications" value={data.current_text as string} onChange={(v) => updateField('current_text', v)} placeholder="Medication name, dosage, frequency (one per line)" />
          <FormField label="OTC Medications" value={data.otc_text as string} onChange={(v) => updateField('otc_text', v)} placeholder="Over-the-counter medications" />
          <FormField label="Known Drug Allergies" value={data.drug_allergies_text as string} onChange={(v) => updateField('drug_allergies_text', v)} placeholder="e.g., Penicillin, Sulfa" />
        </div>
      );
    case 'supplements':
      return (
        <div className="space-y-4">
          <FormField label="Current Supplements" value={data.current_text as string} onChange={(v) => updateField('current_text', v)} placeholder="Supplement name, brand, dosage (one per line)" />
          <FormField label="Past Supplements" value={data.past_text as string} onChange={(v) => updateField('past_text', v)} placeholder="Previously tried supplements" />
          <FormField label="Interested In" value={data.interested_text as string} onChange={(v) => updateField('interested_text', v)} placeholder="Supplements you'd like to explore" />
        </div>
      );
    case 'diet_nutrition':
      return (
        <div className="space-y-4">
          <FormSelect label="Diet Type" value={data.diet_type as string} onChange={(v) => updateField('diet_type', v)} options={[
            { value: 'omnivore', label: 'Omnivore' }, { value: 'vegetarian', label: 'Vegetarian' },
            { value: 'vegan', label: 'Vegan' }, { value: 'pescatarian', label: 'Pescatarian' },
            { value: 'keto', label: 'Keto' }, { value: 'paleo', label: 'Paleo' },
            { value: 'mediterranean', label: 'Mediterranean' }, { value: 'other', label: 'Other' },
          ]} />
          <FormField label="Food Allergies / Intolerances" value={data.allergies_text as string} onChange={(v) => updateField('allergies_text', v)} placeholder="e.g., Gluten, Dairy, Nuts" />
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Meals per Day" type="number" value={data.meals_per_day as number} onChange={(v) => updateField('meals_per_day', parseInt(v))} />
            <FormField label="Water (liters/day)" type="number" value={data.water_liters as number} onChange={(v) => updateField('water_liters', parseFloat(v))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Caffeine (cups/day)" type="number" value={data.caffeine as number} onChange={(v) => updateField('caffeine', parseInt(v))} />
            <FormField label="Alcohol (drinks/week)" type="number" value={data.alcohol as number} onChange={(v) => updateField('alcohol', parseInt(v))} />
          </div>
        </div>
      );
    case 'lifestyle':
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Sleep (hours/night)" type="number" value={data.sleep_hours as number} onChange={(v) => updateField('sleep_hours', parseFloat(v))} />
            <FormSlider label="Sleep Quality" value={data.sleep_quality as number || 5} onChange={(v) => updateField('sleep_quality', v)} min={1} max={10} />
          </div>
          <FormField label="Exercise (min/week)" type="number" value={data.exercise_minutes as number} onChange={(v) => updateField('exercise_minutes', parseInt(v))} />
          <FormSlider label="Stress Level" value={data.stress_level as number || 5} onChange={(v) => updateField('stress_level', v)} min={1} max={10} />
          <FormSelect label="Smoking Status" value={data.smoking_status as string} onChange={(v) => updateField('smoking_status', v)} options={[
            { value: 'never', label: 'Never' }, { value: 'former', label: 'Former' },
            { value: 'current', label: 'Current' }, { value: 'vaping', label: 'Vaping' },
          ]} />
          <FormField label="Occupation" value={data.occupation as string} onChange={(v) => updateField('occupation', v)} />
        </div>
      );
    case 'health_goals':
      return (
        <div className="space-y-4">
          <FormField label="Primary Health Goals" value={data.goals_text as string} onChange={(v) => updateField('goals_text', v)} placeholder="e.g., More energy, Better sleep, Weight management" />
          <FormSelect label="Timeline" value={data.timeline as string} onChange={(v) => updateField('timeline', v)} options={[
            { value: '1_month', label: '1 Month' }, { value: '3_months', label: '3 Months' },
            { value: '6_months', label: '6 Months' }, { value: '1_year', label: '1 Year' },
            { value: 'ongoing', label: 'Ongoing' },
          ]} />
          <FormSelect label="Budget Preference" value={data.budget as string} onChange={(v) => updateField('budget', v)} options={[
            { value: 'minimal', label: 'Minimal' }, { value: 'moderate', label: 'Moderate' },
            { value: 'flexible', label: 'Flexible' }, { value: 'no_limit', label: 'No Limit' },
          ]} />
          <FormSlider label="Openness to Natural Remedies" value={data.openness as number || 7} onChange={(v) => updateField('openness', v)} min={1} max={10} />
        </div>
      );
    case 'family_history':
      return (
        <div className="space-y-4">
          <p className="text-sm text-slate-400">Does anyone in your immediate family have a history of:</p>
          <FormCheckbox label="Cancer" checked={!!data.cancer} onChange={(v) => updateField('cancer', v)} />
          <FormCheckbox label="Cardiovascular Disease" checked={!!data.cardiovascular} onChange={(v) => updateField('cardiovascular', v)} />
          <FormCheckbox label="Diabetes" checked={!!data.diabetes} onChange={(v) => updateField('diabetes', v)} />
          <FormCheckbox label="Autoimmune Conditions" checked={!!data.autoimmune} onChange={(v) => updateField('autoimmune', v)} />
          <FormCheckbox label="Mental Health Conditions" checked={!!data.mental_health} onChange={(v) => updateField('mental_health', v)} />
          <FormField label="Known Genetic Conditions" value={data.genetic_conditions_text as string} onChange={(v) => updateField('genetic_conditions_text', v)} placeholder="Any known inherited conditions" />
        </div>
      );
    case 'genetic_status':
      return (
        <div className="space-y-4">
          <FormCheckbox label="I have had genetic testing done before" checked={!!data.has_prior_testing} onChange={(v) => updateField('has_prior_testing', v)} />
          {!!data.has_prior_testing && (
            <>
              <FormSelect label="Testing Provider" value={data.testing_provider as string} onChange={(v) => updateField('testing_provider', v)} options={[
                { value: '23andme', label: '23andMe' }, { value: 'ancestry', label: 'AncestryDNA' },
                { value: 'clinical', label: 'Clinical Lab' }, { value: 'other', label: 'Other' },
              ]} />
              <FormCheckbox label="I have raw data available for upload" checked={!!data.raw_data_available} onChange={(v) => updateField('raw_data_available', v)} />
            </>
          )}
          <FormCheckbox label="I am interested in genetic testing" checked={data.interested_in_testing !== false} onChange={(v) => updateField('interested_in_testing', v)} />
          <FormField label="Specific Concerns" value={data.concerns_text as string} onChange={(v) => updateField('concerns_text', v)} placeholder="Any specific health concerns you'd like addressed" />
        </div>
      );
    default:
      return <p className="text-slate-400">Module not found</p>;
  }
}

// Reusable form components
function FormField({ label, type = 'text', value, onChange, placeholder }: {
  label: string; type?: string; value?: string | number; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-300">{label}</label>
      <input
        type={type}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
      />
    </div>
  );
}

function FormSelect({ label, value, onChange, options }: {
  label: string; value?: string; onChange: (v: string) => void; options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-300">{label}</label>
      <select
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
      >
        <option value="" className="bg-slate-900">Select...</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-slate-900">{opt.label}</option>
        ))}
      </select>
    </div>
  );
}

function FormSlider({ label, value, onChange, min, max }: {
  label: string; value: number; onChange: (v: number) => void; min: number; max: number;
}) {
  return (
    <div>
      <label className="flex items-center justify-between text-sm font-medium text-slate-300">
        {label}
        <span className="text-emerald-400">{value}/{max}</span>
      </label>
      <input
        type="range"
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        min={min}
        max={max}
        className="mt-2 w-full accent-emerald-500"
      />
    </div>
  );
}

function FormCheckbox({ label, checked, onChange }: {
  label: string; checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-3 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-slate-600 bg-white/5 text-emerald-500 focus:ring-emerald-500"
      />
      <span className="text-sm text-slate-300">{label}</span>
    </label>
  );
}
