import { callStructuredLLM, handleLlmError, VercelRequestLike, VercelResponseLike } from './_llm';
import { schemas, SUGGEST_RECIPES_PROMPT } from './_shared';

export default async function handler(req: VercelRequestLike, res: VercelResponseLike) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
  try {
    const { data, model } = await callStructuredLLM({
      systemPrompt: SUGGEST_RECIPES_PROMPT,
      userText: `User context: ${JSON.stringify(req.body ?? {}).slice(0, 4000)}`,
      schema: schemas.suggestRecipes,
    });
    return res.status(200).json({ recipes: data.recipes, model, prompt_version: 'suggest-recipes-v2' });
  } catch (err) {
    return handleLlmError(res, err);
  }
}
