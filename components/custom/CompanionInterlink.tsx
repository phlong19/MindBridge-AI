"use client";

import {
  cn,
  configureAssistant,
  getSubjectColor,
  getToastStyle,
} from "@/lib/utils";
import { vapi } from "@/lib/vapi.sdk";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import Lottie, { LottieRefCurrentProps } from "lottie-react";
import soundWaveAnimation from "@/constants/sound-voice.json";
import { AssistantOverrides } from "@vapi-ai/web/dist/api";
import { CompanionComponentProps, SavedMessage } from "@/types";
import { TypographyP } from "../ui/Typography";
import { toast } from "sonner";
import { error as errorMessage } from "@/constants/message";
import { saveSessionHistory } from "@/lib/services/sessions-history";
import { Button } from "../ui/Button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "../ui/Drawer";
import { Expand, X } from "lucide-react";

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
  isPublish,
  author,
  userId,
  sessionId,
}: CompanionComponentProps) {
  const lottieRef = useRef<LottieRefCurrentProps>(null);
  const [callStatus, setCallStatus] = useState<ECallStatus>(
    ECallStatus.INACTIVE,
  );
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [messages, setMessages] = useState<SavedMessage[]>(
    author === userId && fetchedMessages
      ? (JSON.parse(fetchedMessages) as SavedMessage[])
      : [],
  );
  const [isTranscriptOpen, setIsTranscriptOpen] = useState(false);
  const messageRef = useRef<SavedMessage[]>(messages);
  useEffect(() => {
    if (lottieRef) {
      if (isSpeaking) {
        lottieRef.current?.play();
      } else {
        lottieRef.current?.stop();
      }
    }
  });

  // know bugs
  // 1. has to be second click to really turn on the mic at first time

  useEffect(() => {
    messageRef.current = messages;
  }, [messages]);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const actions: { event: VapiEventNames; method: (arg0?: any) => void }[] = [
      {
        event: "call-start",
        method: () => {
          setMessages([]);
          setCallStatus(ECallStatus.ACTIVE);
        },
      },
      {
        event: "call-end",
        method: () => {
          setCallStatus(ECallStatus.FINISHED);
          saveSessionHistory(
            companionId,
            isPublish ?? false,
            JSON.stringify(messageRef.current),
            userId,
            sessionId,
          ).then(
            (res) =>
              !!res?.error &&
              toast.error(res.error, {
                ...getToastStyle("error"),
                description: res.errorDescription,
              }),
          );
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
            setMessages((prev) => [newMessage, ...prev]);
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
  }, []);

  function onToggleMicrophone() {
    const isMuted = vapi.isMuted();
    vapi.setMuted(!isMuted);
    setIsMuted(!isMuted);
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
    setCallStatus(ECallStatus.FINISHED);
    vapi.stop();
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
          >
            {callStatus === ECallStatus.ACTIVE
              ? "end session"
              : callStatus === ECallStatus.CONNECTING
                ? "connecting"
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

      <Drawer
        open={isTranscriptOpen}
        direction="right"
        onOpenChange={setIsTranscriptOpen}
      >
        <DrawerContent className="ml-auto w-full max-w-lg px-4">
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
