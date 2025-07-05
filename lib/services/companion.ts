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
export async function getCompanionList() {
  const { userId } = await auth();

  const supabase = createSupabaseClient();

  if (!userId) {
    throw new Error(errorMessage.notAuthenticated);
  }

  const { data, error } = await supabase
    .from("companions")
    .select()
    .eq("author", userId);

  if (error && !data) {
    console.log(error.message);
    throw new Error(errorMessage.fetchFail);
  }

  return data;
}
//#endregion
