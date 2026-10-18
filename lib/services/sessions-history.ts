"use server";

import { createSupabaseClient } from "../supabase";
import { error as errorMessage } from "@/constants/message";
import { auth } from "@clerk/nextjs/server";
import type { WorkspaceSession } from "@/components/custom/companion-workspace/session-messages";

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

  if (!Number.isFinite(durationSeconds)) {
    return { error: errorMessage.invalidRequest };
  }

  const supabase = createSupabaseClient();
  const row = {
    companion_id: companionId,
    messages,
    user_id: authenticatedUserId,
    isPublish,
    duration_seconds: Math.max(0, Math.floor(durationSeconds)),
    ended_by_user: endedByUser,
    vapi_call_id: vapiCallId,
    interaction_mode: "voice",
  };
  const table = supabase.from("session-history");
  // The unique call identity lets live saves, finalization, and retries update
  // one transcript atomically, including when the first response was lost.
  const write = vapiCallId
    ? table.upsert(row, {
        onConflict: "user_id,companion_id,vapi_call_id",
      })
    : table.insert(row);
  const { data, error } = await write.select("id").single();

  if (error) {
    console.log(error.message);
    return {
      error: errorMessage.sessionHistorySaveFail,
      errorDescription: historySaveErrorDescription(error),
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
        "vapi_call_id",
      ].some((column) => error.message.includes(column)),
  );
}

function historySaveErrorDescription(error: { code: string; message: string }) {
  return isMissingOptionalHistoryColumn(error)
    ? "The session database needs an update before this call can be saved. Apply the session-history metadata migration, then retry saving this call."
    : error.message;
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
      "id, created_at, interaction_mode, duration_seconds, ended_by_user, vapi_chat_id, is_demo",
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
        is_demo: false,
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
        !session.is_demo &&
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
      "id, created_at, interaction_mode, ended_by_user, vapi_chat_id, messages, learning_recap, is_demo",
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
          is_demo: false,
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
        !session.is_demo &&
        Boolean(vapi_chat_id),
    },
  };
}

export type ConversationCursor = { createdAt: string; id: number };

type ConversationSession = WorkspaceSession & {
  is_demo: boolean;
  duration_seconds: number | null;
};

type ConversationResult =
  | { data: ConversationSession[]; nextCursor: ConversationCursor | null }
  | { error: string; errorDescription?: string };

function validConversationCursor(cursor: ConversationCursor) {
  // Restrict timestamps to ISO syntax before interpolation into PostgREST's
  // filter expression. Preserve fractional seconds to avoid skipping ties.
  return (
    typeof cursor === "object" &&
    cursor !== null &&
    Number.isSafeInteger(cursor.id) &&
    cursor.id > 0 &&
    typeof cursor.createdAt === "string" &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/.test(
      cursor.createdAt,
    ) &&
    Number.isFinite(Date.parse(cursor.createdAt))
  );
}

export async function getCompanionConversation(
  companionId: string,
  before: ConversationCursor | null = null,
): Promise<ConversationResult> {
  const { userId } = await auth();
  if (!userId) return { error: errorMessage.notAuthenticated };
  if (
    typeof companionId !== "string" ||
    !companionId.trim() ||
    (before !== null && !validConversationCursor(before))
  )
    return { error: errorMessage.invalidRequest };

  const supabase = createSupabaseClient();
  let query = supabase
    .from("session-history")
    .select(
      "id, created_at, messages, interaction_mode, ended_by_user, learning_recap, is_demo, vapi_chat_id, duration_seconds",
    )
    .eq("user_id", userId)
    .eq("companion_id", companionId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(21);
  if (before) {
    query = query.or(
      `created_at.lt.${before.createdAt},and(created_at.eq.${before.createdAt},id.lt.${before.id})`,
    );
  }
  const { data, error } = await query;
  if (error)
    return { error: errorMessage.fetchFail, errorDescription: error.message };

  const rows = (data ?? []).slice(0, 20);
  const oldest = rows.at(-1);
  const nextCursor =
    data && data.length > 20 && oldest
      ? { createdAt: oldest.created_at, id: oldest.id }
      : null;
  return {
    data: rows.reverse().map(({ vapi_chat_id, ...row }) => ({
      ...row,
      canResume:
        row.interaction_mode === "text" &&
        !row.ended_by_user &&
        !row.is_demo &&
        Boolean(vapi_chat_id),
    })),
    nextCursor,
  };
}
