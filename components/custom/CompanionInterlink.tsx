"use client";

import { cn, configureAssistant, getSubjectColor } from "@/lib/utils";
import { vapi } from "@/lib/vapi.sdk";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import Lottie, { LottieRefCurrentProps } from "lottie-react";
import soundWaveAnimation from "@/constants/sound-voice.json";
import { AssistantOverrides } from "@vapi-ai/web/dist/api";

enum ECallStatus {
  INACTIVE = "INACTIVE",
  CONNECTING = "CONNECTING",
  ACTIVE = "ACTIVE",
  FINISHED = "FINISHED",
}

// copy from Vapi because this one not expose
type VapiEventNames =
  | "call-end"
  | "call-start"
  | "volume-level"
  | "speech-start"
  | "speech-end"
  | "message"
  | "video"
  | "error"
  | "camera-error"
  | "network-quality-change"
  | "network-connection"
  | "daily-participant-updated"
  | "call-start-progress"
  | "call-start-success"
  | "call-start-failed";

function CompanionInterlink({
  subject,
  name,
  companionId,
  style,
  topic,
  voice,
  userImage,
  userName,
}: CompanionComponentProps) {
  const lottieRef = useRef<LottieRefCurrentProps>(null);
  const [callStatus, setCallStatus] = useState<ECallStatus>(
    ECallStatus.INACTIVE,
  );
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(true);

  useEffect(() => {
    if (lottieRef) {
      if (isSpeaking) {
        lottieRef.current?.play();
      } else {
        lottieRef.current?.stop();
      }
    }
  });

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const actions: { event: VapiEventNames; method: (arg0?: any) => void }[] = [
      { event: "call-start", method: () => setCallStatus(ECallStatus.ACTIVE) },
      { event: "call-end", method: () => setCallStatus(ECallStatus.FINISHED) },
      { event: "message", method: () => {} },
      { event: "error", method: (error: Error) => console.log("error", error) },
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
      clientMessages: "transcript",
    };

    const call = await vapi.start(
      configureAssistant(voice, style),
      assistantOverrides,
    );

    if (call) {
      setCallStatus(ECallStatus.ACTIVE);
    }
  }

  function handleDisconnect() {
    //
    vapi.stop();
  }

  return (
    <section className="flex h-[70dvh] flex-col">
      <section className="flex gap-8 max-sm:flex-col">
        <div className="companion-section">
          <div
            className="companion-avatar"
            style={{ backgroundColor: getSubjectColor(subject) }}
          >
            <div
              className={cn(
                "absolute transition-opacity duration-100",
                callStatus === ECallStatus.FINISHED ||
                  callStatus === ECallStatus.INACTIVE
                  ? "opacity-100"
                  : "opacity-0",
                callStatus === ECallStatus.CONNECTING &&
                  "animate-pulse opacity-100",
              )}
            >
              <Image
                src={`/icons/${subject}.svg`}
                alt={subject}
                width={150}
                height={150}
                className="max-sm:w-fit"
              />
            </div>

            <div
              className={cn(
                "absolute transition-opacity duration-1000",
                callStatus === ECallStatus.ACTIVE ? "opacity-100" : "opacity-0",
              )}
            >
              <Lottie
                lottieRef={lottieRef}
                animationData={soundWaveAnimation}
                className="companion-lottie"
                autoPlay={false}
              />
            </div>
          </div>

          <p className="text-xl font-bold">{name}</p>
        </div>

        <div className="user-section">
          <div className="user-avatar">
            <Image
              priority
              src={userImage}
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
                : "end session"}
          </button>
        </div>
      </section>

      <section className="transcript">
        <div className="transcript-message no-scrollbar"></div>
      </section>
    </section>
  );
}

export default CompanionInterlink;
