import { z } from 'https://deno.land/x/zod@v3.23.8/mod.ts';
import { callStructuredLLM } from '../_shared/llm.ts';
import { checkRateLimit, getAuthClient } from '../_shared/supabaseClient.ts';

const MAX_BYTES = 15 * 1024 * 1024;

const ParseReportSchema = z.object({
  lab: z
    .object({
      name: z.string().optional().default('Lab Report'),
      collected_at: z.string().nullable().optional().default(null),
      reported_at: z.string().nullable().optional().default(null),
      report_status: z.enum(['Final', 'Provisional']).nullable().optional().default(null),
    })
    .optional()
    .default({ name: 'Lab Report', collected_at: null, reported_at: null, report_status: null }),
  patient: z
    .object({
      age: z.number().nullable().optional().default(null),
      sex: z.enum(['M', 'F']).nullable().optional().default(null),
    })
    .optional()
    .default({ age: null, sex: null }),
  panels: z
    .array(
      z.object({
        panel_name: z.string().optional().default('General Panel'),
        tests: z
          .array(
            z.object({
              raw_name: z.string(),
              method: z.string().nullable().optional().default(null),
              value: z.number().nullable().optional().default(null),
              value_text: z.string().optional().default(''),
              unit: z.string().optional().default(''),
              ref_raw: z.string().optional().default(''),
              lab_flag: z.enum(['H', 'L']).nullable().optional().default(null),
              confidence: z.number().optional().default(0.9),
            })
          )
          .default([]),
      })
    )
    .default([]),
  lab_notes: z.array(z.string()).optional().default([]),
  extraction_warnings: z.array(z.string()).optional().default([]),
});

const SYSTEM_PROMPT = `You extract structured lab test results from Indian & international medical lab reports (PDFs or page photos).
Rules:
- Ignore page headers/footers, barcodes, pathologist signatures, legal boilerplate, and treatment-goal guidance tables.
- Do NOT return patient name or lab ID number (data minimisation).
- Extract exact numeric value, unit, and raw reference range string (e.g., "<50", ">40", "70 - 100").
- Return ONLY valid JSON matching the schema.`;

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

  let body: {
    extractedText?: string;
    pdfBase64?: string;
    pagesBase64?: Array<{ mimeType: string; data: string }>;
  } | null = await req.json();

  try {
    const attachments: Array<{ mimeType: string; data: string }> = [];
    if (body?.pdfBase64) {
      attachments.push({ mimeType: 'application/pdf', data: body.pdfBase64 });
    }
    if (Array.isArray(body?.pagesBase64)) {
      for (const p of body.pagesBase64) {
        if (p?.data) attachments.push({ mimeType: p.mimeType || 'image/jpeg', data: p.data });
      }
    }

    const hasText = Boolean(body?.extractedText && body.extractedText.trim().length >= 200);
    if (!hasText && attachments.length === 0) {
      body = null;
      return Response.json({ error: 'No PDF, page images, or report text received.' }, { status: 400 });
    }

    const useVision = attachments.length > 0;
    const { data, model } = await callStructuredLLM({
      systemPrompt: SYSTEM_PROMPT,
      userText: hasText
        ? `Extract all lab test panels, values, reference ranges, and short interpretive lab notes from this report text:\n\n${body?.extractedText}`
        : 'Extract all lab test panels, numeric test values, units, reference ranges, and short interpretive lab notes from the attached lab report PDF/images.',
      imagesBase64: useVision ? attachments : undefined,
      schema: ParseReportSchema,
      useVision,
      fast: false,
      maxOutputTokens: 4096,
    });

    body = null;
    return Response.json({ parsed: data, model, prompt_version: 'parse-report-v2' });
  } catch (err) {
    body = null;
    return Response.json({ error: `Extraction failed: ${String(err)}` }, { status: 500 });
  }
});
