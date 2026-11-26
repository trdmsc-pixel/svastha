import { z } from 'https://deno.land/x/zod@v3.23.8/mod.ts';
import { callStructuredLLM } from '../_shared/llm.ts';
import { checkRateLimit, getAuthClient } from '../_shared/supabaseClient.ts';
import { json, serveJson } from '../_shared/http.ts';
import { ANALYSE_MEAL_PROMPT } from '../_shared/prompts.ts';
import { attachmentsFrom, buildSchemas } from '../_shared/schemas.ts';

const schemas = buildSchemas(z);

serveJson(async (req) => {
  const { data: { user } } = await getAuthClient(req).auth.getUser();
  if (!user) return json({ error: 'Unauthorized' }, 401);
  if (!(await checkRateLimit(user.id, 'analyse-meal', 60))) return json({ error: 'Daily meal scan limit (60/day) reached' }, 429);
  // Zero-storage invariant: body is never logged; image buffer dropped right after inference.
  let body: Record<string, unknown> | null = await req.json();
  try {
    const images = attachmentsFrom(body ?? {});
    const { data, model } = await callStructuredLLM({
      systemPrompt: ANALYSE_MEAL_PROMPT,
      userText: `Diet context: ${body?.dietType ?? 'unknown'}. Identify every food and drink in the photo and estimate portions.`,
      imagesBase64: images,
      schema: schemas.analyseMeal,
      useVision: true,
    });
    const analysis = { ...data, items: data.items.map((i: { name: string; match_hint?: string }) => ({ ...i, match_hint: i.match_hint || i.name })) };
    return json({ analysis, model, prompt_version: 'analyse-meal-v3' });
  } finally {
    body = null;
  }
});
