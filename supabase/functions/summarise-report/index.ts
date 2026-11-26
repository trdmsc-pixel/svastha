import { z } from 'https://deno.land/x/zod@v3.23.8/mod.ts';
import { callStructuredLLM } from '../_shared/llm.ts';
import { getAuthClient } from '../_shared/supabaseClient.ts';

const SummarySchema = z.object({
  snapshot_sentence: z.string(),
  risk_groups: z.array(
    z.object({
      system: z.string(),
      markers: z.array(z.string()),
      explanation: z.string(),
      what_helps: z.array(z.string()),
    })
  ),
  patterns: z.array(
    z.object({
      markers: z.array(z.string()),
      insight: z.string(),
      rule_id: z.string(),
    })
  ),
  top_actions: z.array(z.object({ title: z.string(), why: z.string(), plan_area: z.string() })),
  doctor_points: z.array(z.string()),
  followup_tests_from_lab_notes: z.array(z.string()),
});

const SYSTEM_PROMPT = `You write calm, plain-English (12-year-old reading level) wellness summaries of pre-computed lab statuses.
Non-negotiable rules:
- NEVER diagnose ("you have X") and NEVER prescribe or adjust medications.
- Use "may suggest", "worth discussing with your doctor".
- Keep each group explanation <= 60 words and cite the exact numeric values and reference ranges provided.`;

Deno.serve(async (req) => {
  const supabase = getAuthClient(req);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const payload = await req.json();
  const { data, model } = await callStructuredLLM({
    systemPrompt: SYSTEM_PROMPT,
    userText: JSON.stringify(payload),
    schema: SummarySchema,
  });

  return Response.json({ summary: data, model, prompt_version: 'summarise-report-v1' });
});
