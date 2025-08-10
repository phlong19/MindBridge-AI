import { error as errorMessage, successMessage } from "@/constants/message";
import { createSupabaseClient } from "../supabase";
import { auth } from "@clerk/nextjs/server";

export async function savedBookmark(companionId: string) {
  const { userId } = await auth();

  if (!userId) {
    return {
      error: errorMessage.notAuthenticated,
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
      error: errorMessage.cantBookmark,
      errorDescription: error.message,
    };
  }

  // TODO: add type for return right client toast type
  // update bookmarked ui
  // more permission check on features & plans
  return { error: successMessage.saveSuccess, errorDescription: "ok" };
}

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
