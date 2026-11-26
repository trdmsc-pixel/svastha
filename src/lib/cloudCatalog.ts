import { DietType, FoodItem, Nutrients, Recipe } from '@/types/domain';
import { isSupabaseConfigured, supabase } from './supabase';

/**
 * Syncs newly Gemini-recognized foods with the Supabase cloud `foods` table.
 * - `fetchCloudFoods`: loads existing cloud foods so previously AI-discovered dishes are reused.
 * - `upsertCloudFood`: creates a new food entry in Supabase `foods` when a scanned food is not yet listed.
 */
export async function fetchCloudFoods(): Promise<FoodItem[]> {
  if (!isSupabaseConfigured) return [];
  try {
    const { data, error } = await supabase
      .from('foods')
      .select('id, name, name_hi, synonyms, source, per_100g, household_units, image_key, diet_tags')
      .limit(400);
    if (error || !Array.isArray(data)) return [];
    return data
      .filter((row) => row?.id && row?.name && row?.per_100g)
      .map((row) => ({
        id: String(row.id),
        name: String(row.name),
        name_hi: row.name_hi ? String(row.name_hi) : undefined,
        synonyms: Array.isArray(row.synonyms) ? row.synonyms.map(String) : [],
        source: (row.source as FoodItem['source']) ?? 'ai_gemini',
        per_100g: row.per_100g as Nutrients,
        household_units: (row.household_units as Record<string, number>) ?? { serving: 150 },
        image_key: row.image_key ? String(row.image_key) : 'foods/quinoa-veggie-bowl.webp',
        diet_tags: Array.isArray(row.diet_tags) ? (row.diet_tags as DietType[]) : ['vegetarian'],
      }));
  } catch {
    return [];
  }
}

export async function upsertCloudFood(food: FoodItem): Promise<{ savedToCloud: boolean; error?: string }> {
  if (!isSupabaseConfigured) return { savedToCloud: false };
  try {
    const { data: sess } = await supabase.auth.getSession();
    const userId = sess.session?.user?.id ?? null;
    if (!userId) return { savedToCloud: false };

    const { error } = await supabase.from('foods').upsert(
      {
        id: food.id,
        name: food.name,
        name_hi: food.name_hi ?? null,
        synonyms: food.synonyms,
        source: food.source,
        per_100g: food.per_100g,
        household_units: food.household_units,
        image_key: food.image_key,
        diet_tags: food.diet_tags,
        created_by: userId,
      },
      { onConflict: 'id' }
    );
    if (error) return { savedToCloud: false, error: error.message };
    return { savedToCloud: true };
  } catch (err) {
    return { savedToCloud: false, error: String(err) };
  }
}

export async function saveCloudAiRecipes(recipes: Recipe[], cravingPrompt?: string): Promise<boolean> {
  if (!isSupabaseConfigured || recipes.length === 0) return false;
  try {
    const { data: sess } = await supabase.auth.getSession();
    const userId = sess.session?.user?.id ?? null;
    if (!userId) return false;

    const rows = recipes.map((r) => ({
      id: `${userId.slice(0, 8)}-${r.id}`,
      user_id: userId,
      name: r.name,
      slot: r.slot,
      cuisine: r.cuisine,
      minutes: r.minutes,
      difficulty: r.difficulty,
      diet_tags: r.diet_tags,
      focus: r.focus,
      biomarker_benefits: r.biomarker_benefits ?? [],
      ingredients: r.ingredients,
      steps: r.steps,
      per_serving: r.per_serving ?? null,
      why: r.why ?? null,
      craving_prompt: cravingPrompt ?? r.craving_prompt ?? null,
    }));

    const { error } = await supabase.from('user_ai_recipes').upsert(rows, { onConflict: 'id' });
    return !error;
  } catch {
    return false;
  }
}
