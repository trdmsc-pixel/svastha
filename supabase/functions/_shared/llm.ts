// Provider-agnostic LLM wrapper for Supabase Edge Functions (Deno)
// Privacy invariant: NEVER log request bodies or base64 payloads.

import { z } from 'https://deno.land/x/zod@v3.23.8/mod.ts';

export interface LlmCallOptions<T> {
  systemPrompt: string;
  userText: string;
  imagesBase64?: Array<{ mimeType: string; data: string }>;
  schema: z.ZodType<T>;
  useVision?: boolean;
}

export async function callStructuredLLM<T>(opts: LlmCallOptions<T>): Promise<{ data: T; model: string }> {
  const provider = Deno.env.get('LLM_PROVIDER') ?? 'gemini';
  const apiKey = Deno.env.get('LLM_API_KEY') ?? '';
  const model = opts.useVision
    ? Deno.env.get('LLM_VISION_MODEL') ?? 'gemini-2.5-flash'
    : Deno.env.get('LLM_TEXT_MODEL') ?? 'gemini-2.5-flash';

  if (!apiKey) {
    throw new Error('LLM_API_KEY secret is not configured in Supabase Edge Function secrets.');
  }

  const invokeOnce = async (retryHint?: string): Promise<string> => {
    const promptText = retryHint
      ? `${opts.userText}\n\nPrevious JSON failed schema validation: ${retryHint}. Return ONLY valid JSON.`
      : opts.userText;

    if (provider === 'gemini') {
      const parts: Array<Record<string, unknown>> = [{ text: promptText }];
      for (const img of opts.imagesBase64 ?? []) {
        parts.push({ inline_data: { mime_type: img.mimeType, data: img.data } });
      }
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: opts.systemPrompt }] },
            contents: [{ role: 'user', parts }],
            generationConfig: { responseMimeType: 'application/json', temperature: 0.2 },
          }),
        }
      );
      if (!res.ok) throw new Error(`LLM HTTP ${res.status}`);
      const json = await res.json();
      return json?.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}';
    }

    // OpenAI-compatible fallback
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: opts.systemPrompt },
          { role: 'user', content: promptText },
        ],
      }),
    });
    if (!res.ok) throw new Error(`LLM HTTP ${res.status}`);
    const json = await res.json();
    return json?.choices?.[0]?.message?.content ?? '{}';
  };

  let raw = await invokeOnce();
  try {
    const parsed = opts.schema.parse(JSON.parse(raw));
    return { data: parsed, model };
  } catch (err) {
    // Retry once with Zod validation error (Section 8)
    raw = await invokeOnce(String(err));
    const parsed = opts.schema.parse(JSON.parse(raw));
    return { data: parsed, model };
  }
}
