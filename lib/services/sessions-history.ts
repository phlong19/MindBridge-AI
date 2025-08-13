"use server";

import { createSupabaseClient } from "../supabase";
import { error as errorMessage } from "@/constants/message";

//#region save session history
export async function saveSessionHistory(
  companionId: string,
  isPublish: boolean = false,
  messages: string,
  userId: string,
  sessionId: number,
) {
  const supabase = createSupabaseClient();

  const { data, error } = await supabase.from("session-history").upsert(
    {
      id: sessionId,
      companion_id: companionId,
      messages,
      user_id: userId,
      isPublish,
    },
    { onConflict: "id" },
  );

  if (error) {
    console.log(error.message);
    return {
      error: errorMessage.sessionHistorySaveFail,
      errorDescription: error.message,
    };
  }

  return data;
}
//#endregion

//#region get session history
export async function getSessionHistories(limit: number) {
  const supabase = createSupabaseClient();

  const { data, error } = await supabase
    .from("session-history")
    .select("companion: companion_id (*)")
    .eq("isPublish", true)
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
    .select("id, messages")
    .eq("user_id", userId!)
    .eq("companion_id", companionId)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.log(error.message);
    return {
      error: errorMessage.fetchFail,
      errorDescription: error.message,
    };
  }

  return { data };
}
//#endregion
