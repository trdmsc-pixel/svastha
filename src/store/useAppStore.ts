import { create } from 'zustand';
import {
  HealthPlan,
  LabReportRecord,
  MealLog,
  MealSlot,
  PlanTask,
} from '@/types/domain';
import {
  buildSamplePlanFromReport,
  buildSampleReportRecord,
  SYNTHETIC_FOLLOWUP_RAW_TESTS,
} from '@/engine/fixtures/lalPathLabsFixture';
import { computeNutrientsForGrams, SEED_FOODS } from '@/engine/foodMatcher';
import { normalizeReportTests } from '@/engine/biomarkerEngine';

interface AppState {
  reports: LabReportRecord[];
  activePlan: HealthPlan | null;
  mealsToday: MealLog[];
  waterMlToday: number;
  tasksToday: PlanTask[];
  loadSampleReport: () => LabReportRecord;
  importFollowUpSampleReport: () => LabReportRecord;
  buildPlanForReport: (reportId: string) => HealthPlan | null;
  addWater: (ml: number) => void;
  toggleTaskDone: (taskId: string) => void;
  logQuickMeal: (foodId: string, grams: number, slot: MealSlot) => void;
}

const initialReport = buildSampleReportRecord();
const initialPlan = buildSamplePlanFromReport(initialReport);

const INITIAL_MEALS: MealLog[] = [
  {
    id: 'meal-1',
    eaten_at: '2026-11-26T08:30:00+05:30',
    slot: 'breakfast',
    source: 'photo',
    ai_confidence: 0.91,
    items: [
      {
        food_id: 'ifct_poha',
        name: 'Kanda poha with peanuts',
        qty: 1.5,
        unit: 'katori',
        grams: 225,
        nutrients: computeNutrientsForGrams(SEED_FOODS[3], 225),
        image_key: 'foods/poha.webp',
      },
    ],
    total: computeNutrientsForGrams(SEED_FOODS[3], 225),
  },
  {
    id: 'meal-2',
    eaten_at: '2026-11-26T13:15:00+05:30',
    slot: 'lunch',
    source: 'photo',
    ai_confidence: 0.88,
    items: [
      {
        food_id: 'ifct_dal_tadka',
        name: 'Dal tadka (toor dal)',
        qty: 1,
        unit: 'katori',
        grams: 180,
        nutrients: computeNutrientsForGrams(SEED_FOODS[1], 180),
        image_key: 'foods/dal-tadka.webp',
      },
      {
        food_id: 'ifct_roti',
        name: 'Whole-wheat roti (phulka)',
        qty: 2,
        unit: 'roti',
        grams: 70,
        nutrients: computeNutrientsForGrams(SEED_FOODS[0], 70),
        image_key: 'foods/roti.webp',
      },
      {
        food_id: 'ifct_curd',
        name: 'Plain curd (dahi)',
        qty: 1,
        unit: 'katori',
        grams: 150,
        nutrients: computeNutrientsForGrams(SEED_FOODS[6], 150),
        image_key: 'foods/curd.webp',
      },
    ],
    total: {
      kcal: 512,
      protein_g: 23.6,
      carbs_g: 74.6,
      fat_g: 12.5,
      fibre_g: 11.6,
    },
  },
];

const INITIAL_TASKS: PlanTask[] = [
  {
    id: 'task-1',
    plan_id: initialPlan.id,
    type: 'exercise',
    title: '30-min brisk walk',
    scheduled_at: '07:15',
    repeat_rule: 'daily',
    reminder: true,
    calendar_sync: true,
    status_today: 'done',
  },
  {
    id: 'task-2',
    plan_id: initialPlan.id,
    type: 'measure',
    title: 'Zero sugary drinks & alcohol today',
    scheduled_at: '18:00',
    repeat_rule: 'daily',
    reminder: false,
    calendar_sync: false,
  },
  {
    id: 'task-3',
    plan_id: initialPlan.id,
    type: 'sleep',
    title: 'Wind-down & lights out 10:45 PM',
    scheduled_at: '22:45',
    repeat_rule: 'daily',
    reminder: true,
    calendar_sync: true,
  },
];

export const useAppStore = create<AppState>((set, get) => ({
  reports: [initialReport],
  activePlan: initialPlan,
  mealsToday: INITIAL_MEALS,
  waterMlToday: 1500,
  tasksToday: INITIAL_TASKS,

  loadSampleReport: () => {
    const sample = buildSampleReportRecord();
    set((s) => ({
      reports: s.reports.some((r) => r.id === sample.id) ? s.reports : [sample, ...s.reports],
    }));
    return sample;
  },

  importFollowUpSampleReport: () => {
    const values = normalizeReportTests(SYNTHETIC_FOLLOWUP_RAW_TESTS);
    const followUp: LabReportRecord = {
      id: 'sample-followup-002',
      lab_name: 'Dr Lal PathLabs (12-Week Retest SAMPLE)',
      collected_at: '2027-02-18T08:30:00+05:30',
      reported_at: '2027-02-18T17:00:00+05:30',
      source_type: 'sample',
      is_sample: true,
      values,
      lab_notes: ['All previously flagged liver and lipid values have moved into the reference range.'],
    };
    set((s) => ({
      reports: [followUp, ...s.reports.filter((r) => r.id !== followUp.id)],
    }));
    return followUp;
  },

  buildPlanForReport: (reportId) => {
    const report = get().reports.find((r) => r.id === reportId);
    if (!report) return null;
    const plan = buildSamplePlanFromReport(report);
    set({ activePlan: plan });
    return plan;
  },

  addWater: (ml) => set((s) => ({ waterMlToday: Math.max(0, s.waterMlToday + ml) })),

  toggleTaskDone: (taskId) =>
    set((s) => ({
      tasksToday: s.tasksToday.map((t) =>
        t.id === taskId
          ? { ...t, status_today: t.status_today === 'done' ? undefined : 'done' }
          : t
      ),
    })),

  logQuickMeal: (foodId, grams, slot) => {
    const food = SEED_FOODS.find((f) => f.id === foodId) ?? SEED_FOODS[0];
    const nutrients = computeNutrientsForGrams(food, grams);
    const newMeal: MealLog = {
      id: `meal-${Date.now()}`,
      eaten_at: new Date().toISOString(),
      slot,
      source: 'search',
      items: [
        {
          food_id: food.id,
          name: food.name,
          qty: 1,
          unit: 'serving',
          grams,
          nutrients,
          image_key: food.image_key,
        },
      ],
      total: nutrients,
    };
    set((s) => ({ mealsToday: [...s.mealsToday, newMeal] }));
  },
}));
