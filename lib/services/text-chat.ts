"use server";

import { auth } from "@clerk/nextjs/server";
import { error as errorMessage } from "@/constants/message";
import { createSupabaseClient } from "@/lib/supabase";
import type { SavedMessage } from "@/types";
import { buildConversationContext } from "@/lib/conversation-context";

const MAX_MESSAGE_LENGTH = 2_000;

type TextChatResult =
  | {
      data: {
        sessionId: number;
        messages: SavedMessage[];
      };
    }
  | { error: string; errorDescription?: string };

function parseMessages(value: string | null): SavedMessage[] {
  if (!value) return [];

  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter(
      (message): message is SavedMessage =>
        !!message &&
        typeof message === "object" &&
        (message.role === "user" || message.role === "assistant") &&
        typeof message.content === "string",
    );
  } catch {
    return [];
  }
}

export async function sendCompanionTextMessage(
  companionId: string,
  content: string,
  sessionId: number | null,
): Promise<TextChatResult> {
  const { userId } = await auth();
  if (!userId) return { error: errorMessage.notAuthenticated };

  const message = content.trim();
  if (
    !companionId ||
    !message ||
    message.length > MAX_MESSAGE_LENGTH ||
    (sessionId !== null && (!Number.isSafeInteger(sessionId) || sessionId <= 0))
  ) {
    return { error: errorMessage.invalidRequest };
  }

  const apiKey = process.env.VAPI_PRIVATE_API_KEY;
  if (!apiKey) {
    return {
      error: errorMessage.serverError,
      errorDescription:
        "Text chat needs the server-side VAPI_PRIVATE_API_KEY setting.",
    };
  }

  const supabase = createSupabaseClient();
  const { data: companion, error: companionError } = await supabase
    .from("companions")
    .select("id, name, subject, topic, style, author, isPublish")
    .eq("id", companionId)
    .maybeSingle();

  if (companionError) {
    return {
      error: errorMessage.fetchFail,
      errorDescription: companionError.message,
    };
  }
  if (!companion || (!companion.isPublish && companion.author !== userId)) {
    return { error: errorMessage.accessDenied };
  }

  let history: SavedMessage[] = [];
  let priorContext: SavedMessage[] = [];
  let existingSession: {
    id: number;
    created_at: string;
    vapi_chat_id: string | null;
  } | null = null;

  if (sessionId !== null) {
    const { data, error: sessionError } = await supabase
      .from("session-history")
      .select(
        "id, messages, created_at, vapi_chat_id, interaction_mode, ended_by_user, is_demo",
      )
      .eq("id", sessionId)
      .eq("user_id", userId)
      .eq("companion_id", companionId)
      .maybeSingle();

    if (sessionError) {
      return {
        error: errorMessage.fetchFail,
        errorDescription: sessionError.message,
      };
    }
    if (!data || data.interaction_mode !== "text" || data.is_demo) {
      return { error: errorMessage.accessDenied };
    }
    if (data.ended_by_user || !data.vapi_chat_id) {
      return {
        error: errorMessage.invalidRequest,
        errorDescription:
          "This text session cannot be resumed. Start a new conversation instead.",
      };
    }

    history = parseMessages(data.messages);
    existingSession = {
      id: data.id,
      created_at: data.created_at,
      vapi_chat_id: data.vapi_chat_id,
    };
  } else {
    // Query the authenticated learner's recent real sessions only. Historical
    // turns initialize the new provider chat; the saved row contains this new
    // text session's turns so the workspace can stack sessions without copies.
    const { data: previousSessions, error: historyError } = await supabase
      .from("session-history")
      .select("id, messages, interaction_mode, is_demo")
      .eq("user_id", userId)
      .eq("companion_id", companionId)
      .eq("is_demo", false)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(20);
    if (historyError) {
      return {
        error: errorMessage.fetchFail,
        errorDescription: historyError.message,
      };
    }
    priorContext = buildConversationContext(
      (previousSessions ?? [])
        .slice()
        .reverse()
        .filter((session) => !session.is_demo)
        .flatMap((session) => {
          const messages = parseMessages(session.messages);
          return session.interaction_mode === "text"
            ? messages
            : messages.reverse();
        }),
    );
  }

  const conversation = [
    ...history,
    { role: "user" as const, content: message },
  ];
  const style = companion.style ? "formal" : "casual";
  const systemPrompt = `You are ${companion.name}, an encouraging tutor for a school learner. Teach ${companion.subject} with a focus on ${companion.topic}. Use a ${style} tone. Keep replies clear and concise, explain ideas step by step, and ask one useful follow-up question at a time. Stay within the topic unless the learner asks a related question. Do not grade, diagnose, or assume what the learner knows.`;

  let vapiResponse: Response;
  try {
    vapiResponse = await fetch("https://api.vapi.ai/chat", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...(existingSession?.vapi_chat_id
          ? { previousChatId: existingSession.vapi_chat_id }
          : {
              assistant: {
                name: `${companion.name} Text Tutor`.slice(0, 40),
                model: {
                  provider: "openai",
                  model: "gpt-4",
                  messages: [
                    { role: "system", content: systemPrompt },
                    ...priorContext,
                  ],
                },
              },
            }),
        input: message,
      }),
      cache: "no-store",
    });
  } catch {
    return {
      error: errorMessage.serverError,
      errorDescription: "Could not reach Vapi Chat. Please try again.",
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
        responseError ?? `Vapi Chat returned ${vapiResponse.status}.`,
    };
  }

  const chatId =
    responseBody &&
    typeof responseBody === "object" &&
    typeof (responseBody as { id?: unknown }).id === "string"
      ? (responseBody as { id: string }).id
      : null;
  const outputs =
    responseBody &&
    typeof responseBody === "object" &&
    Array.isArray((responseBody as { output?: unknown }).output)
      ? ((responseBody as { output: unknown[] }).output as Array<{
          role?: string;
          content?: unknown;
        }>)
      : [];
  const reply = outputs
    .filter(
      (output) =>
        output.role === "assistant" && typeof output.content === "string",
    )
    .map((output) => output.content as string)
    .join("\n\n")
    .trim();

  if (!reply) {
    return {
      error: errorMessage.serverError,
      errorDescription:
        "Vapi Chat returned no text response. Please try again.",
    };
  }

  conversation.push({ role: "assistant", content: reply });
  const durationSeconds = existingSession
    ? Math.max(
        0,
        Math.floor(
          (Date.now() - new Date(existingSession.created_at).getTime()) / 1000,
        ),
      )
    : 0;

  const saveResult = existingSession
    ? await supabase
        .from("session-history")
        .update({
          messages: JSON.stringify(conversation),
          duration_seconds: durationSeconds,
          ended_by_user: false,
          vapi_chat_id: chatId ?? existingSession.vapi_chat_id,
        })
        .eq("id", existingSession.id)
        .eq("user_id", userId)
        .select("id")
        .single()
    : await supabase
        .from("session-history")
        .insert({
          companion_id: companionId,
          messages: JSON.stringify(conversation),
          user_id: userId,
          isPublish: companion.isPublish,
          duration_seconds: durationSeconds,
          ended_by_user: false,
          vapi_chat_id: chatId,
          interaction_mode: "text",
        })
        .select("id")
        .single();

  if (saveResult.error) {
    return {
      error: errorMessage.insertFail,
      errorDescription: saveResult.error.message,
    };
  }

  return {
    data: {
      sessionId: saveResult.data.id,
      messages: conversation,
    },
  };
}

export async function finishCompanionTextSession(
  sessionId: number,
): Promise<{ error: string; errorDescription?: string } | { data: true }> {
  const { userId } = await auth();
  if (!userId) return { error: errorMessage.notAuthenticated };
  if (!Number.isSafeInteger(sessionId) || sessionId <= 0) {
    return { error: errorMessage.invalidRequest };
  }

  const supabase = createSupabaseClient();
  const { data: session, error: readError } = await supabase
    .from("session-history")
    .select("id, created_at, interaction_mode")
    .eq("id", sessionId)
    .eq("user_id", userId)
    .maybeSingle();

  if (readError) {
    return {
      error: errorMessage.fetchFail,
      errorDescription: readError.message,
    };
  }
  if (!session || session.interaction_mode !== "text") {
    return { error: errorMessage.accessDenied };
  }

  const { error: updateError } = await supabase
    .from("session-history")
    .update({
      ended_by_user: true,
      duration_seconds: Math.max(
        0,
        Math.floor(
          (Date.now() - new Date(session.created_at).getTime()) / 1000,
        ),
      ),
    })
    .eq("id", session.id)
    .eq("user_id", userId);

  if (updateError) {
    return {
      error: errorMessage.insertFail,
      errorDescription: updateError.message,
    };
  }

  return { data: true };
}
