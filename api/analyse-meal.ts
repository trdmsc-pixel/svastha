import { z } from 'zod';
import { callStructuredLLM, handleLlmError, VercelRequestLike, VercelResponseLike } from './_llm';

const NutrientsPer100Schema = z.object({
  kcal: z.number().min(0).max(900),
  protein_g: z.number().min(0).max(100).optional().default(0),
  carbs_g: z.number().min(0).max(100).optional().default(0),
  fat_g: z.number().min(0).max(100).optional().default(0),
  fibre_g: z.number().min(0).max(100).optional().default(0),
  sodium_mg: z.number().min(0).max(10000).optional().default(0),
  sugar_g: z.number().min(0).max(100).optional().default(0),
});

const AnalyseMealSchema = z.object({
  items: z
    .array(
      z.object({
        name: z.string(),
        name_hi: z.string().optional().default(''),
        match_hint: z.string().optional().default(''),
        synonyms: z.array(z.string()).optional().default([]),
        portion: z
          .object({
            amount: z.number().optional().default(1),
            unit: z.string().optional().default('serving'),
            grams_est: z.number().optional().default(150),
          })
          .optional()
          .default({ amount: 1, unit: 'serving', grams_est: 150 }),
        estimated_per_100g: NutrientsPer100Schema,
        diet_tags: z.array(z.string()).optional().default([]),
        confidence: z.number().optional().default(0.85),
      })
    )
    .default([]),
  plate_type: z.enum(['thali', 'bowl', 'plate', 'packet', 'drink']).optional().default('plate'),
  notes: z.string().optional().default(''),
  is_food: z.boolean().optional().default(true),
});

const SYSTEM_PROMPT = `You are a precision nutrition vision analyst for an Indian & global personal health app.
Carefully examine the actual photo (or meal description) and identify EVERY distinct food item, drink, condiment, or packaged item visible.
CRITICAL RULES:
1. Identify the EXACT dish visible in the image (e.g., "Avocado Sourdough Toast", "Steamed Veg Momos", "Cold Coffee", "Paneer Butter Masala", "Aloo Paratha"). Never guess a generic staple if it's a different dish.
2. Estimate the realistic portion size in Indian or standard household units (katori, roti, piece, bowl, slice, glass, cup) AND total estimated weight in grams ("grams_est").
3. ALWAYS provide accurate, realistic nutrition PER 100 GRAMS in "estimated_per_100g" (kcal, protein_g, carbs_g, fat_g, fibre_g, sodium_mg, sugar_g) based on IFCT 2017 / USDA nutrition science. If the dish is not yet in the user's cloud food database, the app will save your per-100g profile as a new food entry and scale it by grams_est.
4. If the image does NOT contain food or drink, set "is_food": false and "items": [].

Return ONLY valid JSON matching this exact structure:
{
  "items": [
    {
      "name": "Steamed Veg Momos",
      "name_hi": "वेज मोमोज",
      "match_hint": "veg momos steamed dumplings",
      "synonyms": ["momos", "veg dumplings", "steamed momos"],
      "portion": { "amount": 6, "unit": "piece", "grams_est": 180 },
      "estimated_per_100g": { "kcal": 175, "protein_g": 5.2, "carbs_g": 28.4, "fat_g": 4.1, "fibre_g": 2.3, "sodium_mg": 380, "sugar_g": 1.8 },
      "diet_tags": ["vegetarian", "vegan"],
      "confidence": 0.91
    }
  ],
  "plate_type": "plate",
  "notes": "Served with spicy red chutney",
  "is_food": true
}
Allowed plate_type values: "thali", "bowl", "plate", "packet", "drink".`;

export default async function handler(req: VercelRequestLike, res: VercelResponseLike) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  let body = (req.body ?? {}) as { imageBase64?: string; mimeType?: string; dietType?: string; textHint?: string };
  try {
    const useVision = Boolean(body.imageBase64);
    const { data, model } = await callStructuredLLM({
      systemPrompt: SYSTEM_PROMPT,
      userText: body.textHint
        ? `Diet context: ${body.dietType ?? 'unknown'}. Parse this meal description accurately and estimate per-100g nutrition and portion grams: ${body.textHint}`
        : `Diet context: ${body.dietType ?? 'unknown'}. Inspect the photo closely, identify every exact food or drink item visible, estimate portion grams, and provide accurate per-100g nutrition values.`,
      imagesBase64: body.imageBase64
        ? [{ mimeType: body.mimeType ?? 'image/jpeg', data: body.imageBase64 }]
        : undefined,
      schema: AnalyseMealSchema,
      useVision,
    });
    const normalised = {
      ...data,
      items: data.items.map((item) => ({
        ...item,
        match_hint: item.match_hint || item.name,
      })),
    };
    body = {};
    return res.status(200).json({ analysis: normalised, model, prompt_version: 'analyse-meal-v3' });
  } catch (err) {
    body = {};
    return handleLlmError(res, err);
  }
}