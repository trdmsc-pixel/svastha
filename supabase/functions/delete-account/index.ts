import { getAuthClient, getServiceClient } from '../_shared/supabaseClient.ts';
import { json, serveJson } from '../_shared/http.ts';

// DPDP Act 2023 full account & data deletion. Every user table has ON DELETE CASCADE from
// auth.users, so deleting the auth user removes all of their rows.
serveJson(async (req) => {
  const { data: { user } } = await getAuthClient(req).auth.getUser();
  if (!user) return json({ error: 'Unauthorized' }, 401);
  const { confirmation } = await req.json();
  if (confirmation !== 'DELETE') return json({ error: 'Must confirm with DELETE' }, 400);
  const { error } = await getServiceClient().auth.admin.deleteUser(user.id);
  if (error) return json({ error: error.message }, 500);
  return json({ deleted: true });
});
