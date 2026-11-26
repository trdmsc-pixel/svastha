// Gemini LLM wrapper for Supabase Edge Functions (Deno)
// Reads GEMINI_API_KEY (or LLM_API_KEY fallback) from Supabase secrets.
// Privacy invariant: NEVER log request bodies or base64 payloads.

import { z } from 'https://deno.land/x/zod@v3.23.8/mod.ts';

export interface LlmCallOptions<T> {
  systemPrompt: string;
  userText: string;
  imagesBase64?: Array<{ mimeType: string; data: string }>;
  schema: z.ZodType<T>;
  useVision?: boolean;
}

const GEMINI_CANDIDATES = ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.0-flash'];

function extractJsonString(raw: string): string {
  const trimmed = raw.trim();
  const fence = /```(?:json)?\s*([\s\S]*?)```/i.exec(trimmed);
  if (fence?.[1]) return fence[1].trim();
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start !== -1 && end > start) return trimmed.slice(start, end + 1);
  return trimmed;
}

export async function callStructuredLLM<T>(opts: LlmCallOptions<T>): Promise<{ data: T; model: string }> {
  const apiKey = (Deno.env.get('GEMINI_API_KEY') || Deno.env.get('LLM_API_KEY') || '').trim();
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY secret is not configured in Supabase Edge Function secrets.');
  }

  const envModel = opts.useVision ? Deno.env.get('LLM_VISION_MODEL') : Deno.env.get('LLM_TEXT_MODEL');
  const candidateModels = envModel ? [envModel] : GEMINI_CANDIDATES;

  const invokeWithModel = async (model: string, retryHint?: string): Promise<string> => {
    const promptText = retryHint
      ? `${opts.userText}\n\nPrevious JSON failed schema validation: ${retryHint}. Return ONLY valid JSON.`
      : opts.userText;

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
    if (!res.ok) {
      const e = new Error(`Gemini HTTP ${res.status}`);
      (e as Error & { status?: number }).status = res.status;
      throw e;
    }
    const json = await res.json();
    return json?.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}';
  };

  let lastErr: unknown;
  for (const model of candidateModels) {
    try {
      let raw = await invokeWithModel(model);
      try {
        const parsed = opts.schema.parse(JSON.parse(extractJsonString(raw)));
        return { data: parsed, model };
      } catch (zodErr) {
        raw = await invokeWithModel(model, String(zodErr));
        const parsed = opts.schema.parse(JSON.parse(extractJsonString(raw)));
        return { data: parsed, model };
      }
    } catch (err) {
      lastErr = err;
      const st = (err as { status?: number }).status;
      if (st === 404 || st === 429) continue;
      throw err;
    }
  }
  throw lastErr;
}