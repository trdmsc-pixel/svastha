import { z } from 'zod';
import { callStructuredLLM, handleLlmError, VercelRequestLike, VercelResponseLike } from './_llm';

const SuggestRecipesSchema = z.object({
  recipes: z.array(
    z.object({
      name: z.string(),
      slot: z.enum(['breakfast', 'lunch', 'snack', 'dinner']),
      cuisine: z.string(),
      minutes: z.number(),
      difficulty: z.number(),
      focus: z.array(z.string()),
      ingredients: z.array(z.object({ name: z.string(), grams: z.number() })),
      steps: z.array(z.string()),
      why: z.string(),
    })
  ),
});

const SYSTEM_PROMPT = `Suggest 4 Indian home-cooked recipes tailored to the user's diet type, allergies, cuisine preferences, and lab focus areas.
Rules:
- Strictly respect diet_type (vegetarian excludes meat/fish/eggs; vegan excludes dairy; jain excludes root vegetables) and allergies.
- Never include alcohol, kava, green tea extract, or high-dose niacin.
- Provide realistic ingredient weights in grams so the app can compute nutrition deterministically.`;

export default async function handler(req: VercelRequestLike, res: VercelResponseLike) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const payload = req.body ?? {};
  try {
    const { data, model } = await callStructuredLLM({
      systemPrompt: SYSTEM_PROMPT,
      userText: JSON.stringify(payload),
      schema: SuggestRecipesSchema,
    });
    return res.status(200).json({ recipes: data.recipes, model, prompt_version: 'suggest-recipes-v1' });
  } catch (err) {
    return handleLlmError(res, err);
  }
}