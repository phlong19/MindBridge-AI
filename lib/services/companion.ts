"use server";

import { auth } from "@clerk/nextjs/server";
import { createSupabaseClient } from "../supabase";
import { error as errorMessage } from "@/constants/message";

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
