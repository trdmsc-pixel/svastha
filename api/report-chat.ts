import { z } from 'zod';
import { callStructuredLLM, handleLlmError, VercelRequestLike, VercelResponseLike } from './_llm';

const ChatReplySchema = z.object({
  reply: z.string(),
  cited_markers: z.array(z.string()),
});

const SYSTEM_PROMPT =
  'Answer questions grounded ONLY in the user\'s lab report values, plan, and logs provided in context. Never diagnose, never recommend medication doses, and direct dosing questions to a qualified doctor.';

export default async function handler(req: VercelRequestLike, res: VercelResponseLike) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const { question, context } = (req.body ?? {}) as { question?: string; context?: unknown };
  try {
    const { data, model } = await callStructuredLLM({
      systemPrompt: SYSTEM_PROMPT,
      userText: `Context:\n${JSON.stringify(context ?? {})}\n\nQuestion: ${question ?? ''}`,
      schema: ChatReplySchema,
    });
    return res.status(200).json({ ...data, model, prompt_version: 'report-chat-v1' });
  } catch (err) {
    return handleLlmError(res, err);
  }
}