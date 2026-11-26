import { z } from 'zod';
import { callStructuredLLM, handleLlmError, VercelRequestLike, VercelResponseLike } from './_llm';

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

export default async function handler(req: VercelRequestLike, res: VercelResponseLike) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  let body = (req.body ?? {}) as { imageBase64?: string; mimeType?: string; dietType?: string; textHint?: string };
  try {
    const useVision = Boolean(body.imageBase64);
    const { data, model } = await callStructuredLLM({
      systemPrompt: SYSTEM_PROMPT,
      userText: body.textHint
        ? `Diet context: ${body.dietType ?? 'unknown'}. Parse this meal description: ${body.textHint}`
        : `Diet context: ${body.dietType ?? 'unknown'}. Identify foods and estimate portions.`,
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
    return res.status(200).json({ analysis: normalised, model, prompt_version: 'analyse-meal-v2' });
  } catch (err) {
    body = {};
    return handleLlmError(res, err);
  }
}