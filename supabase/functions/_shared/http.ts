// CORS + JSON helpers for Edge Functions. Without CORS the web app's calls fail at preflight.
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

export function serveJson(handler: (req: Request) => Promise<Response>) {
  Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
    if (req.method !== 'POST') return json({ error: 'Method Not Allowed' }, 405);
    try {
      return await handler(req);
    } catch (err) {
      const e = err as { code?: string; status?: number; name?: string; message?: string };
      if (e?.code === 'not_configured') return json({ code: 'not_configured', error: 'GEMINI_API_KEY is not set in Supabase secrets.' }, 503);
      // Never log request bodies — status/model metadata only.
      console.error('[svastha-ai]', e?.status ?? '', String(e?.message ?? err).slice(0, 160));
      if (e?.status === 429) return json({ error: 'The AI service is busy. Please try again in a minute.' }, 429);
      if (e?.name === 'ZodError' || e?.name === 'SyntaxError') return json({ error: 'The AI returned an unreadable answer. Please try again.' }, 502);
      return json({ error: 'The AI service had a problem. Please try again.' }, 502);
    }
  });
}
