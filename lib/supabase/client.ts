import { createClient } from "@supabase/supabase-js";

// Supabase forces a valid URL format for `supabaseUrl` and non-empty `supabaseKey`.
const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://dummy.supabase.co";
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "dummy_key";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
