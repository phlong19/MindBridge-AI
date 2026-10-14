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

  // A retry may follow a successful insert whose response was interrupted.
  // Reuse that call's saved row rather than creating another transcript.
  if (vapiCallId) {
    const { data: existing, error: lookupError } = await supabase
      .from("session-history")
      .select("id")
      .eq("user_id", authenticatedUserId)
      .eq("companion_id", companionId)
      .eq("vapi_call_id", vapiCallId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (lookupError) {
      return {
        error: errorMessage.sessionHistorySaveFail,
        errorDescription: lookupError.message,
      };
    }
    if (existing) return { data: existing };
  }

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
  const { userId: authenticatedUserId } = await auth();
  if (!authenticatedUserId || authenticatedUserId !== userId) {
    return { error: errorMessage.notAuthorized };
  }
  const supabase = createSupabaseClient();

  const { data, error: error } = await supabase
    .from("session-history")
    // Legacy history tables may not yet have the optional recap/text columns.
    // Select available fields so an empty table is still an ordinary result.
    .select("*")
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

  if (!data) return { data: null };
  if (data.user_id !== userId) return { error: errorMessage.notAuthorized };

  return {
    data: {
      ...data,
      interaction_mode: data.interaction_mode ?? "voice",
      learning_recap: data.learning_recap ?? null,
      ended_by_user: data.ended_by_user ?? false,
      duration_seconds: data.duration_seconds ?? null,
      vapi_call_id: data.vapi_call_id ?? null,
      vapi_chat_id: data.vapi_chat_id ?? null,
    },
  };
}
//#endregion

function isMissingOptionalHistoryColumn(
  error: { code: string; message: string } | null,
) {
  return Boolean(
    error &&
      (error.code === "42703" || error.code === "PGRST204") &&
      [
        "interaction_mode",
        "duration_seconds",
        "ended_by_user",
        "vapi_chat_id",
        "learning_recap",
      ].some((column) => error.message.includes(column)),
  );
}

export async function getCompanionSessions(companionId: string, page = 1) {
  const { userId } = await auth();
  if (!userId) return { error: errorMessage.notAuthenticated };
  if (!companionId || !Number.isSafeInteger(page) || page < 1)
    return { error: errorMessage.invalidRequest };
  const supabase = createSupabaseClient();
  let { data, error, count } = await supabase
    .from("session-history")
    .select(
      "id, created_at, interaction_mode, duration_seconds, ended_by_user, vapi_chat_id",
      { count: "exact" },
    )
    .eq("user_id", userId)
    .eq("companion_id", companionId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range((page - 1) * 20, page * 20 - 1);
  if (isMissingOptionalHistoryColumn(error)) {
    // Existing voice-only tables still support private history and empty states.
    const legacy = await supabase
      .from("session-history")
      .select("id, created_at", { count: "exact" })
      .eq("user_id", userId)
      .eq("companion_id", companionId)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range((page - 1) * 20, page * 20 - 1);
    error = legacy.error;
    count = legacy.count;
    data =
      legacy.data?.map((row) => ({
        ...row,
        interaction_mode: "voice",
        duration_seconds: null,
        ended_by_user: false,
        vapi_chat_id: null,
      })) ?? null;
  }
  if (error)
    return { error: errorMessage.fetchFail, errorDescription: error.message };
  return {
    data: (data ?? []).map(({ vapi_chat_id, ...session }) => ({
      ...session,
      canResume:
        session.interaction_mode === "text" &&
        !session.ended_by_user &&
        Boolean(vapi_chat_id),
    })),
    count: count ?? 0,
  };
}

export async function getCompanionSession(
  companionId: string,
  sessionId: number,
) {
  const { userId } = await auth();
  if (!userId) return { error: errorMessage.notAuthenticated };
  if (!companionId || !Number.isSafeInteger(sessionId) || sessionId < 1)
    return { error: errorMessage.invalidRequest };
  const supabase = createSupabaseClient();
  let { data, error } = await supabase
    .from("session-history")
    .select(
      "id, created_at, interaction_mode, ended_by_user, vapi_chat_id, messages, learning_recap",
    )
    .eq("user_id", userId)
    .eq("companion_id", companionId)
    .eq("id", sessionId)
    .maybeSingle();
  if (isMissingOptionalHistoryColumn(error)) {
    const legacy = await supabase
      .from("session-history")
      .select("id, created_at, messages")
      .eq("user_id", userId)
      .eq("companion_id", companionId)
      .eq("id", sessionId)
      .maybeSingle();
    error = legacy.error;
    data = legacy.data
      ? {
          ...legacy.data,
          interaction_mode: "voice",
          ended_by_user: false,
          vapi_chat_id: null,
          learning_recap: null,
        }
      : null;
  }
  if (error)
    return { error: errorMessage.fetchFail, errorDescription: error.message };
  if (!data) return { error: errorMessage.notAuthorized };
  const { vapi_chat_id, ...session } = data;
  return {
    data: {
      ...session,
      canResume:
        session.interaction_mode === "text" &&
        !session.ended_by_user &&
        Boolean(vapi_chat_id),
    },
  };
}
