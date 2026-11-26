import { z } from 'https://deno.land/x/zod@v3.23.8/mod.ts';
import { callStructuredLLM } from '../_shared/llm.ts';
import { checkRateLimit, getAuthClient } from '../_shared/supabaseClient.ts';

const MAX_BYTES = 15 * 1024 * 1024; // 15 MB cap (Section 10)

const ParseReportSchema = z.object({
  lab: z.object({
    name: z.string(),
    collected_at: z.string().nullable(),
    reported_at: z.string().nullable(),
    report_status: z.enum(['Final', 'Provisional']).nullable(),
  }),
  patient: z.object({
    age: z.number().nullable(),
    sex: z.enum(['M', 'F']).nullable(),
  }),
  panels: z.array(
    z.object({
      panel_name: z.string(),
      tests: z.array(
        z.object({
          raw_name: z.string(),
          method: z.string().nullable().optional(),
          value: z.number().nullable(),
          value_text: z.string(),
          unit: z.string(),
          ref_raw: z.string(),
          lab_flag: z.enum(['H', 'L']).nullable().optional(),
          confidence: z.number(),
        })
      ),
    })
  ),
  lab_notes: z.array(z.string()),
  extraction_warnings: z.array(z.string()),
});

const SYSTEM_PROMPT = `You extract structured lab test results from Indian medical lab reports (PDF text or images).
Rules:
- Ignore page headers/footers, barcodes, pathologist signatures, legal boilerplate, and treatment-goal guidance tables.
- Do NOT return patient name or lab ID number (data minimisation).
- Extract exact numeric value, unit, and raw reference range string (e.g., "<50", ">40", "70 - 100").
- Return valid JSON matching the schema.`;

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });

  const contentLength = Number(req.headers.get('content-length') ?? '0');
  if (contentLength > MAX_BYTES) {
    return Response.json({ error: 'Payload exceeds 15 MB limit' }, { status: 413 });
  }

  const supabase = getAuthClient(req);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const allowed = await checkRateLimit(user.id, 'parse-report', 10);
  if (!allowed) return Response.json({ error: 'Daily limit (10 reports/day) reached' }, { status: 429 });

  // Read body ephemerally — NEVER log request body
  let body: { extractedText?: string; pagesBase64?: Array<{ mimeType: string; data: string }> } | null =
    await req.json();

  try {
    const useVision = !body?.extractedText || body.extractedText.trim().length < 200;
    const { data, model } = await callStructuredLLM({
      systemPrompt: SYSTEM_PROMPT,
      userText: useVision
        ? 'Extract all lab test panels, values, reference ranges, and short interpretive lab notes from the attached report pages.'
        : `Extract all lab test panels, values, reference ranges, and short interpretive lab notes from this report text:\n\n${body?.extractedText}`,
      imagesBase64: useVision ? body?.pagesBase64 : undefined,
      schema: ParseReportSchema,
      useVision,
    });

    // Discard buffer immediately (Section 2.2.2)
    body = null;
    return Response.json({ parsed: data, model, prompt_version: 'parse-report-v1' });
  } catch (err) {
    body = null;
    return Response.json({ error: `Extraction failed: ${String(err)}` }, { status: 500 });
  }
});
