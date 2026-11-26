import { z } from 'zod';
import { callStructuredLLM, handleLlmError, VercelRequestLike, VercelResponseLike } from './_llm';

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
- Return ONLY valid JSON matching this exact structure:
{
  "lab": { "name": "Dr Lal PathLabs", "collected_at": "2026-11-26T08:00:00Z", "reported_at": "2026-11-26T17:00:00Z", "report_status": "Final" },
  "patient": { "age": 32, "sex": "M" },
  "panels": [
    {
      "panel_name": "LIVER FUNCTION TEST",
      "tests": [
        { "raw_name": "ALT (SGPT)", "method": "IFCC", "value": 99.8, "value_text": "99.8", "unit": "U/L", "ref_raw": "<50", "lab_flag": "H", "confidence": 0.98 }
      ]
    }
  ],
  "lab_notes": ["Short interpretive note from the report"],
  "extraction_warnings": []
}`;

export default async function handler(req: VercelRequestLike, res: VercelResponseLike) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  let body = (req.body ?? {}) as {
    extractedText?: string;
    pdfBase64?: string;
    pagesBase64?: Array<{ mimeType: string; data: string }>;
  };

  try {
    const attachments: Array<{ mimeType: string; data: string }> = [];
    if (body.pdfBase64) {
      attachments.push({ mimeType: 'application/pdf', data: body.pdfBase64 });
    }
    if (Array.isArray(body.pagesBase64)) {
      for (const p of body.pagesBase64) {
        if (p?.data) attachments.push({ mimeType: p.mimeType || 'image/jpeg', data: p.data });
      }
    }

    const hasText = Boolean(body.extractedText && body.extractedText.trim().length >= 200);
    if (!hasText && attachments.length === 0) {
      return res.status(400).json({ error: 'No PDF, page images, or report text received.' });
    }

    const useVision = attachments.length > 0;
    const { data, model } = await callStructuredLLM({
      systemPrompt: SYSTEM_PROMPT,
      userText: hasText
        ? `Extract all lab test panels, values, reference ranges, and short interpretive lab notes from this report text:\n\n${body.extractedText}`
        : 'Extract all lab test panels, numeric test values, units, reference ranges, and short interpretive lab notes from the attached lab report PDF/images.',
      imagesBase64: useVision ? attachments : undefined,
      schema: ParseReportSchema,
      useVision,
    });
    body = {};
    return res.status(200).json({ parsed: data, model, prompt_version: 'parse-report-v2' });
  } catch (err) {
    body = {};
    return handleLlmError(res, err);
  }
}