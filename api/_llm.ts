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

const GEMINI_CANDIDATES = ['gemini-3.8-flash', 'gemini-3.5-flash', 'gemini-2.5-flash', 'gemini-2.5-flash-lite'];

async function fetchGeminiFlashModels(apiKey: string): Promise<string[]> {
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    if (!res.ok) return [];
    const json = (await res.json()) as {
      models?: Array<{ name: string; supportedGenerationMethods?: string[] }>;
    };
    return (json.models ?? [])
      .filter((m) => m.supportedGenerationMethods?.includes('generateContent') && /flash/i.test(m.name))
      .map((m) => m.name.replace(/^models\//, ''))
      .sort()
      .reverse();
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
  const apiKey = (process.env.GEMINI_API_KEY || process.env.LLM_API_KEY || '').trim();
  if (!apiKey) {
    const err = new Error('GEMINI_API_KEY is not configured on the server.');
    (err as Error & { code?: string }).code = 'not_configured';
    throw err;
  }

  const envModel = opts.useVision ? process.env.LLM_VISION_MODEL : process.env.LLM_TEXT_MODEL;
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
      const errText = await res.text().catch(() => '');
      const e = new Error(`Gemini HTTP ${res.status} (${model}): ${errText.slice(0, 220)}`);
      (e as Error & { status?: number }).status = res.status;
      throw e;
    }
    const json = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    return json?.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}';
  };

  const tryModels = async (models: string[]) => {
    let lastErr: unknown;
    for (const model of models) {
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
        if (st === 404 || st === 429 || st === 503) continue;
        throw err;
      }
    }
    throw lastErr;
  };

  try {
    return await tryModels(candidateModels);
  } catch (err) {
    const st = (err as { status?: number }).status;
    if (!envModel && (st === 404 || st === 429 || st === 503)) {
      const discovered = await fetchGeminiFlashModels(apiKey);
      const fresh = discovered.filter((m) => !candidateModels.includes(m));
      if (fresh.length > 0) return await tryModels(fresh);
    }
    throw err;
  }
}

export function handleLlmError(res: VercelResponseLike, err: unknown) {
  const code = (err as { code?: string })?.code;
  if (code === 'not_configured') {
    return res.status(503).json({ code: 'not_configured', error: 'GEMINI_API_KEY is not configured.' });
  }
  return res.status(500).json({ error: String(err) });
}