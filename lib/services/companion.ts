"use server";

import { auth } from "@clerk/nextjs/server";
import { createSupabaseClient } from "../supabase";
import { error as errorMessage } from "@/constants/message";

//#region create
export async function createCompanion(formData: CreateCompanion) {
  const { userId: author } = await auth();

  const supabase = createSupabaseClient();

  const { data, error } = await supabase
    .from("companions")
    .insert({ ...formData, author })
    .select();

  if (error && !data) {
    console.log(error.message);
    throw new Error(errorMessage.insertFail);
  }

  return data[0];
}
//#endregion

//#region get list
export async function getCompanionList({
  limit = 10,
  page = 1,
  subject,
  topic,
}: GetAllCompanions) {
  const { userId } = await auth();

  const supabase = createSupabaseClient();
  // pagination
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  if (!userId) {
    throw new Error(errorMessage.notAuthenticated);
  }

  let query = supabase
    .from("companions")
    .select("*", { count: "exact" })
    .eq("author", userId)
    .range(from, to)
    .limit(limit);

  if (subject) {
    query = query.ilike("subject", `%${subject}%`);
  }
  if (topic) {
    query = query.or(`topic.ilike.%${topic}%,name.ilike.%${topic}%`);
  }

  const { data, error, count } = await query;

  if (error && !data) {
    console.log(error.message);
    return { error: errorMessage.fetchFail };
  }

  return { data, count };
}
//#endregion
