import type { SavedMessage } from "@/types";
import type { CompletedVoiceSession } from "./session-messages";

// Preserve the existing newest-first voice storage format.
export class VoiceSession {
  messages: SavedMessage[] = [];
  callId: string | null = null;
  private startedAt: number | null = null;
  private typedMessages: string[] = [];

  get isActive() {
    return this.startedAt !== null;
  }

  begin(now = Date.now()) {
    this.startedAt = now;
    this.messages = [];
    this.typedMessages = [];
  }

  addTypedMessage(content: string) {
    this.typedMessages.push(content);
    this.messages = [{ role: "user", content }, ...this.messages];
  }

  addTranscript(message: SavedMessage) {
    if (
      this.startedAt === null ||
      (message.role !== "user" && message.role !== "assistant")
    )
      return;
    // An assistant reply closes the typed turn's echo window. A later spoken
    // answer can legitimately contain exactly the same words.
    if (message.role === "assistant") this.typedMessages = [];
    const pending =
      message.role === "user"
        ? this.typedMessages.indexOf(message.content)
        : -1;
    if (pending >= 0) {
      this.typedMessages.splice(pending, 1);
      return;
    }
    this.messages = [message, ...this.messages];
  }

  snapshot(
    endedByUser = false,
    now = Date.now(),
  ): CompletedVoiceSession | null {
    if (this.startedAt === null) return null;
    return {
      messages: [...this.messages],
      callId: this.callId,
      endedByUser,
      durationSeconds: Math.max(0, Math.floor((now - this.startedAt) / 1000)),
    };
  }

  finish(endedByUser: boolean, now = Date.now()): CompletedVoiceSession | null {
    const completed = this.snapshot(endedByUser, now);
    if (!completed) return null;
    this.startedAt = null;
    this.callId = null;
    return completed;
  }
}
