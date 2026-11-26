import { z } from 'zod';
import { callStructuredLLM, handleLlmError, VercelRequestLike, VercelResponseLike } from './_llm';

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

export default async function handler(req: VercelRequestLike, res: VercelResponseLike) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  let body = (req.body ?? {}) as { extractedText?: string; pagesBase64?: Array<{ mimeType: string; data: string }> };
  try {
    const useVision = !body.extractedText || body.extractedText.trim().length < 200;
    const { data, model } = await callStructuredLLM({
      systemPrompt: SYSTEM_PROMPT,
      userText: useVision
        ? 'Extract all lab test panels, values, reference ranges, and short interpretive lab notes from the attached report pages.'
        : `Extract all lab test panels, values, reference ranges, and short interpretive lab notes from this report text:\n\n${body.extractedText}`,
      imagesBase64: useVision ? body.pagesBase64 : undefined,
      schema: ParseReportSchema,
      useVision,
    });
    body = {};
    return res.status(200).json({ parsed: data, model, prompt_version: 'parse-report-v1' });
  } catch (err) {
    body = {};
    return handleLlmError(res, err);
  }
}