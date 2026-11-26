// Provider-agnostic LLM wrapper for Supabase Edge Functions (Deno)
// Supports Groq (gsk_*), Gemini, and OpenAI.
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
  const apiKey = (Deno.env.get('LLM_API_KEY') ?? '').trim();
  if (!apiKey) {
    throw new Error('LLM_API_KEY secret is not configured in Supabase Edge Function secrets.');
  }

  const explicitProvider = Deno.env.get('LLM_PROVIDER')?.toLowerCase();
  const provider =
    explicitProvider ||
    (apiKey.startsWith('gsk_') ? 'groq' : apiKey.startsWith('AIza') ? 'gemini' : 'openai');

  const defaultTextModel =
    provider === 'groq'
      ? 'llama-3.3-70b-versatile'
      : provider === 'gemini'
        ? 'gemini-2.5-flash'
        : 'gpt-4o-mini';
  const defaultVisionModel =
    provider === 'groq'
      ? 'meta-llama/llama-4-scout-17b-16e-instruct'
      : provider === 'gemini'
        ? 'gemini-2.5-flash'
        : 'gpt-4o-mini';

  const model = opts.useVision
    ? Deno.env.get('LLM_VISION_MODEL') ?? defaultVisionModel
    : Deno.env.get('LLM_TEXT_MODEL') ?? defaultTextModel;

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

    const endpoint =
      provider === 'groq'
        ? 'https://api.groq.com/openai/v1/chat/completions'
        : 'https://api.openai.com/v1/chat/completions';

    const userContent: unknown =
      opts.imagesBase64 && opts.imagesBase64.length > 0
        ? [
            { type: 'text', text: promptText },
            ...opts.imagesBase64.map((img) => ({
              type: 'image_url',
              image_url: { url: `data:${img.mimeType};base64,${img.data}` },
            })),
          ]
        : promptText;

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: `${opts.systemPrompt}\nReturn ONLY valid JSON.` },
          { role: 'user', content: userContent },
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
    raw = await invokeOnce(String(err));
    const parsed = opts.schema.parse(JSON.parse(raw));
    return { data: parsed, model };
  }
}