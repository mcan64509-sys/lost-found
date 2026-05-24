import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function getAuthenticatedUser(req: NextRequest) {
  const auth = req.headers.get("authorization") ?? req.headers.get("Authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7).trim() : null;
  if (!token) return null;

  // User-context client ile validate et (Supabase'in önerdiği sunucu tarafı pattern)
  const userClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    }
  );

  const { data: { user }, error } = await userClient.auth.getUser();
  if (error || !user) return null;

  return {
    id: user.id,
    email: user.email?.toLowerCase().trim() ?? null,
  };
}
