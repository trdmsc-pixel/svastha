import { z } from 'https://deno.land/x/zod@v3.23.8/mod.ts';
import { callStructuredLLM } from '../_shared/llm.ts';
import { checkRateLimit, getAuthClient } from '../_shared/supabaseClient.ts';

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
1. Identify the EXACT dish visible in the image (e.g., "Avocado Sourdough Toast", "Steamed Veg Momos", "Cold Coffee", "Paneer Butter Masala"). Never guess a generic staple if it's a different dish.
2. Estimate the realistic portion size in Indian or standard household units (katori, roti, piece, bowl, slice, glass, cup) AND total estimated weight in grams ("grams_est").
3. ALWAYS provide accurate, realistic nutrition PER 100 GRAMS in "estimated_per_100g" (kcal, protein_g, carbs_g, fat_g, fibre_g, sodium_mg, sugar_g).
4. If the image does NOT contain food or drink, set "is_food": false and "items": [].

Return ONLY valid JSON matching this exact structure:
{
  "items": [
    {
      "name": "Steamed Veg Momos",
      "name_hi": "वेज मोमोज",
      "match_hint": "veg momos steamed dumplings",
      "synonyms": ["momos", "veg dumplings"],
      "portion": { "amount": 6, "unit": "piece", "grams_est": 180 },
      "estimated_per_100g": { "kcal": 175, "protein_g": 5.2, "carbs_g": 28.4, "fat_g": 4.1, "fibre_g": 2.3, "sodium_mg": 380, "sugar_g": 1.8 },
      "diet_tags": ["vegetarian", "vegan"],
      "confidence": 0.91
    }
  ],
  "plate_type": "plate",
  "notes": "",
  "is_food": true
}
Allowed plate_type values: "thali", "bowl", "plate", "packet", "drink".`;

Deno.serve(async (req) => {
  const supabase = getAuthClient(req);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const allowed = await checkRateLimit(user.id, 'analyse-meal', 60);
  if (!allowed) return Response.json({ error: 'Daily meal scan limit (60/day) reached' }, { status: 429 });

  let body: { imageBase64?: string; mimeType?: string; dietType?: string; textHint?: string } | null = await req.json();
  try {
    const useVision = Boolean(body?.imageBase64);
    const { data, model } = await callStructuredLLM({
      systemPrompt: SYSTEM_PROMPT,
      userText: body?.textHint
        ? `Diet context: ${body?.dietType ?? 'unknown'}. Parse this meal description accurately: ${body.textHint}`
        : `Diet context: ${body?.dietType ?? 'unknown'}. Inspect the photo closely, identify every exact food item, estimate portion grams, and provide per-100g nutrition values.`,
      imagesBase64: body?.imageBase64
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
    body = null;
    return Response.json({ analysis: normalised, model, prompt_version: 'analyse-meal-v3' });
  } catch (err) {
    body = null;
    return Response.json({ error: `Meal analysis failed: ${String(err)}` }, { status: 500 });
  }
});