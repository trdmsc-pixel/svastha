import { DietType, FoodItem, HealthBackground, Nutrients, Recipe, RecipeFocus, UserProfile } from '@/types/domain';
import { ALL_FOODS, computeNutrientsForGrams, findFoodById, matchFoodByQuery } from './foodMatcher';

/**
 * Recipe engine.
 * - Curated library: Indian recipes tagged with the lab focus areas they support.
 * - Ranking is deterministic: lab focus match, diet compatibility, allergies, cuisine, goal.
 * - AI-generated recipes pass the SAME safety filter, and their nutrition is computed in code
 *   from matched ingredients (never taken from the model).
 */

const r = (
  id: string,
  name: string,
  slot: Recipe['slot'],
  cuisine: string,
  minutes: number,
  difficulty: Recipe['difficulty'],
  diet_tags: DietType[],
  focus: RecipeFocus[],
  ingredients: Array<[foodId: string, grams: number, label?: string]>,
  steps: string[],
  why: string,
  image_key?: string
): Recipe => ({
  id,
  name,
  slot,
  cuisine,
  minutes,
  difficulty,
  diet_tags,
  focus,
  ingredients: ingredients.map(([food_id, grams, label]) => ({ food_id, grams, name: label ?? findFoodById(food_id)?.name ?? food_id })),
  steps,
  why,
  image_key,
  source: 'curated',
});

const VEG: DietType[] = ['vegetarian', 'eggetarian', 'non_veg'];
const VEGAN: DietType[] = ['vegan', 'vegetarian', 'eggetarian', 'non_veg'];
const EGG: DietType[] = ['eggetarian', 'non_veg'];
const NONVEG: DietType[] = ['non_veg'];

export const CURATED_RECIPES: Recipe[] = [
  r('rc_quinoa_bowl', 'Quinoa veggie power bowl', 'lunch', 'Modern Indian', 20, 2, VEG, ['liver', 'ldl', 'fibre', 'weight', 'protein'],
    [['ifct_quinoa_bowl', 300], ['ifct_flaxseed', 7, 'Flaxseed, roasted'], ['svs_lemon_water', 30, 'Lemon juice']],
    ['Cook quinoa and cool slightly.', 'Toss with sautéed veggies and paneer cubes.', 'Finish with lemon, roasted flaxseed and coriander.'],
    'High fibre and lean protein keep you full and support healthy cholesterol.', 'recipes/quinoa-veggie-bowl.webp'),
  r('rc_moong_chilla', 'Moong dal chilla with mint chutney', 'breakfast', 'North Indian', 20, 2, VEGAN, ['glucose', 'protein', 'fibre', 'weight', 'liver'],
    [['ifct_besan_chilla', 130, 'Moong/besan chilla (2)'], ['svs_green_salad', 80, 'Onion-tomato topping'], ['ifct_mustard_oil', 5, 'Oil (1 tsp)']],
    ['Blend soaked moong dal with ginger and green chilli.', 'Spread thin on a hot tawa with a teaspoon of oil.', 'Top with onion, tomato and serve with mint chutney.'],
    'Plant protein + fibre for a steady, low-GI start to the day.'),
  r('rc_oats_upma', 'Vegetable oats upma', 'breakfast', 'South Indian', 15, 1, VEGAN, ['ldl', 'glucose', 'fibre', 'weight'],
    [['ifct_oats_raw', 50], ['svs_mixed_veg', 100, 'Carrot, beans, peas'], ['ifct_peanuts', 10], ['ifct_mustard_oil', 5]],
    ['Dry-roast oats for 2 minutes.', 'Temper mustard seeds, curry leaves and veggies in 1 tsp oil.', 'Add oats and water, cook until fluffy; top with peanuts.'],
    'Oat beta-glucan is one of the best-studied foods for lowering LDL.'),
  r('rc_dal_palak', 'Dal palak with brown rice', 'lunch', 'North Indian', 30, 2, VEGAN, ['iron', 'fibre', 'ldl', 'protein'],
    [['ifct_dal_tadka', 180, 'Toor dal with spinach'], ['ifct_spinach_cooked', 80], ['ifct_brown_rice', 150]],
    ['Pressure-cook toor dal with turmeric.', 'Add chopped spinach, garlic tadka and a squeeze of lemon.', 'Serve with a katori of brown rice.'],
    'Iron from spinach + lemon’s vitamin C, with whole-grain fibre.'),
  r('rc_rajma_bajra', 'Rajma with bajra roti', 'dinner', 'North Indian', 35, 2, VEGAN, ['glucose', 'fibre', 'iron', 'protein'],
    [['svs_rajma', 180], ['ifct_bajra_roti', 90, 'Bajra roti (2)'], ['svs_green_salad', 100]],
    ['Simmer soaked rajma with onion-tomato masala.', 'Make bajra rotis on a hot tawa.', 'Serve with a big kachumber salad.'],
    'Millet + legumes give slow-release carbs that are kinder to blood sugar.'),
  r('rc_sprouts_salad', 'Moong sprouts chaat salad', 'snack', 'Pan-Indian', 10, 1, VEGAN, ['weight', 'fibre', 'glucose', 'liver', 'protein'],
    [['ifct_sprouts_chaat', 150], ['ifct_cucumber', 50], ['ifct_tomato', 50], ['svs_lemon_water', 20, 'Lemon juice']],
    ['Steam sprouts for 3 minutes.', 'Toss with cucumber, tomato, onion, chaat masala and lemon.'],
    'Crunchy, high-protein snack that keeps cravings away.'),
  r('rc_makhana_mix', 'Roasted makhana & walnut trail mix', 'snack', 'Pan-Indian', 10, 1, VEGAN, ['hdl', 'ldl', 'weight'],
    [['ifct_makhana', 20], ['ifct_walnuts', 10], ['ifct_almonds', 10]],
    ['Dry-roast makhana until crisp.', 'Toss with walnuts, almonds, a pinch of salt and pepper.'],
    'Walnuts bring plant omega-3s that support HDL.'),
  r('rc_ragi_dosa', 'Ragi dosa with sambar', 'breakfast', 'South Indian', 25, 3, VEGAN, ['glucose', 'fibre', 'vitamin_d', 'iron'],
    [['ifct_ragi_roti', 90, 'Ragi dosa (2)'], ['svs_sambar', 180]],
    ['Mix ragi flour, rice flour and curd/water into a thin batter.', 'Spread on a hot tawa; cook till crisp.', 'Serve with vegetable sambar.'],
    'Finger millet is calcium-rich with a gentler glucose rise than rice dosa.'),
  r('rc_paneer_tikka_salad', 'Paneer tikka salad bowl', 'dinner', 'North Indian', 25, 2, VEG, ['protein', 'weight', 'glucose', 'b12'],
    [['svs_paneer_tikka', 120], ['svs_green_salad', 150], ['svs_buttermilk', 250, 'Chaas on the side']],
    ['Marinate paneer in curd, spices and lemon.', 'Grill or air-fry until charred.', 'Serve over salad with a glass of chaas.'],
    'High-protein dinner with dairy B12 and very few refined carbs.'),
  r('rc_tofu_bhurji', 'Tofu bhurji with jowar roti', 'breakfast', 'Fusion', 15, 1, VEGAN, ['protein', 'ldl', 'liver', 'weight'],
    [['ifct_tofu', 150], ['svs_green_salad', 60, 'Onion, tomato, capsicum'], ['ifct_jowar_roti', 45]],
    ['Crumble tofu; sauté with onion, tomato and turmeric.', 'Season with pepper and coriander.', 'Serve with one jowar roti.'],
    'Soy protein can modestly lower LDL; very low in saturated fat.'),
  r('rc_egg_veg_omelette', 'Spinach masala omelette', 'breakfast', 'Pan-Indian', 10, 1, EGG, ['protein', 'b12', 'vitamin_d', 'weight'],
    [['svs_omelette', 140, 'Omelette (2 eggs)'], ['ifct_spinach_cooked', 50], ['ifct_brown_bread', 28, 'Whole-wheat toast']],
    ['Whisk eggs with chopped spinach, onion and chilli.', 'Cook in a non-stick pan with a few drops of oil.', 'Serve with a slice of whole-wheat toast.'],
    'Eggs provide B12 and some vitamin D; spinach adds folate.'),
  r('rc_fish_curry', 'Coastal fish curry with red rice', 'dinner', 'Coastal', 30, 3, NONVEG, ['hdl', 'triglycerides', 'vitamin_d', 'protein', 'b12'],
    [['svs_fish_curry', 180], ['ifct_brown_rice', 150, 'Red/brown rice']],
    ['Simmer fish in a light coconut-tamarind gravy.', 'Serve with a katori of red or brown rice.'],
    'Oily fish is rich in omega-3s, vitamin D and B12.'),
  r('rc_grilled_chicken', 'Grilled chicken with khichdi', 'dinner', 'North Indian', 30, 2, NONVEG, ['protein', 'weight', 'b12'],
    [['ifct_chicken_breast', 120], ['svs_khichdi', 200]],
    ['Marinate chicken in curd, ginger-garlic and spices; grill.', 'Serve alongside a katori of moong dal khichdi.'],
    'Lean protein with easy-to-digest khichdi.'),
  r('rc_lauki_chana', 'Lauki chana dal (low-salt)', 'lunch', 'North Indian', 30, 2, VEGAN, ['kidney', 'fibre', 'liver', 'weight'],
    [['svs_moong_dal', 180, 'Chana dal with lauki'], ['svs_mixed_veg', 100, 'Lauki (bottle gourd)'], ['ifct_roti', 70, 'Roti (2)']],
    ['Cook chana dal with lauki cubes and turmeric.', 'Temper with cumin and very little salt; finish with lemon.', 'Serve with 2 phulkas.'],
    'A gentle, low-sodium, high-fibre everyday meal.'),
  r('rc_papaya_guava_bowl', 'Guava–papaya fruit bowl with seeds', 'snack', 'Pan-Indian', 5, 1, VEGAN, ['iron', 'fibre', 'liver', 'weight'],
    [['ifct_guava', 100], ['ifct_papaya', 100], ['ifct_chia', 10]],
    ['Cube guava and papaya.', 'Sprinkle chia seeds and a pinch of chaat masala.'],
    'Guava is one of the richest vitamin C foods — great with iron-rich meals.'),
];

const NON_VEG_WORDS = /chicken|mutton|fish|prawn|shrimp|meat|beef|pork|lamb|keema|egg|anda/i;
const EGG_WORDS = /egg|anda|omelette|omelet/i;
const DAIRY_WORDS = /paneer|curd|dahi|milk|ghee|butter|cream|cheese|lassi|chaas|buttermilk|yogurt|khoa/i;
const ROOT_WORDS = /onion|garlic|potato|aloo|carrot|beetroot|radish|ginger/i;
const UNSAFE_WORDS = /alcohol|wine|beer|rum|whisky|vodka|green tea extract|egcg|kava|niacin/i;

/** Returns null when the recipe is compatible, otherwise a human-readable reason it was removed. */
export function recipeExclusionReason(recipe: Recipe, profile: Pick<UserProfile, 'diet_type'>, health: Pick<HealthBackground, 'allergies'>): string | null {
  const text = `${recipe.name} ${recipe.ingredients.map((i) => i.name).join(' ')}`;
  const diet = profile.diet_type;
  if (UNSAFE_WORDS.test(text)) return 'contains alcohol or a liver-unsafe ingredient';
  // Indian "vegetarian" excludes eggs, meat and fish.
  if ((diet === 'vegetarian' || diet === 'vegan' || diet === 'jain' || diet === 'sattvic') && NON_VEG_WORDS.test(text)) {
    return 'not vegetarian';
  }
  if (diet === 'eggetarian' && NON_VEG_WORDS.test(text.replace(EGG_WORDS, ''))) return 'contains meat or fish';
  if (diet === 'vegan' && DAIRY_WORDS.test(text)) return 'contains dairy';
  if (diet === 'jain' && ROOT_WORDS.test(text)) return 'contains root vegetables';
  if (recipe.source === 'curated' && !recipe.diet_tags.includes(diet) && diet !== 'jain' && diet !== 'sattvic') return 'diet mismatch';
  for (const allergy of health.allergies ?? []) {
    const a = allergy.trim().toLowerCase();
    if (a.length < 3) continue;
    const synonyms: Record<string, RegExp> = {
      peanut: /peanut|groundnut|moongphali/i,
      nuts: /almond|walnut|cashew|peanut|pista|nut/i,
      'tree nuts': /almond|walnut|cashew|pista/i,
      dairy: DAIRY_WORDS,
      lactose: DAIRY_WORDS,
      milk: DAIRY_WORDS,
      gluten: /wheat|atta|roti|bread|maida|rava|suji|semolina|barley/i,
      wheat: /wheat|atta|roti|bread|maida|rava|suji/i,
      egg: EGG_WORDS,
      eggs: EGG_WORDS,
      soy: /soy|soya|tofu/i,
      fish: /fish|machli/i,
      shellfish: /prawn|shrimp|crab|lobster/i,
      sesame: /sesame|til/i,
      mustard: /mustard/i,
    };
    const re = synonyms[a] ?? new RegExp(a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    if (re.test(text)) return `contains ${allergy}`;
  }
  return null;
}

/** Computes per-serving nutrition from ingredients that match the food database. */
export function computeRecipeNutrition(recipe: Recipe, catalog: FoodItem[] = ALL_FOODS): { per_serving: Nutrients; coverage: number } {
  let total: Nutrients = { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fibre_g: 0 };
  let matchedGrams = 0;
  let allGrams = 0;
  for (const ing of recipe.ingredients) {
    const grams = Math.max(0, Math.min(2000, Number(ing.grams) || 0));
    allGrams += grams;
    const food = (ing.food_id ? catalog.find((f) => f.id === ing.food_id) : undefined) ?? matchFoodByQuery(ing.name, catalog);
    if (!food) continue;
    matchedGrams += grams;
    const n = computeNutrientsForGrams(food, grams);
    total = {
      kcal: total.kcal + n.kcal,
      protein_g: Number((total.protein_g + n.protein_g).toFixed(1)),
      carbs_g: Number((total.carbs_g + n.carbs_g).toFixed(1)),
      fat_g: Number((total.fat_g + n.fat_g).toFixed(1)),
      fibre_g: Number((total.fibre_g + n.fibre_g).toFixed(1)),
    };
  }
  return { per_serving: total, coverage: allGrams === 0 ? 0 : Number((matchedGrams / allGrams).toFixed(2)) };
}

export interface RankedRecipe extends Recipe {
  score: number;
  matchedFocus: RecipeFocus[];
}

export const FOCUS_LABELS: Record<RecipeFocus, string> = {
  liver: 'Liver friendly',
  hdl: 'HDL boosting',
  ldl: 'Heart healthy',
  triglycerides: 'Low triglyceride',
  glucose: 'Low GI',
  iron: 'Iron rich',
  b12: 'B12 source',
  vitamin_d: 'Vitamin D',
  thyroid: 'Thyroid aware',
  kidney: 'Low sodium',
  uric_acid: 'Low purine',
  protein: 'High protein',
  fibre: 'High fibre',
  weight: 'Light & filling',
};

export function rankRecipes(
  recipes: Recipe[],
  ctx: { focus: RecipeFocus[]; profile: UserProfile; health: HealthBackground },
  catalog: FoodItem[] = ALL_FOODS
): RankedRecipe[] {
  const wantsWeightLoss = ctx.profile.goals.some((g) => /lose|weight/i.test(g));
  const cuisines = ctx.profile.cuisine_prefs.map((c) => c.toLowerCase());
  return recipes
    .filter((rec) => recipeExclusionReason(rec, ctx.profile, ctx.health) === null)
    .map((rec) => {
      const nutrition = computeRecipeNutrition(rec, catalog);
      const matchedFocus = rec.focus.filter((f) => ctx.focus.includes(f));
      let score = matchedFocus.length * 10;
      if (wantsWeightLoss && rec.focus.includes('weight')) score += 4;
      if (rec.focus.includes('fibre')) score += 1;
      if (cuisines.some((c) => rec.cuisine.toLowerCase().includes(c.split(' ')[0]))) score += 3;
      if (rec.source === 'ai') score += 2; // freshly personalised
      score -= rec.minutes / 30; // quicker is easier to stick to
      return { ...rec, per_serving: nutrition.per_serving, nutrition_coverage: nutrition.coverage, score: Number(score.toFixed(2)), matchedFocus };
    })
    .sort((a, b) => b.score - a.score);
}

/** Validates & normalises an AI recipe payload into a Recipe (or null when unusable). */
export function normaliseAiRecipe(raw: unknown, index: number): Recipe | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const name = typeof o.name === 'string' ? o.name.trim().slice(0, 70) : '';
  const ingredients = Array.isArray(o.ingredients)
    ? (o.ingredients as unknown[])
        .map((i) => {
          const io = (i ?? {}) as Record<string, unknown>;
          const n = typeof io.name === 'string' ? io.name.slice(0, 60) : '';
          const g = Number(io.grams);
          return n && Number.isFinite(g) && g > 0 ? { name: n, grams: Math.min(1000, Math.round(g)) } : null;
        })
        .filter((x): x is { name: string; grams: number } => x !== null)
        .slice(0, 14)
    : [];
  const steps = Array.isArray(o.steps) ? (o.steps as unknown[]).filter((s): s is string => typeof s === 'string').map((s) => s.slice(0, 240)).slice(0, 8) : [];
  if (!name || ingredients.length === 0 || steps.length === 0) return null;
  const focusValues = Object.keys(FOCUS_LABELS) as RecipeFocus[];
  const focus = Array.isArray(o.focus) ? (o.focus as unknown[]).filter((f): f is RecipeFocus => focusValues.includes(f as RecipeFocus)) : [];
  const slots = ['breakfast', 'lunch', 'snack', 'dinner'] as const;
  const slot = slots.includes(o.slot as (typeof slots)[number]) ? (o.slot as Recipe['slot']) : 'lunch';
  const minutes = Math.min(180, Math.max(5, Math.round(Number(o.minutes) || 20)));
  const difficulty = Math.min(5, Math.max(1, Math.round(Number(o.difficulty) || 2))) as Recipe['difficulty'];
  return {
    id: `ai-${index}-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 30)}`,
    name,
    slot,
    cuisine: typeof o.cuisine === 'string' ? o.cuisine.slice(0, 30) : 'Indian',
    minutes,
    difficulty,
    diet_tags: [],
    focus,
    ingredients,
    steps,
    why: typeof o.why === 'string' ? o.why.slice(0, 200) : undefined,
    source: 'ai',
  };
}
