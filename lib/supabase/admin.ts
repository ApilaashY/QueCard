import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseServiceRoleKey = process.env.SUPABASE_ANON_KEY || "";

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.warn(
    "Supabase Admin client initialized with missing environment variables.",
  );
}

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export async function tokenToUser(token: string | null | undefined) {
  if (!token) {
    return null;
  }
  const { data } = await supabaseAdmin.auth.getUser(token.split(" ")[1]);

  if (!data || !data.user) {
    return null;
  }

  return data.user.id;
}
