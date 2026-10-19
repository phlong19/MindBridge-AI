"use client";

import { useI18n } from "@/lib/i18n/provider";
import { Loader2, Square } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { CompanionSessionState } from "./useCompanionSession";

export default function SessionCountdown({
  session,
}: {
  session: CompanionSessionState;
}) {
  const { t } = useI18n();
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
              ? t("Session time")
              : session.callStatus === "connecting"
                ? t("Connecting…")
                : session.callStatus === "ending"
                  ? t("Ending…")
                  : t("Saving…")}
          </span>
          <span className="font-medium tabular-nums">
            {minutes}:{seconds}
          </span>
        </div>
        <div
          role="progressbar"
          aria-label={t("Session time remaining")}
          aria-valuemin={0}
          aria-valuemax={session.durationSeconds}
          aria-valuenow={remaining}
          aria-valuetext={`${minutes} ${t("minutes")} ${seconds} ${t("seconds remaining")}`}
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
        aria-label={t("End session")}
        title={t("End session")}
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
