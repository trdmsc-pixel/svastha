import { getAuthClient, getServiceClient } from '../_shared/supabaseClient.ts';

// DPDP Act 2023 full account & data deletion (Section 2.2.5 & 6.6)
Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });

  const authClient = getAuthClient(req);
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { confirmation } = await req.json();
  if (confirmation !== 'DELETE') {
    return Response.json({ error: 'Must confirm with DELETE' }, { status: 400 });
  }

  const service = getServiceClient();
  const { error } = await service.auth.admin.deleteUser(user.id);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ deleted: true, user_id: user.id });
});
