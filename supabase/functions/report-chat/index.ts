import { z } from 'https://deno.land/x/zod@v3.23.8/mod.ts';
import { callStructuredLLM } from '../_shared/llm.ts';
import { getAuthClient } from '../_shared/supabaseClient.ts';
import { json, serveJson } from '../_shared/http.ts';
import { REPORT_CHAT_PROMPT } from '../_shared/prompts.ts';
import { buildSchemas, minimiseChatContext } from '../_shared/schemas.ts';

const schemas = buildSchemas(z);

serveJson(async (req) => {
  const { data: { user } } = await getAuthClient(req).auth.getUser();
  if (!user) return json({ error: 'Unauthorized' }, 401);
  const { question, context, history } = await req.json();
  if (!String(question ?? '').trim()) return json({ error: 'Ask a question first.' }, 400);
  const recent = ((history ?? []) as Array<{ role: string; text: string }>).slice(-6).map((m) => `${m.role === 'user' ? 'User' : 'Svastha'}: ${String(m.text).slice(0, 400)}`).join('\n');
  const { data, model } = await callStructuredLLM({
    systemPrompt: REPORT_CHAT_PROMPT,
    userText: `Context:\n${JSON.stringify(minimiseChatContext(context)).slice(0, 20000)}\n\nRecent conversation:\n${recent}\n\nQuestion: ${String(question).slice(0, 600)}`,
    schema: schemas.reportChat,
  });
  return json({ ...data, model, prompt_version: 'report-chat-v2' });
});
