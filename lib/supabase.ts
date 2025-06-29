import { error } from "@/constants/message";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";

export const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const createSupabaseClient = () => {
  if (!url || !key) {
    throw new Error(error.missingEnvVariables);
  }
  return createClient(url, key, {
    async accessToken() {
      return (await auth()).getToken();
    },
  });
};
