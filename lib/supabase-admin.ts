import "server-only";

import { createClient } from "@supabase/supabase-js";
import { Database } from "@/types/supabase";

// Only for explicitly authorized server-side maintenance operations.
// Never import this module into a Client Component or expose the key publicly.
export function createSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error("Supabase admin configuration is missing.");
  }

  return createClient<Database>(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
