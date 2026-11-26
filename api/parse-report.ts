import { callStructuredLLM, handleLlmError, VercelRequestLike, VercelResponseLike } from './_llm';
import { attachmentsFrom, PARSE_REPORT_PROMPT, schemas } from './_shared';

export default async function handler(req: VercelRequestLike, res: VercelResponseLike) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
  // Zero-storage: report pages/PDF are processed in memory and never logged or stored.
  let body = (req.body ?? {}) as { extractedText?: string; pagesBase64?: Array<{ mimeType: string; data: string }>; pdfBase64?: string };
  try {
    const files = attachmentsFrom(body);
    const text = (body.extractedText ?? '').trim();
    if (files.length === 0 && text.length < 50) return res.status(400).json({ error: 'No report pages or PDF received.' });
    const { data, model } = await callStructuredLLM({
      systemPrompt: PARSE_REPORT_PROMPT,
      userText: files.length
        ? 'Extract all lab test panels, values, units, reference ranges and short lab notes from the attached report.'
        : `Extract all lab test panels, values, units, reference ranges and short lab notes from this report text:\n\n${text.slice(0, 60000)}`,
      imagesBase64: files.length ? files : undefined,
      schema: schemas.parseReport,
      useVision: files.length > 0,
    });
    return res.status(200).json({ parsed: data, model, prompt_version: 'parse-report-v2' });
  } catch (err) {
    return handleLlmError(res, err);
  } finally {
    body = {};
  }
}
