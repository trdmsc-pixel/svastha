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
  'llama-3.1-8b-instant',
  'openai/gpt-oss-120b',
  'llama-3.3-70b-versatile',
  'meta-llama/llama-4-scout-17b-16e-instruct',
];

const GROQ_VISION_CANDIDATES = [
  'meta-llama/llama-4-scout-17b-16e-instruct',
  'meta-llama/llama-4-maverick-17b-128e-instruct',
];

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
  const candidateModels = envModel
    ? [envModel]
    : provider === 'groq'
      ? opts.useVision
        ? GROQ_VISION_CANDIDATES
        : GROQ_TEXT_CANDIDATES
      : provider === 'gemini'
        ? ['gemini-2.5-flash']
        : ['gpt-4o-mini'];

  const invokeWithModel = async (model: string, retryHint?: string): Promise<string> => {
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
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      const e = new Error(`LLM HTTP ${res.status} (${provider}/${model}): ${errText.slice(0, 200)}`);
      (e as Error & { status?: number }).status = res.status;
      throw e;
    }
    const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    return json?.choices?.[0]?.message?.content ?? '{}';
  };

  let lastErr: unknown;
  for (const model of candidateModels) {
    try {
      let raw = await invokeWithModel(model);
      try {
        const parsed = opts.schema.parse(JSON.parse(raw));
        return { data: parsed, model };
      } catch (zodErr) {
        raw = await invokeWithModel(model, String(zodErr));
        const parsed = opts.schema.parse(JSON.parse(raw));
        return { data: parsed, model };
      }
    } catch (err) {
      lastErr = err;
      if ((err as { status?: number }).status === 404) continue;
      throw err;
    }
  }
  throw lastErr;
}

export function handleLlmError(res: VercelResponseLike, err: unknown) {
  const code = (err as { code?: string })?.code;
  if (code === 'not_configured') {
    return res.status(503).json({ code: 'not_configured', error: 'LLM_API_KEY is not configured.' });
  }
  return res.status(500).json({ error: String(err) });
}