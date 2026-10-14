import type { LearningRecap, SavedMessage } from "@/types";

export type WorkspaceSession = {
  id: number;
  interaction_mode: string;
  ended_by_user: boolean;
  canResume: boolean;
  messages: string | null;
  created_at: string;
  learning_recap: unknown;
};

export function parseSessionMessages(
  value: string | null,
  mode: string,
): SavedMessage[] {
  try {
    const parsed: unknown = JSON.parse(value ?? "[]");
    if (!Array.isArray(parsed)) return [];
    const messages = parsed.filter(
      (message): message is SavedMessage =>
        Boolean(message) &&
        (message.role === "user" || message.role === "assistant") &&
        typeof message.content === "string",
    );
    return mode === "voice" ? messages.reverse() : messages;
  } catch {
    return [];
  }
}

export function resumableTextSessionId(
  session: Pick<
    WorkspaceSession,
    "id" | "interaction_mode" | "ended_by_user" | "canResume"
  > | null,
) {
  return session?.interaction_mode === "text" &&
    !session.ended_by_user &&
    session.canResume
    ? session.id
    : null;
}

export type CompletedVoiceSession = {
  messages: SavedMessage[];
  durationSeconds: number;
  endedByUser: boolean;
  callId: string | null;
};

export function remainingCallSeconds(
  startedAt: number | null,
  durationSeconds: number,
  now = Date.now(),
) {
  const elapsed =
    startedAt === null ? 0 : Math.max(0, Math.floor((now - startedAt) / 1000));
  return Math.max(0, durationSeconds - elapsed);
}

export function canOfferRecap(session: CompletedVoiceSession) {
  return (
    session.endedByUser &&
    Boolean(session.callId) &&
    session.durationSeconds >= 60 &&
    session.messages.filter((message) => message.role === "user").length >= 2
  );
}

export function readLearningRecap(value: unknown): LearningRecap | null {
  if (!value || typeof value !== "object") return null;
  const recap = value as Record<string, unknown>;
  if (typeof recap.summary !== "string") return null;
  for (const key of ["topicsLearned", "strengths", "tryNext"]) {
    if (
      !Array.isArray(recap[key]) ||
      !recap[key].every((item) => typeof item === "string")
    )
      return null;
  }
  return value as LearningRecap;
}
