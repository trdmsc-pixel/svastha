import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.46.1';

export function getAuthClient(req: Request) {
  const url = Deno.env.get('SUPABASE_URL') ?? '';
  const anon = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
  const authHeader = req.headers.get('Authorization') ?? '';
  return createClient(url, anon, {
    global: { headers: { Authorization: authHeader } },
  });
}

export function getServiceClient() {
  const url = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  return createClient(url, serviceKey);
}

/**
 * Enforces per-user daily rate limits (Section 10):
 * analyse-meal: 60/day/user, parse-report: 10/day/user
 */
export async function checkRateLimit(userId: string, endpoint: string, dailyLimit: number): Promise<boolean> {
  const svc = getServiceClient();
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await svc
    .from('ai_rate_limits')
    .select('count')
    .eq('user_id', userId)
    .eq('endpoint', endpoint)
    .eq('day', today)
    .maybeSingle();

  const current = data?.count ?? 0;
  if (current >= dailyLimit) return false;

  await svc.from('ai_rate_limits').upsert({
    user_id: userId,
    endpoint,
    day: today,
    count: current + 1,
  });
  return true;
}
