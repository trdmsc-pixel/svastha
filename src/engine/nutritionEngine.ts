import { ActivityLevel, BiologicalSex } from '@/types/domain';

const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

export interface CalorieTargetInput {
  sex: BiologicalSex;
  ageYears: number;
  heightCm: number;
  weightKg: number;
  activityLevel: ActivityLevel;
  goal: 'lose_weight' | 'maintain' | 'gain_muscle';
  pregnant?: boolean;
  underMedicalSupervision?: boolean;
}

export interface CalorieTargetResult {
  bmr: number;
  tdee: number;
  dailyKcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fibreG: number;
  bmi: number;
  deficitBlockedReason?: string;
}

/**
 * Deterministic Mifflin-St Jeor BMR & safe calorie target calculation (Section 8.3).
 * Max deficit 500 kcal/day; floors 1,500 kcal (men) / 1,200 kcal (women).
 * Zero deficit if pregnant, underweight (BMI < 18.5), or under medical supervision flag.
 */
export function calculateDailyNutritionTargets(input: CalorieTargetInput): CalorieTargetResult {
  const heightM = input.heightCm / 100;
  const bmi = Number((input.weightKg / (heightM * heightM)).toFixed(1));

  const sexOffset = input.sex === 'M' ? 5 : input.sex === 'F' ? -161 : -78;
  const bmr = Math.round(10 * input.weightKg + 6.25 * input.heightCm - 5 * input.ageYears + sexOffset);
  const tdee = Math.round(bmr * ACTIVITY_MULTIPLIERS[input.activityLevel]);

  let dailyKcal = tdee;
  let deficitBlockedReason: string | undefined;

  if (input.goal === 'lose_weight') {
    if (input.pregnant) {
      deficitBlockedReason = 'Calorie deficit disabled during pregnancy. Please consult your doctor.';
    } else if (bmi < 18.5) {
      deficitBlockedReason = 'Calorie deficit disabled because current BMI is in the underweight range.';
    } else if (input.underMedicalSupervision) {
      deficitBlockedReason = 'Calorie deficit disabled while under active medical supervision.';
    } else {
      const floor = input.sex === 'M' ? 1500 : 1200;
      dailyKcal = Math.max(floor, tdee - 500);
    }
  } else if (input.goal === 'gain_muscle') {
    dailyKcal = tdee + 250;
  }

  // Balanced metabolic-friendly macro split: ~25% protein, ~48% carbs, ~27% fat
  const proteinG = Math.round((dailyKcal * 0.25) / 4);
  const fatG = Math.round((dailyKcal * 0.27) / 9);
  const carbsG = Math.round((dailyKcal - proteinG * 4 - fatG * 9) / 4);
  const fibreG = input.sex === 'M' ? 35 : 28;

  return {
    bmr,
    tdee,
    dailyKcal,
    proteinG,
    carbsG,
    fatG,
    fibreG,
    bmi,
    deficitBlockedReason,
  };
}

/**
 * Weather-aware daily hydration goal (Section 7.5 & 11.5):
 * Base 33 ml/kg, +300 ml for moderate/active, +15% on hot days (>= 35°C).
 */
export function calculateDailyWaterMl(
  weightKg: number,
  activityLevel: ActivityLevel,
  tempCelsius?: number
): number {
  let ml = weightKg * 33;
  if (activityLevel === 'moderate' || activityLevel === 'active' || activityLevel === 'very_active') {
    ml += 350;
  }
  if (tempCelsius !== undefined && tempCelsius >= 35) {
    ml *= 1.15;
  }
  return Math.round(ml / 50) * 50;
}
