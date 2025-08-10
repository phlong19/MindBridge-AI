"use server";

import { auth } from "@clerk/nextjs/server";
import { createSupabaseClient } from "../supabase";
import { error as errorMessage } from "@/constants/message";
import { CreateCompanion, GetAllCompanions } from "@/types";
import { features, plansGroup } from "@/constants";

//#region create
export async function createCompanion(formData: CreateCompanion) {
  const { userId: author } = await auth();
  const gender = formData.gender ? "men" : "women";

  const supabase = createSupabaseClient();

  const { data, error } = await supabase
    .from("companions")
    .insert({
      ...formData,
      author,
      photoUrl: `https://randomuser.me/api/portraits/${gender}/${Math.floor(Math.random() * 100)}.jpg`,
    })
    .select();

  if (error && !data) {
    console.log(error.message);
    return { error: errorMessage.insertFail, errorDescription: error.message };
  }

  return { companion: data[0] };
}
//#endregion

//#region get list
export async function getCompanionList({
  limit = 10,
  page = 1,
  subject,
  topic,
  authorized = false,
}: GetAllCompanions) {
  const supabase = createSupabaseClient();
  // pagination
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase
    .from("companions")
    .select("*", { count: "exact" })
    .range(from, to)
    .limit(limit);

  if (authorized) {
    const { userId } = await auth();

    if (!userId) {
      return { error: errorMessage.notAuthenticated, errorDescription: "" };
    }

    query = query.eq("author", userId);
  } else {
    query = query.eq("isPublish", true);
  }

  if (subject) {
    query = query.ilike("subject", `%${subject}%`);
  }
  if (topic) {
    query = query.or(`topic.ilike.%${topic}%,name.ilike.%${topic}%`);
  }

  const { data, error, count } = await query;

  if (error && !data) {
    console.log(error.message);
    return { error: errorMessage.fetchFail, errorDescription: error.message };
  }

  return { data, count };
}
//#endregion

//#region get detail
export async function getCompanion(id: string, userId?: string) {
  const supabase = createSupabaseClient();

  const { data, error } = await supabase
    .from("companions")
    .select()
    .eq("id", id)
    .limit(1)
    .single();

  if (error && !data) {
    console.log(error.message);
    return { error: errorMessage.getDetailFail };
  }

  if (!data.isPublish && data.author !== userId) {
    return { error: errorMessage.notAuthorized };
  }

  return { companion: data };
}
//#endregion

//#region save session history
export async function saveSessionHistory(
  companionId: string,
  isPublish: boolean = false,
  messages: string,
  userId: string,
  sessionId: number,
) {
  const supabase = createSupabaseClient();

  console.log({
    id: sessionId,
    companion_id: companionId,
    user_id: userId,
    messages,
    isPublish,
  });

  const { data, error } = await supabase.from("session-history").upsert(
    {
      id: sessionId,
      companion_id: companionId,
      user_id: userId,
      messages,
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

//#region permissions
export async function newCompanionPermissions(): Promise<
  true | { error: string; errorDescription?: string }
> {
  const { userId, has } = await auth();
  const supabase = createSupabaseClient();

  let limit = 0;

  if (has(plansGroup.ultimate)) {
    return true;
  } else if (has({ feature: features.starter.Limit2Companions })) {
    limit = 2;
  } else if (has({ feature: features.pro.Limit10Companions })) {
    limit = 10;
  }

  const { data, error } = await supabase
    .from("companions")
    .select("id", { count: "exact" })
    .eq("author", userId!);

  if (error) {
    console.log(error);
    return { error: errorMessage.fetchFail, errorDescription: error.message };
  }

  const count = data.length;

  if (count >= limit) {
    return { error: errorMessage.companionExceed };
  }

  return true;
}
