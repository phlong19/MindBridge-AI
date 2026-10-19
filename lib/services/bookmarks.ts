"use server";

import { error as errorMessage, successMessage } from "@/constants/message";
import { createSupabaseClient } from "../supabase";
import { auth } from "@clerk/nextjs/server";
import { ToastTypes } from "../utils";

export async function getCompanionBookmarkStatus(
  companionId: string,
): Promise<boolean | null> {
  const { userId } = await auth();
  if (!userId) return null;
  const { data, error } = await createSupabaseClient()
    .from("bookmarks")
    .select("id")
    .eq("userId", userId)
    .eq("companionId", companionId)
    .maybeSingle();
  return error ? null : Boolean(data);
}

export async function savedBookmark(
  companionId: string,
): Promise<{
  type: ToastTypes;
  title: string;
  message?: string;
  bookmarked?: boolean;
}> {
  const { userId } = await auth();

  if (!userId) {
    return {
      type: "error",
      title: errorMessage.notAuthenticated,
    };
  }
  const supabase = createSupabaseClient();

  // Check if the bookmark already exists
  const { data: existingBookmark, error: lookupError } = await supabase
    .from("bookmarks")
    .select()
    .eq("userId", userId)
    .eq("companionId", companionId)
    .maybeSingle();

  if (lookupError) {
    return { type: "error", title: errorMessage.cantBookmark };
  }

  if (existingBookmark) {
    const { data, error } = await supabase
      .from("bookmarks")
      .delete()
      .eq("id", existingBookmark.id)
      .select();

    if (error || !data) {
      console.log(error);
      return {
        type: "error",
        title: errorMessage.cantBookmark,
        message: error?.message,
      };
    }

    if (data.length > 0) {
      return {
        type: "success",
        title: successMessage.unbookmarked,
        bookmarked: false,
      };
    }
  }

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

  return {
    type: "success",
    title: successMessage.bookmarked,
    bookmarked: true,
  };
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
