"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type Vapi from "@vapi-ai/web";
import type { CompanionRow, LearningRecap, SavedMessage } from "@/types";
import { configureAssistant } from "@/lib/utils";
import { buildConversationContext } from "@/lib/conversation-context";
import { saveSessionHistory } from "@/lib/services/sessions-history";
import { finishCompanionTextSession } from "@/lib/services/text-chat";
import { generateLearningRecap } from "@/lib/services/learning-recap";
import {
  canOfferRecap,
  parseSessionMessages,
  readLearningRecap,
  resumableTextSessionId,
  remainingCallSeconds,
  type CompletedVoiceSession,
  type WorkspaceSession,
  type ConversationPage,
} from "./session-messages";
import { VoiceSession } from "./voice-session";
import { useConversationTimeline } from "./useConversationTimeline";

type CallStatus = "idle" | "connecting" | "active" | "ending" | "saving";
type VoiceClient = Vapi;

export function useCompanionSession(
  companion: CompanionRow,
  userId: string,
  initialSession: WorkspaceSession | null,
  initialConversation?: ConversationPage,
  historyError = false,
) {
  const history = useConversationTimeline(
    companion.id,
    initialSession,
    initialConversation,
  );
  const { recordSessions, sessionsRef } = history;
  const [timelineSessionId, setTimelineSessionId] = useState<number | null>(
    initialSession?.id ?? null,
  );
  const [messages, setMessages] = useState<SavedMessage[]>(() =>
    parseSessionMessages(
      initialSession?.messages ?? null,
      initialSession?.interaction_mode ?? "text",
    ),
  );
  const [mode, setMode] = useState(initialSession?.interaction_mode ?? "text");
  const [textSessionId, setTextSessionId] = useState(() =>
    resumableTextSessionId(initialSession),
  );
  const textSessionRef = useRef(textSessionId);
  const [completed, setCompleted] = useState(
    textSessionId === null && Boolean(initialSession),
  );
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(
    initialSession?.id ?? null,
  );
  const [viewedSession, setViewedSession] = useState<WorkspaceSession | null>(
    initialSession,
  );
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [clockNow, setClockNow] = useState(() => Date.now());
  const desiredMuted = useRef(true);
  const pendingFirstMessage = useRef<string | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [callStatus, setCallStatus] = useState<CallStatus>("idle");
  const callStatusRef = useRef<CallStatus>("idle");
  const [voiceReady, setVoiceReady] = useState(false);
  const [muted, setMuted] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [responsePending, setResponsePending] = useState(false);
  const [callEndedMessage, setCallEndedMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recap, setRecap] = useState<LearningRecap | null>(() =>
    readLearningRecap(initialSession?.learning_recap),
  );
  const [recapSessionId, setRecapSessionId] = useState<number | null>(null);
  const [generatingRecap, setGeneratingRecap] = useState(false);
  const generatingRecapRef = useRef(false);
  const [unsavedVoice, setUnsavedVoice] = useState(false);
  const pendingSave = useRef<CompletedVoiceSession | null>(null);
  const saving = useRef(false);
  const voiceWrites = useRef<Promise<unknown>>(Promise.resolve());
  const autosaveTimer = useRef<number | null>(null);
  const voiceStartedAt = useRef<number | null>(null);
  const voice = useRef(new VoiceSession());
  const sdk = useRef<VoiceClient | null>(null);
  const endedByUser = useRef(false);
  const mounted = useRef(true);

  const updateCallStatus = useCallback((status: CallStatus) => {
    callStatusRef.current = status;
    if (mounted.current) setCallStatus(status);
  }, []);

  const persistVoice = useCallback(
    (snapshot: CompletedVoiceSession) => {
      const write = voiceWrites.current
        .catch(() => {})
        .then(async () => {
          const result = await saveSessionHistory(
            companion.id,
            companion.isPublish ?? false,
            JSON.stringify(snapshot.messages),
            userId,
            snapshot.durationSeconds,
            snapshot.endedByUser,
            snapshot.callId,
          );
          if ("error" in result)
            throw new Error(result.errorDescription ?? result.error);
          return result.data;
        });
      voiceWrites.current = write;
      return write;
    },
    [companion.id, companion.isPublish, userId],
  );

  const recordVoice = useCallback(
    (id: number, snapshot: CompletedVoiceSession, createdAt: string) => {
      recordSessions([
        {
          id,
          created_at: createdAt,
          interaction_mode: "voice",
          canResume: false,
          ended_by_user: snapshot.endedByUser,
          learning_recap: null,
          is_demo: false,
          messages: JSON.stringify(snapshot.messages),
          duration_seconds: snapshot.durationSeconds,
        },
      ]);
      setTimelineSessionId(id);
    },
    [recordSessions],
  );

  const cancelAutosave = useCallback(() => {
    if (autosaveTimer.current !== null)
      window.clearTimeout(autosaveTimer.current);
    autosaveTimer.current = null;
  }, []);

  const scheduleAutosave = useCallback(() => {
    cancelAutosave();
    autosaveTimer.current = window.setTimeout(() => {
      autosaveTimer.current = null;
      const session = voice.current;
      const snapshot = session.snapshot();
      if (!snapshot?.callId || !snapshot.messages.length) return;
      const createdAt = new Date(
        voiceStartedAt.current ?? Date.now(),
      ).toISOString();
      void persistVoice(snapshot)
        .then((data) => {
          if (mounted.current && voice.current === session)
            recordVoice(data.id, snapshot, createdAt);
        })
        .catch((failure) => {
          if (mounted.current)
            setError(
              failure instanceof Error
                ? failure.message
                : "Messages could not be saved. End the session to retry saving.",
            );
        });
    }, 600);
  }, [cancelAutosave, persistVoice, recordVoice]);

  const saveVoice = useCallback(async () => {
    const snapshot = pendingSave.current;
    if (!snapshot || saving.current) return;
    saving.current = true;
    cancelAutosave();
    const createdAt = new Date(
      voiceStartedAt.current ?? Date.now(),
    ).toISOString();
    updateCallStatus("saving");
    try {
      const data = await persistVoice(snapshot);
      pendingSave.current = null;
      if (mounted.current) {
        setUnsavedVoice(false);
        setSelectedSessionId(data.id);
        recordVoice(data.id, snapshot, createdAt);
        setError(null);
        if (canOfferRecap(snapshot)) setRecapSessionId(data.id);
      }
    } catch (failure) {
      if (mounted.current) {
        setUnsavedVoice(true);
        setError(
          failure instanceof Error
            ? failure.message
            : "Could not save this call. Please retry.",
        );
      }
    } finally {
      saving.current = false;
      updateCallStatus("idle");
    }
  }, [cancelAutosave, persistVoice, recordVoice, updateCallStatus]);

  useEffect(() => {
    mounted.current = true;
    let disposed = false;
    let cleanup = () => {};
    void import("@/lib/vapi.sdk")
      .then(({ createVapiClient }) => {
        if (disposed) return;
        const vapi = createVapiClient({ startAudioOff: true });
        sdk.current = vapi;
        setVoiceReady(true);
        const onStart = () => {
          if (callStatusRef.current !== "connecting") return;
          voice.current.begin();
          voiceStartedAt.current = Date.now();
          setTimelineSessionId(null);
          setMessages([]);
          setStartedAt(Date.now());
          setClockNow(Date.now());
          setSelectedSessionId(null);
          setViewedSession(null);
          setMode("voice");
          setCompleted(false);
          setError(null);
          setRecap(null);
          setRecapSessionId(null);
          setResponsePending(true);
          setCallEndedMessage(null);
          vapi.setMuted(desiredMuted.current);
          setMuted(vapi.isMuted());
          updateCallStatus("active");
          const content = pendingFirstMessage.current;
          pendingFirstMessage.current = null;
          if (content) {
            // The first typed turn is already in the assistant's initial
            // context. Sending it here can race the assistant's startup.
            voice.current.addTypedMessage(content);
            scheduleAutosave();
            setMessages([...voice.current.messages].reverse());
            setDraft("");
          }
        };
        const onEnd = () => {
          cancelAutosave();
          setSpeaking(false);
          setResponsePending(false);
          pendingFirstMessage.current = null;
          if (!endedByUser.current)
            setCallEndedMessage(
              (message) =>
                message ??
                "The voice connection closed. Send a message to continue.",
            );
          const snapshot = voice.current.finish(endedByUser.current);
          if (!snapshot) {
            if (!saving.current) updateCallStatus("idle");
            return;
          }
          setCompleted(true);
          pendingSave.current = snapshot;
          setUnsavedVoice(true);
          void saveVoice();
        };
        const onStartSuccess = (event: { callId?: string }) => {
          if (event.callId && event.callId !== "unknown")
            voice.current.callId = event.callId;
          // This SDK attaches its app-message listener after joining Daily,
          // so the "listening" notification behind call-start can be missed.
          // Startup success also confirms the transport is ready. onStart's
          // status guard keeps either event order from starting twice.
          onStart();
          scheduleAutosave();
        };
        const onMessage = (message: Message) => {
          if (message.type === "status-update") {
            if (message.status === "ended" && !endedByUser.current) {
              setResponsePending(false);
              setCallEndedMessage(
                message.endedReason === "silence-timed-out"
                  ? "The session ended after a long pause. Send a message to continue."
                  : message.endedReason === "exceeded-max-duration"
                    ? "Your lesson reached its time limit. Send a message to continue."
                    : "The voice connection closed. Send a message to continue.",
              );
            }
            return;
          }
          if (message.type === "speech-update") {
            if (message.role === "assistant") {
              setSpeaking(message.status === "started");
              if (message.status === "started") setResponsePending(false);
            }
            return;
          }
          if (
            message.type === "transcript" &&
            callStatusRef.current === "active"
          ) {
            if (message.role === "assistant") setResponsePending(false);
            else if (
              message.role === "user" &&
              message.transcriptType === "final"
            )
              setResponsePending(true);
          }
          if (
            message.type !== "transcript" ||
            message.transcriptType !== "final"
          )
            return;
          voice.current.addTranscript({
            role: message.role,
            content: message.transcript,
          });
          scheduleAutosave();
          if (
            callStatusRef.current === "active" ||
            callStatusRef.current === "ending"
          )
            setMessages([...voice.current.messages].reverse());
        };
        const onError = () => {
          setError("The voice connection failed. Please try again.");
          // Vapi also emits recoverable audio setup errors. Only an actual
          // failed start or call-end should return the controls to idle.
        };
        const onSpeechStart = () => {
          setResponsePending(false);
          setSpeaking(true);
        };
        const onSpeechEnd = () => setSpeaking(false);
        vapi.on("call-start", onStart);
        vapi.on("call-end", onEnd);
        vapi.on("call-start-success", onStartSuccess);
        vapi.on("message", onMessage);
        vapi.on("error", onError);
        vapi.on("speech-start", onSpeechStart);
        vapi.on("speech-end", onSpeechEnd);
        cleanup = () => {
          cancelAutosave();
          vapi.removeListener("call-start", onStart);
          vapi.removeListener("call-end", onEnd);
          vapi.removeListener("call-start-success", onStartSuccess);
          vapi.removeListener("message", onMessage);
          vapi.removeListener("error", onError);
          vapi.removeListener("speech-start", onSpeechStart);
          vapi.removeListener("speech-end", onSpeechEnd);
          const snapshot = voice.current.finish(false);
          if (snapshot) {
            pendingSave.current = snapshot;
            void saveVoice();
          }
          if (callStatusRef.current !== "idle") vapi.stop();
          sdk.current = null;
        };
      })
      .catch(() => {
        if (!disposed) setVoiceReady(false);
      });
    return () => {
      disposed = true;
      mounted.current = false;
      cleanup();
    };
  }, [saveVoice, updateCallStatus, scheduleAutosave, cancelAutosave]);

  const locked =
    busy || callStatus !== "idle" || unsavedVoice || generatingRecap;
  const isNavigationLocked = useCallback(
    () =>
      busyRef.current ||
      callStatusRef.current !== "idle" ||
      pendingSave.current !== null ||
      generatingRecapRef.current,
    [],
  );
  const durationSeconds = Math.max(1, companion.duration ?? 10) * 60;
  const remainingSeconds = remainingCallSeconds(
    startedAt,
    durationSeconds,
    clockNow,
  );
  useEffect(() => {
    if (callStatus !== "active") return;
    const timer = window.setInterval(() => setClockNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [callStatus]);

  useEffect(() => {
    if (!responsePending || callStatus !== "active") return;
    const timer = window.setTimeout(() => {
      setResponsePending(false);
      setError(
        "The assistant has not responded. Try sending again, or end the session and retry.",
      );
    }, 45_000);
    return () => window.clearTimeout(timer);
  }, [responsePending, callStatus]);

  function openSavedSession(saved: WorkspaceSession, resume = false) {
    if (isNavigationLocked()) return false;
    const resumeId = resume ? resumableTextSessionId(saved) : null;
    if (resume && resumeId === null) return false;
    textSessionRef.current = resumeId;
    setTextSessionId(resumeId);
    recordSessions([saved]);
    setTimelineSessionId(saved.id);
    setMessages(parseSessionMessages(saved.messages, saved.interaction_mode));
    setMode(saved.interaction_mode);
    setCompleted(!resume);
    setSelectedSessionId(saved.id);
    setViewedSession(saved);
    setRecap(readLearningRecap(saved.learning_recap));
    setRecapSessionId(null);
    setError(null);
    setCallEndedMessage(null);
    return true;
  }
  useEffect(() => {
    if (!locked) return;
    const onUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", onUnload);
    return () => window.removeEventListener("beforeunload", onUnload);
  }, [locked]);

  async function send() {
    const content = draft.trim();
    if (
      !content ||
      historyError ||
      busyRef.current ||
      generatingRecapRef.current ||
      pendingSave.current ||
      (callStatusRef.current !== "idle" && callStatusRef.current !== "active")
    )
      return false;
    setError(null);
    setCallEndedMessage(null);
    if (callStatusRef.current === "active") {
      try {
        const request = {
          type: "add-message" as const,
          message: { role: "user" as const, content },
          triggerResponseEnabled: true,
        };
        sdk.current?.send(request);
        setResponsePending(true);
        voice.current.addTypedMessage(content);
        scheduleAutosave();
        setMessages([...voice.current.messages].reverse());
        setDraft("");
        return true;
      } catch {
        setError("Could not send your message. Please try again.");
        return false;
      }
    }
    return startVoice({ muted: true, firstMessage: content });
  }

  async function endText() {
    if (!textSessionRef.current || busyRef.current) return false;
    busyRef.current = true;
    setBusy(true);
    setError(null);
    setCallEndedMessage(null);
    const endingSessionId = textSessionRef.current;
    try {
      const result = await finishCompanionTextSession(textSessionRef.current);
      if ("error" in result)
        throw new Error(result.errorDescription ?? result.error);
      textSessionRef.current = null;
      const saved = sessionsRef.current.find(
        (session) => session.id === endingSessionId,
      );
      if (saved)
        recordSessions([{ ...saved, ended_by_user: true, canResume: false }]);
      setTextSessionId(null);
      setCompleted(true);
      setViewedSession(null);
      return true;
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Could not end this session. Please retry.",
      );
      return false;
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  async function startVoice(
    options: { muted?: boolean; firstMessage?: string } = {},
  ) {
    if (!sdk.current || !companion.slug) {
      if (mounted.current)
        setError("Voice chat is not ready yet. Please try again.");
      return false;
    }
    if (
      historyError ||
      callStatusRef.current !== "idle" ||
      busyRef.current ||
      generatingRecapRef.current ||
      pendingSave.current
    )
      return false;
    if (textSessionRef.current !== null) {
      const ended = await endText();
      if (!ended || !mounted.current) return false;
    }
    voice.current = new VoiceSession();
    desiredMuted.current = options.muted ?? false;
    pendingFirstMessage.current = options.firstMessage ?? null;
    endedByUser.current = false;
    setError(null);
    setCallEndedMessage(null);
    updateCallStatus("connecting");
    const client = sdk.current;
    try {
      const assistant = configureAssistant(
        companion.slug,
        companion.duration ?? 10,
      );
      const context = buildConversationContext(
        sessionsRef.current
          .filter((session) => !session.is_demo)
          .flatMap((session) =>
            parseSessionMessages(session.messages, session.interaction_mode),
          ),
      );
      if (assistant.model && "messages" in assistant.model)
        assistant.model.messages = [
          ...(assistant.model.messages ?? []),
          ...context,
          ...(options.firstMessage
            ? [{ role: "user" as const, content: options.firstMessage }]
            : []),
        ];
      // Put runtime settings on the transient assistant itself so the call
      // configuration includes them alongside the model and voice settings.
      assistant.silenceTimeoutSeconds = Math.min(durationSeconds, 3600);
      if (options.firstMessage || context.length) {
        delete assistant.firstMessage;
        assistant.firstMessageMode =
          "assistant-speaks-first-with-model-generated-message";
      }
      // @ts-expect-error Vapi accepts an array despite its generated scalar type.
      assistant.clientMessages = ["transcript", "speech-update", "status-update"];
      const call = await client.start(assistant, {
        variableValues: {
          subject: companion.subject,
          topic: companion.topic,
          style: companion.style ? "formal" : "casual",
        },
      });
      if (call?.id) voice.current.callId = call.id;
      if (!mounted.current) {
        client.stop();
        return false;
      }
      scheduleAutosave();
      if (!call && !voice.current.isActive)
        throw new Error("Voice session could not start.");
      return true;
    } catch {
      if (mounted.current) {
        setError(
          "Could not start the voice session. Check microphone access and try again.",
        );
        updateCallStatus("idle");
        setResponsePending(false);
      }
      pendingFirstMessage.current = null;
      return false;
    }
  }

  function endVoice() {
    if (callStatusRef.current !== "active") return;
    endedByUser.current = true;
    setResponsePending(false);
    updateCallStatus("ending");
    sdk.current?.stop();
  }

  function toggleMute() {
    if (!sdk.current || callStatusRef.current !== "active") return;
    sdk.current.setMuted(!sdk.current.isMuted());
    setMuted(sdk.current.isMuted());
  }

  async function generateRecap() {
    if (
      !recapSessionId ||
      generatingRecapRef.current ||
      busyRef.current ||
      callStatusRef.current !== "idle" ||
      pendingSave.current ||
      textSessionRef.current !== null
    )
      return;
    generatingRecapRef.current = true;
    setGeneratingRecap(true);
    setError(null);
    try {
      const result = await generateLearningRecap(recapSessionId);
      if ("error" in result)
        throw new Error(result.errorDescription ?? result.error);
      if (!mounted.current) return;
      setRecap(result.data);
      setRecapSessionId(null);
    } catch (failure) {
      if (mounted.current)
        setError(
          failure instanceof Error
            ? failure.message
            : "Could not generate the recap. Please retry.",
        );
    } finally {
      generatingRecapRef.current = false;
      if (mounted.current) setGeneratingRecap(false);
    }
  }

  const conversationSections = history.sessions.map((session) => ({
    key: `session-${session.id}`,
    id: session.id,
    createdAt: session.created_at,
    mode: session.interaction_mode,
    isDemo: session.is_demo ?? false,
    messages:
      session.id === timelineSessionId
        ? messages
        : parseSessionMessages(session.messages, session.interaction_mode),
  }));
  if (timelineSessionId === null && messages.length)
    conversationSections.push({
      key: "active",
      id: -1,
      createdAt: new Date(voiceStartedAt.current ?? Date.now()).toISOString(),
      mode,
      isDemo: false,
      messages,
    });

  return {
    conversationSections,
    savedSessions: history.sessions,
    loadOlderHistory: history.loadOlder,
    hasOlderHistory: history.hasOlder,
    historyLoading: history.loading,
    historyLoadError: history.error,
    messages,
    mode,
    completed,
    selectedSessionId,
    viewedSession,
    openSavedSession,
    durationSeconds,
    remainingSeconds,
    draft,
    setDraft,
    busy,
    callStatus,
    voiceReady,
    muted,
    speaking,
    responsePending,
    callEndedMessage,
    error,
    locked,
    isNavigationLocked,
    textSessionId,
    unsavedVoice,
    recap,
    recapSessionId,
    generatingRecap,
    send,
    endText,
    startVoice,
    endVoice,
    toggleMute,
    retrySave: saveVoice,
    generateRecap,
    dismissRecap: () => setRecapSessionId(null),
  };
}

export type CompanionSessionState = ReturnType<typeof useCompanionSession>;
