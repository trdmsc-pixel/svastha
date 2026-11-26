import { z } from 'https://deno.land/x/zod@v3.23.8/mod.ts';
import { callStructuredLLM } from '../_shared/llm.ts';
import { checkRateLimit, getAuthClient } from '../_shared/supabaseClient.ts';
import { json, serveJson } from '../_shared/http.ts';
import { SUGGEST_RECIPES_PROMPT } from '../_shared/prompts.ts';
import { buildSchemas } from '../_shared/schemas.ts';

const schemas = buildSchemas(z);

serveJson(async (req) => {
  const { data: { user } } = await getAuthClient(req).auth.getUser();
  if (!user) return json({ error: 'Unauthorized' }, 401);
  if (!(await checkRateLimit(user.id, 'suggest-recipes', 20))) return json({ error: 'Daily recipe limit reached' }, 429);
  const payload = await req.json();
  const { data, model } = await callStructuredLLM({ systemPrompt: SUGGEST_RECIPES_PROMPT, userText: `User context: ${JSON.stringify(payload).slice(0, 4000)}`, schema: schemas.suggestRecipes });
  return json({ recipes: data.recipes, model, prompt_version: 'suggest-recipes-v2' });
});
