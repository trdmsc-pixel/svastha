import { FoodItem, MealLogItem, Nutrients } from '@/types/domain';

export const SEED_FOODS: FoodItem[] = [
  {
    id: 'ifct_roti',
    name: 'Whole-wheat roti (phulka)',
    name_hi: 'रोटी / फुलका',
    synonyms: ['roti', 'chapati', 'phulka', 'wheat roti'],
    source: 'IFCT2017',
    per_100g: { kcal: 297, protein_g: 9.8, carbs_g: 57.5, fat_g: 2.1, fibre_g: 8.6, sodium_mg: 12 },
    household_units: { roti: 35, piece: 35 },
    image_key: 'foods/roti.webp',
    diet_tags: ['vegetarian', 'vegan', 'eggetarian', 'non_veg', 'jain', 'sattvic'],
  },
  {
    id: 'ifct_dal_tadka',
    name: 'Dal tadka (toor dal)',
    name_hi: 'दाल तड़का',
    synonyms: ['dal', 'dal tadka', 'toor dal', 'arhar dal', 'yellow dal'],
    source: 'IFCT2017',
    per_100g: { kcal: 118, protein_g: 6.4, carbs_g: 15.2, fat_g: 3.4, fibre_g: 3.1, sodium_mg: 260 },
    household_units: { katori: 180, bowl: 250 },
    image_key: 'foods/dal-tadka.webp',
    diet_tags: ['vegetarian', 'vegan', 'eggetarian', 'non_veg'],
  },
  {
    id: 'ifct_rice_steamed',
    name: 'Steamed basmati rice',
    name_hi: 'उबले चावल',
    synonyms: ['rice', 'white rice', 'steamed rice', 'basmati rice', 'chawal'],
    source: 'IFCT2017',
    per_100g: { kcal: 130, protein_g: 2.7, carbs_g: 28.2, fat_g: 0.3, fibre_g: 0.4, sodium_mg: 2 },
    household_units: { katori: 150, bowl: 220 },
    image_key: 'foods/rice-steamed.webp',
    diet_tags: ['vegetarian', 'vegan', 'eggetarian', 'non_veg', 'jain', 'sattvic'],
  },
  {
    id: 'ifct_poha',
    name: 'Kanda poha with peanuts',
    name_hi: 'पोहा',
    synonyms: ['poha', 'kanda poha', 'flattened rice'],
    source: 'IFCT2017',
    per_100g: { kcal: 158, protein_g: 3.6, carbs_g: 26.8, fat_g: 4.1, fibre_g: 2.1, sodium_mg: 290 },
    household_units: { katori: 150, plate: 220 },
    image_key: 'foods/poha.webp',
    diet_tags: ['vegetarian', 'vegan', 'eggetarian', 'non_veg'],
  },
  {
    id: 'ifct_idli_sambar',
    name: 'Idli with sambar',
    name_hi: 'इडली सांबर',
    synonyms: ['idli', 'idli sambar', 'steamed idli'],
    source: 'IFCT2017',
    per_100g: { kcal: 132, protein_g: 4.3, carbs_g: 25.1, fat_g: 1.4, fibre_g: 2.3, sodium_mg: 280 },
    household_units: { piece: 45, plate: 180 },
    image_key: 'foods/idli-sambar.webp',
    diet_tags: ['vegetarian', 'vegan', 'eggetarian', 'non_veg', 'sattvic'],
  },
  {
    id: 'ifct_paneer_bhurji',
    name: 'Paneer bhurji',
    name_hi: 'पनीर भुर्जी',
    synonyms: ['paneer', 'paneer bhurji', 'cottage cheese'],
    source: 'IFCT2017',
    per_100g: { kcal: 214, protein_g: 13.8, carbs_g: 4.5, fat_g: 15.6, fibre_g: 1.1, sodium_mg: 310 },
    household_units: { katori: 150, serving: 150 },
    image_key: 'foods/paneer-bhurji.webp',
    diet_tags: ['vegetarian', 'eggetarian', 'non_veg'],
  },
  {
    id: 'ifct_curd',
    name: 'Plain curd (dahi)',
    name_hi: 'दही',
    synonyms: ['curd', 'dahi', 'yogurt', 'plain dahi'],
    source: 'IFCT2017',
    per_100g: { kcal: 61, protein_g: 3.5, carbs_g: 4.7, fat_g: 3.3, fibre_g: 0, sodium_mg: 46 },
    household_units: { katori: 150, cup: 200 },
    image_key: 'foods/curd.webp',
    diet_tags: ['vegetarian', 'eggetarian', 'non_veg', 'jain', 'sattvic'],
  },
  {
    id: 'ifct_quinoa_bowl',
    name: 'Quinoa & paneer veggie bowl',
    name_hi: 'क्विनोआ वेजी बाउल',
    synonyms: ['quinoa bowl', 'salad bowl', 'veggie bowl', 'quinoa'],
    source: 'USDA',
    per_100g: { kcal: 142, protein_g: 6.8, carbs_g: 18.4, fat_g: 4.6, fibre_g: 3.9, sodium_mg: 180 },
    household_units: { bowl: 320, serving: 320 },
    image_key: 'foods/quinoa-veggie-bowl.webp',
    diet_tags: ['vegetarian', 'eggetarian', 'non_veg'],
  },
  {
    id: 'ifct_besan_chilla',
    name: 'Besan chilla (gram flour pancake)',
    name_hi: 'बेसन चीला',
    synonyms: ['besan chilla', 'chilla', 'cheela', 'moong chilla'],
    source: 'IFCT2017',
    per_100g: { kcal: 196, protein_g: 9.2, carbs_g: 24.5, fat_g: 6.4, fibre_g: 4.8, sodium_mg: 270 },
    household_units: { piece: 65, serving: 130 },
    image_key: 'foods/besan-chilla.webp',
    diet_tags: ['vegetarian', 'vegan', 'eggetarian', 'non_veg', 'jain'],
  },
  {
    id: 'ifct_egg_boiled',
    name: 'Boiled egg',
    name_hi: 'उबला अंडा',
    synonyms: ['egg', 'boiled egg', 'anda'],
    source: 'IFCT2017',
    per_100g: { kcal: 155, protein_g: 12.6, carbs_g: 1.1, fat_g: 10.6, fibre_g: 0, sodium_mg: 124 },
    household_units: { piece: 50, egg: 50 },
    image_key: 'foods/egg-boiled.webp',
    diet_tags: ['eggetarian', 'non_veg'],
  },
  {
    id: 'ifct_sprouts_chaat',
    name: 'Moong sprouts chaat',
    name_hi: 'अंकुरित मूंग चाट',
    synonyms: ['sprouts', 'sprouts chaat', 'moong sprouts'],
    source: 'IFCT2017',
    per_100g: { kcal: 105, protein_g: 7.4, carbs_g: 16.8, fat_g: 0.9, fibre_g: 4.2, sodium_mg: 140 },
    household_units: { katori: 120, bowl: 180 },
    image_key: 'foods/sprouts-chaat.webp',
    diet_tags: ['vegetarian', 'vegan', 'eggetarian', 'non_veg', 'sattvic'],
  },
  {
    id: 'ifct_makhana',
    name: 'Roasted makhana (fox nuts)',
    name_hi: 'भुना मखाना',
    synonyms: ['makhana', 'fox nuts', 'roasted makhana'],
    source: 'IFCT2017',
    per_100g: { kcal: 347, protein_g: 9.7, carbs_g: 76.9, fat_g: 0.1, fibre_g: 14.5, sodium_mg: 10 },
    household_units: { katori: 25, handful: 20 },
    image_key: 'foods/makhana-roasted.webp',
    diet_tags: ['vegetarian', 'vegan', 'eggetarian', 'non_veg', 'jain', 'sattvic'],
  },
];

export function matchFoodByQuery(query: string, catalog: FoodItem[] = SEED_FOODS): FoodItem | null {
  const q = query.trim().toLowerCase();
  if (!q) return null;

  let best: { item: FoodItem; score: number } | null = null;
  for (const item of catalog) {
    const haystack = [item.name, item.name_hi ?? '', ...item.synonyms].map((s) => s.toLowerCase());
    let score = 0;
    for (const h of haystack) {
      if (h === q) score = Math.max(score, 100);
      else if (h.includes(q) || q.includes(h)) score = Math.max(score, 75);
      else {
        const tokens = q.split(/\s+/).filter(Boolean);
        const hits = tokens.filter((t) => h.includes(t)).length;
        if (hits > 0) score = Math.max(score, Math.round((hits / tokens.length) * 60));
      }
    }
    if (score > 0 && (!best || score > best.score)) {
      best = { item, score };
    }
  }
  return best ? best.item : null;
}

/**
 * Computes exact nutrients from database per-100g values (Section 8.4.3).
 */
export function computeNutrientsForGrams(food: FoodItem, grams: number): Nutrients {
  const factor = Math.max(0, grams) / 100;
  return {
    kcal: Math.round(food.per_100g.kcal * factor),
    protein_g: Number((food.per_100g.protein_g * factor).toFixed(1)),
    carbs_g: Number((food.per_100g.carbs_g * factor).toFixed(1)),
    fat_g: Number((food.per_100g.fat_g * factor).toFixed(1)),
    fibre_g: Number((food.per_100g.fibre_g * factor).toFixed(1)),
    sodium_mg: food.per_100g.sodium_mg ? Math.round(food.per_100g.sodium_mg * factor) : undefined,
  };
}

export function sumMealNutrients(items: MealLogItem[]): Nutrients {
  return items.reduce<Nutrients>(
    (acc, item) => ({
      kcal: acc.kcal + item.nutrients.kcal,
      protein_g: Number((acc.protein_g + item.nutrients.protein_g).toFixed(1)),
      carbs_g: Number((acc.carbs_g + item.nutrients.carbs_g).toFixed(1)),
      fat_g: Number((acc.fat_g + item.nutrients.fat_g).toFixed(1)),
      fibre_g: Number((acc.fibre_g + item.nutrients.fibre_g).toFixed(1)),
    }),
    { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fibre_g: 0 }
  );
}
