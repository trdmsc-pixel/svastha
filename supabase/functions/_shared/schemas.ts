// Shared, tolerant response schemas for BOTH runtimes. Each runtime passes in its own `zod`
// (Deno URL import vs npm package), so this file has no imports.
// Tolerant = optional fields get safe defaults, so one missing key from the model doesn't fail
// a whole report import. Final validation and all medical/nutrition logic happens in app code.

// deno-lint-ignore no-explicit-any
type Z = any;

export function buildSchemas(z: Z) {
  const num = z.preprocess((v: unknown) => (typeof v === 'string' && v.trim() !== '' && !isNaN(Number(v)) ? Number(v) : v), z.number());
  const nullableNum = z.preprocess(
    (v: unknown) => (v === '' || v === undefined ? null : typeof v === 'string' && !isNaN(Number(v)) ? Number(v) : v),
    z.number().nullable()
  );

  const per100 = z
    .object({
      kcal: num.optional().default(0),
      protein_g: num.optional().default(0),
      carbs_g: num.optional().default(0),
      fat_g: num.optional().default(0),
      fibre_g: num.optional().default(0),
    })
    .nullable()
    .optional()
    .default(null);

  const analyseMeal = z.object({
    items: z
      .array(
        z.object({
          name: z.string(),
          match_hint: z.string().optional().default(''),
          portion: z
            .object({
              amount: num.optional().default(1),
              unit: z.string().optional().default('serving'),
              grams_est: num.optional().default(150),
            })
            .optional()
            .default({ amount: 1, unit: 'serving', grams_est: 150 }),
          confidence: num.optional().default(0.7),
          estimated_per_100g: per100,
        })
      )
      .optional()
      .default([]),
    plate_type: z.string().optional().default('plate'),
    notes: z.string().optional().default(''),
    is_food: z.boolean().optional().default(true),
  });

  const parseReport = z.object({
    lab: z
      .object({
        name: z.string().optional().default('Imported lab report'),
        collected_at: z.string().nullable().optional().default(null),
        reported_at: z.string().nullable().optional().default(null),
      })
      .passthrough()
      .optional()
      .default({ name: 'Imported lab report', collected_at: null, reported_at: null }),
    panels: z
      .array(
        z.object({
          panel_name: z.string().optional().default('Results'),
          tests: z
            .array(
              z.object({
                raw_name: z.string(),
                method: z.string().nullable().optional(),
                value: nullableNum.optional().default(null),
                value_text: z.preprocess((v: unknown) => (v === null || v === undefined ? '' : String(v)), z.string()),
                unit: z.preprocess((v: unknown) => (v === null || v === undefined ? '' : String(v)), z.string()),
                ref_raw: z.preprocess((v: unknown) => (v === null || v === undefined ? '' : String(v)), z.string()),
                lab_flag: z.preprocess((v: unknown) => (v === 'H' || v === 'L' ? v : null), z.enum(['H', 'L']).nullable()).optional(),
                confidence: num.optional().default(0.8),
              })
            )
            .optional()
            .default([]),
        })
      )
      .optional()
      .default([]),
    lab_notes: z.array(z.string()).optional().default([]),
    extraction_warnings: z.array(z.string()).optional().default([]),
  });

  const suggestRecipes = z.object({
    recipes: z
      .array(
        z
          .object({
            name: z.string(),
            slot: z.string().optional().default('lunch'),
            cuisine: z.string().optional().default('Indian'),
            minutes: num.optional().default(20),
            difficulty: num.optional().default(2),
            focus: z.array(z.string()).optional().default([]),
            ingredients: z.array(z.object({ name: z.string(), grams: num })).optional().default([]),
            steps: z.array(z.string()).optional().default([]),
            why: z.string().optional().default(''),
          })
          .passthrough()
      )
      .optional()
      .default([]),
  });

  const reportChat = z.object({
    reply: z.string(),
    cited_markers: z.array(z.string()).optional().default([]),
  });

  return { analyseMeal, parseReport, suggestRecipes, reportChat };
}

/** Builds Gemini inline attachments from a request body (photos and/or a PDF). */
export function attachmentsFrom(body: {
  imageBase64?: string;
  mimeType?: string;
  pagesBase64?: Array<{ mimeType: string; data: string }>;
  pdfBase64?: string;
}): Array<{ mimeType: string; data: string }> {
  const out: Array<{ mimeType: string; data: string }> = [];
  if (body.imageBase64) out.push({ mimeType: body.mimeType || 'image/jpeg', data: body.imageBase64 });
  for (const p of body.pagesBase64 ?? []) if (p?.data) out.push({ mimeType: p.mimeType || 'image/jpeg', data: p.data });
  if (body.pdfBase64) out.push({ mimeType: 'application/pdf', data: body.pdfBase64 });
  return out.slice(0, 8);
}

/** Strips anything that could identify the user before sending lab context to the model. */
export function minimiseChatContext(ctx: unknown): unknown {
  const json = JSON.stringify(ctx ?? {});
  return JSON.parse(json.replace(/"(full_name|email|phone|address|patient_name|dob)"\s*:\s*"[^"]*"/gi, '"$1":"[removed]"'));
}
