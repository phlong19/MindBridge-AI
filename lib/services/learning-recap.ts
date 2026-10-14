"use server";

import { auth } from "@clerk/nextjs/server";
import { error as errorMessage } from "@/constants/message";
import { createSupabaseClient } from "@/lib/supabase";
import { LearningRecap, SavedMessage } from "@/types";

const MINIMUM_CALL_SECONDS = 60;
const MINIMUM_USER_TURNS = 2;

type RecapResult =
  | { data: LearningRecap }
  | { error: string; errorDescription?: string };

function isLearningRecap(value: unknown): value is LearningRecap {
  if (!value || typeof value !== "object") return false;

  const recap = value as Record<string, unknown>;
  return (
    typeof recap.summary === "string" &&
    Array.isArray(recap.topicsLearned) &&
    recap.topicsLearned.every((item) => typeof item === "string") &&
    Array.isArray(recap.strengths) &&
    recap.strengths.every((item) => typeof item === "string") &&
    Array.isArray(recap.tryNext) &&
    recap.tryNext.every((item) => typeof item === "string")
  );
}

function parseTranscript(messages: string | null): SavedMessage[] {
  if (!messages) return [];

  try {
    const parsed: unknown = JSON.parse(messages);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter(
        (message): message is SavedMessage =>
          !!message &&
          typeof message === "object" &&
          (message.role === "user" || message.role === "assistant") &&
          typeof message.content === "string" &&
          message.content.trim().length > 0,
      )
      .reverse();
  } catch {
    return [];
  }
}

function findLearningRecap(value: unknown): LearningRecap | null {
  if (isLearningRecap(value)) return value;
  if (typeof value === "string") {
    try {
      return findLearningRecap(JSON.parse(value));
    } catch {
      return null;
    }
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const recap = findLearningRecap(item);
      if (recap) return recap;
    }
    return null;
  }
  if (value && typeof value === "object") {
    for (const item of Object.values(value)) {
      const recap = findLearningRecap(item);
      if (recap) return recap;
    }
  }
  return null;
}

export async function generateLearningRecap(
  sessionId: number,
): Promise<RecapResult> {
  const { userId } = await auth();
  if (!userId) {
    return { error: errorMessage.notAuthenticated };
  }

  if (!Number.isSafeInteger(sessionId) || sessionId <= 0) {
    return { error: errorMessage.invalidRequest };
  }

  const apiKey = process.env.VAPI_PRIVATE_API_KEY;
  if (!apiKey) {
    return {
      error: errorMessage.serverError,
      errorDescription:
        "Learning recaps need the server-side VAPI_PRIVATE_API_KEY setting.",
    };
  }

  const supabase = createSupabaseClient();
  const { data: session, error: readError } = await supabase
    .from("session-history")
    .select(
      "id, user_id, messages, duration_seconds, ended_by_user, vapi_call_id, learning_recap",
    )
    .eq("id", sessionId)
    .eq("user_id", userId)
    .maybeSingle();

  if (readError) {
    return {
      error: errorMessage.fetchFail,
      errorDescription: readError.message,
    };
  }

  if (!session) {
    return { error: errorMessage.accessDenied };
  }

  if (isLearningRecap(session.learning_recap)) {
    return { data: session.learning_recap };
  }

  if (!session.vapi_call_id) {
    return {
      error: errorMessage.invalidRequest,
      errorDescription:
        "This session does not have a Vapi call record for recap analysis.",
    };
  }

  if ((session.duration_seconds ?? 0) < MINIMUM_CALL_SECONDS) {
    return {
      error: errorMessage.invalidRequest,
      errorDescription: "This call was too short to generate a learning recap.",
    };
  }

  if (!session.ended_by_user) {
    return {
      error: errorMessage.invalidRequest,
      errorDescription: "A recap is available only after you end the call.",
    };
  }

  const transcript = parseTranscript(session.messages);
  const userTurns = transcript.filter((message) => message.role === "user");
  if (userTurns.length < MINIMUM_USER_TURNS) {
    return {
      error: errorMessage.invalidRequest,
      errorDescription:
        "The call needs at least two student turns to generate a recap.",
    };
  }

  let vapiResponse: Response;
  try {
    vapiResponse = await fetch("https://api.vapi.ai/structured-output/run", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        callIds: [session.vapi_call_id],
        previewEnabled: true,
        structuredOutput: {
          name: "MindBridge Learning Recap",
          type: "ai",
          description:
            "Create a concise, encouraging learning recap for a school learner. Use only ideas supported by the tutor and student conversation. Do not grade, diagnose, or invent what the student knows.",
          schema: {
            type: "object",
            properties: {
              summary: {
                type: "string",
                description:
                  "A brief, friendly summary of the learning session.",
              },
              topicsLearned: {
                type: "array",
                items: {
                  type: "string",
                  description: "A topic or idea actually discussed.",
                },
              },
              strengths: {
                type: "array",
                items: {
                  type: "string",
                  description:
                    "Something the learner did well, grounded in the conversation.",
                },
              },
              tryNext: {
                type: "array",
                items: {
                  type: "string",
                  description: "A useful next practice step for the learner.",
                },
              },
            },
            required: ["summary", "topicsLearned", "strengths", "tryNext"],
            additionalProperties: false,
          },
        },
      }),
      cache: "no-store",
    });
  } catch {
    return {
      error: errorMessage.serverError,
      errorDescription:
        "Could not reach Vapi's recap service. Please try again.",
    };
  }

  const responseBody: unknown = await vapiResponse.json().catch(() => null);

  if (!vapiResponse.ok) {
    const responseError =
      responseBody && typeof responseBody === "object"
        ? ((responseBody as { message?: string; error?: string }).message ??
          (responseBody as { error?: string }).error)
        : undefined;
    return {
      error: errorMessage.serverError,
      errorDescription:
        responseError ?? `Vapi recap service returned ${vapiResponse.status}.`,
    };
  }

  const recap = findLearningRecap(responseBody);
  if (!recap) {
    return {
      error: errorMessage.serverError,
      errorDescription:
        "Vapi returned no recap result. Check that this call has a saved transcript and try again.",
    };
  }

  const { error: updateError } = await supabase
    .from("session-history")
    .update({
      learning_recap: {
        summary: recap.summary,
        topicsLearned: recap.topicsLearned,
        strengths: recap.strengths,
        tryNext: recap.tryNext,
      },
    })
    .eq("id", sessionId)
    .eq("user_id", userId);

  if (updateError) {
    return {
      error: errorMessage.insertFail,
      errorDescription: updateError.message,
    };
  }

  return { data: recap };
}
