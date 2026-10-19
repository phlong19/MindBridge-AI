"use server";

import { auth } from "@clerk/nextjs/server";
import { error as errorMessage } from "@/constants/message";
import { createSupabaseClient } from "@/lib/supabase";

// Retained to close saved text sessions before continuing through voice.
export async function finishCompanionTextSession(
  sessionId: number,
): Promise<{ error: string; errorDescription?: string } | { data: true }> {
  const { userId } = await auth();
  if (!userId) return { error: errorMessage.notAuthenticated };
  if (!Number.isSafeInteger(sessionId) || sessionId <= 0) {
    return { error: errorMessage.invalidRequest };
  }

  const supabase = createSupabaseClient();
  const { data: session, error: readError } = await supabase
    .from("session-history")
    .select("id, created_at, interaction_mode")
    .eq("id", sessionId)
    .eq("user_id", userId)
    .maybeSingle();

  if (readError) {
    return {
      error: errorMessage.fetchFail,
      errorDescription: readError.message,
    };
  }
  if (!session || session.interaction_mode !== "text") {
    return { error: errorMessage.accessDenied };
  }

  const { error: updateError } = await supabase
    .from("session-history")
    .update({
      ended_by_user: true,
      duration_seconds: Math.max(
        0,
        Math.floor(
          (Date.now() - new Date(session.created_at).getTime()) / 1000,
        ),
      ),
    })
    .eq("id", session.id)
    .eq("user_id", userId);

  if (updateError) {
    return {
      error: errorMessage.insertFail,
      errorDescription: updateError.message,
    };
  }

  return { data: true };
}
