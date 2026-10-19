"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getCompanionConversation } from "@/lib/services/sessions-history";
import type { ConversationPage, WorkspaceSession } from "./session-messages";

function mergeSessions(
  current: WorkspaceSession[],
  incoming: WorkspaceSession[],
) {
  return [
    ...new Map(
      [...current, ...incoming].map((session) => [session.id, session]),
    ).values(),
  ].sort(
    (a, b) =>
      Date.parse(a.created_at) - Date.parse(b.created_at) || a.id - b.id,
  );
}

export function useConversationTimeline(
  companionId: string,
  initialSession: WorkspaceSession | null,
  initialConversation?: ConversationPage,
) {
  const [sessions, setSessions] = useState<WorkspaceSession[]>(() =>
    mergeSessions(
      initialConversation?.data ?? [],
      initialSession ? [initialSession] : [],
    ),
  );
  const sessionsRef = useRef(sessions);
  const [nextCursor, setNextCursor] = useState(
    initialConversation?.nextCursor ?? null,
  );
  const cursorRef = useRef(nextCursor);
  const [loading, setLoading] = useState(false);
  const loadingRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const recordSessions = useCallback((incoming: WorkspaceSession[]) => {
    sessionsRef.current = mergeSessions(sessionsRef.current, incoming);
    if (mounted.current) setSessions(sessionsRef.current);
  }, []);

  async function loadOlder() {
    if (loadingRef.current || !cursorRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    setError(null);
    try {
      const result = await getCompanionConversation(
        companionId,
        cursorRef.current,
      );
      if ("error" in result)
        throw new Error("Could not load older messages. Please retry.");
      if (!mounted.current) return;
      // Paging fills older gaps. A session may have been refreshed or saved
      // while this request was in flight; keep that newer local snapshot.
      const known = new Set(sessionsRef.current.map((session) => session.id));
      recordSessions(result.data.filter((session) => !known.has(session.id)));
      cursorRef.current = result.nextCursor;
      setNextCursor(result.nextCursor);
    } catch {
      if (mounted.current)
        setError("Could not load older messages. Please retry.");
    } finally {
      loadingRef.current = false;
      if (mounted.current) setLoading(false);
    }
  }

  return {
    sessions,
    sessionsRef,
    recordSessions,
    loadOlder,
    hasOlder: nextCursor !== null,
    loading,
    error,
  };
}
