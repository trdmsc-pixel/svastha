import { z } from 'https://deno.land/x/zod@v3.23.8/mod.ts';
import { callStructuredLLM } from '../_shared/llm.ts';
import { getAuthClient } from '../_shared/supabaseClient.ts';

const PlanSchema = z.object({
  sleep: z.object({
    bed: z.string(),
    wake: z.string(),
    caffeine_cutoff: z.string(),
    wind_down: z.array(z.string()),
  }),
  measures: z.array(z.string()),
  medication_talking_points: z.array(z.string()),
  supplements_to_discuss: z.array(
    z.object({
      name: z.string(),
      why_biomarker: z.string(),
      evidence: z.enum(['Strong', 'Moderate', 'Limited']),
      typical_form: z.string(),
      caution: z.string().optional(),
    })
  ),
});

const SYSTEM_PROMPT = `Generate a personalised wellness plan grounded in the user's pre-computed daily calorie/macro targets, retest date, diet type, and flagged biomarkers.
Rules:
- Never prescribe medications.
- If liver enzymes (ALT/AST/GGTP) are flagged, NEVER suggest high-dose niacin, kava, green-tea extract, or high-dose vitamin A.
- If pregnant=true, return an empty supplements_to_discuss array.`;

Deno.serve(async (req) => {
  const supabase = getAuthClient(req);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const payload = await req.json();
  const { data, model } = await callStructuredLLM({
    systemPrompt: SYSTEM_PROMPT,
    userText: JSON.stringify(payload),
    schema: PlanSchema,
  });

  return Response.json({ plan: data, model, prompt_version: 'generate-plan-v1' });
});
