import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders, json } from '../_shared/cors.ts';

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const authorization = request.headers.get('Authorization');
    if (!authorization) return json({ error: 'Missing authorization token' }, 401);
    const body = await request.json();
    if (body.confirmation !== 'DELETE') return json({ error: 'Confirmation must be DELETE' }, 400);

    const url = Deno.env.get('SUPABASE_URL')!;
    const anon = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const userClient = createClient(url, anon, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false },
    });
    const admin = createClient(url, serviceRole, { auth: { persistSession: false } });
    const { data, error } = await userClient.auth.getUser();
    if (error || !data.user) return json({ error: 'Invalid session' }, 401);
    const { error: deleteError } = await admin.auth.admin.deleteUser(data.user.id);
    if (deleteError) throw deleteError;
    return json({ message: 'Account and associated data were permanently deleted' });
  } catch (error) {
    console.error(error);
    return json({ error: error instanceof Error ? error.message : 'Account deletion failed' }, 500);
  }
});
