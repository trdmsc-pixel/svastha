import { DietType, FoodItem, MealLogItem, Nutrients } from '@/types/domain';

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


type DietCode = 'V' | 'D' | 'E' | 'N';
const DIET_TAGS: Record<DietCode, DietType[]> = {
  V: ['vegan', 'vegetarian', 'eggetarian', 'non_veg'],
  D: ['vegetarian', 'eggetarian', 'non_veg'],
  E: ['eggetarian', 'non_veg'],
  N: ['non_veg'],
};

/** Compact constructor for the extended catalogue (per-100 g values). */
function food(
  id: string,
  name: string,
  synonyms: string[],
  n: [kcal: number, protein: number, carbs: number, fat: number, fibre: number, sodium?: number],
  units: Record<string, number>,
  diet: DietCode,
  opts: { jain?: boolean; sattvic?: boolean; source?: FoodItem['source']; image?: string; hi?: string } = {}
): FoodItem {
  const tags = [...DIET_TAGS[diet]];
  if (opts.jain) tags.push('jain');
  if (opts.sattvic) tags.push('sattvic');
  return {
    id,
    name,
    name_hi: opts.hi,
    synonyms,
    source: opts.source ?? 'IFCT2017',
    per_100g: { kcal: n[0], protein_g: n[1], carbs_g: n[2], fat_g: n[3], fibre_g: n[4], sodium_mg: n[5] },
    household_units: units,
    image_key: opts.image ?? `foods/${id.replace(/^ifct_|^svs_/, '').replace(/_/g, '-')}.webp`,
    diet_tags: tags,
  };
}

/**
 * Extended catalogue. Raw ingredients follow IFCT 2017 values; composite dishes (source
 * 'custom') are Svastha standard recipes computed from IFCT 2017 ingredients.
 */
export const EXTENDED_FOODS: FoodItem[] = [
  // Breads & grains
  food('svs_paratha', 'Plain paratha', ['paratha', 'parantha', 'lachha paratha'], [326, 6.4, 45, 13, 4, 300], { piece: 60, paratha: 60 }, 'D', { source: 'custom' }),
  food('svs_aloo_paratha', 'Aloo paratha', ['aloo paratha', 'potato paratha', 'stuffed paratha'], [260, 5.6, 36, 10.5, 3.2, 330], { piece: 120, paratha: 120 }, 'D', { source: 'custom' }),
  food('svs_methi_thepla', 'Methi thepla', ['thepla', 'methi thepla'], [280, 7, 38, 11, 5, 310], { piece: 40 }, 'D', { source: 'custom' }),
  food('ifct_bajra_roti', 'Bajra roti', ['bajra roti', 'bajra', 'pearl millet roti', 'bajre ki roti'], [290, 8, 55, 4.5, 8, 10], { roti: 45, piece: 45 }, 'V', { jain: true }),
  food('ifct_jowar_roti', 'Jowar roti (bhakri)', ['jowar roti', 'jowar', 'bhakri', 'sorghum roti'], [280, 8.5, 58, 2, 7, 8], { roti: 45, piece: 45 }, 'V', { jain: true }),
  food('ifct_ragi_roti', 'Ragi roti', ['ragi roti', 'ragi', 'finger millet', 'nachni'], [260, 6, 52, 2.3, 9, 10], { roti: 45, piece: 45 }, 'V', { jain: true, sattvic: true }),
  food('ifct_brown_rice', 'Brown rice (cooked)', ['brown rice'], [112, 2.6, 23.5, 0.9, 1.8, 3], { katori: 150, bowl: 220 }, 'V', { jain: true, sattvic: true }),
  food('ifct_oats_raw', 'Rolled oats (dry)', ['oats', 'rolled oats', 'oatmeal dry'], [379, 13.2, 67.7, 6.5, 10.1, 6], { tbsp: 10, cup: 80 }, 'V', { jain: true, sattvic: true }),
  food('svs_oats_porridge', 'Oats porridge with milk', ['oats porridge', 'oatmeal', 'porridge', 'daliya'], [95, 4, 14, 2.5, 1.7, 45], { bowl: 250, katori: 180 }, 'D', { source: 'custom', jain: true }),
  food('ifct_white_bread', 'White bread', ['bread', 'white bread', 'toast'], [265, 9, 49, 3.2, 2.7, 490], { slice: 25 }, 'V', { source: 'USDA' }),
  food('ifct_brown_bread', 'Whole-wheat bread', ['brown bread', 'whole wheat bread', 'atta bread'], [250, 10, 43, 3.5, 6, 450], { slice: 28 }, 'V', { source: 'USDA' }),
  // South Indian & breakfast
  food('ifct_idli_plain', 'Plain idli', ['plain idli', 'idly'], [146, 4.5, 29.6, 0.6, 1.5, 230], { piece: 40 }, 'V', { sattvic: true }),
  food('svs_plain_dosa', 'Plain dosa', ['dosa', 'plain dosa', 'sada dosa'], [168, 3.8, 29, 3.7, 1.2, 250], { piece: 90, dosa: 90 }, 'V', { source: 'custom' }),
  food('svs_masala_dosa', 'Masala dosa', ['masala dosa'], [190, 3.9, 28, 7, 2, 320], { piece: 160, dosa: 160 }, 'V', { source: 'custom' }),
  food('svs_upma', 'Rava upma', ['upma', 'rava upma', 'suji upma'], [150, 3.8, 22, 5.2, 1.8, 290], { katori: 180, plate: 220 }, 'V', { source: 'custom' }),
  food('svs_sambar', 'Sambar', ['sambar', 'sambhar'], [75, 3.4, 10.5, 2.2, 2.6, 300], { katori: 180, bowl: 250 }, 'V', { source: 'custom' }),
  food('svs_rasam', 'Rasam', ['rasam'], [40, 1.5, 6, 1.2, 0.8, 320], { katori: 180 }, 'V', { source: 'custom' }),
  food('svs_dhokla', 'Khaman dhokla', ['dhokla', 'khaman'], [160, 6.5, 24, 4, 2.2, 360], { piece: 40 }, 'V', { source: 'custom' }),
  // Dals, curries & sabzi
  food('svs_moong_dal', 'Moong dal (cooked)', ['moong dal', 'yellow moong', 'moong'], [105, 7, 18, 0.4, 5, 220], { katori: 180, bowl: 250 }, 'V', { source: 'custom', sattvic: true }),
  food('svs_dal_makhani', 'Dal makhani', ['dal makhani', 'black dal', 'maa ki dal'], [170, 6, 16, 9, 4.5, 330], { katori: 180 }, 'D', { source: 'custom' }),
  food('svs_rajma', 'Rajma curry', ['rajma', 'rajma chawal', 'kidney beans'], [140, 6.8, 18, 4.6, 5.4, 300], { katori: 180 }, 'V', { source: 'custom' }),
  food('svs_chole', 'Chole (chana masala)', ['chole', 'chana masala', 'chickpea curry', 'chana'], [165, 7.6, 21, 5.8, 6.2, 320], { katori: 180 }, 'V', { source: 'custom' }),
  food('svs_palak_paneer', 'Palak paneer', ['palak paneer', 'saag paneer', 'spinach paneer'], [165, 8, 6, 12.5, 2.2, 340], { katori: 170 }, 'D', { source: 'custom' }),
  food('svs_paneer_tikka', 'Paneer tikka', ['paneer tikka', 'tandoori paneer'], [230, 15, 6, 16, 1, 380], { piece: 30, serving: 150 }, 'D', { source: 'custom' }),
  food('svs_mixed_veg', 'Mixed vegetable sabzi', ['sabzi', 'mixed veg', 'vegetable curry', 'sabji'], [90, 2.4, 9, 5, 3.2, 280], { katori: 150 }, 'V', { source: 'custom' }),
  food('svs_bhindi', 'Bhindi masala', ['bhindi', 'okra', 'lady finger', 'bhindi fry'], [110, 2.2, 9, 7.5, 3.5, 260], { katori: 150 }, 'V', { source: 'custom' }),
  food('svs_aloo_sabzi', 'Aloo sabzi', ['aloo', 'potato curry', 'aloo sabzi', 'jeera aloo'], [120, 2, 15, 6, 2, 290], { katori: 150 }, 'V', { source: 'custom' }),
  food('ifct_spinach_cooked', 'Spinach (cooked)', ['spinach', 'palak'], [23, 2.9, 3.6, 0.4, 2.2, 70], { katori: 150 }, 'V', { jain: true }),
  food('svs_soya_chunks', 'Soya chunks curry', ['soya', 'soya chunks', 'nutrela', 'soy chunks'], [120, 17, 9, 2.5, 4, 260], { katori: 150 }, 'V', { source: 'custom' }),
  food('ifct_tofu', 'Tofu', ['tofu', 'soy paneer'], [76, 8, 1.9, 4.8, 0.3, 7], { serving: 100 }, 'V', { source: 'USDA', jain: true }),
  food('ifct_paneer_raw', 'Paneer (raw)', ['paneer cubes', 'raw paneer', 'fresh paneer'], [265, 18.3, 1.2, 20.8, 0, 30], { serving: 100, piece: 25 }, 'D', { jain: true, sattvic: true }),
  // Rice dishes
  food('svs_khichdi', 'Moong dal khichdi', ['khichdi', 'khichri'], [120, 4.4, 20, 2.6, 2.4, 240], { katori: 200, bowl: 280 }, 'V', { source: 'custom', sattvic: true }),
  food('svs_curd_rice', 'Curd rice', ['curd rice', 'thayir sadam', 'dahi chawal'], [120, 3.2, 18, 3.8, 0.5, 250], { katori: 200 }, 'D', { source: 'custom' }),
  food('svs_veg_biryani', 'Veg biryani / pulao', ['veg biryani', 'pulao', 'veg pulao', 'biryani'], [165, 3.8, 25, 5.6, 2, 350], { plate: 300, katori: 180 }, 'V', { source: 'custom' }),
  food('svs_chicken_biryani', 'Chicken biryani', ['chicken biryani'], [190, 9, 23, 6.8, 1, 380], { plate: 300 }, 'N', { source: 'custom' }),
  // Eggs, meat & fish
  food('svs_omelette', 'Masala omelette', ['omelette', 'omelet', 'masala omelette'], [154, 10.6, 1.5, 11.7, 0.3, 300], { piece: 70, egg: 70 }, 'E', { source: 'custom' }),
  food('svs_egg_bhurji', 'Egg bhurji', ['egg bhurji', 'scrambled eggs', 'anda bhurji'], [190, 12, 2.5, 15, 0.4, 320], { serving: 120 }, 'E', { source: 'custom' }),
  food('svs_chicken_curry', 'Chicken curry', ['chicken curry', 'chicken masala', 'butter chicken'], [150, 14, 4, 8.6, 0.8, 360], { katori: 180 }, 'N', { source: 'custom' }),
  food('ifct_chicken_breast', 'Grilled chicken breast', ['grilled chicken', 'chicken breast', 'chicken tikka', 'tandoori chicken'], [165, 31, 0, 3.6, 0, 74], { piece: 120, serving: 150 }, 'N'),
  food('svs_fish_curry', 'Fish curry', ['fish curry', 'machli', 'fish'], [130, 13.5, 3.5, 7, 0.5, 340], { katori: 180, piece: 90 }, 'N', { source: 'custom' }),
  // Snacks & street food
  food('svs_samosa', 'Samosa', ['samosa'], [308, 5, 32, 18, 2.6, 420], { piece: 70 }, 'V', { source: 'custom' }),
  food('svs_pakora', 'Pakora (bhajiya)', ['pakora', 'pakoda', 'bhajiya', 'bhaji'], [315, 7.5, 28, 19, 3.5, 400], { piece: 25 }, 'V', { source: 'custom' }),
  food('svs_pav_bhaji', 'Pav bhaji', ['pav bhaji'], [175, 4, 25, 6.8, 3.6, 420], { plate: 300 }, 'D', { source: 'custom' }),
  food('svs_vada_pav', 'Vada pav', ['vada pav', 'wada pav'], [290, 6, 40, 11.5, 3, 480], { piece: 150 }, 'V', { source: 'custom' }),
  food('svs_marie_biscuit', 'Marie biscuits', ['biscuit', 'biscuits', 'marie'], [440, 7, 76, 11, 2, 370], { piece: 7 }, 'D', { source: 'USDA' }),
  // Sweets
  food('svs_gulab_jamun', 'Gulab jamun', ['gulab jamun', 'sweet', 'mithai'], [323, 5, 50, 12, 0.5, 60], { piece: 45 }, 'D', { source: 'custom' }),
  food('ifct_dates', 'Dates (khajur)', ['dates', 'khajur', 'khajoor'], [282, 2.5, 75, 0.4, 8, 2], { piece: 8 }, 'V', { jain: true, sattvic: true }),
  // Nuts & seeds
  food('ifct_almonds', 'Almonds', ['almonds', 'badam'], [579, 21.2, 21.6, 49.9, 12.5, 1], { piece: 1.2, handful: 25 }, 'V', { jain: true, sattvic: true }),
  food('ifct_walnuts', 'Walnuts', ['walnuts', 'akhrot'], [654, 15.2, 13.7, 65.2, 6.7, 2], { piece: 4, handful: 25 }, 'V', { jain: true, sattvic: true }),
  food('ifct_peanuts', 'Roasted peanuts', ['peanuts', 'groundnuts', 'moongphali'], [567, 25.8, 16.1, 49.2, 8.5, 18], { handful: 30, tbsp: 9 }, 'V', { jain: true }),
  food('ifct_flaxseed', 'Flaxseed (alsi)', ['flaxseed', 'flax seeds', 'alsi', 'linseed'], [534, 18.3, 28.9, 42.2, 27.3, 30], { tbsp: 7, tsp: 3 }, 'V', { jain: true, sattvic: true }),
  food('ifct_chia', 'Chia seeds', ['chia', 'chia seeds'], [486, 16.5, 42.1, 30.7, 34.4, 16], { tbsp: 10 }, 'V', { source: 'USDA', jain: true }),
  food('svs_peanut_butter', 'Peanut butter', ['peanut butter'], [588, 25, 20, 50, 6, 430], { tbsp: 16 }, 'V', { source: 'USDA', jain: true }),
  // Fruit & veg
  food('ifct_banana', 'Banana', ['banana', 'kela'], [89, 1.1, 22.8, 0.3, 2.6, 1], { piece: 120 }, 'V', { jain: true, sattvic: true }),
  food('ifct_apple', 'Apple', ['apple', 'seb'], [52, 0.3, 13.8, 0.2, 2.4, 1], { piece: 180 }, 'V', { jain: true, sattvic: true }),
  food('ifct_guava', 'Guava (amrood)', ['guava', 'amrood', 'peru'], [68, 2.6, 14.3, 1, 5.4, 2], { piece: 150 }, 'V', { jain: true, sattvic: true }),
  food('ifct_papaya', 'Papaya', ['papaya', 'papita'], [43, 0.5, 10.8, 0.3, 1.7, 8], { bowl: 150, katori: 120 }, 'V', { jain: true, sattvic: true }),
  food('ifct_orange', 'Orange', ['orange', 'santra', 'mosambi', 'sweet lime'], [47, 0.9, 11.8, 0.1, 2.4, 0], { piece: 130 }, 'V', { jain: true, sattvic: true }),
  food('svs_green_salad', 'Green salad (cucumber, tomato, onion)', ['salad', 'green salad', 'kachumber'], [20, 1, 3.8, 0.2, 1.6, 10], { bowl: 150, katori: 100 }, 'V', { source: 'custom' }),
  food('ifct_cucumber', 'Cucumber', ['cucumber', 'kheera'], [15, 0.7, 3.6, 0.1, 0.5, 2], { piece: 200 }, 'V', { jain: true, sattvic: true }),
  food('ifct_tomato', 'Tomato', ['tomato', 'tamatar'], [18, 0.9, 3.9, 0.2, 1.2, 5], { piece: 100 }, 'V', { jain: true, sattvic: true }),
  food('ifct_onion', 'Onion', ['onion', 'pyaz'], [40, 1.1, 9.3, 0.1, 1.7, 4], { piece: 110 }, 'V'),
  food('ifct_carrot', 'Carrot', ['carrot', 'gajar'], [41, 0.9, 9.6, 0.2, 2.8, 69], { piece: 60 }, 'V', { sattvic: true }),
  // Drinks & dairy
  food('ifct_milk_toned', 'Toned milk', ['milk', 'doodh', 'toned milk'], [58, 3.1, 4.8, 3, 0, 44], { glass: 250, cup: 200 }, 'D', { jain: true, sattvic: true }),
  food('svs_masala_chai', 'Masala chai (with sugar)', ['chai', 'tea', 'masala chai', 'milk tea'], [55, 1.6, 8, 1.8, 0, 20], { cup: 150 }, 'D', { source: 'custom' }),
  food('svs_black_coffee', 'Black coffee', ['coffee', 'black coffee', 'americano'], [2, 0.3, 0, 0, 0, 2], { cup: 200 }, 'V', { source: 'USDA' }),
  food('svs_buttermilk', 'Buttermilk (chaas)', ['buttermilk', 'chaas', 'chhachh', 'mattha'], [25, 1.5, 2.7, 0.9, 0, 180], { glass: 250 }, 'D', { source: 'custom', sattvic: true }),
  food('svs_sweet_lassi', 'Sweet lassi', ['lassi', 'sweet lassi'], [90, 3, 14, 2.5, 0, 50], { glass: 250 }, 'D', { source: 'custom' }),
  food('ifct_coconut_water', 'Coconut water', ['coconut water', 'nariyal pani'], [19, 0.7, 3.7, 0.2, 1.1, 105], { glass: 250 }, 'V', { jain: true, sattvic: true }),
  food('svs_lemon_water', 'Lemon water (no sugar)', ['lemon water', 'nimbu pani'], [6, 0.1, 1.9, 0, 0.1, 2], { glass: 250 }, 'V', { source: 'custom', jain: true }),
  // Fats
  food('ifct_ghee', 'Ghee', ['ghee', 'clarified butter'], [900, 0, 0, 99.5, 0, 0], { tsp: 5, tbsp: 14 }, 'D', { jain: true, sattvic: true }),
  food('ifct_mustard_oil', 'Cooking oil (mustard/groundnut)', ['oil', 'mustard oil', 'cooking oil', 'groundnut oil', 'olive oil'], [884, 0, 0, 100, 0, 0], { tsp: 5, tbsp: 14 }, 'V', { jain: true }),
];

/** The full catalogue used for search, photo matching and recipe nutrition. */
export const ALL_FOODS: FoodItem[] = [...SEED_FOODS, ...EXTENDED_FOODS];

export function findFoodById(id: string, catalog: FoodItem[] = ALL_FOODS): FoodItem | undefined {
  return catalog.find((f) => f.id === id);
}

function normalise(s: string): string {
  return s
    .toLowerCase()
    .replace(/\(.*?\)/g, ' ')
    .replace(/[^a-zऀ-ॿ\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function scoreFood(item: FoodItem, q: string): number {
  const qTokens = q.split(' ').filter((t) => t.length > 1);
  let score = 0;
  const haystack = [item.name, item.name_hi ?? '', ...item.synonyms].map(normalise).filter(Boolean);
  for (const h of haystack) {
    if (h === q) return 100;
    if (h.length > 2 && (q.includes(h) || h.includes(q))) {
      // prefer the longest synonym contained in the query ("aloo paratha" beats "paratha")
      score = Math.max(score, 70 + Math.min(20, h.length));
      continue;
    }
    if (qTokens.length > 0) {
      const hTokens = h.split(' ');
      const hits = qTokens.filter((t) => hTokens.some((ht) => ht === t || (t.length > 3 && ht.startsWith(t)))).length;
      if (hits > 0) score = Math.max(score, Math.round((hits / Math.max(qTokens.length, hTokens.length)) * 60));
    }
  }
  return score;
}

/** Ranked fuzzy search over the food catalogue (deterministic). */
export function searchFoods(query: string, catalog: FoodItem[] = ALL_FOODS, limit = 8): FoodItem[] {
  const q = normalise(query);
  if (!q) return [];
  return catalog
    .map((item) => ({ item, score: scoreFood(item, q) }))
    .filter((r) => r.score >= 30)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((r) => r.item);
}

export function matchFoodByQuery(query: string, catalog: FoodItem[] = ALL_FOODS): FoodItem | null {
  return searchFoods(query, catalog, 1)[0] ?? null;
}

/**
 * Strict matcher used by the Gemini Vision meal scanner so an unrecognized dish
 * (e.g. "Steamed Veg Momos", "Avocado Toast", "Cold Coffee") NEVER falsely matches
 * an unrelated staple in the catalogue. Requires exact name/synonym match or score >= 82.
 */
export function matchFoodStrict(query: string, catalog: FoodItem[] = ALL_FOODS): FoodItem | null {
  const q = normalise(query);
  if (!q) return null;
  const qTokens = q.split(' ').filter((t) => t.length > 1);
  let best: { item: FoodItem; score: number } | null = null;
  for (const item of catalog) {
    const haystack = [item.name, item.name_hi ?? '', ...item.synonyms].map(normalise).filter(Boolean);
    for (const h of haystack) {
      if (h === q) return item;
      const hTokens = h.split(' ').filter((t) => t.length > 1);
      if (qTokens.length > 0 && hTokens.length > 0) {
        const overlap = qTokens.filter((t) => hTokens.includes(t)).length;
        const jaccard = overlap / new Set([...qTokens, ...hTokens]).size;
        const score = Math.round(jaccard * 100);
        if (score >= 82 && (!best || score > best.score)) {
          best = { item, score };
        }
      }
    }
  }
  return best?.item ?? null;
}

/** Grams for `qty` of a household unit, falling back to a sensible default serving. */
export function gramsForUnit(food: FoodItem, unit: string, qty: number): number | null {
  const key = unit.toLowerCase().replace(/s$/, '');
  const grams = food.household_units[key] ?? food.household_units[unit.toLowerCase()];
  if (grams === undefined) {
    if (key === 'g' || key === 'gram') return qty;
    if (key === 'ml') return qty;
    return null;
  }
  return Math.round(grams * qty);
}

export function defaultServing(food: FoodItem): { unit: string; grams: number } {
  const [unit, grams] = Object.entries(food.household_units)[0] ?? ['serving', 100];
  return { unit, grams };
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
