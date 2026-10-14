"use server";

import { createSupabaseClient } from "../supabase";
import { error as errorMessage } from "@/constants/message";
import { auth } from "@clerk/nextjs/server";

//#region save session history
export async function saveSessionHistory(
  companionId: string,
  isPublish: boolean = false,
  messages: string,
  userId: string,
  durationSeconds: number,
  endedByUser: boolean,
  vapiCallId: string | null,
) {
  const { userId: authenticatedUserId } = await auth();
  if (!authenticatedUserId || authenticatedUserId !== userId) {
    return { error: errorMessage.notAuthorized };
  }

  const supabase = createSupabaseClient();

  const { data, error } = await supabase
    .from("session-history")
    .insert({
      companion_id: companionId,
      messages,
      user_id: userId,
      isPublish,
      duration_seconds: Math.max(0, Math.floor(durationSeconds)),
      ended_by_user: endedByUser,
      vapi_call_id: vapiCallId,
      interaction_mode: "voice",
    })
    .select("id")
    .single();

  if (error) {
    console.log(error.message);
    return {
      error: errorMessage.sessionHistorySaveFail,
      errorDescription: error.message,
    };
  }

  return { data };
}
//#endregion

//#region get session history
export async function getSessionHistories(limit: number) {
  const supabase = createSupabaseClient();

  // This RPC returns only public companion fields. Session transcripts stay
  // private under RLS, including for anonymously viewed homepages.
  const { data, error } = await supabase.rpc(
    "get_recent_published_session_companions",
    { max_results: limit },
  );

  if (error) {
    console.log(error.message);
    return {
      error: errorMessage.fetchFail,
      errorDescription: error.message,
    };
  }

  return data;
}
//#endregion

//#region get user sessions
export async function getUserSessionHistories(
  userId: string,
  limit: number = 10,
) {
  const supabase = createSupabaseClient();

  const { data, error } = await supabase
    .from("session-history")
    .select("companion: companion_id (*)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.log(error.message);
    return {
      error: errorMessage.fetchFail,
      errorDescription: error.message,
    };
  }

  return data.map(({ companion }) => companion);
}
//#endregion

//#region get last session
export async function getLastUserSession(companionId: string, userId: string) {
  const supabase = createSupabaseClient();

  const { data, error: error } = await supabase
    .from("session-history")
    .select(
      "id, user_id, messages, learning_recap, duration_seconds, ended_by_user",
    )
    .eq("user_id", userId!)
    .eq("companion_id", companionId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.log(error.message);
    return {
      error: errorMessage.fetchFail,
      errorDescription: error.message,
    };
  }

  if (data?.user_id !== userId) {
    return {};
  }

  return { data };
}
//#endregion
