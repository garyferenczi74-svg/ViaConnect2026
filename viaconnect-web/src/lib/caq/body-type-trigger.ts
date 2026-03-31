// Body Type Trigger — determines if the underweight body type selector should show

export function calculateBMI(
  height: number,
  weight: number,
  heightUnit: "cm" | "ft" | "in",
  weightUnit: "kg" | "lbs"
): number {
  const heightM = heightUnit === "cm" ? height / 100 : height * 0.0254;
  const weightKg = weightUnit === "kg" ? weight : weight * 0.453592;
  if (heightM <= 0) return 0;
  return weightKg / (heightM * heightM);
}

export function shouldShowBodyTypeSelector(data: {
  height?: string | number;
  weight?: string | number;
  heightUnit?: "cm" | "ft";
  weightUnit?: "kg" | "lbs";
  healthConcerns?: string[];
  goals?: string[];
}): boolean {
  const h = typeof data.height === "string" ? parseFloat(data.height) : data.height;
  const w = typeof data.weight === "string" ? parseFloat(data.weight) : data.weight;

  // Method 1: BMI check (height stored in cm internally)
  if (h && w && h > 0 && w > 0) {
    const bmi = calculateBMI(h, w, "cm", "kg");
    if (bmi > 0 && bmi < 18.5) return true;
  }

  // Method 2: underweight-related concerns or goals
  const underweightKeywords = [
    "underweight",
    "weight_gain",
    "difficulty_gaining",
    "low_appetite",
    "too_thin",
    "muscle_gain",
    "hardgainer",
  ];

  const allSelections = [
    ...(data.healthConcerns || []),
    ...(data.goals || []),
  ].map((s) => s.toLowerCase());

  return allSelections.some((s) =>
    underweightKeywords.some((kw) => s.includes(kw))
  );
}
