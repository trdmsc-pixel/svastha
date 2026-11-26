import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  AppSettings,
  FoodItem,
  HealthBackground,
  HealthPlan,
  InboxItem,
  LabReportRecord,
  MealLog,
  MealLogItem,
  MealSlot,
  MealSource,
  NotificationPrefs,
  PlanTask,
  Recipe,
  TaskLogStatus,
  UserProfile,
} from '@/types/domain';
import { buildSampleReportRecord, SYNTHETIC_FOLLOWUP_RAW_TESTS } from '@/engine/fixtures/lalPathLabsFixture';
import { ALL_FOODS, computeNutrientsForGrams } from '@/engine/foodMatcher';
import { normalizeReportTests } from '@/engine/biomarkerEngine';
import { buildDeterministicSummary } from '@/engine/reportSummary';
import { buildPersonalPlan, refreshPlanTargets } from '@/engine/planBuilder';
import { DEFAULT_NOTIFICATION_PREFS } from '@/engine/reminderSchedule';
import { sumNutrients } from '@/engine/mealAnalysis';
import { addDays, DateKey, isoAt, todayKey } from '@/lib/dates';
import { persistStorage, readRaw, removeKey } from '@/lib/storage';
import { fetchCloudFoods, saveCloudAiRecipes, upsertCloudFood } from '@/lib/cloudCatalog';

export interface DayLog {
  meals: MealLog[];
  waterMl: number;
  waterEntries: Array<{ ml: number; at: string }>;
  taskStatus: Record<string, TaskLogStatus>;
}

export interface ConsentRecord {
  purpose: 'account' | 'report_processing' | 'meal_photo_processing' | 'ai_recipes';
  version: string;
  granted_at: string;
  withdrawn_at?: string;
}

export const EMPTY_DAY: DayLog = { meals: [], waterMl: 0, waterEntries: [], taskStatus: {} };

export const DEFAULT_SETTINGS: AppSettings = {
  aiRecipeSuggestions: true,
  aiMealPhotoAnalysis: true,
  calendarSyncEnabled: false,
  showDeviceCalendarEvents: true,
  haptics: true,
};

export function blankProfile(id: string): UserProfile {
  return {
    id,
    full_name: '',
    dob: '',
    sex: 'M',
    height_cm: 165,
    weight_kg: 65,
    waist_cm: null,
    target_weight_kg: null,
    city: '',
    diet_type: 'vegetarian',
    fasting_practices: [],
    activity_level: 'light',
    job_type: 'desk',
    wake_time: '06:30',
    sleep_time: '22:30',
    cuisine_prefs: ['North Indian'],
    budget_level: 'moderate',
    goals: ['Improve lab report'],
    units: 'metric',
    language: 'en',
  };
}

export function blankHealth(id: string): HealthBackground {
  return { user_id: id, conditions: [], family_history: [], allergies: [], smoking: 'never', alcohol_units_week: 0, pregnant: false, under_medical_supervision: false, medications: [], notes: '' };
}

interface DataState {
  userId: string;
  profile: UserProfile;
  healthBackground: HealthBackground;
  onboardingComplete: boolean;
  consents: ConsentRecord[];
  settings: AppSettings;
  notificationPrefs: NotificationPrefs;
  days: Record<DateKey, DayLog>;
  reports: LabReportRecord[];
  activePlan: HealthPlan | null;
  tasks: PlanTask[];
  readInboxIds: string[];
  deviceEventIds: Record<string, string>;
  aiRecipes: { generatedAt: string; recipes: Recipe[] } | null;
  savedRecipeIds: string[];
  customFoods: FoodItem[];
}

interface AppState extends DataState {
  /** The day the whole app is showing (dashboard, logging, calendar). Not persisted. */
  selectedDate: DateKey;
  hasHydrated: boolean;
  pendingRecipeCraving: string | null;

  setSelectedDate: (d: DateKey) => void;
  shiftSelectedDate: (days: number) => void;
  goToday: () => void;

  logMeal: (items: MealLogItem[], slot: MealSlot, source: MealSource, opts?: { aiConfidence?: number; date?: DateKey; time?: string }) => MealLog;
  updateMealItems: (date: DateKey, mealId: string, items: MealLogItem[]) => void;
  deleteMeal: (date: DateKey, mealId: string) => void;
  logFood: (foodId: string, grams: number, slot: MealSlot, date?: DateKey) => void;
  addWater: (ml: number, date?: DateKey) => void;
  undoWater: (date?: DateKey) => void;
  setTaskStatus: (taskId: string, status: TaskLogStatus | undefined, date?: DateKey) => void;
  toggleTaskDone: (taskId: string, date?: DateKey) => void;
  upsertTask: (task: PlanTask) => void;
  removeTask: (taskId: string) => void;

  addReport: (report: LabReportRecord) => void;
  deleteReport: (reportId: string) => void;
  loadSampleReport: () => LabReportRecord;
  importFollowUpSampleReport: () => LabReportRecord;
  buildPlanForReport: (reportId: string) => HealthPlan | null;

  updateProfile: (patch: Partial<UserProfile>) => void;
  updateHealthBackground: (patch: Partial<HealthBackground>) => void;
  saveProfileAndHealth: (profile: UserProfile, health: HealthBackground) => void;
  completeOnboarding: () => void;
  grantConsent: (purpose: ConsentRecord['purpose']) => void;
  withdrawConsent: (purpose: ConsentRecord['purpose']) => void;
  hasConsent: (purpose: ConsentRecord['purpose']) => boolean;

  updateSettings: (patch: Partial<AppSettings>) => void;
  updateNotificationPrefs: (patch: Partial<NotificationPrefs>) => void;
  markInboxRead: (ids: string[]) => void;
  setDeviceEventIds: (map: Record<string, string>) => void;
  setAiRecipes: (recipes: Recipe[], cravingPrompt?: string) => void;
  appendAiRecipes: (recipes: Recipe[], cravingPrompt?: string) => void;
  toggleSavedRecipe: (id: string) => void;
  registerCustomFoods: (foods: FoodItem[]) => Promise<number>;
  syncCloudFoods: () => Promise<void>;
  setPendingRecipeCraving: (craving: string | null) => void;
}

const CONSENT_VERSION = '2026-11';

export function initialData(userId: string): DataState {
  return {
    userId,
    profile: blankProfile(userId),
    healthBackground: blankHealth(userId),
    onboardingComplete: false,
    consents: [],
    settings: DEFAULT_SETTINGS,
    notificationPrefs: DEFAULT_NOTIFICATION_PREFS,
    days: {},
    reports: [],
    activePlan: null,
    tasks: [],
    readInboxIds: [],
    deviceEventIds: {},
    aiRecipes: null,
    savedRecipeIds: [],
    customFoods: [],
  };
}

const getDay = (days: Record<DateKey, DayLog>, d: DateKey): DayLog => days[d] ?? EMPTY_DAY;

const withDay = (days: Record<DateKey, DayLog>, d: DateKey, fn: (day: DayLog) => DayLog): Record<DateKey, DayLog> => ({
  ...days,
  [d]: fn(getDay(days, d)),
});

function defaultTimeFor(slot: MealSlot): string {
  return { breakfast: '08:30', lunch: '13:15', snack: '17:00', dinner: '20:30' }[slot];
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      ...initialData('anon'),
      selectedDate: todayKey(),
      hasHydrated: false,
      pendingRecipeCraving: null,

      setSelectedDate: (d) => set({ selectedDate: d }),
      shiftSelectedDate: (n) => set((s) => ({ selectedDate: addDays(s.selectedDate, n) })),
      goToday: () => set({ selectedDate: todayKey() }),

      logMeal: (items, slot, source, opts = {}) => {
        const date = opts.date ?? get().selectedDate;
        const isToday = date === todayKey();
        const eatenAt = isToday && !opts.time ? new Date().toISOString() : isoAt(date, opts.time ?? defaultTimeFor(slot));
        const meal: MealLog = {
          id: `meal-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          date,
          eaten_at: eatenAt,
          slot,
          source,
          items,
          total: sumNutrients(items),
          ai_confidence: opts.aiConfidence,
        };
        set((s) => ({ days: withDay(s.days, date, (day) => ({ ...day, meals: [...day.meals, meal].sort((a, b) => a.eaten_at.localeCompare(b.eaten_at)) })) }));
        return meal;
      },

      updateMealItems: (date, mealId, items) =>
        set((s) => ({
          days: withDay(s.days, date, (day) => ({
            ...day,
            meals: items.length === 0 ? day.meals.filter((m) => m.id !== mealId) : day.meals.map((m) => (m.id === mealId ? { ...m, items, total: sumNutrients(items) } : m)),
          })),
        })),

      deleteMeal: (date, mealId) => set((s) => ({ days: withDay(s.days, date, (day) => ({ ...day, meals: day.meals.filter((m) => m.id !== mealId) })) })),

      logFood: (foodId, grams, slot, date) => {
        const catalog = [...get().customFoods, ...ALL_FOODS];
        const food = catalog.find((f) => f.id === foodId) ?? ALL_FOODS[0];
        const item: MealLogItem = { food_id: food.id, name: food.name, qty: grams, unit: 'g', grams, nutrients: computeNutrientsForGrams(food, grams), image_key: food.image_key, match: 'db' };
        get().logMeal([item], slot, 'search', { date });
      },

      addWater: (ml, date) => {
        const d = date ?? get().selectedDate;
        set((s) => ({
          days: withDay(s.days, d, (day) => ({ ...day, waterMl: Math.max(0, day.waterMl + ml), waterEntries: [...day.waterEntries, { ml, at: new Date().toISOString() }] })),
        }));
      },

      undoWater: (date) => {
        const d = date ?? get().selectedDate;
        set((s) => ({
          days: withDay(s.days, d, (day) => {
            const last = day.waterEntries[day.waterEntries.length - 1];
            if (!last) return day;
            return { ...day, waterMl: Math.max(0, day.waterMl - last.ml), waterEntries: day.waterEntries.slice(0, -1) };
          }),
        }));
      },

      setTaskStatus: (taskId, status, date) => {
        const d = date ?? get().selectedDate;
        set((s) => ({
          days: withDay(s.days, d, (day) => {
            const next = { ...day.taskStatus };
            if (status) next[taskId] = status;
            else delete next[taskId];
            return { ...day, taskStatus: next };
          }),
        }));
      },

      toggleTaskDone: (taskId, date) => {
        const d = date ?? get().selectedDate;
        const cur = getDay(get().days, d).taskStatus[taskId];
        get().setTaskStatus(taskId, cur === 'done' ? undefined : 'done', d);
      },

      upsertTask: (task) => set((s) => ({ tasks: s.tasks.some((t) => t.id === task.id) ? s.tasks.map((t) => (t.id === task.id ? task : t)) : [...s.tasks, task] })),
      removeTask: (taskId) => set((s) => ({ tasks: s.tasks.filter((t) => t.id !== taskId) })),

      addReport: (report) =>
        set((s) => ({
          reports: [report, ...s.reports.filter((r) => r.id !== report.id)].sort((a, b) => b.collected_at.localeCompare(a.collected_at)),
        })),

      deleteReport: (reportId) =>
        set((s) => ({
          reports: s.reports.filter((r) => r.id !== reportId),
          activePlan: s.activePlan?.report_id === reportId ? null : s.activePlan,
          tasks: s.activePlan?.report_id === reportId ? [] : s.tasks,
        })),

      loadSampleReport: () => {
        const sample = buildSampleReportRecord(new Date());
        get().addReport(sample);
        return sample;
      },

      importFollowUpSampleReport: () => {
        const values = normalizeReportTests(SYNTHETIC_FOLLOWUP_RAW_TESTS);
        const collected = new Date(Date.now() + 12 * 7 * 86_400_000);
        const followUp: LabReportRecord = {
          id: 'sample-followup-002',
          lab_name: 'Dr Lal PathLabs (12-week retest SAMPLE)',
          collected_at: collected.toISOString(),
          reported_at: collected.toISOString(),
          source_type: 'sample',
          is_sample: true,
          values,
          lab_notes: ['All previously flagged liver and lipid values have moved into the reference range.'],
        };
        followUp.summary = buildDeterministicSummary(values, followUp.lab_notes);
        get().addReport(followUp);
        return followUp;
      },

      buildPlanForReport: (reportId) => {
        const s = get();
        const report = s.reports.find((r) => r.id === reportId);
        if (!report) return null;
        const { plan, tasks } = buildPersonalPlan({ report, profile: s.profile, healthBackground: s.healthBackground, startDate: new Date() });
        // Keep user-created tasks; replace generated ones.
        const custom = s.tasks.filter((t) => t.plan_id === 'custom');
        set({ activePlan: plan, tasks: [...tasks, ...custom], aiRecipes: null });
        return plan;
      },

      updateProfile: (patch) => get().saveProfileAndHealth({ ...get().profile, ...patch }, get().healthBackground),
      updateHealthBackground: (patch) => get().saveProfileAndHealth(get().profile, { ...get().healthBackground, ...patch }),

      saveProfileAndHealth: (profile, health) => {
        const s = get();
        const latest = s.reports.find((r) => r.id === s.activePlan?.report_id);
        set({
          profile,
          healthBackground: health,
          activePlan: s.activePlan ? refreshPlanTargets(s.activePlan, profile, health, latest?.values ?? []) : null,
          aiRecipes: null, // profile changed → personalised recipes must be regenerated
        });
      },

      completeOnboarding: () => set({ onboardingComplete: true }),

      grantConsent: (purpose) =>
        set((s) => ({
          consents: [...s.consents.filter((c) => c.purpose !== purpose || c.withdrawn_at), { purpose, version: CONSENT_VERSION, granted_at: new Date().toISOString() }],
        })),
      withdrawConsent: (purpose) =>
        set((s) => ({ consents: s.consents.map((c) => (c.purpose === purpose && !c.withdrawn_at ? { ...c, withdrawn_at: new Date().toISOString() } : c)) })),
      hasConsent: (purpose) => get().consents.some((c) => c.purpose === purpose && !c.withdrawn_at),

      updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),
      updateNotificationPrefs: (patch) => set((s) => ({ notificationPrefs: { ...s.notificationPrefs, ...patch } })),
      markInboxRead: (ids) => set((s) => ({ readInboxIds: [...new Set([...s.readInboxIds, ...ids])].slice(-400) })),
      setDeviceEventIds: (map) => set({ deviceEventIds: map }),
      setAiRecipes: (recipes, cravingPrompt) => {
        set({ aiRecipes: { generatedAt: new Date().toISOString(), recipes } });
        void saveCloudAiRecipes(recipes, cravingPrompt);
      },
      appendAiRecipes: (recipes, cravingPrompt) => {
        set((s) => {
          const existing = s.aiRecipes?.recipes ?? [];
          const byName = new Set(recipes.map((r) => r.name.toLowerCase()));
          const merged = [...recipes, ...existing.filter((r) => !byName.has(r.name.toLowerCase()))].slice(0, 24);
          return { aiRecipes: { generatedAt: new Date().toISOString(), recipes: merged } };
        });
        void saveCloudAiRecipes(recipes, cravingPrompt);
      },
      toggleSavedRecipe: (id) => set((s) => ({ savedRecipeIds: s.savedRecipeIds.includes(id) ? s.savedRecipeIds.filter((x) => x !== id) : [...s.savedRecipeIds, id] })),
      registerCustomFoods: async (foods) => {
        if (foods.length === 0) return 0;
        let savedCloud = 0;
        set((s) => {
          const existingIds = new Set(s.customFoods.map((f) => f.id));
          const fresh = foods.filter((f) => !existingIds.has(f.id));
          return { customFoods: [...fresh, ...s.customFoods].slice(0, 300) };
        });
        for (const f of foods) {
          const res = await upsertCloudFood(f);
          if (res.savedToCloud) savedCloud++;
        }
        return savedCloud;
      },
      syncCloudFoods: async () => {
        const cloud = await fetchCloudFoods();
        if (cloud.length === 0) return;
        set((s) => {
          const map = new Map<string, FoodItem>();
          for (const f of s.customFoods) map.set(f.id, f);
          for (const f of cloud) {
            if (!ALL_FOODS.some((a) => a.id === f.id)) map.set(f.id, f);
          }
          return { customFoods: Array.from(map.values()).slice(0, 300) };
        });
      },
      setPendingRecipeCraving: (craving) => set({ pendingRecipeCraving: craving }),
    }),
    {
      name: 'svastha-data-anon',
      storage: persistStorage,
      skipHydration: true,
      version: 2,
      partialize: (s): DataState => ({
        userId: s.userId,
        profile: s.profile,
        healthBackground: s.healthBackground,
        onboardingComplete: s.onboardingComplete,
        consents: s.consents,
        settings: s.settings,
        notificationPrefs: s.notificationPrefs,
        days: s.days,
        reports: s.reports,
        activePlan: s.activePlan,
        tasks: s.tasks,
        readInboxIds: s.readInboxIds,
        deviceEventIds: s.deviceEventIds,
        aiRecipes: s.aiRecipes,
        savedRecipeIds: s.savedRecipeIds,
        customFoods: s.customFoods,
      }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<DataState>;
        return {
          ...current,
          ...p,
          settings: { ...DEFAULT_SETTINGS, ...(p.settings ?? {}) },
          notificationPrefs: { ...DEFAULT_NOTIFICATION_PREFS, ...(p.notificationPrefs ?? {}), categories: { ...DEFAULT_NOTIFICATION_PREFS.categories, ...(p.notificationPrefs?.categories ?? {}) } },
        };
      },
    }
  )
);

const dataKey = (userId: string) => `svastha-data-${userId}`;

/**
 * Points the data store at a user's own namespace and loads it. Every account's logs,
 * reports and settings live under a separate storage key, so switching accounts on a shared
 * device never mixes data.
 */
export async function switchUserData(userId: string | null, opts: { seedDemo?: boolean } = {}): Promise<void> {
  const id = userId ?? 'anon';
  const key = dataKey(id);
  const raw = await readRaw(key);
  useAppStore.persist.setOptions({ name: key });
  if (raw) {
    await useAppStore.persist.rehydrate();
    useAppStore.setState({ selectedDate: todayKey(), hasHydrated: true });
    return;
  }
  const fresh = opts.seedDemo ? demoData(id) : initialData(id);
  useAppStore.setState({ ...fresh, selectedDate: todayKey(), hasHydrated: true });
}

export async function wipeUserData(userId: string): Promise<void> {
  await removeKey(dataKey(userId));
  useAppStore.persist.setOptions({ name: dataKey('anon') });
  useAppStore.setState({ ...initialData('anon'), selectedDate: todayKey() });
}

/** Exportable copy of everything Svastha stores for this user (DPDP data-portability). */
export function exportUserData(): Record<string, unknown> {
  const s = useAppStore.getState();
  return {
    exported_at: new Date().toISOString(),
    app: 'Svastha',
    note: 'Meal photos and lab report files are never stored, so they are not part of this export.',
    profile: s.profile,
    health_background: s.healthBackground,
    consents: s.consents,
    settings: s.settings,
    notification_prefs: s.notificationPrefs,
    reports: s.reports.map((r) => ({ ...r })),
    active_plan: s.activePlan,
    tasks: s.tasks,
    daily_logs: s.days,
  };
}

/** Demo account: Section 14 sample report + plan + today's logged meals. */
function demoData(userId: string): DataState {
  const base = initialData(userId);
  const profile: UserProfile = {
    ...base.profile,
    full_name: 'Aarav Sharma',
    dob: '1994-05-14',
    sex: 'M',
    height_cm: 175,
    weight_kg: 76,
    waist_cm: 88,
    target_weight_kg: 72,
    city: 'Delhi',
    diet_type: 'vegetarian',
    activity_level: 'moderate',
    wake_time: '06:30',
    sleep_time: '22:45',
    cuisine_prefs: ['North Indian', 'South Indian'],
    goals: ['Improve lab report', 'Lose weight', 'More energy'],
  };
  const health: HealthBackground = { ...base.healthBackground, family_history: ['Heart disease'], alcohol_units_week: 2 };
  const report = buildSampleReportRecord(new Date());
  const { plan, tasks } = buildPersonalPlan({ report, profile, healthBackground: health, startDate: new Date() });
  const today = todayKey();
  const poha = ALL_FOODS.find((f) => f.id === 'ifct_poha')!;
  const dal = ALL_FOODS.find((f) => f.id === 'ifct_dal_tadka')!;
  const roti = ALL_FOODS.find((f) => f.id === 'ifct_roti')!;
  const curd = ALL_FOODS.find((f) => f.id === 'ifct_curd')!;
  const item = (f: typeof poha, grams: number, qty: number, unit: string): MealLogItem => ({ food_id: f.id, name: f.name, qty, unit, grams, nutrients: computeNutrientsForGrams(f, grams), image_key: f.image_key, match: 'db' });
  const breakfast = [item(poha, 225, 1.5, 'katori')];
  const lunch = [item(dal, 180, 1, 'katori'), item(roti, 70, 2, 'roti'), item(curd, 150, 1, 'katori')];
  const nowH = new Date().getHours();
  const meals: MealLog[] = [{ id: 'demo-breakfast', date: today, eaten_at: isoAt(today, '08:30'), slot: 'breakfast', source: 'photo', ai_confidence: 0.91, items: breakfast, total: sumNutrients(breakfast) }];
  if (nowH >= 13) meals.push({ id: 'demo-lunch', date: today, eaten_at: isoAt(today, '13:15'), slot: 'lunch', source: 'photo', ai_confidence: 0.88, items: lunch, total: sumNutrients(lunch) });

  // A little history so the calendar & adherence have something to show.
  const days: Record<DateKey, DayLog> = { [today]: { meals, waterMl: 1250, waterEntries: [{ ml: 1250, at: new Date().toISOString() }], taskStatus: { [tasks[0].id]: 'done' } } };
  for (let i = 1; i <= 9; i++) {
    const d = addDays(today, -i);
    const pastMeals: MealLog[] = [
      { id: `demo-b-${i}`, date: d, eaten_at: isoAt(d, '08:30'), slot: 'breakfast', source: 'search', items: breakfast, total: sumNutrients(breakfast) },
      { id: `demo-l-${i}`, date: d, eaten_at: isoAt(d, '13:15'), slot: 'lunch', source: 'photo', items: lunch, total: sumNutrients(lunch) },
    ];
    if (i % 3 !== 0) pastMeals.push({ id: `demo-d-${i}`, date: d, eaten_at: isoAt(d, '20:30'), slot: 'dinner', source: 'photo', items: lunch, total: sumNutrients(lunch) });
    const status: Record<string, TaskLogStatus> = {};
    tasks.forEach((t, ti) => {
      if ((i + ti) % 3 !== 0) status[t.id] = 'done';
    });
    days[d] = { meals: pastMeals, waterMl: 1800 + ((i * 230) % 1200), waterEntries: [], taskStatus: status };
  }

  return {
    ...base,
    profile,
    healthBackground: health,
    onboardingComplete: true,
    consents: [
      { purpose: 'account', version: CONSENT_VERSION, granted_at: new Date().toISOString() },
      { purpose: 'report_processing', version: CONSENT_VERSION, granted_at: new Date().toISOString() },
      { purpose: 'meal_photo_processing', version: CONSENT_VERSION, granted_at: new Date().toISOString() },
    ],
    reports: [report],
    activePlan: plan,
    tasks,
    days,
  };
}

export type { InboxItem };
