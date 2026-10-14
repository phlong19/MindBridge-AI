"use client";

import {
  cn,
  configureAssistant,
  getSubjectColor,
  getToastStyle,
} from "@/lib/utils";
import { vapi } from "@/lib/vapi.sdk";
import Image from "next/image";
import {
  FormEvent,
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import Lottie, { LottieRefCurrentProps } from "lottie-react";
import soundWaveAnimation from "@/constants/sound-voice.json";
import { AssistantOverrides } from "@vapi-ai/web/dist/api";
import { CompanionComponentProps, LearningRecap, SavedMessage } from "@/types";
import { TypographyP } from "../ui/Typography";
import { toast } from "sonner";
import { error as errorMessage } from "@/constants/message";
import { saveSessionHistory } from "@/lib/services/sessions-history";
import { generateLearningRecap } from "@/lib/services/learning-recap";
import { Button } from "../ui/Button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "../ui/Drawer";
import { Expand, MessageSquareText, Send, Sparkles, X } from "lucide-react";
import {
  finishCompanionTextSession,
  sendCompanionTextMessage,
} from "@/lib/services/text-chat";

enum ECallStatus {
  INACTIVE = "INACTIVE",
  CONNECTING = "CONNECTING",
  ACTIVE = "ACTIVE",
  FINISHED = "FINISHED",
}

interface VapiErrorMessage {
  action: string;
  callClientId: string;
  error: {
    details?: string;
    msg?: string;
    type?: string;
  };
  errorMsg?: string;
}

// copy from Vapi because this one not expose
// prettier-ignore
type VapiEventNames = "call-end" | "call-start" | "volume-level" | "speech-start"
  | "speech-end" | "message" | "video" | "error" | "camera-error" | "network-quality-change"
  | "network-connection" | "daily-participant-updated" | "call-start-progress"
  | "call-start-success" | "call-start-failed";

function CompanionInterlink({
  subject,
  name,
  companionId,
  style,
  topic,
  slug,
  userImage,
  userName,
  photoUrl,
  duration,
  fetchedMessages,
  fetchedRecap,
  isPublish,
  author,
  userId,
}: CompanionComponentProps) {
  const lottieRef = useRef<LottieRefCurrentProps>(null);
  const [callStatus, setCallStatus] = useState<ECallStatus>(
    ECallStatus.INACTIVE,
  );
  const [isStoppingCall, setIsStoppingCall] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [messages, setMessages] = useState<SavedMessage[]>(
    author === userId && fetchedMessages
      ? (JSON.parse(fetchedMessages) as SavedMessage[])
      : [],
  );
  const [isTranscriptOpen, setIsTranscriptOpen] = useState(false);
  const [learningRecap, setLearningRecap] = useState<LearningRecap | null>(
    fetchedRecap ?? null,
  );
  const [recapSessionId, setRecapSessionId] = useState<number | null>(null);
  const [isRecapOfferOpen, setIsRecapOfferOpen] = useState(false);
  const [isGeneratingRecap, setIsGeneratingRecap] = useState(false);
  const [isTextChatOpen, setIsTextChatOpen] = useState(false);
  const [textChatMessages, setTextChatMessages] = useState<SavedMessage[]>([]);
  const [textChatDraft, setTextChatDraft] = useState("");
  const [isSendingTextChat, setIsSendingTextChat] = useState(false);
  const [textChatSessionId, setTextChatSessionId] = useState<number | null>(
    null,
  );
  const [chatWindowPosition, setChatWindowPosition] = useState<{
    left: number;
    top: number;
  } | null>(null);
  const messageRef = useRef<SavedMessage[]>(messages);
  const callStartedAtRef = useRef<number | null>(null);
  const vapiCallIdRef = useRef<string | null>(null);
  const userEndedCallRef = useRef(false);
  const pendingTypedMessagesRef = useRef<string[]>([]);
  const chatWindowRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLTextAreaElement>(null);
  const dragStartRef = useRef<{
    pointerId: number;
    pointerX: number;
    pointerY: number;
    left: number;
    top: number;
  } | null>(null);

  useEffect(() => {
    if (lottieRef) {
      if (isSpeaking) {
        lottieRef.current?.play();
      } else {
        lottieRef.current?.stop();
      }
    }
  }, [isSpeaking]);

  useEffect(() => {
    if (isTextChatOpen) chatInputRef.current?.focus();
  }, [isTextChatOpen]);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const actions: { event: VapiEventNames; method: (arg0?: any) => void }[] = [
      {
        event: "call-start",
        method: () => {
          callStartedAtRef.current = Date.now();
          vapiCallIdRef.current = null;
          userEndedCallRef.current = false;
          pendingTypedMessagesRef.current = [];
          messageRef.current = [];
          setIsStoppingCall(false);
          setMessages([]);
          setLearningRecap(null);
          setRecapSessionId(null);
          setIsRecapOfferOpen(false);
          setCallStatus(ECallStatus.ACTIVE);
        },
      },
      {
        event: "call-end",
        method: () => {
          setIsStoppingCall(false);
          setCallStatus(ECallStatus.FINISHED);
          if (!callStartedAtRef.current) return;

          const durationSeconds = callStartedAtRef.current
            ? Math.max(
                0,
                Math.floor((Date.now() - callStartedAtRef.current) / 1000),
              )
            : 0;
          const endedByUser = userEndedCallRef.current;
          const vapiCallId = vapiCallIdRef.current;
          const completedMessages = [...messageRef.current];
          const hasEnoughStudentTurns =
            completedMessages.filter((message) => message.role === "user")
              .length >= 2;
          callStartedAtRef.current = null;
          vapiCallIdRef.current = null;
          userEndedCallRef.current = false;

          void saveSessionHistory(
            companionId,
            isPublish ?? false,
            JSON.stringify(completedMessages),
            userId,
            durationSeconds,
            endedByUser,
            vapiCallId,
          )
            .then((result) => {
              if ("error" in result) {
                toast.error(result.error, {
                  ...getToastStyle("error"),
                  description: result.errorDescription,
                });
                return;
              }

              if (
                endedByUser &&
                vapiCallId &&
                durationSeconds >= 60 &&
                hasEnoughStudentTurns
              ) {
                setRecapSessionId(result.data.id);
                setIsRecapOfferOpen(true);
              }
            })
            .catch(() => {
              toast.error(errorMessage.sessionHistorySaveFail, {
                ...getToastStyle("error"),
              });
            });
        },
      },
      {
        event: "call-start-success",
        method: (event: { callId?: string }) => {
          if (event.callId && event.callId !== "unknown") {
            vapiCallIdRef.current = event.callId;
          }
        },
      },
      {
        event: "message",
        method: (message: Message) => {
          if (
            message.type === "transcript" &&
            message.transcriptType === "final"
          ) {
            const newMessage = {
              role: message.role,
              content: message.transcript,
            };
            if (message.role === "user") {
              const pendingIndex = pendingTypedMessagesRef.current.indexOf(
                message.transcript,
              );
              if (pendingIndex >= 0) {
                pendingTypedMessagesRef.current.splice(pendingIndex, 1);
                return;
              }
            }
            messageRef.current = [newMessage, ...messageRef.current];
            setMessages(messageRef.current);
          }
        },
      },
      {
        event: "error",
        method: (error: VapiErrorMessage) => {
          console.log("error", error);

          toast.error(errorMessage.serverError, {
            ...getToastStyle("error"),
            description: error?.errorMsg && (error.errorMsg || error.error.msg),
          });
        },
      },
      { event: "speech-start", method: () => setIsSpeaking(true) },
      { event: "speech-end", method: () => setIsSpeaking(false) },
    ];

    // bind
    for (const action of actions) {
      vapi.on(action.event, action.method);
    }

    // unbind
    return () => {
      for (const action of actions) {
        vapi.off(action.event, action.method);
      }
    };
  }, [companionId, isPublish, userId]);

  function onToggleMicrophone() {
    vapi.setMuted(!isMuted);
    setIsMuted((prev) => !prev);
  }

  async function handleTextChatSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = textChatDraft.trim();
    if (!content || isSendingTextChat) return;
    setTextChatDraft("");

    if (callStatus === ECallStatus.ACTIVE) {
      const userMessage: SavedMessage = { role: "user", content };
      try {
        vapi.send({
          type: "add-message",
          message: { role: "user", content },
        });
        pendingTypedMessagesRef.current.push(content);
        messageRef.current = [userMessage, ...messageRef.current];
        setMessages(messageRef.current);
        return;
      } catch {
        toast.error(errorMessage.serverError, getToastStyle("error"));
        setTextChatDraft(content);
        return;
      }
    }

    setIsSendingTextChat(true);
    try {
      const result = await sendCompanionTextMessage(
        companionId,
        content,
        textChatSessionId,
      );
      if ("error" in result) {
        toast.error(result.error, {
          ...getToastStyle("error"),
          description: result.errorDescription,
        });
        setTextChatDraft(content);
        return;
      }

      setTextChatSessionId(result.data.sessionId);
      setTextChatMessages(result.data.messages);
    } catch {
      toast.error(errorMessage.serverError, getToastStyle("error"));
      setTextChatDraft(content);
    } finally {
      setIsSendingTextChat(false);
    }
  }

  function handleChatDragStart(event: ReactPointerEvent<HTMLDivElement>) {
    if ((event.target as HTMLElement).closest("button")) return;
    const rect = chatWindowRef.current?.getBoundingClientRect();
    if (!rect) return;

    dragStartRef.current = {
      pointerId: event.pointerId,
      pointerX: event.clientX,
      pointerY: event.clientY,
      left: rect.left,
      top: rect.top,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    setChatWindowPosition({ left: rect.left, top: rect.top });
  }

  function handleChatDragMove(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragStartRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const panel = chatWindowRef.current;
    const width = panel?.offsetWidth ?? 384;
    const height = panel?.offsetHeight ?? 520;
    setChatWindowPosition({
      left: Math.min(
        Math.max(12, drag.left + event.clientX - drag.pointerX),
        window.innerWidth - width - 12,
      ),
      top: Math.min(
        Math.max(12, drag.top + event.clientY - drag.pointerY),
        window.innerHeight - height - 12,
      ),
    });
  }

  function handleChatDragEnd(event: ReactPointerEvent<HTMLDivElement>) {
    if (dragStartRef.current?.pointerId === event.pointerId) {
      dragStartRef.current = null;
    }
  }

  function handleChatHandleKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if ((event.target as HTMLElement).closest("button")) return;
    if (
      !["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)
    ) {
      return;
    }
    event.preventDefault();
    const rect = chatWindowRef.current?.getBoundingClientRect();
    if (!rect) return;

    const distance = event.shiftKey ? 48 : 20;
    const left =
      rect.left +
      (event.key === "ArrowLeft"
        ? -distance
        : event.key === "ArrowRight"
          ? distance
          : 0);
    const top =
      rect.top +
      (event.key === "ArrowUp"
        ? -distance
        : event.key === "ArrowDown"
          ? distance
          : 0);
    setChatWindowPosition({
      left: Math.min(Math.max(12, left), window.innerWidth - rect.width - 12),
      top: Math.min(Math.max(12, top), window.innerHeight - rect.height - 12),
    });
  }

  async function handleEndTextChat() {
    if (textChatSessionId) {
      const result = await finishCompanionTextSession(textChatSessionId);
      if ("error" in result) {
        toast.error(result.error, {
          ...getToastStyle("error"),
          description: result.errorDescription,
        });
        return;
      }
    }

    setTextChatSessionId(null);
    setTextChatMessages([]);
    setIsTextChatOpen(false);
  }

  async function handleConnect() {
    setCallStatus(ECallStatus.CONNECTING);
    const assistantOverrides: AssistantOverrides = {
      variableValues: {
        subject,
        topic,
        style,
      },
      //@ts-expect-error wrong value define
      clientMessages: ["transcript"],
      //@ts-expect-error wrong value define
      serverMessages: [],
    };

    vapi.start(configureAssistant(slug!, duration!), assistantOverrides);
  }

  function handleDisconnect() {
    userEndedCallRef.current = true;
    setIsStoppingCall(true);
    vapi.stop();
  }

  async function handleGenerateRecap() {
    if (!recapSessionId) return;

    setIsGeneratingRecap(true);
    try {
      const result = await generateLearningRecap(recapSessionId);
      if ("error" in result) {
        toast.error(result.error, {
          ...getToastStyle("error"),
          description: result.errorDescription,
        });
        return;
      }

      setLearningRecap(result.data);
      setIsRecapOfferOpen(false);
      setRecapSessionId(null);
    } catch {
      toast.error(errorMessage.serverError, getToastStyle("error"));
    } finally {
      setIsGeneratingRecap(false);
    }
  }

  function renderMessages() {
    return messages.map(({ content, role }, index) =>
      role === "assistant" ? (
        <TypographyP key={index} className="max-sm:text-sm">
          {name?.split(" ")[0].replace("/[,.]/g/", "")}: {content}
        </TypographyP>
      ) : (
        <TypographyP key={index} className="text-primary max-sm:text-sm">
          {userName}: {content}
        </TypographyP>
      ),
    );
  }

  return (
    <section className="flex h-[70dvh] flex-col">
      <section className="flex gap-8 max-sm:flex-col">
        <div className="companion-section">
          <div
            className="companion-avatar"
            style={
              photoUrl ? {} : { backgroundColor: getSubjectColor(subject!) }
            }
          >
            <div
              className={cn(
                "absolute z-[2] transition-opacity duration-100",
                callStatus === ECallStatus.CONNECTING && "animate-pulse",
              )}
            >
              <Image
                className="size-44 rounded-lg max-sm:size-24"
                width={128}
                height={128}
                src={photoUrl ? photoUrl : `/icons/${subject}.svg`}
                alt={photoUrl ? name! : subject!}
                unoptimized
              />
            </div>

            <div
              className={cn(
                "absolute z-[1] transition-opacity duration-1000",
                callStatus === ECallStatus.ACTIVE ? "opacity-100" : "opacity-0",
              )}
            >
              <Lottie
                lottieRef={lottieRef}
                animationData={soundWaveAnimation}
                className="companion-lottie"
                autoPlay
              />
            </div>
          </div>

          <p className="text-xl font-bold">{name}</p>
        </div>

        <div className="user-section">
          <div className="user-avatar">
            <Image
              priority
              src={userImage!}
              alt={userName || "user avatar"}
              height={130}
              width={130}
              className="rounded-md"
            />
            <p className="text-xl font-bold">{userName}</p>
          </div>

          <button
            className="btn-mic"
            type="button"
            onClick={onToggleMicrophone}
            disabled={callStatus !== ECallStatus.ACTIVE}
          >
            <Image
              src={isMuted ? "/icons/mic-off.svg" : "/icons/mic-on.svg"}
              alt="microphone icon"
              height={36}
              width={36}
            />
            <p className="max-sm:hidden">
              Turn {isMuted ? "on" : "off"} microphone
            </p>
          </button>

          <button
            type="button"
            className="btn-mic"
            onClick={() => setIsTextChatOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={isTextChatOpen}
            aria-label="Open text chat"
            title="Open text chat"
          >
            <MessageSquareText aria-hidden="true" className="size-8" />
            <p className="max-sm:hidden">Open text chat</p>
          </button>

          <button
            type="button"
            className={cn(
              "w-full cursor-pointer rounded-lg py-2 text-white capitalize transition-colors",
              callStatus === ECallStatus.ACTIVE ? "bg-red-700" : "bg-primary",
              callStatus === ECallStatus.CONNECTING && "animate-pulse",
            )}
            onClick={
              callStatus === ECallStatus.ACTIVE
                ? handleDisconnect
                : handleConnect
            }
            disabled={
              callStatus === ECallStatus.CONNECTING ||
              isStoppingCall ||
              isSendingTextChat ||
              (textChatSessionId !== null && callStatus !== ECallStatus.ACTIVE)
            }
            title={
              textChatSessionId !== null && callStatus !== ECallStatus.ACTIVE
                ? "End the text session before starting a voice session"
                : undefined
            }
          >
            {isStoppingCall
              ? "ending session"
              : callStatus === ECallStatus.ACTIVE
                ? "end session"
                : callStatus === ECallStatus.CONNECTING
                  ? "connecting"
                  : textChatSessionId !== null
                    ? "end text chat first"
                    : "start session"}
          </button>
        </div>
      </section>

      <section className="transcript">
        <div className="transcript-message no-scrollbar">
          {renderMessages()}
        </div>
        <div className="transcript-fade"></div>
        {messages.length > 0 && (
          <Button
            aria-label="View full chat"
            title="View full chat"
            onClick={() => setIsTranscriptOpen(true)}
            className="absolute right-0 rounded-full !p-2.5"
          >
            <Expand className="size-4" />
          </Button>
        )}
      </section>

      {(isRecapOfferOpen || learningRecap) && (
        <section className="bg-card mt-4 rounded-xl border p-4">
          <div className="mb-3 flex items-center gap-2 font-semibold">
            <Sparkles className="text-primary size-4" />
            <h2>
              {learningRecap ? "Learning recap" : "Create a learning recap?"}
            </h2>
          </div>
          {learningRecap ? (
            <div className="space-y-4 text-sm">
              <p>{learningRecap.summary}</p>
              {learningRecap.topicsLearned.length > 0 && (
                <div>
                  <p className="mb-1 font-medium">Topics covered</p>
                  <ul className="list-inside list-disc space-y-1">
                    {learningRecap.topicsLearned.map((item, index) => (
                      <li key={`topic-${index}`}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
              {learningRecap.strengths.length > 0 && (
                <div>
                  <p className="mb-1 font-medium">What went well</p>
                  <ul className="list-inside list-disc space-y-1">
                    {learningRecap.strengths.map((item, index) => (
                      <li key={`strength-${index}`}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
              {learningRecap.tryNext.length > 0 && (
                <div>
                  <p className="mb-1 font-medium">Try next</p>
                  <ul className="list-inside list-disc space-y-1">
                    {learningRecap.tryNext.map((item, index) => (
                      <li key={`next-${index}`}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <>
              <p className="text-muted-foreground mb-3 text-sm">
                Your session was long enough. Vapi will analyze the saved call
                transcript only if you choose Generate.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  onClick={handleGenerateRecap}
                  disabled={isGeneratingRecap}
                >
                  {isGeneratingRecap ? "Generating…" : "Generate recap"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={isGeneratingRecap}
                  onClick={() => {
                    setIsRecapOfferOpen(false);
                    setRecapSessionId(null);
                  }}
                >
                  Not now
                </Button>
              </div>
            </>
          )}
        </section>
      )}

      {isTextChatOpen && (
        <div
          ref={chatWindowRef}
          role="dialog"
          aria-modal="false"
          aria-labelledby="companion-text-chat-title"
          className="bg-background fixed right-4 bottom-4 z-50 flex h-[min(34rem,calc(100dvh-2rem))] w-[min(24rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border shadow-2xl"
          style={
            chatWindowPosition
              ? {
                  left: chatWindowPosition.left,
                  top: chatWindowPosition.top,
                  right: "auto",
                  bottom: "auto",
                }
              : undefined
          }
        >
          <div
            className="bg-primary text-primary-foreground focus-visible:ring-ring flex cursor-move touch-none items-center justify-between gap-3 px-4 py-3 select-none focus-visible:ring-2 focus-visible:outline-none"
            onPointerDown={handleChatDragStart}
            onPointerMove={handleChatDragMove}
            onPointerUp={handleChatDragEnd}
            onPointerCancel={handleChatDragEnd}
            onKeyDown={handleChatHandleKeyDown}
            tabIndex={0}
            aria-label="Move text chat window with arrow keys"
            title="Drag to move. Use arrow keys to reposition."
          >
            <div className="min-w-0">
              <h2
                id="companion-text-chat-title"
                className="truncate font-semibold"
              >
                Chat with {name}
              </h2>
              <p className="text-primary-foreground/80 text-xs">
                {callStatus === ECallStatus.ACTIVE
                  ? "Connected to your voice session"
                  : "Text session · no microphone needed"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsTextChatOpen(false)}
              className="focus-visible:ring-ring rounded-md p-1.5 hover:bg-white/15 focus-visible:ring-2 focus-visible:outline-none"
              aria-label="Close text chat"
            >
              <X className="size-5" />
            </button>
          </div>

          <div
            className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-4"
            role="log"
            aria-live="polite"
            aria-relevant="additions text"
            aria-label="Conversation with companion"
          >
            {(callStatus === ECallStatus.ACTIVE
              ? messages.slice().reverse()
              : textChatMessages
            ).map((message, index) => (
              <div
                key={`${index}-${message.role}`}
                className={cn(
                  "max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                  message.role === "user"
                    ? "bg-primary text-primary-foreground ml-auto rounded-br-sm"
                    : "bg-muted rounded-bl-sm",
                )}
              >
                {message.content}
              </div>
            ))}
            {isSendingTextChat && (
              <p className="text-muted-foreground text-sm" role="status">
                {name} is thinking…
              </p>
            )}
            {!textChatMessages.length && callStatus !== ECallStatus.ACTIVE && (
              <p className="text-muted-foreground m-auto max-w-xs text-center text-sm">
                Ask about {topic || subject}. You can chat here without turning
                on your microphone.
              </p>
            )}
          </div>

          <form onSubmit={handleTextChatSubmit} className="border-t p-3">
            {callStatus !== ECallStatus.ACTIVE && (
              <p className="text-muted-foreground mb-2 text-xs">
                Messages are processed by Vapi to generate replies.
              </p>
            )}
            <label className="sr-only" htmlFor="companion-text-chat-input">
              Message {name}
            </label>
            <div className="flex items-end gap-2">
              <textarea
                ref={chatInputRef}
                id="companion-text-chat-input"
                value={textChatDraft}
                onChange={(event) => setTextChatDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    event.currentTarget.form?.requestSubmit();
                  }
                }}
                placeholder="Type your message…"
                rows={2}
                maxLength={2_000}
                className="border-input placeholder:text-muted-foreground focus-visible:ring-ring max-h-32 min-h-11 flex-1 resize-y rounded-xl border bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-2"
                disabled={isSendingTextChat}
              />
              <Button
                type="submit"
                size="icon"
                className="size-11 rounded-xl"
                disabled={!textChatDraft.trim() || isSendingTextChat}
                aria-label="Send message"
              >
                <Send className="size-4" />
              </Button>
            </div>
            {textChatSessionId !== null &&
              callStatus !== ECallStatus.ACTIVE && (
                <Button
                  type="button"
                  variant="link"
                  className="mt-1 h-auto px-0 text-xs"
                  onClick={handleEndTextChat}
                  disabled={isSendingTextChat}
                >
                  End text session
                </Button>
              )}
          </form>
        </div>
      )}

      <Drawer
        open={isTranscriptOpen}
        direction="right"
        onOpenChange={setIsTranscriptOpen}
      >
        <DrawerContent
          aria-describedby="Full Conversation View Panel"
          className="ml-auto w-full max-w-lg px-4"
        >
          <DrawerHeader className="flex flex-row items-center justify-between px-0 text-xl">
            <DrawerTitle>Full Conversation</DrawerTitle>
            <DrawerClose className="cursor-pointer">
              <X />
            </DrawerClose>
          </DrawerHeader>
          <hr className="pb-3" />
          <div className="space-y-1 overflow-y-auto pb-4">
            {renderMessages()}
          </div>
        </DrawerContent>
      </Drawer>
    </section>
  );
}

export default CompanionInterlink;
