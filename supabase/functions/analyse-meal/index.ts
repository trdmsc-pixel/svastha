import { z } from 'https://deno.land/x/zod@v3.23.8/mod.ts';
import { callStructuredLLM } from '../_shared/llm.ts';
import { checkRateLimit, getAuthClient } from '../_shared/supabaseClient.ts';

const AnalyseMealSchema = z.object({
  items: z
    .array(
      z.object({
        name: z.string(),
        match_hint: z.string().optional().default(''),
        portion: z
          .object({
            amount: z.number().optional().default(1),
            unit: z.string().optional().default('serving'),
            grams_est: z.number().optional().default(150),
          })
          .optional()
          .default({ amount: 1, unit: 'serving', grams_est: 150 }),
        confidence: z.number().optional().default(0.8),
      })
    )
    .default([]),
  plate_type: z.enum(['thali', 'bowl', 'plate', 'packet', 'drink']).optional().default('plate'),
  notes: z.string().optional().default(''),
  is_food: z.boolean().optional().default(true),
});

const SYSTEM_PROMPT = `Identify all food items on the plate (especially Indian dishes and thalis) with portion estimates in Indian household units (katori, roti, piece, glass) and grams. Do NOT calculate calories — the server computes nutrients from IFCT 2017.

Return ONLY valid JSON matching this exact structure:
{
  "items": [
    {
      "name": "Dal tadka",
      "match_hint": "dal, toor, cooked",
      "portion": { "amount": 1, "unit": "katori", "grams_est": 180 },
      "confidence": 0.85
    }
  ],
  "plate_type": "thali",
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

  // Zero-storage invariant: never log body; discard image buffer right after inference
  let body: { imageBase64?: string; mimeType?: string; dietType?: string } | null = await req.json();
  try {
    const { data, model } = await callStructuredLLM({
      systemPrompt: SYSTEM_PROMPT,
      userText: `Diet context: ${body?.dietType ?? 'unknown'}. Identify foods and estimate portions.`,
      imagesBase64: body?.imageBase64
        ? [{ mimeType: body.mimeType ?? 'image/jpeg', data: body.imageBase64 }]
        : undefined,
      schema: AnalyseMealSchema,
      useVision: true,
    });
    const normalised = {
      ...data,
      items: data.items.map((item) => ({
        ...item,
        match_hint: item.match_hint || item.name,
      })),
    };
    body = null;
    return Response.json({ analysis: normalised, model, prompt_version: 'analyse-meal-v2' });
  } catch (err) {
    body = null;
    return Response.json({ error: `Meal analysis failed: ${String(err)}` }, { status: 500 });
  }
});