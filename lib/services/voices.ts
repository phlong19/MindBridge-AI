"use server";

import { Voice } from "@/types";
import { createPublicSupabaseClient } from "../supabase";
import { createSupabaseAdminClient } from "../supabase-admin";
import { auth } from "@clerk/nextjs/server";
import { error as errorMessage } from "@/constants/message";

//#region sync voices
type Providers = "11labs" | "openai" | "playht" | "azure";
const VOICE_PAGE_SIZE = 150;
const MAX_VOICE_PAGES = 100;

export async function fetchVoicesAndSync(
  provider: Providers,
  token: string,
): Promise<Voice[] | Record<string, string>> {
  const { userId } = await auth();
  if (!userId || !process.env.ADMIN_USER_ID || userId !== process.env.ADMIN_USER_ID) {
    return { error: errorMessage.notAuthorized };
  }

  try {
    const bearerToken = token.trim().replace(/^Bearer\s+/i, "");
    if (!bearerToken || /\s/.test(bearerToken)) {
      return {
        error: errorMessage.invalidToken,
        errorDescription:
          "Paste a current Vapi dashboard token, with or without the Bearer prefix.",
      };
    }

    // This is the same dashboard-only endpoint used by Vapi's Voice Library.
    // Its bearer is a short-lived dashboard session token, not a Vapi API key.
    const rawData: Omit<Voice, "style">[] = [];
    for (let page = 1; page <= MAX_VOICE_PAGES; page += 1) {
      const response = await fetch(
        `https://api.vapi.ai/voice-library/${provider}?limit=${VOICE_PAGE_SIZE}&page=${page}`,
        {
          headers: {
            Accept: "*/*",
            Authorization: `Bearer ${bearerToken}`,
            "x-client-platform": "web",
            "x-client-source": "dashboard",
          },
          cache: "no-store",
        },
      );

      if (!response.ok) {
        const description = (await response.text()).slice(0, 1000);
        return {
          error: errorMessage.fetchFail,
          errorDescription: `Vapi returned ${response.status}: ${description}`,
        };
      }

      const payload: unknown = await response.json();
      if (!Array.isArray(payload)) {
        return {
          error: errorMessage.fetchFail,
          errorDescription: "Vapi returned an unexpected voice-list response.",
        };
      }

      const pageVoices = payload as Omit<Voice, "style">[];
      if (
        pageVoices.some(
          (voice) =>
            !voice ||
            typeof voice.id !== "string" ||
            typeof voice.providerId !== "string",
        )
      ) {
        return {
          error: errorMessage.fetchFail,
          errorDescription:
            "Vapi returned voices without the id/providerId fields required by the catalogue.",
        };
      }

      rawData.push(...pageVoices);
      if (pageVoices.length < VOICE_PAGE_SIZE) break;
    }

    if (rawData.length === 0) {
      return {
        error: errorMessage.fetchFail,
        errorDescription: "Vapi returned no voices for this provider.",
      };
    }

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

    const data: Voice[] = rawData.map((voice) => {
      const text =
        `${voice.name ?? ""} ${voice.description ?? ""}`.toLocaleLowerCase();
      let style: "casual" | "formal" = "casual";

      const isContainsKeyword = (keywords: string[]) =>
        keywords.some((keyword) => text.includes(keyword));

      if (isContainsKeyword(formalKeywords)) style = "formal";
      if (isContainsKeyword(casualKeywords)) style = "casual";

      // Persist only columns owned by this app's voices table. The dashboard
      // API adds fields such as isCloned that do not exist in our schema.
      return {
        id: voice.id,
        providerId: voice.providerId,
        createdAt: voice.createdAt ?? new Date().toISOString(),
        updatedAt: voice.updatedAt ?? null,
        name: voice.name ?? null,
        description: voice.description ?? null,
        provider: voice.provider ?? provider,
        gender: voice.gender ?? null,
        accent: voice.accent ?? null,
        style,
        slug: voice.slug ?? null,
        previewUrl: voice.previewUrl ?? null,
        orgId: voice.orgId ?? null,
        isPublic: voice.isPublic ?? null,
        isDeleted: voice.isDeleted ?? null,
      };
    });

    let supabase;
    try {
      supabase = createSupabaseAdminClient();
    } catch (error) {
      const description =
        error instanceof Error ? error.message : "Supabase admin setup failed.";
      return {
        error: errorMessage.insertFail,
        errorDescription: description,
      };
    }

    let writeError: string | null = null;
    try {
      const { error } = await supabase
        .from("voices")
        .upsert(data, { onConflict: "id" });
      writeError = error?.message ?? null;
    } catch (error) {
      writeError =
        error instanceof Error ? error.message : "Supabase write request failed.";
    }

    if (writeError) {
      return {
        error: errorMessage.insertFail,
        errorDescription: writeError,
      };
    }

    return data;
  } catch (error) {
    let message = "Unknown error";

    if (error instanceof Error) {
      message = error.message;
    } else if (typeof error === "string") {
      message = error;
    }

    return {
      error: errorMessage.serverError,
      errorDescription: message,
    };
  }
}
//#endregion

//#region get voices list
export async function getVoicesList() {
  // Voices are public catalogue data. Query as anon so this route does not
  // depend on a Clerk JWT or the project's Clerk third-party auth setup.
  const supabase = createPublicSupabaseClient();

  const { data, error } = await supabase
    .from("voices")
    .select("*", { count: "exact" });

  if (error && !data) {
    console.log(error.message);
    return { error: errorMessage.fetchFail, errorDescription: error.message };
  }

  return { data };
}
