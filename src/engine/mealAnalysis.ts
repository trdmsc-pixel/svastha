import { DietType, FoodItem, MealLogItem, MealSlot, Nutrients } from '@/types/domain';
import { ALL_FOODS, computeNutrientsForGrams, gramsForUnit, matchFoodStrict } from './foodMatcher';

/**
 * Shape returned by the `analyse-meal` AI endpoint (v3).
 * Gemini Vision identifies the exact food(s), estimates portion grams, AND provides
 * per-100g nutrition so foods not yet in the cloud DB are automatically catalogued.
 */
export interface AiMealItem {
  name: string;
  name_hi?: string;
  match_hint?: string;
  synonyms?: string[];
  portion: { amount: number; unit: string; grams_est: number };
  confidence: number;
  estimated_per_100g?: Partial<Nutrients> | null;
  diet_tags?: string[];
}

export interface AiMealAnalysis {
  is_food: boolean;
  plate_type?: string;
  notes?: string;
  items: AiMealItem[];
}

export interface MealDraftItem extends MealLogItem {
  key: string;
  /** Kept so the user can re-scale an AI-catalogued item when they change grams. */
  per100?: Nutrients;
  /** Present when this item was NOT in the food DB and was newly created for cloud auto-cataloging. */
  newCatalogFood?: FoodItem;
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

const VALID_DIETS: DietType[] = ['vegetarian', 'vegan', 'eggetarian', 'non_veg', 'jain', 'sattvic'];

function sanitiseEstimate(e: Partial<Nutrients> | null | undefined): Nutrients | null {
  if (!e || typeof e.kcal !== 'number' || !Number.isFinite(e.kcal)) return null;
  const kcal = Math.round(clamp(e.kcal, 0, 900));
  return {
    kcal,
    protein_g: Number(clamp(Number(e.protein_g) || 0, 0, 100).toFixed(1)),
    carbs_g: Number(clamp(Number(e.carbs_g) || 0, 0, 100).toFixed(1)),
    fat_g: Number(clamp(Number(e.fat_g) || 0, 0, 100).toFixed(1)),
    fibre_g: Number(clamp(Number(e.fibre_g) || 0, 0, 100).toFixed(1)),
    sodium_mg: e.sodium_mg !== undefined ? Math.round(clamp(Number(e.sodium_mg) || 0, 0, 10000)) : undefined,
    sugar_g: e.sugar_g !== undefined ? Number(clamp(Number(e.sugar_g) || 0, 0, 100).toFixed(1)) : undefined,
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
    sodium_mg: per100.sodium_mg ? Math.round(per100.sodium_mg * f) : undefined,
    sugar_g: per100.sugar_g ? Number((per100.sugar_g * f).toFixed(1)) : undefined,
  };
}

export function slugifyFoodId(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40);
  return `ai_${slug || 'dish'}`;
}

export function buildCatalogFoodFromAi(item: AiMealItem, per100: Nutrients, estGrams: number): FoodItem {
  const unitKey = (item.portion?.unit || 'serving').toLowerCase().replace(/[^a-z]/g, '') || 'serving';
  const amount = Number.isFinite(item.portion?.amount) && item.portion.amount > 0 ? item.portion.amount : 1;
  const perUnitGrams = Math.max(10, Math.round(estGrams / amount));
  const cleanName = item.name.trim().slice(0, 70);
  const syns = Array.from(
    new Set(
      [cleanName.toLowerCase(), item.match_hint?.toLowerCase() ?? '', ...(item.synonyms ?? []).map((s) => s.toLowerCase())]
        .map((s) => s.trim())
        .filter((s) => s.length > 1)
    )
  ).slice(0, 8);
  const dietTags = (item.diet_tags ?? []).filter((d): d is DietType => VALID_DIETS.includes(d as DietType));

  return {
    id: slugifyFoodId(cleanName),
    name: cleanName,
    name_hi: item.name_hi?.trim() || undefined,
    synonyms: syns,
    source: 'ai_gemini',
    per_100g: per100,
    household_units: { [unitKey]: perUnitGrams, serving: Math.round(estGrams) },
    image_key: 'foods/quinoa-veggie-bowl.webp',
    diet_tags: dietTags.length > 0 ? dietTags : ['vegetarian', 'eggetarian', 'non_veg'],
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
    per100: food.per_100g,
    match: food.source === 'ai_gemini' ? 'ai_catalogued' : 'db',
    confidence,
  };
}

/**
 * Converts Gemini Vision meal analysis into loggable items:
 * 1. Uses STRICT matching (`matchFoodStrict`) against the combined cloud + local food database
 *    so a scanned dish is NEVER mistakenly replaced by an unrelated staple.
 * 2. If found in DB -> fetches its exact per-100g nutrition and scales by quantity.
 * 3. If NOT in DB -> creates a brand-new `FoodItem` entry (`newCatalogFood`) with Gemini's
 *    per-100g macros so the app automatically saves it to the cloud `foods` database and logs it.
 */
export function mapAiMealToDraft(analysis: AiMealAnalysis, catalog: FoodItem[] = ALL_FOODS): MealDraftItem[] {
  if (!analysis.is_food) return [];
  const out: MealDraftItem[] = [];
  for (const item of analysis.items.slice(0, 12)) {
    // Strict match ONLY — prevents "Veg Momos" or "Avocado Toast" from wrongly matching "White bread" or "Mixed veg"
    const food =
      matchFoodStrict(item.name, catalog) ??
      (item.match_hint ? matchFoodStrict(item.match_hint, catalog) : null);

    const amount = Number.isFinite(item.portion?.amount) && item.portion.amount > 0 ? item.portion.amount : 1;
    const unit = (item.portion?.unit || 'serving').toLowerCase();
    const estGrams = clamp(Number(item.portion?.grams_est) || 150, 5, 1500);
    const confidence = clamp(Number(item.confidence) || 0.85, 0, 1);

    if (food) {
      const unitGrams = gramsForUnit(food, unit, amount);
      const grams = clamp(unitGrams ?? estGrams, 5, 1500);
      out.push(draftFromFood(food, grams, unitGrams ? amount : Math.round(grams), unitGrams ? unit : 'g', confidence));
      continue;
    }

    // Not in the database yet -> create a new AI-catalogued food entry for cloud DB persistence!
    const per100 = sanitiseEstimate(item.estimated_per_100g) ?? {
      kcal: 165,
      protein_g: 6.0,
      carbs_g: 22.0,
      fat_g: 5.5,
      fibre_g: 2.5,
    };
    const newFood = buildCatalogFoodFromAi(item, per100, estGrams);
    out.push({
      key: `ai-${out.length}-${Math.random().toString(36).slice(2, 8)}`,
      food_id: newFood.id,
      name: newFood.name,
      qty: amount,
      unit,
      grams: Math.round(estGrams),
      nutrients: scale(per100, estGrams),
      per100,
      newCatalogFood: newFood,
      match: 'ai_catalogued',
      confidence,
    });
  }
  return out;
}

/** Re-computes an item after the user edits its grams. */
export function rescaleDraftItem(item: MealDraftItem, grams: number, catalog: FoodItem[] = ALL_FOODS): MealDraftItem {
  const g = clamp(Math.round(grams), 1, 3000);
  if (item.per100) {
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
