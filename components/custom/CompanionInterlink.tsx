"use client";

import { cn, getSubjectColor } from "@/lib/utils";
import { vapi } from "@/lib/vapi.sdk";
import Image from "next/image";
import { useEffect, useState } from "react";

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

function CompanionInterlink({ subject }: CompanionComponentProps) {
  const [callStatus, setCallStatus] = useState<ECallStatus>(
    ECallStatus.INACTIVE,
  );
  const [isSpeaking, setIsSpeaking] = useState(false);

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
                style={{ width: 150, height: 150 }}
                className="max-sm:w-fit"
              />
            </div>

            <div
              className={cn(
                "absolute transition-opacity duration-1000",
                callStatus === ECallStatus.ACTIVE ? "opacity-100" : "opacity-0",
              )}
            >
              {isSpeaking}
              {/* lottie */}
            </div>
          </div>
        </div>
      </section>
    </section>
  );
}

export default CompanionInterlink;
