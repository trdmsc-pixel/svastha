import { ALL_FOODS, matchFoodStrict } from '@/engine/foodMatcher';
import { mapAiMealToDraft, rescaleDraftItem } from '@/engine/mealAnalysis';
import { CURATED_RECIPES, computeRecipeNutrition, normaliseAiRecipe } from '@/engine/recipeEngine';
import { buildSmartCoachTip } from '@/engine/smartCoach';
import { buildSampleReportRecord } from '@/engine/fixtures/lalPathLabsFixture';
import { UserProfile } from '@/types/domain';

describe('Gemini Vision Meal Scanner + Cloud Auto-Cataloging', () => {
  test('does NOT falsely match unrecognized dishes to unrelated IFCT foods; creates new catalog food', () => {
    expect(matchFoodStrict('Steamed Veg Momos', ALL_FOODS)).toBeNull();
    expect(matchFoodStrict('Avocado Sourdough Toast', ALL_FOODS)).toBeNull();
    expect(matchFoodStrict('Cold Coffee', ALL_FOODS)).toBeNull();

    const draft = mapAiMealToDraft({
      is_food: true,
      plate_type: 'plate',
      items: [
        {
          name: 'Steamed Veg Momos',
          name_hi: 'वेज मोमोज',
          match_hint: 'veg momos dumplings',
          synonyms: ['momos', 'veg dumplings'],
          portion: { amount: 6, unit: 'piece', grams_est: 180 },
          estimated_per_100g: { kcal: 175, protein_g: 5.2, carbs_g: 28.4, fat_g: 4.1, fibre_g: 2.3 },
          diet_tags: ['vegetarian', 'vegan'],
          confidence: 0.92,
        },
      ],
    });

    expect(draft).toHaveLength(1);
    expect(draft[0].name).toBe('Steamed Veg Momos');
    expect(draft[0].match).toBe('ai_catalogued');
    expect(draft[0].nutrients.kcal).toBe(315); // 175 * 1.8
    expect(draft[0].newCatalogFood).toBeDefined();
    expect(draft[0].newCatalogFood?.source).toBe('ai_gemini');
    expect(draft[0].newCatalogFood?.id).toBe('ai_steamed_veg_momos');

    // Rescaling portion grams updates calories accurately
    const rescaled = rescaleDraftItem(draft[0], 100);
    expect(rescaled.nutrients.kcal).toBe(175);

    // On next scan, once added to the catalog, it matches directly from the DB without creating a duplicate!
    const nextCatalog = [draft[0].newCatalogFood!, ...ALL_FOODS];
    const secondDraft = mapAiMealToDraft(
      {
        is_food: true,
        items: [
          {
            name: 'Steamed Veg Momos',
            portion: { amount: 4, unit: 'piece', grams_est: 120 },
            estimated_per_100g: { kcal: 175, protein_g: 5.2, carbs_g: 28.4, fat_g: 4.1, fibre_g: 2.3 },
            confidence: 0.94,
          },
        ],
      },
      nextCatalog
    );
    expect(secondDraft[0].newCatalogFood).toBeUndefined();
    expect(secondDraft[0].food_id).toBe('ai_steamed_veg_momos');
    expect(secondDraft[0].nutrients.kcal).toBe(210); // 175 * 1.2
  });

  test('still matches exact existing IFCT foods directly from the database', () => {
    const draft = mapAiMealToDraft({
      is_food: true,
      items: [
        {
          name: 'Dal tadka',
          portion: { amount: 1, unit: 'katori', grams_est: 180 },
          estimated_per_100g: { kcal: 120, protein_g: 6, carbs_g: 15, fat_g: 3.5, fibre_g: 3 },
          confidence: 0.95,
        },
      ],
    });
    expect(draft[0].food_id).toBe('ifct_dal_tadka');
    expect(draft[0].match).toBe('db');
    expect(draft[0].newCatalogFood).toBeUndefined();
  });
});

describe('Expanded Curated & AI Personalised Recipes', () => {
  test('curated catalog has 30 recipes and AI recipes preserve biomarker_benefits & per_serving fallback', () => {
    expect(CURATED_RECIPES.length).toBe(30);

    const rec = normaliseAiRecipe(
      {
        name: 'Air-Fried Edamame & Quinoa Chaat',
        slot: 'snack',
        cuisine: 'Fusion',
        minutes: 15,
        difficulty: 1,
        focus: ['protein', 'liver', 'ldl'],
        biomarker_benefits: ['ALT < 50 U/L', 'LDL < 100 mg/dL'],
        ingredients: [{ name: 'Edamame beans', grams: 120 }],
        steps: ['Toss steamed edamame with chaat masala and lemon.'],
        per_serving: { kcal: 210, protein_g: 16, carbs_g: 18, fat_g: 7, fibre_g: 6 },
        why: 'High plant protein with zero refined oil.',
      },
      0,
      'high protein snack'
    );
    expect(rec).not.toBeNull();
    expect(rec?.biomarker_benefits).toEqual(['ALT < 50 U/L', 'LDL < 100 mg/dL']);
    const nut = computeRecipeNutrition(rec!);
    expect(nut.per_serving.kcal).toBe(210);
  });
});

describe('Smart Biomarker-Aware Daily Coach', () => {
  test('generates evening protein & liver-aware dinner suggestion when protein is low', () => {
    const report = buildSampleReportRecord(new Date('2026-11-26'));
    const tip = buildSmartCoachTip({
      now: new Date(2026, 10, 26, 19, 0),
      totals: { kcal: 1100, protein_g: 50, carbs_g: 140, fat_g: 30, fibre_g: 15 },
      targets: { kcal: 2000, protein_g: 120, fibre_g: 35, water_ml: 2500 },
      waterMl: 2000,
      meals: [],
      latestReport: report,
      plan: null,
      profile: {
        id: 'u1', full_name: 'Test', dob: '1994-05-14', sex: 'M', height_cm: 175, weight_kg: 76,
        diet_type: 'vegetarian', fasting_practices: [], activity_level: 'moderate', job_type: 'desk',
        wake_time: '06:30', sleep_time: '22:30', cuisine_prefs: ['North Indian'], budget_level: 'moderate',
        goals: ['Improve lab report'], units: 'metric', language: 'en',
      } as UserProfile,
    });
    expect(tip.id).toBe('coach-dinner-protein');
    expect(tip.recipeCraving).toContain('liver-friendly');
    expect(tip.route).toBe('/(tabs)/plan');
  });
});
