import { z } from 'https://deno.land/x/zod@v3.23.8/mod.ts';
import { callStructuredLLM } from '../_shared/llm.ts';
import { getAuthClient } from '../_shared/supabaseClient.ts';

const ChatReplySchema = z.object({
  reply: z.string(),
  cited_markers: z.array(z.string()),
});

const SYSTEM_PROMPT = `Answer questions grounded ONLY in the user's lab report values, plan, and logs provided in context. Never diagnose, never recommend medication doses, and direct dosing questions to a qualified doctor.`;

Deno.serve(async (req) => {
  const supabase = getAuthClient(req);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { question, context } = await req.json();
  const { data, model } = await callStructuredLLM({
    systemPrompt: SYSTEM_PROMPT,
    userText: `Context:\n${JSON.stringify(context)}\n\nQuestion: ${question}`,
    schema: ChatReplySchema,
  });

  return Response.json({ ...data, model, prompt_version: 'report-chat-v1' });
});
