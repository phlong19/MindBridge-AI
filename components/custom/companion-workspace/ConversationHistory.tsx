"use client";

import { LocalizedText, useI18n } from "@/lib/i18n/provider";
import { useEffect, useRef, useState } from "react";
import { History, Loader2, MessageSquareText, Mic, Play } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/Dialog";
import {
  getCompanionSession,
  getCompanionSessions,
} from "@/lib/services/sessions-history";
import type { CompanionSessionState } from "./useCompanionSession";

type Summary = {
  id: number;
  created_at: string;
  interaction_mode: string;
  duration_seconds: number | null;
  ended_by_user: boolean;
  canResume: boolean;
  is_demo?: boolean;
};

export default function ConversationHistory({
  companionId,
  session,
}: {
  companionId: string;
  session: CompanionSessionState;
}) {
  const { t, locale } = useI18n();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Summary[]>([]);
  const [page, setPage] = useState(1);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selection, setSelection] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const visible = useRef(false);
  const request = useRef(0);
  const selecting = useRef(false);

  useEffect(
    () => () => {
      visible.current = false;
      request.current++;
    },
    [],
  );

  async function load(nextPage: number) {
    const id = ++request.current;
    setLoading(true);
    setError(null);
    try {
      const result = await getCompanionSessions(companionId, nextPage);
      if (!visible.current || id !== request.current) return;
      if ("error" in result) throw new Error("Could not load your sessions.");
      setItems((previous) =>
        nextPage === 1
          ? result.data
          : [
              ...new Map(
                [...previous, ...result.data].map((item) => [item.id, item]),
              ).values(),
            ],
      );
      setCount(result.count);
      setPage(nextPage);
    } catch {
      if (visible.current && id === request.current)
        setError("Could not load your sessions. Please try again.");
    } finally {
      if (visible.current && id === request.current) setLoading(false);
    }
  }

  function changeOpen(value: boolean) {
    visible.current = value;
    request.current++;
    setOpen(value);
    setSelection(null);
    selecting.current = false;
    if (value) {
      setItems([]);
      void load(1);
    }
  }

  async function choose(id: number, resume: boolean) {
    if (selecting.current || session.isNavigationLocked()) return;
    selecting.current = true;
    setSelection(id);
    setError(null);
    const token = ++request.current;
    try {
      const result = await getCompanionSession(companionId, id);
      if (!visible.current || token !== request.current) return;
      if ("error" in result)
        throw new Error("Could not open this session. Please try again.");
      if (resume && !result.data.canResume)
        throw new Error(
          "This session can no longer be resumed. View it or start a new conversation.",
        );
      if (!session.openSavedSession(result.data, resume))
        throw new Error("End your current session before opening another one.");
      changeOpen(false);
    } catch (failure) {
      if (visible.current && token === request.current)
        setError(
          failure instanceof Error
            ? failure.message
            : "Could not open this session. Please retry.",
        );
    } finally {
      if (visible.current && token === request.current) {
        selecting.current = false;
        setSelection(null);
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-9 shrink-0 rounded-xl"
          aria-label={t("Conversation history")}
          title={t("Conversation history")}
        >
          <History className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="flex max-h-[85dvh] flex-col rounded-2xl bg-white">
        <DialogHeader>
          <DialogTitle>
            <LocalizedText>Conversation history</LocalizedText>
          </DialogTitle>
          <DialogDescription>
            <LocalizedText>
              Your saved sessions with this companion.
            </LocalizedText>
          </DialogDescription>
        </DialogHeader>
        {session.locked && (
          <p className="bg-muted text-muted-foreground rounded-lg p-3 text-xs">
            <LocalizedText>
              End the current session before viewing or resuming another one.
            </LocalizedText>
          </p>
        )}
        <div
          className="min-h-0 space-y-2 overflow-y-auto"
          aria-busy={loading || selection !== null}
        >
          {!loading && !error && !items.length && (
            <p className="text-muted-foreground py-8 text-center text-sm">
              <LocalizedText>
                No conversations yet. Start chatting with this companion and
                your saved sessions will appear here.
              </LocalizedText>
            </p>
          )}
          {items.map((item) => (
            <div
              key={item.id}
              className="border-border/60 flex items-center gap-3 rounded-xl border p-3"
            >
              {item.interaction_mode === "voice" ? (
                <Mic className="text-primary size-4 shrink-0" />
              ) : (
                <MessageSquareText className="text-primary size-4 shrink-0" />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">
                  {item.interaction_mode === "voice"
                    ? t("Voice session")
                    : t("Text session")}
                  {item.is_demo && (
                    <span className="ml-2 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] text-amber-800">
                      <LocalizedText>Demo</LocalizedText>
                    </span>
                  )}
                  {item.id === session.selectedSessionId && (
                    <span className="text-primary ml-2 text-[10px]">
                      <LocalizedText>Current view</LocalizedText>
                    </span>
                  )}
                </p>
                <p className="text-muted-foreground mt-1 text-xs">
                  {new Date(item.created_at).toLocaleString(
                    locale === "vi" ? "vi-VN" : "en-US",
                    {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                      timeZone: "Asia/Ho_Chi_Minh",
                    },
                  )}
                  {item.duration_seconds !== null
                    ? ` · ${Math.floor(item.duration_seconds / 60)} ${t("min")} ${item.duration_seconds % 60} ${t("sec")}`
                    : ""}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={session.locked || loading || selection !== null}
                  onClick={() => {
                    void choose(item.id, false);
                  }}
                >
                  {selection === item.id ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    t("View")
                  )}
                </Button>
                {item.canResume && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={session.locked || loading || selection !== null}
                    onClick={() => {
                      void choose(item.id, true);
                    }}
                  >
                    <Play className="size-3" />
                    <span>
                      <LocalizedText>Resume</LocalizedText>
                    </span>
                  </Button>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <p
              role="status"
              className="text-muted-foreground flex items-center justify-center gap-2 p-6 text-sm"
            >
              <Loader2 className="size-4 animate-spin" />
              <LocalizedText>Loading sessions…</LocalizedText>
            </p>
          )}
        </div>
        {error && (
          <div role="alert" className="text-sm text-red-700">
            <p>{t(error)}</p>
            <Button
              variant="link"
              className="h-auto px-0 py-2"
              disabled={loading || selection !== null}
              onClick={() => {
                void load(1);
              }}
            >
              <LocalizedText>Retry</LocalizedText>
            </Button>
          </div>
        )}
        {!error && items.length < count && (
          <Button
            variant="outline"
            size="sm"
            disabled={loading || selection !== null}
            onClick={() => {
              void load(page + 1);
            }}
          >
            <LocalizedText>Load more sessions</LocalizedText>
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
