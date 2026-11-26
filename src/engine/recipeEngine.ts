import { DietType, FoodItem, HealthBackground, Nutrients, Recipe, RecipeFocus, UserProfile } from '@/types/domain';
import { ALL_FOODS, computeNutrientsForGrams, findFoodById, matchFoodByQuery, matchFoodStrict } from './foodMatcher';

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
  ingredients: ingredients.map(([food_id, grams, label]) => ({
    food_id,
    grams,
    name: label ?? findFoodById(food_id)?.name ?? food_id,
  })),
  steps,
  why,
  image_key,
  source: 'curated',
});

const VEG: DietType[] = ['vegetarian', 'eggetarian', 'non_veg'];
const VEGAN: DietType[] = ['vegan', 'vegetarian', 'eggetarian', 'non_veg'];
const JAIN_VEGAN: DietType[] = ['vegan', 'vegetarian', 'eggetarian', 'non_veg', 'jain', 'sattvic'];
const JAIN_VEG: DietType[] = ['vegetarian', 'eggetarian', 'non_veg', 'jain', 'sattvic'];
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
    'Iron from spinach + lemon’s vitamin C, with whole-grain fibre.', 'foods/dal-tadka.webp'),
  r('rc_rajma_bajra', 'Rajma with bajra roti', 'dinner', 'North Indian', 35, 2, VEGAN, ['glucose', 'fibre', 'iron', 'protein'],
    [['svs_rajma', 180], ['ifct_bajra_roti', 90, 'Bajra roti (2)'], ['svs_green_salad', 100]],
    ['Simmer soaked rajma with onion-tomato masala.', 'Make bajra rotis on a hot tawa.', 'Serve with a big kachumber salad.'],
    'Millet + legumes give slow-release carbs that are kinder to blood sugar.'),
  r('rc_sprouts_salad', 'Moong sprouts chaat salad', 'snack', 'Pan-Indian', 10, 1, VEGAN, ['weight', 'fibre', 'glucose', 'liver', 'protein'],
    [['ifct_sprouts_chaat', 150], ['ifct_cucumber', 50], ['ifct_tomato', 50], ['svs_lemon_water', 20, 'Lemon juice']],
    ['Steam sprouts for 3 minutes.', 'Toss with cucumber, tomato, onion, chaat masala and lemon.'],
    'Crunchy, high-protein snack that keeps cravings away.'),
  r('rc_makhana_mix', 'Roasted makhana & walnut trail mix', 'snack', 'Pan-Indian', 10, 1, JAIN_VEGAN, ['hdl', 'ldl', 'weight'],
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
  r('rc_papaya_guava_bowl', 'Guava–papaya fruit bowl with seeds', 'snack', 'Pan-Indian', 5, 1, JAIN_VEGAN, ['iron', 'fibre', 'liver', 'weight'],
    [['ifct_guava', 100], ['ifct_papaya', 100], ['ifct_chia', 10]],
    ['Cube guava and papaya.', 'Sprinkle chia seeds and a pinch of chaat masala.'],
    'Guava is one of the richest vitamin C foods — great with iron-rich meals.'),
  // ── Expanded Personalized Catalog (15 more diverse dishes) ──
  r('rc_kanda_poha_sprouts', 'High-protein sprouts poha', 'breakfast', 'Maharashtrian', 15, 1, VEGAN, ['fibre', 'protein', 'liver', 'weight'],
    [['ifct_poha', 150], ['ifct_sprouts_chaat', 75, 'Steamed moong sprouts'], ['ifct_peanuts', 10]],
    ['Rinse poha and toss with mustard seeds, curry leaves, turmeric and steamed sprouts.', 'Finish with roasted peanuts, coriander and fresh lemon.'],
    'Upgrades classic poha with sprouts for extra plant protein and gentler blood sugar.', 'foods/poha.webp'),
  r('rc_soya_pulao', 'Soya chunks & veggie brown rice pulao', 'lunch', 'North Indian', 25, 2, VEGAN, ['protein', 'ldl', 'fibre', 'liver'],
    [['svs_soya_chunks', 120], ['ifct_brown_rice', 150], ['svs_mixed_veg', 100], ['ifct_curd', 100, 'Side curd (optional)']],
    ['Squeeze boiled soya chunks and sauté with whole spices and mixed veggies.', 'Fold in cooked brown rice and simmer 5 minutes with mint.'],
    'Packed with ~26g protein and soluble fibre to support LDL and liver recovery.'),
  r('rc_methi_thepla_curd', 'Methi thepla with spiced dahi', 'breakfast', 'Gujarati', 20, 2, JAIN_VEG, ['glucose', 'fibre', 'b12'],
    [['svs_methi_thepla', 80, 'Methi thepla (2)'], ['ifct_curd', 150], ['ifct_flaxseed', 7, 'Roasted flaxseed']],
    ['Knead whole-wheat flour with fresh fenugreek leaves, turmeric and curd.', 'Roast lightly on a tawa and serve with chilled spiced curd.'],
    'Fenugreek (methi) is well-known for supporting fasting glucose and satiety.'),
  r('rc_palak_paneer_jowar', 'Light palak paneer with jowar bhakri', 'dinner', 'North Indian', 30, 2, VEG, ['iron', 'protein', 'b12', 'glucose'],
    [['svs_palak_paneer', 170], ['ifct_jowar_roti', 90, 'Jowar bhakri (2)'], ['svs_green_salad', 80]],
    ['Blanch spinach and purée with green chilli and cumin (skip heavy cream).', 'Simmer fresh paneer cubes for 5 minutes and pair with jowar rotis.'],
    'Iron, folate, and calcium with gluten-free millet fibre.'),
  r('rc_chole_salad_bowl', 'Pindi chole & kachumber protein bowl', 'lunch', 'Punjabi', 25, 2, VEGAN, ['fibre', 'ldl', 'protein', 'iron'],
    [['svs_chole', 180], ['svs_green_salad', 120], ['ifct_roti', 35, '1 phulka']],
    ['Cook chickpeas with roasted cumin, amchur and minimal oil.', 'Serve over crisp cucumber-tomato kachumber with one warm phulka.'],
    'Chickpea soluble fibre helps trap dietary cholesterol and steady energy.'),
  r('rc_idli_sambar_bowl', 'Steamed idli with drumstick sambar', 'breakfast', 'South Indian', 15, 1, JAIN_VEGAN, ['liver', 'weight', 'fibre', 'kidney'],
    [['ifct_idli_sambar', 180, 'Idli (3) with sambar'], ['svs_sambar', 100, 'Extra veggie sambar']],
    ['Steam fermented idlis until fluffy.', 'Serve with hot lentil-vegetable sambar (light on salt and oil).'],
    'Fermented, steamed, and virtually oil-free — super gentle on the liver.'),
  r('rc_overnight_chia_oats', 'Almond-chia overnight oats', 'breakfast', 'Modern Indian', 10, 1, JAIN_VEG, ['ldl', 'hdl', 'fibre', 'weight'],
    [['ifct_oats_raw', 45], ['ifct_chia', 10], ['ifct_milk_toned', 200], ['ifct_almonds', 10], ['ifct_apple', 90, 'Diced apple']],
    ['Stir oats, chia seeds and toned milk with a pinch of cinnamon.', 'Chill overnight and top with diced apple and sliced almonds.'],
    'Double soluble fibre from oats + chia actively supports lowering LDL.'),
  r('rc_khichdi_chaas', 'Satvik moong khichdi & mint chaas', 'dinner', 'Pan-Indian', 25, 1, JAIN_VEG, ['liver', 'kidney', 'weight', 'fibre'],
    [['svs_khichdi', 250], ['svs_buttermilk', 250], ['ifct_ghee', 5, '1 tsp ghee']],
    ['Pressure-cook yellow moong dal and rice with turmeric and cumin.', 'Drizzle 1 tsp ghee and serve with chilled mint buttermilk.'],
    'Easy-to-digest evening comfort meal that supports restful sleep and gut recovery.'),
  r('rc_bhindi_dal_roti', 'Air-fried bhindi, moong dal & 2 rotis', 'lunch', 'North Indian', 25, 2, VEGAN, ['glucose', 'ldl', 'liver', 'fibre'],
    [['svs_bhindi', 150], ['svs_moong_dal', 180], ['ifct_roti', 70, 'Whole-wheat roti (2)']],
    ['Toss sliced okra with turmeric, coriander powder and 1 tsp oil; roast crisp.', 'Serve with yellow moong dal and 2 phulkas.'],
    'Okra mucilage slows glucose absorption while moong dal adds clean protein.'),
  r('rc_dhokla_sprouts', 'Steamed khaman dhokla & chaas', 'snack', 'Gujarati', 20, 2, JAIN_VEG, ['weight', 'liver', 'protein'],
    [['svs_dhokla', 120, 'Khaman dhokla (3 pcs)'], ['svs_buttermilk', 250]],
    ['Steam fermented besan batter until spongy.', 'Top with light mustard-curry leaf tempering and pair with chaas.'],
    'Steamed gram-flour snack — satisfies savoury cravings without deep-frying.'),
  r('rc_paneer_bhurji_toast', 'Spiced paneer bhurji on atta toast', 'breakfast', 'North Indian', 15, 1, VEG, ['protein', 'b12', 'weight'],
    [['ifct_paneer_bhurji', 120], ['ifct_brown_bread', 56, 'Whole-wheat toast (2)']],
    ['Sauté crumbled paneer with capsicum, tomato, turmeric and black pepper.', 'Spoon onto crisp whole-wheat toast and garnish with coriander.'],
    'Delivers ~22g protein in 15 minutes with zero refined maida.'),
  r('rc_egg_bhurji_bajra', 'Pepper egg bhurji with bajra roti', 'dinner', 'North Indian', 15, 1, EGG, ['protein', 'b12', 'vitamin_d', 'glucose'],
    [['svs_egg_bhurji', 140], ['ifct_bajra_roti', 45, 'Bajra roti (1)'], ['svs_green_salad', 100]],
    ['Scramble 2 eggs with onion, tomato, green chilli and black pepper.', 'Serve hot with 1 bajra roti and fresh kachumber.'],
    'High-protein, low-carb dinner rich in vitamin B12 and choline.'),
  r('rc_curd_rice_pomegranate', 'Cooling curd rice with roasted peanuts', 'lunch', 'South Indian', 15, 1, JAIN_VEG, ['kidney', 'liver', 'weight'],
    [['svs_curd_rice', 220], ['ifct_cucumber', 60], ['ifct_peanuts', 10]],
    ['Mix cooled rice with fresh curd, grated cucumber and a light mustard tempering.', 'Top with a spoon of roasted peanuts for crunch.'],
    'Probiotic-rich, cooling midday meal with gentle sodium and fat.'),
  r('rc_chicken_tikka_salad', 'Tandoori chicken & kachumber power plate', 'lunch', 'North Indian', 25, 2, NONVEG, ['protein', 'weight', 'liver', 'glucose'],
    [['ifct_chicken_breast', 150], ['svs_green_salad', 150], ['ifct_curd', 60, 'Mint-curd dip']],
    ['Marinate chicken breast in hung curd, turmeric, cumin and lemon; grill.', 'Serve over crisp cucumber-tomato salad with mint-curd dip.'],
    '~48g lean protein with minimal saturated fat — ideal for fatty liver & weight goals.'),
  r('rc_banana_walnut_dates', 'Pre-workout banana, walnut & date bites', 'snack', 'Pan-Indian', 5, 1, JAIN_VEGAN, ['hdl', 'fibre', 'iron'],
    [['ifct_banana', 120], ['ifct_walnuts', 12], ['ifct_dates', 16, 'Dates (2)']],
    ['Slice banana and serve with walnuts and 2 pitted dates.', 'Optional: dust with a pinch of cinnamon.'],
    'Natural potassium, iron, and omega-3 fats to fuel brisk walks or strength days.'),
];

const NON_VEG_WORDS = /chicken|mutton|fish|prawn|shrimp|meat|beef|pork|lamb|keema|egg|anda/i;
const EGG_WORDS = /egg|anda|omelette|omelet/i;
const DAIRY_WORDS = /paneer|curd|dahi|milk|ghee|butter|cream|cheese|lassi|chaas|buttermilk|yogurt|khoa/i;
const ROOT_WORDS = /onion|garlic|potato|aloo|carrot|beetroot|radish|ginger/i;
const UNSAFE_WORDS = /alcohol|wine|beer|rum|whisky|vodka|green tea extract|egcg|kava|niacin/i;

export function recipeExclusionReason(
  recipe: Recipe,
  profile: Pick<UserProfile, 'diet_type'>,
  health: Pick<HealthBackground, 'allergies'>
): string | null {
  const text = `${recipe.name} ${recipe.ingredients.map((i) => i.name).join(' ')}`;
  const diet = profile.diet_type;
  if (UNSAFE_WORDS.test(text)) return 'contains alcohol or a liver-unsafe ingredient';
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

export function computeRecipeNutrition(recipe: Recipe, catalog: FoodItem[] = ALL_FOODS): { per_serving: Nutrients; coverage: number } {
  let total: Nutrients = { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fibre_g: 0 };
  let matchedGrams = 0;
  let allGrams = 0;
  for (const ing of recipe.ingredients) {
    const grams = Math.max(0, Math.min(2000, Number(ing.grams) || 0));
    allGrams += grams;
    const food = (ing.food_id ? catalog.find((f) => f.id === ing.food_id) : undefined) ?? (recipe.source === 'ai' ? matchFoodStrict(ing.name, catalog) : matchFoodByQuery(ing.name, catalog));
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
  const coverage = allGrams === 0 ? 0 : Number((matchedGrams / allGrams).toFixed(2));
  // For AI recipes with ingredients outside IFCT, fall back to AI's per_serving estimate if DB coverage < 50%
  if (recipe.source === 'ai' && coverage < 0.5 && recipe.per_serving && recipe.per_serving.kcal > 0) {
    return { per_serving: recipe.per_serving, coverage };
  }
  return { per_serving: total, coverage };
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
      if (rec.source === 'ai') score += 8; // bubble freshly personalized AI recipes to top
      score -= rec.minutes / 30;
      return {
        ...rec,
        per_serving: nutrition.per_serving,
        nutrition_coverage: nutrition.coverage,
        score: Number(score.toFixed(2)),
        matchedFocus,
      };
    })
    .sort((a, b) => b.score - a.score);
}

export function normaliseAiRecipe(raw: unknown, index: number, cravingPrompt?: string): Recipe | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const name = typeof o.name === 'string' ? o.name.trim().slice(0, 80) : '';
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
  const steps = Array.isArray(o.steps)
    ? (o.steps as unknown[])
        .filter((s): s is string => typeof s === 'string')
        .map((s) => s.slice(0, 240))
        .slice(0, 8)
    : [];
  if (!name || ingredients.length === 0 || steps.length === 0) return null;
  const focusValues = Object.keys(FOCUS_LABELS) as RecipeFocus[];
  const focus = Array.isArray(o.focus)
    ? (o.focus as unknown[]).filter((f): f is RecipeFocus => focusValues.includes(f as RecipeFocus))
    : [];
  const slots = ['breakfast', 'lunch', 'snack', 'dinner'] as const;
  const slot = slots.includes(o.slot as (typeof slots)[number]) ? (o.slot as Recipe['slot']) : 'lunch';
  const minutes = Math.min(180, Math.max(5, Math.round(Number(o.minutes) || 20)));
  const difficulty = Math.min(5, Math.max(1, Math.round(Number(o.difficulty) || 2))) as Recipe['difficulty'];
  const biomarker_benefits = Array.isArray(o.biomarker_benefits)
    ? (o.biomarker_benefits as unknown[]).filter((b): b is string => typeof b === 'string').slice(0, 4)
    : undefined;

  let per_serving: Nutrients | undefined;
  if (o.per_serving && typeof o.per_serving === 'object') {
    const ps = o.per_serving as Record<string, unknown>;
    const kcal = Number(ps.kcal);
    if (Number.isFinite(kcal) && kcal > 0) {
      per_serving = {
        kcal: Math.round(Math.min(1800, kcal)),
        protein_g: Number((Number(ps.protein_g) || 0).toFixed(1)),
        carbs_g: Number((Number(ps.carbs_g) || 0).toFixed(1)),
        fat_g: Number((Number(ps.fat_g) || 0).toFixed(1)),
        fibre_g: Number((Number(ps.fibre_g) || 0).toFixed(1)),
      };
    }
  }

  return {
    id: `ai-${Date.now().toString(36)}-${index}-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 28)}`,
    name,
    slot,
    cuisine: typeof o.cuisine === 'string' ? o.cuisine.slice(0, 30) : 'Indian',
    minutes,
    difficulty,
    diet_tags: [],
    focus,
    biomarker_benefits,
    craving_prompt: cravingPrompt,
    ingredients,
    steps,
    per_serving,
    why: typeof o.why === 'string' ? o.why.slice(0, 220) : undefined,
    source: 'ai',
  };
}
