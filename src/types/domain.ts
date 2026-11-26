export type BiologicalSex = 'M' | 'F' | 'other';
export type DietType = 'vegetarian' | 'vegan' | 'eggetarian' | 'non_veg' | 'jain' | 'sattvic';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
export type BudgetLevel = 'budget' | 'moderate' | 'premium';
export type BiomarkerStatus = 'low' | 'normal' | 'high' | 'borderline_low' | 'borderline_high';
export type RefOperator = '<' | '<=' | '>' | '>=' | 'range' | 'unknown';
export type MealSlot = 'breakfast' | 'lunch' | 'snack' | 'dinner';
export type MealSource = 'photo' | 'search' | 'barcode' | 'voice' | 'plan';
export type TaskType = 'meal' | 'exercise' | 'sleep' | 'water' | 'med' | 'supplement' | 'routine' | 'measure';
export type TaskLogStatus = 'done' | 'skipped' | 'missed' | 'snoozed';

export interface UserProfile {
  id: string;
  full_name: string;
  dob: string; // YYYY-MM-DD
  sex: BiologicalSex;
  height_cm: number;
  weight_kg: number;
  waist_cm?: number | null;
  target_weight_kg?: number | null;
  city?: string | null;
  diet_type: DietType;
  fasting_practices: string[];
  activity_level: ActivityLevel;
  job_type: 'desk' | 'on_feet' | 'mixed';
  wake_time: string; // HH:mm
  sleep_time: string; // HH:mm
  cuisine_prefs: string[];
  budget_level: BudgetLevel;
  goals: string[];
  units: 'metric' | 'imperial';
  language: 'en' | 'hi';
}

export interface HealthBackground {
  user_id: string;
  conditions: string[];
  family_history: string[];
  allergies: string[];
  smoking: 'never' | 'former' | 'current';
  alcohol_units_week: number;
  pregnant: boolean;
  under_medical_supervision?: boolean;
  notes?: string;
}

export interface ParsedRefRange {
  raw: string;
  operator: RefOperator;
  low: number | null;
  high: number | null;
}

export interface RawExtractedTest {
  panel_name: string;
  raw_name: string;
  method?: string;
  value: number | null;
  value_text: string;
  unit: string;
  ref_raw: string;
  ref_low?: number | null;
  ref_high?: number | null;
  ref_operator?: string | null;
  lab_flag?: 'H' | 'L' | null;
  confidence: number;
}

export interface NormalizedBiomarkerValue {
  biomarker_code: string;
  display_name: string;
  raw_name: string;
  panel_name: string;
  system: BodySystem;
  value: number;
  value_text: string;
  unit: string;
  original_value?: number;
  original_unit?: string;
  ref_raw: string;
  ref_low: number | null;
  ref_high: number | null;
  ref_operator: RefOperator;
  used_default_range?: boolean;
  status: BiomarkerStatus;
  severity: number; // ratio e.g. 2.0 for 2x ULN, 0 when normal
  lab_flag: 'H' | 'L' | null;
  confidence: number;
  user_edited?: boolean;
}

export type BodySystem =
  | 'Liver'
  | 'Heart & lipids'
  | 'Blood sugar'
  | 'Kidney'
  | 'Thyroid'
  | 'Blood count'
  | 'Vitamins & minerals'
  | 'Inflammation'
  | 'Hormones'
  | 'Other';

export interface RedFlagRule {
  id: string;
  biomarker_code: string;
  operator: '<' | '<=' | '>' | '>=' | 'xULN>';
  threshold: number;
  unit: string;
  message: string;
}

export interface RedFlagAlert {
  rule_id: string;
  biomarker_code: string;
  display_name: string;
  value: number;
  unit: string;
  message: string;
}

export interface CrossMarkerPattern {
  rule_id: string;
  markers: string[];
  title: string;
  insight: string;
  doctor_question: string;
}

export interface ReportSummaryPayload {
  snapshot_sentence: string;
  counts: { risk: number; watch: number; ok: number };
  red_flags: RedFlagAlert[];
  risk_groups: Array<{
    system: BodySystem;
    markers: NormalizedBiomarkerValue[];
    explanation: string;
    what_helps: string[];
    why_rule: string;
  }>;
  ok_markers: NormalizedBiomarkerValue[];
  patterns: CrossMarkerPattern[];
  top_actions: Array<{ title: string; why: string; plan_area: string }>;
  doctor_points: string[];
  followup_tests_from_lab_notes: string[];
}

export interface LabReportRecord {
  id: string;
  lab_name: string;
  collected_at: string;
  reported_at?: string;
  source_type: 'pdf' | 'photo' | 'sample';
  is_sample?: boolean;
  values: NormalizedBiomarkerValue[];
  lab_notes: string[];
  summary?: ReportSummaryPayload;
}

export interface Nutrients {
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fibre_g: number;
  sodium_mg?: number;
  sugar_g?: number;
}

export interface FoodItem {
  id: string;
  name: string;
  name_hi?: string;
  synonyms: string[];
  source: 'IFCT2017' | 'USDA' | 'OFF' | 'custom';
  per_100g: Nutrients;
  household_units: Record<string, number>; // e.g. { katori: 180, roti: 35 }
  image_key: string;
  diet_tags: DietType[];
}

export interface MealLogItem {
  food_id: string;
  name: string;
  qty: number;
  unit: string;
  grams: number;
  nutrients: Nutrients;
  image_key?: string;
}

export interface MealLog {
  id: string;
  eaten_at: string;
  slot: MealSlot;
  source: MealSource;
  items: MealLogItem[];
  total: Nutrients;
  ai_confidence?: number;
}

export interface SupplementOption {
  name: string;
  why_biomarker: string;
  evidence: 'Strong' | 'Moderate' | 'Limited';
  typical_form: string;
  caution?: string;
  hepatotoxic_risk?: boolean;
}

export interface PlanTarget {
  marker: string;
  biomarker_code: string;
  current: number;
  target: string;
  unit: string;
}

export interface HealthPlan {
  id: string;
  report_id: string;
  status: 'active' | 'archived';
  start_date: string;
  retest_date: string;
  retest_weeks: number;
  retest_reasoning: string;
  targets: PlanTarget[];
  daily_targets: {
    kcal: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    fibre_g: number;
    water_ml: number;
    steps: number;
  };
  supplements_to_discuss: SupplementOption[];
  medication_talking_points: string[];
  sleep: {
    bed: string;
    wake: string;
    caffeine_cutoff: string;
    wind_down: string[];
  };
  exercise_weekly: Array<{
    day: string;
    type: string;
    minutes: number;
    intensity: string;
    steps: string[];
  }>;
  measures: string[];
  adherence_pct: number;
}

export interface PlanTask {
  id: string;
  plan_id: string;
  type: TaskType;
  title: string;
  scheduled_at: string; // HH:mm
  repeat_rule: 'daily' | 'weekdays' | 'fasting' | 'custom';
  reminder: boolean;
  calendar_sync: boolean;
  device_event_id?: string | null;
  status_today?: TaskLogStatus;
}
