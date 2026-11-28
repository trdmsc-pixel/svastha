import { z } from 'zod';
import { callStructuredLLM, handleLlmError, VercelRequestLike, VercelResponseLike } from './_llm';

const SuggestRecipesSchema = z.object({
  recipes: z
    .array(
      z.object({
        name: z.string(),
        slot: z.enum(['breakfast', 'lunch', 'snack', 'dinner']).optional().default('lunch'),
        cuisine: z.string().optional().default('Indian'),
        minutes: z.number().optional().default(20),
        difficulty: z.number().optional().default(2),
        focus: z.array(z.string()).optional().default([]),
        biomarker_benefits: z.array(z.string()).optional().default([]),
        ingredients: z
          .array(
            z.object({
              name: z.string(),
              grams: z.number(),
              kcal_per_100g: z.number().optional(),
            })
          )
          .default([]),
        steps: z.array(z.string()).default([]),
        per_serving: z
          .object({
            kcal: z.number(),
            protein_g: z.number(),
            carbs_g: z.number(),
            fat_g: z.number(),
            fibre_g: z.number(),
          })
          .optional(),
        why: z.string().optional().default(''),
      })
    )
    .default([]),
});

const SYSTEM_PROMPT = `You are a clinical wellness chef creating deeply personalised home-cooked recipes based on:
1. What the user specifically wants to eat ("craving" / "meal_slot" / "max_minutes"),
2. Their LATEST LAB REPORT flagged biomarkers (exact values, statuses, and targets),
3. Their stored health profile (diet_type, allergies, conditions, fasting_practices, cuisine_prefs, budget_level, daily_targets, and remaining_today macros).

NON-NEGOTIABLE RULES:
- Generate 5 distinct, mouth-watering, practical recipes tailored to their craving AND lab markers.
- Strictly obey diet_type (vegetarian excludes meat/fish/eggs; vegan excludes dairy/ghee/paneer/curd; jain excludes onion/garlic/potato/root vegetables) and allergies.
- Never include alcohol, kava, green tea extract, or high-dose niacin. If pregnant=true, keep recipes gentle and nutrient-dense.
- Explain in "why" and "biomarker_benefits" specifically how each dish supports their flagged lab values (non-diagnostic wellness language only).
- Provide realistic ingredient weights in grams AND a complete per_serving estimate (kcal, protein_g, carbs_g, fat_g, fibre_g).

Return ONLY valid JSON:
{
  "recipes": [
    {
      "name": "Tandoori Paneer & Roasted Bell Pepper Quinoa Wrap",
      "slot": "dinner",
      "cuisine": "North Indian",
      "minutes": 20,
      "difficulty": 2,
      "focus": ["protein", "liver", "ldl", "fibre"],
      "biomarker_benefits": ["ALT < 50 U/L", "LDL < 100 mg/dL"],
      "ingredients": [{ "name": "Paneer", "grams": 100 }, { "name": "Whole-wheat roti", "grams": 70 }],
      "steps": ["Marinate paneer in curd and spices.", "Grill until lightly charred and wrap with salad."],
      "per_serving": { "kcal": 430, "protein_g": 24, "carbs_g": 38, "fat_g": 18, "fibre_g": 7 },
      "why": "High plant fibre and lean protein support lowering LDL and easing liver load without deep frying."
    }
  ]
}`;

export default async function handler(req: VercelRequestLike, res: VercelResponseLike) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const payload = req.body ?? {};
  try {
    const { data, model } = await callStructuredLLM({
      systemPrompt: SYSTEM_PROMPT,
      userText: `Reassess this user's database profile, latest lab report biomarkers, remaining daily macros, and craving to craft 5 fresh personalised recipes (keep each recipe's steps concise, 2-4 short steps):\n${JSON.stringify(payload)}`,
      schema: SuggestRecipesSchema,
      fast: true,
      maxOutputTokens: 4096,
    });
    return res.status(200).json({ recipes: data.recipes, model, prompt_version: 'suggest-recipes-v2' });
  } catch (err) {
    return handleLlmError(res, err);
  }
}