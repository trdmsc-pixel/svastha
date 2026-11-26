import { z } from 'https://deno.land/x/zod@v3.23.8/mod.ts';
import { callStructuredLLM } from '../_shared/llm.ts';
import { checkRateLimit, getAuthClient } from '../_shared/supabaseClient.ts';
import { json, serveJson } from '../_shared/http.ts';
import { PARSE_REPORT_PROMPT } from '../_shared/prompts.ts';
import { attachmentsFrom, buildSchemas } from '../_shared/schemas.ts';

const schemas = buildSchemas(z);
const MAX_BYTES = 15 * 1024 * 1024;

serveJson(async (req) => {
  if (Number(req.headers.get('content-length') ?? '0') > MAX_BYTES) return json({ error: 'Payload exceeds 15 MB limit' }, 413);
  const { data: { user } } = await getAuthClient(req).auth.getUser();
  if (!user) return json({ error: 'Unauthorized' }, 401);
  if (!(await checkRateLimit(user.id, 'parse-report', 10))) return json({ error: 'Daily limit (10 reports/day) reached' }, 429);
  // Read ephemerally — NEVER log the body; PDF/page buffers discarded after inference.
  let body: Record<string, unknown> | null = await req.json();
  try {
    const files = attachmentsFrom(body ?? {});
    const text = String(body?.extractedText ?? '').trim();
    if (files.length === 0 && text.length < 50) return json({ error: 'No report pages or PDF received.' }, 400);
    const { data, model } = await callStructuredLLM({
      systemPrompt: PARSE_REPORT_PROMPT,
      userText: files.length ? 'Extract all lab test panels, values, units, reference ranges and short lab notes from the attached report.' : `Extract from this report text:\n\n${text.slice(0, 60000)}`,
      imagesBase64: files.length ? files : undefined,
      schema: schemas.parseReport,
      useVision: files.length > 0,
    });
    return json({ parsed: data, model, prompt_version: 'parse-report-v2' });
  } finally {
    body = null;
  }
});
