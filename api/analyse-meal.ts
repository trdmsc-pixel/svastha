import { callStructuredLLM, handleLlmError, VercelRequestLike, VercelResponseLike } from './_llm';
import { ANALYSE_MEAL_PROMPT, attachmentsFrom, schemas } from './_shared';

export default async function handler(req: VercelRequestLike, res: VercelResponseLike) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
  // Zero-storage: the body (base64 photo) is never logged and is dropped right after inference.
  let body = (req.body ?? {}) as { imageBase64?: string; mimeType?: string; dietType?: string; textHint?: string };
  try {
    const images = attachmentsFrom(body);
    if (images.length === 0 && !body.textHint) return res.status(400).json({ error: 'No photo received.' });
    const { data, model } = await callStructuredLLM({
      systemPrompt: ANALYSE_MEAL_PROMPT,
      userText: body.textHint
        ? `Diet context: ${body.dietType ?? 'unknown'}. Parse this meal description: ${String(body.textHint).slice(0, 500)}`
        : `Diet context: ${body.dietType ?? 'unknown'}. Identify every food and drink in the photo and estimate portions.`,
      imagesBase64: images.length ? images : undefined,
      schema: schemas.analyseMeal,
      useVision: images.length > 0,
    });
    const analysis = { ...data, items: data.items.map((i) => ({ ...i, match_hint: i.match_hint || i.name })) };
    return res.status(200).json({ analysis, model, prompt_version: 'analyse-meal-v3' });
  } catch (err) {
    return handleLlmError(res, err);
  } finally {
    body = {};
  }
}
