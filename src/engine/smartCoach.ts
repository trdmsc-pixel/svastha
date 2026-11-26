import { HealthPlan, LabReportRecord, MealLog, Nutrients, UserProfile } from '@/types/domain';

export interface SmartCoachTip {
  id: string;
  badge: string;
  title: string;
  body: string;
  tone: 'accent' | 'ok' | 'watch';
  actionLabel: string;
  route: '/(tabs)/plan' | '/(tabs)/scan' | '/(tabs)/health';
  /** Optional craving prompt passed to the AI Recipe Chef when tapping the CTA. */
  recipeCraving?: string;
}

/**
 * Smart biomarker-aware daily coach.
 * Synthesises today's remaining calories/protein/water + latest lab report flagged biomarkers
 * + time of day into a concise, high-signal, actionable suggestion.
 */
export function buildSmartCoachTip(ctx: {
  now: Date;
  totals: Nutrients;
  targets: { kcal: number; protein_g: number; fibre_g: number; water_ml: number };
  waterMl: number;
  meals: MealLog[];
  latestReport: LabReportRecord | null;
  plan: HealthPlan | null;
  profile: UserProfile;
}): SmartCoachTip {
  const hour = ctx.now.getHours();
  const remKcal = Math.max(0, ctx.targets.kcal - ctx.totals.kcal);
  const remProtein = Math.max(0, Math.round(ctx.targets.protein_g - ctx.totals.protein_g));
  const remWater = Math.max(0, ctx.targets.water_ml - ctx.waterMl);
  const flagged = ctx.latestReport?.values.filter((v) => v.status !== 'normal') ?? [];
  const hasLiver = flagged.some((v) => v.biomarker_code === 'ALT' || v.biomarker_code === 'AST');
  const hasLipids = flagged.some((v) => v.biomarker_code === 'LDL' || v.biomarker_code === 'HDL' || v.biomarker_code === 'NON_HDL');
  const hasGlucose = flagged.some((v) => v.biomarker_code === 'GLUCOSE_FASTING' || v.biomarker_code === 'HBA1C');

  // 1. No report yet -> guide them to unlock full lab-driven intelligence
  if (!ctx.latestReport) {
    return {
      id: 'coach-no-report',
      badge: 'SMART START',
      title: 'Unlock lab-driven meal & recipe coaching',
      body: 'Import a PDF or photo of your latest blood report so Svastha can tailor daily targets and AI recipes to your exact biomarkers.',
      tone: 'accent',
      actionLabel: 'Import lab report',
      route: '/(tabs)/scan',
    };
  }

  // 2. Evening protein + biomarker-matched dinner suggestion
  if (hour >= 17 && remProtein >= 20 && remKcal >= 250) {
    const labFocus = hasLiver
      ? 'liver-friendly, low-oil'
      : hasLipids
      ? 'high-fibre, heart-healthy'
      : hasGlucose
      ? 'low-GI, steady-glucose'
      : 'balanced';
    return {
      id: 'coach-dinner-protein',
      badge: 'SMART DINNER COACH',
      title: `${remProtein} g protein left — craft a ${labFocus} dinner`,
      body: `You have ~${remKcal} kcal left today. Let Svastha AI generate a quick ${ctx.profile.diet_type} dinner tailored to your ${flagged.slice(0, 2).map((f) => f.biomarker_code).join(' & ') || 'health'} goals.`,
      tone: 'accent',
      actionLabel: 'Generate AI dinner',
      route: '/(tabs)/plan',
      recipeCraving: `Quick ${labFocus} ${ctx.profile.diet_type} dinner with at least ${Math.min(35, remProtein)}g protein under ${Math.min(600, remKcal)} kcal`,
    };
  }

  // 3. Afternoon hydration + fibre nudge
  if (hour >= 13 && hour < 17 && remWater >= 1000) {
    return {
      id: 'coach-afternoon-hydration',
      badge: 'HYDRATION & METABOLISM',
      title: `${Math.round(remWater / 250)} glasses left to stay on pace`,
      body: 'Steady hydration supports liver enzyme clearance and curbs late-afternoon snack cravings. Pair with a high-fibre snack like roasted makhana or sprouts.',
      tone: 'watch',
      actionLabel: 'See smart snacks',
      route: '/(tabs)/plan',
      recipeCraving: `Light crunchy ${ctx.profile.diet_type} afternoon snack under 250 kcal`,
    };
  }

  // 4. Morning biomarker-linked breakfast boost
  if (hour < 12 && ctx.meals.length === 0) {
    const focusNote = hasLipids
      ? 'Soluble fibre (oats, dal, flaxseed) at breakfast helps nudge LDL down.'
      : hasLiver
      ? 'A high-protein, low-sugar breakfast eases morning liver load.'
      : 'Starting with protein + fibre keeps energy and glucose steady.';
    return {
      id: 'coach-morning',
      badge: 'MORNING BRIEF',
      title: 'Ready to fuel your day?',
      body: `${focusNote} Snap your plate or generate a fresh AI breakfast idea.`,
      tone: 'ok',
      actionLabel: 'AI breakfast ideas',
      route: '/(tabs)/plan',
      recipeCraving: `Energising ${ctx.profile.diet_type} breakfast under 20 minutes`,
    };
  }

  // 5. Default celebratory / retest momentum tip
  return {
    id: 'coach-momentum',
    badge: 'ON TRACK',
    title: `${Math.round((ctx.totals.kcal / Math.max(1, ctx.targets.kcal)) * 100)}% of daily calories logged`,
    body: flagged.length > 0
      ? `Every consistent meal moves ${flagged.slice(0, 3).map((f) => f.biomarker_code).join(', ')} toward target before your retest.`
      : 'Great consistency today! Ask AI Chef for a fresh personalised recipe anytime.',
    tone: 'ok',
    actionLabel: 'Explore AI recipes',
    route: '/(tabs)/plan',
  };
}
