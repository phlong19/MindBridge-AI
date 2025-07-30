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
  let rawData: Omit<Voice, "style">[];
  let data: Voice[];

  try {
    const res = await fetch(
      `https://api.vapi.ai/voice-library/${provider}?limit=5`,
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

    rawData = await res.json();

    // assign voice style
    // prettier-ignore
    const formalKeywords = [
      'formal', 'narration', 'narrator', 'news', 'professional',
      'documentary', 'presenter', 'announcer', 'corporate',
      'neutral', 'instructional', 'tutorial', 'lecture', 'voiceover'
    ];
    // prettier-ignore
    const casualKeywords = [
      'casual', 'friendly', 'conversational', 'chatty', 'relaxed',
      'playful', 'fun', 'light', 'natural', 'everyday', 'approachable',
      'personable', 'storytelling', 'laid-back', 'emotive'
    ];

    if (rawData && Array.isArray(rawData)) {
      data = rawData.map((voice) => {
        const text =
          `${voice.name} ${voice.description ?? ""}`.toLocaleLowerCase();
        let style: "casual" | "formal" = "casual";

        const isContainsKeyword = (keywords: string[]) =>
          keywords.some((keyword) => text.includes(keyword));

        if (isContainsKeyword(formalKeywords)) style = "formal";
        if (isContainsKeyword(casualKeywords)) style = "casual";

        return { ...voice, style };
      });

      // sync to db
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

      return Array.isArray(data) ? data : [data];
    }
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

  return [];
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
