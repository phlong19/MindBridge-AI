"use client";

import { Loader2, Square } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { CompanionSessionState } from "./useCompanionSession";

export default function SessionCountdown({
  session,
}: {
  session: CompanionSessionState;
}) {
  const remaining = session.remainingSeconds;
  const minutes = Math.floor(remaining / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (remaining % 60).toString().padStart(2, "0");
  const active = session.callStatus === "active";
  return (
    <div className="flex items-center gap-2">
      <div className="w-32 sm:w-40">
        <div className="mb-1.5 flex items-center justify-between gap-2 text-[11px]">
          <span className="text-muted-foreground">
            {active
              ? "Session time"
              : session.callStatus === "connecting"
                ? "Connecting…"
                : session.callStatus === "ending"
                  ? "Ending…"
                  : "Saving…"}
          </span>
          <span className="font-medium tabular-nums">
            {minutes}:{seconds}
          </span>
        </div>
        <div
          role="progressbar"
          aria-label="Session time remaining"
          aria-valuemin={0}
          aria-valuemax={session.durationSeconds}
          aria-valuenow={remaining}
          aria-valuetext={`${minutes} minutes ${seconds} seconds remaining`}
          className="bg-muted h-1.5 overflow-hidden rounded-full"
        >
          <div
            className="bg-primary h-full rounded-full transition-[width] duration-700 motion-reduce:transition-none"
            style={{ width: `${(remaining / session.durationSeconds) * 100}%` }}
          />
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="size-8 rounded-lg text-red-600 hover:bg-red-50 hover:text-red-700"
        disabled={!active}
        aria-label="End session"
        title="End session"
        onClick={session.endVoice}
      >
        {active ? (
          <Square className="size-3.5 fill-current" />
        ) : (
          <Loader2 className="size-4 animate-spin" />
        )}
      </Button>
    </div>
  );
}
