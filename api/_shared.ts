import { z } from 'zod';
import { attachmentsFrom, buildSchemas, minimiseChatContext } from '../supabase/functions/_shared/schemas';
export * from '../supabase/functions/_shared/prompts';
export { attachmentsFrom, minimiseChatContext };
const built = buildSchemas(z);

export interface MealItemOut { name: string; match_hint: string; portion: { amount: number; unit: string; grams_est: number }; confidence: number; estimated_per_100g: Record<string, number> | null }
export interface MealOut { items: MealItemOut[]; plate_type: string; notes: string; is_food: boolean }
export interface ReportOut { lab: { name: string; collected_at: string | null; reported_at: string | null }; panels: Array<{ panel_name: string; tests: Array<Record<string, unknown>> }>; lab_notes: string[]; extraction_warnings: string[] }
export interface RecipesOut { recipes: Array<Record<string, unknown>> }
export interface ChatOut { reply: string; cited_markers: string[] }

export const schemas = {
  analyseMeal: built.analyseMeal as z.ZodType<MealOut>,
  parseReport: built.parseReport as z.ZodType<ReportOut>,
  suggestRecipes: built.suggestRecipes as z.ZodType<RecipesOut>,
  reportChat: built.reportChat as z.ZodType<ChatOut>,
};

/** Vercel rejects bodies over ~4.5 MB before our code runs; check early for a clear message. */
export function tooLarge(body: unknown): boolean {
  try {
    return JSON.stringify(body ?? {}).length > 4_300_000;
  } catch {
    return true;
  }
}
