import { callStructuredLLM, handleLlmError, VercelRequestLike, VercelResponseLike } from './_llm';
import { minimiseChatContext, REPORT_CHAT_PROMPT, schemas } from './_shared';

export default async function handler(req: VercelRequestLike, res: VercelResponseLike) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
  const { question, context, history } = (req.body ?? {}) as { question?: string; context?: unknown; history?: Array<{ role: string; text: string }> };
  if (!question?.trim()) return res.status(400).json({ error: 'Ask a question first.' });
  try {
    const recent = (history ?? []).slice(-6).map((m) => `${m.role === 'user' ? 'User' : 'Svastha'}: ${String(m.text).slice(0, 400)}`).join('\n');
    const { data, model } = await callStructuredLLM({
      systemPrompt: REPORT_CHAT_PROMPT,
      userText: `Context:\n${JSON.stringify(minimiseChatContext(context)).slice(0, 20000)}\n\nRecent conversation:\n${recent}\n\nQuestion: ${question.slice(0, 600)}`,
      schema: schemas.reportChat,
    });
    return res.status(200).json({ ...data, model, prompt_version: 'report-chat-v2' });
  } catch (err) {
    return handleLlmError(res, err);
  }
}
