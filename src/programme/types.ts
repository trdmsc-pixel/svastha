/**
 * Guided programmes (e.g. the 8-Week Reset). Pure data — no React, no I/O —
 * so the engine and tests can use it directly.
 */

export type RoutineKind = 'medicine' | 'meal' | 'water' | 'sun' | 'move' | 'family' | 'rest' | 'sleep';

/** Weekday index, Monday = 0 … Sunday = 6 (matches `weekdayIndex` in lib/dates). */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/** Optional switches the user turns on from the Doctor screen once something is prescribed. */
export type ConditionFlag = 'thyroid' | 'b12' | 'vitaminD' | 'calcium' | 'folic';

export interface RoutineItem {
  id: string;
  time: string; // HH:mm local
  endTime?: string; // HH:mm, for windows like 9:30–12:00
  emoji: string;
  title: string;
  detail?: string;
  kind: RoutineKind;
  /** Highlighted "big" moments of the day (breakfast, lunch, exercise). */
  key?: boolean;
  /** Counts toward the day's tick score. */
  track: boolean;
  /** Sends a phone notification at `time`. */
  remind: boolean;
  reminderTitle?: string;
  reminderBody?: string;
  /** Only shown when the matching flag is on (e.g. a prescribed medicine). */
  requires?: ConditionFlag;
  /** Only on these weekdays. Omit = every day. */
  days?: Weekday[];
}

export interface Phase {
  index: 0 | 1 | 2;
  label: string; // "Start", "Build", "Strong"
  fromWeek: number; // inclusive, 1-based
  toWeek: number;
  walkMin: number;
  steps: number;
  rounds: number;
}

export type WorkoutType = 'strength' | 'yoga' | 'rest';

export interface Move {
  id: string;
  name: string;
  how: string;
  /** Reps label per phase (index = phase.index). */
  reps: [string, string, string];
  /** Seconds per phase for timed moves (enables the countdown in guided mode). */
  seconds?: [number, number, number];
}

export interface MenuMeal {
  title: string;
  detail: string;
}

export interface MenuDay {
  breakfast: MenuMeal;
  lunch: MenuMeal;
  snack: MenuMeal;
  dinner: MenuMeal;
}

export interface Swap {
  from: string;
  to: string;
}

export interface Recipe {
  id: string;
  name: string;
  tag: string;
  minutes: number;
  steps: string[];
}

export interface DoctorTask {
  id: string;
  title: string;
  detail: string;
  when: string;
}

export interface Programme {
  id: string;
  name: string;
  tagline: string;
  weeks: number;
  /** Habit goals shown as badges on the hero. */
  goals: string[];
  routine: RoutineItem[];
  phases: Phase[];
  workoutByWeekday: Record<Weekday, WorkoutType>;
  strength: Move[];
  yoga: Move[];
  menu: Record<Weekday, MenuDay>;
  dailyFixed: MenuMeal[];
  plateRules: string[];
  portions: Array<{ item: string; amount: string }>;
  swaps: Swap[];
  recipes: Recipe[];
  doctor: DoctorTask[];
  doctorQuestions: string[];
  redFlags: string[];
  /** A day counts as "won" when at least this share of tracked items is ticked. */
  winThreshold: number;
}
