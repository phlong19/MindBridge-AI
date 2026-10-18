"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  Loader2,
  Mic,
  MicOff,
  MessageSquareText,
  Send,
} from "lucide-react";
import type { CompanionRow } from "@/types";
import { Button } from "@/components/ui/Button";
import CompanionAvatar from "./CompanionAvatar";
import LearningRecapPanel from "./LearningRecapPanel";
import type { CompanionSessionState } from "./useCompanionSession";
import ConversationTimeline from "./ConversationTimeline";
import SessionCountdown from "./SessionCountdown";
import ConversationHistory from "./ConversationHistory";
import { resumableTextSessionId } from "./session-messages";

export default function CompanionConversation({
  companion,
  userName,
  session,
  panelControls,
  historyError,
}: {
  companion: CompanionRow;
  userName: string;
  session: CompanionSessionState;
  panelControls: ReactNode;
  historyError: boolean;
}) {
  const router = useRouter();
  const log = useRef<HTMLDivElement>(null);
  const pinned = useRef(true);
  const input = useRef<HTMLTextAreaElement>(null);
  const focusAfterStart = useRef(false);
  const olderScrollAnchor = useRef<{ height: number; top: number } | null>(
    null,
  );
  const initialHistoryView = useRef(true);
  const [hasNew, setHasNew] = useState(false);
  const voiceBusy =
    session.callStatus !== "idle" && session.callStatus !== "active";
  const sendDisabled =
    historyError ||
    session.busy ||
    voiceBusy ||
    session.unsavedVoice ||
    session.generatingRecap;
  const callActive = session.callStatus === "active";
  useEffect(() => {
    if (callActive && focusAfterStart.current) {
      input.current?.focus();
      focusAfterStart.current = false;
    }
  }, [callActive]);

  useEffect(() => {
    if (!log.current) return;
    if (olderScrollAnchor.current) {
      if (!session.historyLoading) {
        const anchor = olderScrollAnchor.current;
        log.current.scrollTop =
          anchor.top + log.current.scrollHeight - anchor.height;
        olderScrollAnchor.current = null;
      }
      return;
    }
    if (pinned.current) {
      log.current.scrollTop = log.current.scrollHeight;
      setHasNew(false);
    } else setHasNew(true);
  }, [
    session.messages,
    session.savedSessions,
    session.historyLoading,
    session.busy,
    session.responsePending,
    session.error,
    session.recapSessionId,
  ]);

  useEffect(() => {
    if (initialHistoryView.current) {
      initialHistoryView.current = false;
      return;
    }
    if (!session.viewedSession) return;
    const element = log.current?.querySelector<HTMLElement>(
      `#conversation-session-${session.viewedSession.id}`,
    );
    if (element && log.current) {
      pinned.current = false;
      log.current.scrollTop +=
        element.getBoundingClientRect().top -
        log.current.getBoundingClientRect().top;
    }
  }, [session.viewedSession]);

  function scrollToLatest() {
    pinned.current = true;
    if (log.current) log.current.scrollTop = log.current.scrollHeight;
    setHasNew(false);
  }

  return (
    <section
      className="relative flex h-full min-h-0 min-w-0 flex-col"
      aria-label={`Conversation with ${companion.name}`}
    >
      <header className="border-border/60 flex shrink-0 flex-wrap items-center justify-between gap-3 border-b px-4 py-4 sm:px-6">
        <div className="flex min-w-0 flex-[1_1_160px] items-center gap-3">
          <CompanionAvatar
            companion={companion}
            className="size-12 rounded-xl"
          />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="truncate !text-lg sm:!text-xl">
                {companion.name}
              </h1>
              {companion.isPublish && (
                <span className="rounded-full bg-green-50 px-2 py-0.5 text-[10px] text-green-700">
                  Community
                </span>
              )}
            </div>
            <p className="text-muted-foreground mt-1 truncate text-xs">
              {companion.topic}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {session.callStatus !== "idle" ? (
            <SessionCountdown session={session} />
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="border-primary/30 text-primary hover:text-primary h-10 rounded-xl bg-[#fff8f3] px-3 text-xs hover:bg-[#ffede4]"
              disabled={
                historyError ||
                session.busy ||
                session.unsavedVoice ||
                session.generatingRecap
              }
              title="Continue the conversation with a message"
              onClick={() => {
                input.current?.focus();
              }}
            >
              <MessageSquareText className="size-4" />
              <span className="hidden sm:inline">
                {session.conversationSections.length ? "Continue chat" : "Start chat"}
              </span>
              <span className="sm:hidden">Start chat</span>
            </Button>
          )}
          <ConversationHistory companionId={companion.id} session={session} />
          {panelControls}
        </div>
      </header>
      <div
        className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-7"
        ref={log}
        onScroll={() => {
          const element = log.current;
          if (!element) return;
          pinned.current =
            element.scrollHeight - element.scrollTop - element.clientHeight <
            100;
          if (pinned.current) setHasNew(false);
        }}
      >
        {historyError && (
          <div
            role="alert"
            className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm"
          >
            <p>
              Your previous messages could not be loaded. Retry before
              continuing so your companion can follow the conversation.
            </p>
            <Button
              variant="link"
              className="h-auto px-0 py-2"
              onClick={() => router.refresh()}
              disabled={session.locked}
            >
              Retry loading history
            </Button>
          </div>
        )}
        <p className="text-muted-foreground mb-6 text-center text-[11px]">
          {callActive
            ? session.muted
              ? "Chat session"
              : "Voice session"
            : "Your conversation"}
          {session.speaking && callActive ? " · Companion speaking" : ""}
        </p>
        {session.hasOlderHistory && (
          <div className="mb-5 text-center">
            <Button
              variant="outline"
              size="sm"
              disabled={session.historyLoading}
              onClick={() => {
                if (log.current)
                  olderScrollAnchor.current = {
                    height: log.current.scrollHeight,
                    top: log.current.scrollTop,
                  };
                void session.loadOlderHistory();
              }}
            >
              {session.historyLoading ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" /> Loading older
                  messages…
                </>
              ) : (
                "Load older messages"
              )}
            </Button>
          </div>
        )}
        {session.historyLoadError && (
          <p role="alert" className="mb-4 text-center text-xs text-red-700">
            {session.historyLoadError}
          </p>
        )}
        <div
          role="log"
          aria-live="polite"
          aria-relevant="additions text"
          aria-label="Conversation messages"
          className="flex flex-col gap-5"
        >
          {!session.conversationSections.some(
            (section) => section.messages.length,
          ) && (
            <div className="flex items-start gap-3">
              <CompanionAvatar
                companion={companion}
                className="mt-1 size-8 rounded-lg"
              />
              <div className="bg-muted/70 max-w-[90%] rounded-2xl px-4 py-3 text-sm leading-relaxed">
                <p>Hi! I’m {companion.name}, your learning companion.</p>
                <p className="mt-1">
                  What would you like to practice today? Ask a question about{" "}
                  {companion.topic || companion.subject}, or start a voice
                  session.
                </p>
              </div>
            </div>
          )}
          {session.completed &&
            session.viewedSession &&
            resumableTextSessionId(session.viewedSession) !== null && (
              <div className="border-primary/15 flex items-center justify-between gap-3 rounded-xl border bg-[#fff8f3] p-3 text-xs">
                <p>This text session is still open.</p>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={session.locked}
                  onClick={() => {
                    if (session.viewedSession)
                      session.openSavedSession(session.viewedSession, true);
                  }}
                >
                  Resume text session
                </Button>
              </div>
            )}
          <ConversationTimeline
            sections={session.conversationSections}
            companion={companion}
            userName={userName}
            selectedSessionId={session.selectedSessionId}
          />
          {(session.busy || session.responsePending) && (
            <p
              role="status"
              className="text-muted-foreground flex items-center gap-2 pl-11 text-xs"
            >
              <Loader2 className="size-3.5 animate-spin" />
              {companion.name} is thinking…
            </p>
          )}
        </div>
        {session.callEndedMessage && (
          <p
            role="status"
            className="text-muted-foreground mt-4 text-center text-xs"
          >
            {session.callEndedMessage}
          </p>
        )}
        {session.error && (
          <div
            role="alert"
            className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"
          >
            <p>{session.error}</p>
            {session.unsavedVoice && (
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                disabled={session.callStatus === "saving"}
                onClick={() => {
                  void session.retrySave();
                }}
              >
                Retry saving call
              </Button>
            )}
          </div>
        )}
        {(session.recap || session.recapSessionId) && (
          <div className="mt-5 xl:hidden">
            <LearningRecapPanel session={session} />
          </div>
        )}
      </div>
      {hasNew && (
        <Button
          variant="outline"
          size="sm"
          className="absolute right-5 bottom-40 z-10 rounded-full bg-white shadow-sm"
          onClick={scrollToLatest}
        >
          <ArrowDown className="size-3.5" />
          Latest messages
        </Button>
      )}
      <div className="shrink-0 px-3 pb-3 sm:px-4">
        <div className="text-muted-foreground mb-2 flex min-h-5 items-center justify-between gap-2 px-2 text-[11px]">
          <span>
            {session.callStatus === "saving"
              ? "Saving your call…"
              : callActive
                ? `Session active · ${session.muted ? "Microphone muted" : "Microphone on"}`
                : session.textSessionId !== null
                  ? "Text chat"
                  : session.completed
                    ? "Continue chatting below, or enable voice input"
                    : "Ask a question or practice together"}
          </span>
          {session.textSessionId !== null && (
            <button
              type="button"
              className="text-primary focus-visible:ring-primary shrink-0 rounded px-1 hover:underline focus-visible:ring-2 focus-visible:outline-none disabled:opacity-50"
              disabled={session.busy}
              onClick={() => {
                void session.endText();
              }}
            >
              End text session
            </button>
          )}
        </div>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            pinned.current = true;
            void session.send();
          }}
          className="border-border/70 focus-within:border-primary/40 focus-within:ring-primary/10 rounded-2xl border bg-white p-3 focus-within:ring-2"
        >
          <label htmlFor="workspace-message" className="sr-only">
            Message {companion.name}
          </label>
          <textarea
            id="workspace-message"
            ref={input}
            value={session.draft}
            onChange={(event) => session.setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (
                event.key === "Enter" &&
                !event.shiftKey &&
                !event.nativeEvent.isComposing
              ) {
                event.preventDefault();
                event.currentTarget.form?.requestSubmit();
              }
            }}
            placeholder="Type your message…"
            rows={2}
            maxLength={2000}
            disabled={sendDisabled}
            className="placeholder:text-muted-foreground max-h-28 min-h-12 w-full resize-none bg-transparent px-1 text-sm outline-none disabled:opacity-60"
          />
          <div className="flex items-center justify-between gap-3">
            <p className="text-muted-foreground px-1 text-[10px]">
              {callActive
                ? "Typed messages join this voice session"
                : "Enter to send · Shift + Enter for a new line"}
            </p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-9 rounded-full"
                aria-label={
                  callActive && !session.muted
                    ? "Mute voice input"
                    : "Enable voice input"
                }
                aria-pressed={callActive && !session.muted}
                disabled={
                  voiceBusy ||
                  historyError ||
                  session.busy ||
                  session.unsavedVoice ||
                  session.generatingRecap ||
                  !session.voiceReady ||
                  !companion.slug
                }
                title={
                  session.textSessionId !== null
                    ? "Start voice input in a new session"
                    : callActive && !session.muted
                      ? "Mute microphone"
                      : "Enable voice input"
                }
                onClick={() => {
                  if (callActive) session.toggleMute();
                  else {
                    focusAfterStart.current = true;
                    void session.startVoice({ muted: false });
                  }
                }}
              >
                {callActive && session.muted ? (
                  <MicOff className="size-4" />
                ) : (
                  <Mic className="size-4" />
                )}
              </Button>
              <Button
                type="submit"
                size="icon"
                className="bg-primary size-10 rounded-full shadow-sm"
                disabled={sendDisabled || !session.draft.trim()}
                aria-label="Send message"
              >
                {session.busy ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Send className="size-4" />
                )}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </section>
  );
}
