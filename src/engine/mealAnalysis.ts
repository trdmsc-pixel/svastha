import { FoodItem, MealLogItem, MealSlot, Nutrients } from '@/types/domain';
import { ALL_FOODS, computeNutrientsForGrams, gramsForUnit, matchFoodByQuery } from './foodMatcher';

/**
 * Shape returned by the `analyse-meal` AI endpoint. The model ONLY identifies foods and
 * estimates portions — it never computes calories (CLAUDE.md rule 2).
 * `estimated_per_100g` is used solely when no database food matches, and is shown to the
 * user as an "AI estimate" they must confirm.
 */
export interface AiMealItem {
  name: string;
  match_hint?: string;
  portion: { amount: number; unit: string; grams_est: number };
  confidence: number;
  estimated_per_100g?: Partial<Nutrients> | null;
}

export interface AiMealAnalysis {
  is_food: boolean;
  plate_type?: string;
  notes?: string;
  items: AiMealItem[];
}

export interface MealDraftItem extends MealLogItem {
  key: string;
  /** Kept so the user can re-scale an AI estimate when they change grams. */
  per100?: Nutrients;
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

function sanitiseEstimate(e: Partial<Nutrients> | null | undefined): Nutrients | null {
  if (!e || typeof e.kcal !== 'number' || !Number.isFinite(e.kcal)) return null;
  // Physically plausible bounds per 100 g (pure fat is ~900 kcal/100 g).
  const kcal = clamp(e.kcal, 0, 900);
  return {
    kcal,
    protein_g: clamp(Number(e.protein_g) || 0, 0, 100),
    carbs_g: clamp(Number(e.carbs_g) || 0, 0, 100),
    fat_g: clamp(Number(e.fat_g) || 0, 0, 100),
    fibre_g: clamp(Number(e.fibre_g) || 0, 0, 100),
  };
}

function scale(per100: Nutrients, grams: number): Nutrients {
  const f = Math.max(0, grams) / 100;
  return {
    kcal: Math.round(per100.kcal * f),
    protein_g: Number((per100.protein_g * f).toFixed(1)),
    carbs_g: Number((per100.carbs_g * f).toFixed(1)),
    fat_g: Number((per100.fat_g * f).toFixed(1)),
    fibre_g: Number((per100.fibre_g * f).toFixed(1)),
  };
}

export function draftFromFood(food: FoodItem, grams: number, qty = 1, unit = 'g', confidence?: number): MealDraftItem {
  return {
    key: `${food.id}-${Math.random().toString(36).slice(2, 8)}`,
    food_id: food.id,
    name: food.name,
    qty,
    unit,
    grams: Math.round(grams),
    nutrients: computeNutrientsForGrams(food, grams),
    image_key: food.image_key,
    match: 'db',
    confidence,
  };
}

/**
 * Deterministically converts AI-identified foods into loggable items:
 * 1. Match each item to the food database (match_hint first, then the display name).
 * 2. Portion grams = household unit × amount when the unit is known for that food,
 *    otherwise the model's gram estimate (clamped to 5–1500 g).
 * 3. Nutrients = database per-100 g × grams. Unmatched items keep a sanitised AI estimate,
 *    flagged `match: 'ai_estimate'`.
 */
export function mapAiMealToDraft(analysis: AiMealAnalysis, catalog: FoodItem[] = ALL_FOODS): MealDraftItem[] {
  if (!analysis.is_food) return [];
  const out: MealDraftItem[] = [];
  for (const item of analysis.items.slice(0, 12)) {
    const food =
      (item.match_hint ? matchFoodByQuery(item.match_hint, catalog) : null) ?? matchFoodByQuery(item.name, catalog);
    const amount = Number.isFinite(item.portion?.amount) && item.portion.amount > 0 ? item.portion.amount : 1;
    const unit = (item.portion?.unit || 'g').toLowerCase();
    const estGrams = clamp(Number(item.portion?.grams_est) || 100, 5, 1500);
    const confidence = clamp(Number(item.confidence) || 0, 0, 1);

    if (food) {
      const unitGrams = gramsForUnit(food, unit, amount);
      const grams = clamp(unitGrams ?? estGrams, 5, 1500);
      out.push(draftFromFood(food, grams, unitGrams ? amount : Math.round(grams), unitGrams ? unit : 'g', confidence));
      continue;
    }

    const per100 = sanitiseEstimate(item.estimated_per_100g);
    if (!per100) continue; // nothing trustworthy to log — user can add it manually
    out.push({
      key: `ai-${out.length}-${Math.random().toString(36).slice(2, 8)}`,
      food_id: 'ai_estimate',
      name: item.name.slice(0, 60),
      qty: Math.round(estGrams),
      unit: 'g',
      grams: Math.round(estGrams),
      nutrients: scale(per100, estGrams),
      per100,
      match: 'ai_estimate',
      confidence,
    });
  }
  return out;
}

/** Re-computes an item after the user edits its grams. */
export function rescaleDraftItem(item: MealDraftItem, grams: number, catalog: FoodItem[] = ALL_FOODS): MealDraftItem {
  const g = clamp(Math.round(grams), 1, 3000);
  if (item.match === 'ai_estimate' && item.per100) {
    return { ...item, grams: g, qty: g, unit: 'g', nutrients: scale(item.per100, g) };
  }
  const food = catalog.find((f) => f.id === item.food_id);
  if (!food) return item;
  return { ...item, grams: g, qty: g, unit: 'g', nutrients: computeNutrientsForGrams(food, g) };
}

/** Suggests a meal slot from the local time of day. */
export function suggestSlot(now: Date = new Date()): MealSlot {
  const h = now.getHours() + now.getMinutes() / 60;
  if (h < 11) return 'breakfast';
  if (h < 15.5) return 'lunch';
  if (h < 18.5) return 'snack';
  return 'dinner';
}

export function sumNutrients(items: Array<{ nutrients: Nutrients }>): Nutrients {
  return items.reduce<Nutrients>(
    (acc, i) => ({
      kcal: acc.kcal + i.nutrients.kcal,
      protein_g: Number((acc.protein_g + i.nutrients.protein_g).toFixed(1)),
      carbs_g: Number((acc.carbs_g + i.nutrients.carbs_g).toFixed(1)),
      fat_g: Number((acc.fat_g + i.nutrients.fat_g).toFixed(1)),
      fibre_g: Number((acc.fibre_g + i.nutrients.fibre_g).toFixed(1)),
    }),
    { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fibre_g: 0 }
  );
}
