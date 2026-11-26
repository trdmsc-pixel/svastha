import { getServiceClient } from '../_shared/supabaseClient.ts';

// Scheduled via pg_cron every Sunday night (Section 8.5)
Deno.serve(async () => {
  const supabase = getServiceClient();
  const { data: activePlans, error } = await supabase
    .from('plans')
    .select('id, user_id, retest_date')
    .eq('status', 'active');

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({
    checked_plans: activePlans?.length ?? 0,
    note: 'Weekly adherence adaptation & Expo Push dispatch ready.',
  });
});
