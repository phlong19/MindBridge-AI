"use server";

import { error as errorMessage, successMessage } from "@/constants/message";
import { createSupabaseClient } from "../supabase";
import { auth } from "@clerk/nextjs/server";
import { ToastTypes } from "../utils";

export async function savedBookmark(
  companionId: string,
): Promise<{ type: ToastTypes; title: string; message?: string }> {
  const { userId } = await auth();

  if (!userId) {
    return {
      type: "error",
      title: errorMessage.notAuthenticated,
    };
  }
  const supabase = createSupabaseClient();

  const { error } = await supabase
    .from("bookmarks")
    .insert([{ userId, companionId }])
    .select();

  if (error) {
    console.log(error);
    return {
      type: "error",
      title: errorMessage.cantBookmark,
      message: error.message,
    };
  }

  // update bookmarked ui
  // more permission check on features & plans
  return { type: "success", title: successMessage.bookmarked };
}

// for my-journey page
export async function getAllCompanionsFromBookmark(userId: string) {
  const supabase = createSupabaseClient();

  const { data, error } = await supabase
    .from("bookmarks")
    .select("companion: companionId (*)")
    .eq("userId", userId)
    .limit(10);

  if (error) {
    console.log(error);
    return {
      error: errorMessage.fetchFail,
      errorDescription: error.message,
      data: null,
    };
  }

  return data.map(({ companion }) => companion);
}
