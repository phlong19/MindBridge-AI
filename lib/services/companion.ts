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
  authenticated = true,
  authorized = true,
}: GetAllCompanions) {
  const supabase = createSupabaseClient();

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query;
  let userId: string | null = null;

  query = supabase.from("companions");

  if (authenticated) {
    const authResult = await auth();
    userId = authResult?.userId ?? null;

    if (userId) {
      query = query.select("*, bookmarks(userId)", { count: "exact" });

      if (authorized) {
        query = query.eq("author", userId);
      } else {
        query = query.eq("isPublish", true);
      }
    } else {
      return { error: errorMessage.notAuthenticated };
    }
  } else {
    query = query.select("*", { count: "exact" }).eq("isPublish", true);
  }

  query = query.range(from, to).limit(limit);

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

  return {
    // @ts-expect-error type error
    data: data.map((i) => ({ ...i, isBookmarked: !!i.bookmarks?.length })),
    count,
  };
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
