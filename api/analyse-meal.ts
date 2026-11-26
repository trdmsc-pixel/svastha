import { z } from 'zod';
import { callStructuredLLM, handleLlmError, VercelRequestLike, VercelResponseLike } from './_llm';

const AnalyseMealSchema = z.object({
  items: z.array(
    z.object({
      name: z.string(),
      match_hint: z.string(),
      portion: z.object({
        amount: z.number(),
        unit: z.string(),
        grams_est: z.number(),
      }),
      confidence: z.number(),
    })
  ),
  plate_type: z.enum(['thali', 'bowl', 'plate', 'packet', 'drink']),
  notes: z.string(),
  is_food: z.boolean(),
});

const SYSTEM_PROMPT =
  'Identify all food items on the plate (especially Indian dishes and thalis) with portion estimates in Indian household units (katori, roti, piece, glass) and grams. Do NOT calculate calories — the server computes nutrients from IFCT 2017.';

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
    body = {};
    return res.status(200).json({ analysis: data, model, prompt_version: 'analyse-meal-v1' });
  } catch (err) {
    body = {};
    return handleLlmError(res, err);
  }
}