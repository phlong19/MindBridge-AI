"use server";

import { Voice } from "@/types";
import { createSupabaseClient } from "../supabase";
import { error as errorMessage } from "@/constants/message";

//#region sync voices
type Providers = "11labs" | "openai" | "playht" | "azure";

export async function fetchVoicesAndSync(
  provider: Providers,
  token: string,
): Promise<Voice[] | Record<string, string>> {
  const res = await fetch(
    `https://api.vapi.ai/voice-library/${provider}?limit=100`,
    {
      headers: {
        Authorization: token,
        "Content-Type": "application/json",
      },
    },
  );

  if (!res.ok) {
    const text = await res.text();
    return { error: errorMessage.fetchFail, errorDescription: text };
  }

  let data;

  try {
    data = await res.json();
  } catch (error) {
    let message = "Unknown error";

    if (error instanceof Error) {
      message = error.message;
    } else if (typeof error === "string") {
      message = error;
    }

    return {
      error: errorMessage.fetchFail,
      errorDescription: message,
    };
  }

  // validate data type

  // sync to db
  if (data && Array.isArray(data)) {
    const supabase = createSupabaseClient();
    const { error } = await supabase
      .from("voices")
      .upsert(data, { onConflict: "id" });

    if (error) {
      return {
        error: errorMessage.insertFail,
        errorDescription: error.message,
      };
    }
  }

  return Array.isArray(data) ? data : [data];
}
//#endregion

//#region get voices list
export async function getVoicesList() {
  const supabase = createSupabaseClient();

  const { data, error } = await supabase
    .from("voices")
    .select("*", { count: "exact" });

  if (error && !data) {
    console.log(error.message);
    return { error: errorMessage.fetchFail, errorDescription: error.message };
  }

  return { data };
}
