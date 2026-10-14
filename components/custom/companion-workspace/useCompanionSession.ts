"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CompanionRow, LearningRecap, SavedMessage } from "@/types";
import { configureAssistant } from "@/lib/utils";
import { saveSessionHistory } from "@/lib/services/sessions-history";
import {
  finishCompanionTextSession,
  sendCompanionTextMessage,
} from "@/lib/services/text-chat";
import { generateLearningRecap } from "@/lib/services/learning-recap";
import {
  canOfferRecap,
  parseSessionMessages,
  readLearningRecap,
  resumableTextSessionId,
  remainingCallSeconds,
  type CompletedVoiceSession,
  type WorkspaceSession,
} from "./session-messages";
import { VoiceSession } from "./voice-session";

type CallStatus = "idle" | "connecting" | "active" | "ending" | "saving";
type VoiceClient = typeof import("@/lib/vapi.sdk").vapi;

export function useCompanionSession(
  companion: CompanionRow,
  userId: string,
  initialSession: WorkspaceSession | null,
) {
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
  const voice = useRef(new VoiceSession());
  const sdk = useRef<VoiceClient | null>(null);
  const endedByUser = useRef(false);
  const mounted = useRef(true);

  const updateCallStatus = useCallback((status: CallStatus) => {
    callStatusRef.current = status;
    if (mounted.current) setCallStatus(status);
  }, []);

  const saveVoice = useCallback(async () => {
    const snapshot = pendingSave.current;
    if (!snapshot || saving.current) return;
    saving.current = true;
    updateCallStatus("saving");
    try {
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
      pendingSave.current = null;
      if (mounted.current) {
        setUnsavedVoice(false);
        setSelectedSessionId(result.data.id);
        setError(null);
        if (canOfferRecap(snapshot)) setRecapSessionId(result.data.id);
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
  }, [companion.id, companion.isPublish, userId, updateCallStatus]);

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
          vapi.setMuted(desiredMuted.current);
          setMuted(vapi.isMuted());
          updateCallStatus("active");
          const content = pendingFirstMessage.current;
          pendingFirstMessage.current = null;
          if (content) {
            try {
              const request = {
                type: "add-message" as const,
                message: { role: "user" as const, content },
                triggerResponseEnabled: true,
              };
              vapi.send(request);
              voice.current.addTypedMessage(content);
              setMessages([...voice.current.messages].reverse());
              setDraft("");
            } catch {
              setError("Could not send your first message. Please try again.");
            }
          }
        };
        const onEnd = () => {
          setSpeaking(false);
          const snapshot = voice.current.finish(endedByUser.current);
          if (!snapshot) {
            updateCallStatus("idle");
            return;
          }
          setCompleted(true);
          pendingSave.current = snapshot;
          setUnsavedVoice(true);
          void saveVoice();
        };
        const onCallId = (event: { callId?: string }) => {
          if (event.callId && event.callId !== "unknown")
            voice.current.callId = event.callId;
        };
        const onMessage = (message: Message) => {
          if (
            message.type !== "transcript" ||
            message.transcriptType !== "final"
          )
            return;
          voice.current.addTranscript({
            role: message.role,
            content: message.transcript,
          });
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
        const onSpeechStart = () => setSpeaking(true);
        const onSpeechEnd = () => setSpeaking(false);
        vapi.on("call-start", onStart);
        vapi.on("call-end", onEnd);
        vapi.on("call-start-success", onCallId);
        vapi.on("message", onMessage);
        vapi.on("error", onError);
        vapi.on("speech-start", onSpeechStart);
        vapi.on("speech-end", onSpeechEnd);
        cleanup = () => {
          vapi.removeListener("call-start", onStart);
          vapi.removeListener("call-end", onEnd);
          vapi.removeListener("call-start-success", onCallId);
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
        // Text chat remains usable if voice configuration is unavailable.
        if (!disposed) setVoiceReady(false);
      });
    return () => {
      disposed = true;
      mounted.current = false;
      cleanup();
    };
  }, [saveVoice, updateCallStatus]);

  const locked =
    busy ||
    callStatus !== "idle" ||
    textSessionId !== null ||
    unsavedVoice ||
    generatingRecap;
  const isNavigationLocked = useCallback(
    () =>
      busyRef.current ||
      callStatusRef.current !== "idle" ||
      textSessionRef.current !== null ||
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

  function openSavedSession(saved: WorkspaceSession, resume = false) {
    if (isNavigationLocked()) return false;
    const resumeId = resume ? resumableTextSessionId(saved) : null;
    if (resume && resumeId === null) return false;
    textSessionRef.current = resumeId;
    setTextSessionId(resumeId);
    setMessages(parseSessionMessages(saved.messages, saved.interaction_mode));
    setMode(saved.interaction_mode);
    setCompleted(!resume);
    setSelectedSessionId(saved.id);
    setViewedSession(saved);
    setRecap(readLearningRecap(saved.learning_recap));
    setRecapSessionId(null);
    setError(null);
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
      busyRef.current ||
      generatingRecapRef.current ||
      pendingSave.current ||
      (callStatusRef.current !== "idle" && callStatusRef.current !== "active")
    )
      return false;
    setError(null);
    if (callStatusRef.current === "active") {
      try {
        const request = {
          type: "add-message" as const,
          message: { role: "user" as const, content },
          triggerResponseEnabled: true,
        };
        sdk.current?.send(request);
        voice.current.addTypedMessage(content);
        setMessages([...voice.current.messages].reverse());
        setDraft("");
        return true;
      } catch {
        setError("Could not send your message. Please try again.");
        return false;
      }
    }
    if (textSessionRef.current === null && sdk.current && companion.slug) {
      return startVoice({ muted: true, firstMessage: content });
    }
    busyRef.current = true;
    setBusy(true);
    try {
      const result = await sendCompanionTextMessage(
        companion.id,
        content,
        textSessionRef.current,
      );
      if ("error" in result)
        throw new Error(result.errorDescription ?? result.error);
      if (!mounted.current) return true;
      textSessionRef.current = result.data.sessionId;
      setTextSessionId(result.data.sessionId);
      setSelectedSessionId(result.data.sessionId);
      setViewedSession(null);
      setMessages(result.data.messages);
      setMode("text");
      setCompleted(false);
      setRecap(null);
      setRecapSessionId(null);
      setDraft("");
      return true;
    } catch (failure) {
      if (mounted.current)
        setError(
          failure instanceof Error
            ? failure.message
            : "Could not send your message. Please try again.",
        );
      return false;
    } finally {
      busyRef.current = false;
      if (mounted.current) setBusy(false);
    }
  }

  async function endText() {
    if (!textSessionRef.current || busyRef.current) return false;
    busyRef.current = true;
    setBusy(true);
    setError(null);
    try {
      const result = await finishCompanionTextSession(textSessionRef.current);
      if ("error" in result)
        throw new Error(result.errorDescription ?? result.error);
      textSessionRef.current = null;
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
    if (
      !sdk.current ||
      !companion.slug ||
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
    updateCallStatus("connecting");
    const client = sdk.current;
    try {
      const call = await client.start(
        configureAssistant(companion.slug, companion.duration ?? 10),
        {
          variableValues: {
            subject: companion.subject,
            topic: companion.topic,
            style: companion.style ? "formal" : "casual",
          },
          // The installed Vapi types incorrectly declare message lists as scalars.
          // @ts-expect-error Vapi accepts an array of client messages.
          clientMessages: ["transcript"],
          // @ts-expect-error Vapi accepts an array of server messages.
          serverMessages: [],
        },
      );
      if (call?.id) voice.current.callId = call.id;
      if (!mounted.current) {
        client.stop();
        return false;
      }
      if (!call && !voice.current.isActive)
        throw new Error("Voice session could not start.");
      return true;
    } catch {
      if (mounted.current) {
        setError(
          "Could not start the voice session. Check microphone access and try again.",
        );
        updateCallStatus("idle");
      }
      pendingFirstMessage.current = null;
      return false;
    }
  }

  function endVoice() {
    if (callStatusRef.current !== "active") return;
    endedByUser.current = true;
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

  return {
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
    startConversation: () => startVoice({ muted: true }),
    endVoice,
    toggleMute,
    retrySave: saveVoice,
    generateRecap,
    dismissRecap: () => setRecapSessionId(null),
  };
}

export type CompanionSessionState = ReturnType<typeof useCompanionSession>;
