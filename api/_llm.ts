import { z } from 'zod';

export interface VercelRequestLike {
  method?: string;
  body?: unknown;
  headers: Record<string, string | string[] | undefined>;
}

export interface VercelResponseLike {
  status: (code: number) => VercelResponseLike;
  json: (data: unknown) => void;
}

const GROQ_TEXT_CANDIDATES = [
  'openai/gpt-oss-120b',
  'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant',
  'meta-llama/llama-4-scout-17b-16e-instruct',
];

const GROQ_VISION_CANDIDATES = [
  'meta-llama/llama-4-scout-17b-16e-instruct',
  'meta-llama/llama-4-maverick-17b-128e-instruct',
];

async function fetchGroqModels(apiKey: string, useVision: boolean): Promise<string[]> {
  try {
    const res = await fetch('https://api.groq.com/openai/v1/models', {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) return [];
    const json = (await res.json()) as { data?: Array<{ id: string }> };
    const ids = (json.data ?? []).map((m) => m.id);
    if (useVision) {
      return ids.filter((id) => /vision|scout|maverick|llama-4|vl/i.test(id));
    }
    return ids.filter((id) => !/whisper|guard|tts|playai/i.test(id));
  } catch {
    return [];
  }
}

function extractJsonString(raw: string): string {
  const trimmed = raw.trim();
  const fence = /```(?:json)?\s*([\s\S]*?)```/i.exec(trimmed);
  if (fence?.[1]) return fence[1].trim();
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start !== -1 && end > start) return trimmed.slice(start, end + 1);
  return trimmed;
}

export async function callStructuredLLM<T>(opts: {
  systemPrompt: string;
  userText: string;
  imagesBase64?: Array<{ mimeType: string; data: string }>;
  schema: z.ZodType<T>;
  useVision?: boolean;
}): Promise<{ data: T; model: string }> {
  const apiKey = (process.env.LLM_API_KEY ?? '').trim();
  if (!apiKey) {
    const err = new Error('LLM_API_KEY is not configured on the server.');
    (err as Error & { code?: string }).code = 'not_configured';
    throw err;
  }

  const explicitProvider = process.env.LLM_PROVIDER?.toLowerCase();
  const provider =
    explicitProvider ||
    (apiKey.startsWith('gsk_') ? 'groq' : apiKey.startsWith('AIza') ? 'gemini' : 'openai');

  const envModel = opts.useVision ? process.env.LLM_VISION_MODEL : process.env.LLM_TEXT_MODEL;
  let candidateModels = envModel
    ? [envModel]
    : provider === 'groq'
      ? opts.useVision
        ? [...GROQ_VISION_CANDIDATES]
        : [...GROQ_TEXT_CANDIDATES]
      : provider === 'gemini'
        ? ['gemini-2.5-flash']
        : ['gpt-4o-mini'];

  const invokeWithModel = async (
    model: string,
    retryHint?: string,
    useJsonMode = true
  ): Promise<string> => {
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
      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        const e = new Error(`LLM HTTP ${res.status} (${provider}/${model}): ${errText.slice(0, 200)}`);
        (e as Error & { status?: number }).status = res.status;
        throw e;
      }
      const json = (await res.json()) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
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

    const payload: Record<string, unknown> = {
      model,
      temperature: 0.2,
      messages: [
        { role: 'system', content: `${opts.systemPrompt}\nReturn ONLY valid JSON.` },
        { role: 'user', content: userContent },
      ],
    };
    if (useJsonMode) {
      payload.response_format = { type: 'json_object' };
    }

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      const e = new Error(`LLM HTTP ${res.status} (${provider}/${model}): ${errText.slice(0, 200)}`);
      (e as Error & { status?: number }).status = res.status;
      throw e;
    }
    const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    return json?.choices?.[0]?.message?.content ?? '{}';
  };

  const tryModels = async (models: string[]) => {
    let lastErr: unknown;
    for (const model of models) {
      try {
        let raw: string;
        try {
          raw = await invokeWithModel(model, undefined, true);
        } catch (err) {
          if ((err as { status?: number }).status === 400) {
            raw = await invokeWithModel(model, undefined, false);
          } else {
            throw err;
          }
        }
        try {
          const parsed = opts.schema.parse(JSON.parse(extractJsonString(raw)));
          return { data: parsed, model };
        } catch (zodErr) {
          raw = await invokeWithModel(model, String(zodErr), false);
          const parsed = opts.schema.parse(JSON.parse(extractJsonString(raw)));
          return { data: parsed, model };
        }
      } catch (err) {
        lastErr = err;
        const st = (err as { status?: number }).status;
        const msg = String(err);
        if (st === 404 || st === 429 || msg.includes('decommissioned') || msg.includes('model_not_found')) continue;
        throw err;
      }
    }
    throw lastErr;
  };

  try {
    return await tryModels(candidateModels);
  } catch (err) {
    const st = (err as { status?: number }).status;
    if (provider === 'groq' && !envModel && (st === 404 || st === 400)) {
      const discovered = await fetchGroqModels(apiKey, Boolean(opts.useVision));
      const fresh = discovered.filter((m) => !candidateModels.includes(m));
      if (fresh.length > 0) {
        return await tryModels(fresh);
      }
      if (opts.useVision) {
        const visionErr = new Error(
          'Photo vision is not enabled on this Groq API key (only text models like openai/gpt-oss-120b are active). Use food search or switch LLM_API_KEY to a Gemini key for photo scanning.'
        );
        (visionErr as Error & { status?: number }).status = 422;
        throw visionErr;
      }
    }
    throw err;
  }
}

export function handleLlmError(res: VercelResponseLike, err: unknown) {
  const code = (err as { code?: string })?.code;
  const status = (err as { status?: number })?.status;
  if (code === 'not_configured') {
    return res.status(503).json({ code: 'not_configured', error: 'LLM_API_KEY is not configured.' });
  }
  if (status === 422) {
    return res.status(422).json({ error: (err as Error).message });
  }
  return res.status(500).json({ error: String(err) });
}